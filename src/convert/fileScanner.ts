import { promises as fs } from 'fs'
import * as path from 'path'
import { IMarkdownFile } from '../types/index.js'
import { logger } from '../utils/log'

/**
 * 递归扫描目录，找到所有 markdown 文件
 * @param sourceDir 源目录路径
 * @returns Promise<IMarkdownFile[]> markdown 文件列表
 */
export async function scanMarkdownFiles(sourceDir: string): Promise<IMarkdownFile[]> {
  const markdownFiles: IMarkdownFile[] = []
  const absoluteSourceDir = path.resolve(sourceDir)

  logger.info(`Starting to scan directory: ${absoluteSourceDir}`)

  async function scanDirectory(currentDir: string): Promise<void> {
    try {
      logger.debug(`Scanning directory: ${currentDir}`)
      const entries = await fs.readdir(currentDir, { withFileTypes: true })
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name)
        
        try {
          if (entry.isDirectory()) {
            // 递归扫描子目录
            logger.debug(`Entering subdirectory: ${fullPath}`)
            await scanDirectory(fullPath)
          } else if (entry.isFile() && isMarkdownFile(entry.name)) {
            // 处理 markdown 文件
            logger.debug(`Found markdown file: ${fullPath}`)
            const relativePath = path.relative(absoluteSourceDir, fullPath)
            
            try {
              const content = await fs.readFile(fullPath, 'utf-8')
              markdownFiles.push({
                relativePath,
                absolutePath: fullPath,
                content
              })
              logger.debug(`Successfully loaded markdown file: ${relativePath}`)
            } catch (readError) {
              const errorMsg = `Failed to read markdown file ${fullPath}: ${readError instanceof Error ? readError.message : String(readError)}`
              logger.error(errorMsg)
              // 继续处理其他文件，不让单个文件读取失败影响整体扫描
              continue
            }
          }
        } catch (entryError) {
          const errorMsg = `Error processing entry ${fullPath}: ${entryError instanceof Error ? entryError.message : String(entryError)}`
          logger.warn(errorMsg)
          // 继续处理其他条目
          continue
        }
      }
    } catch (error) {
      const errorMsg = `Failed to scan directory ${currentDir}: ${error instanceof Error ? error.message : String(error)}`
      logger.error(errorMsg)
      throw new Error(errorMsg)
    }
  }

  // 检查源目录是否存在
  try {
    logger.debug(`Checking source directory: ${absoluteSourceDir}`)
    const stats = await fs.stat(absoluteSourceDir)
    if (!stats.isDirectory()) {
      const errorMsg = `Source path is not a directory: ${absoluteSourceDir}`
      logger.error(errorMsg)
      throw new Error(errorMsg)
    }
    logger.debug(`Source directory verified: ${absoluteSourceDir}`)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      const errorMsg = `Source directory does not exist: ${absoluteSourceDir}`
      logger.error(errorMsg)
      throw new Error(errorMsg)
    }
    throw error
  }

  await scanDirectory(absoluteSourceDir)
  logger.info(`Directory scan completed: found ${markdownFiles.length} markdown files`)
  return markdownFiles
}

/**
 * 检查文件是否为 markdown 文件
 * @param filename 文件名
 * @returns boolean
 */
function isMarkdownFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase()
  return ext === '.md' || ext === '.markdown'
}

/**
 * 将相对路径转换为绝对路径
 * @param basePath 基础路径
 * @param relativePath 相对路径
 * @returns string 绝对路径
 */
export function resolveAbsolutePath(basePath: string, relativePath: string): string {
  return path.resolve(basePath, relativePath)
}

/**
 * 计算从源目录到目标文件的相对路径
 * @param sourceDir 源目录
 * @param targetPath 目标文件路径
 * @returns string 相对路径
 */
export function calculateRelativePath(sourceDir: string, targetPath: string): string {
  return path.relative(path.resolve(sourceDir), path.resolve(targetPath))
}
/**
 * 创建输出目录，如果目录已存在则根据覆盖选项处理
 * @param outputDir 输出目录路径
 * @param overwrite 是否覆盖已存在的目录
 * @returns Promise<void>
 */
export async function createOutputDirectory(outputDir: string, overwrite: boolean = false): Promise<void> {
  const absoluteOutputDir = path.resolve(outputDir)
  
  logger.info(`Creating output directory: ${absoluteOutputDir}`)
  
  try {
    const stats = await fs.stat(absoluteOutputDir)
    if (stats.isDirectory()) {
      if (!overwrite) {
        const errorMsg = `Output directory already exists: ${absoluteOutputDir}. Use --overwrite flag to overwrite.`
        logger.error(errorMsg)
        throw new Error(errorMsg)
      }
      // 如果允许覆盖，清空目录内容
      logger.info(`Overwriting existing directory: ${absoluteOutputDir}`)
      await clearDirectory(absoluteOutputDir)
      logger.info(`Directory cleared successfully: ${absoluteOutputDir}`)
    } else {
      const errorMsg = `Output path exists but is not a directory: ${absoluteOutputDir}`
      logger.error(errorMsg)
      throw new Error(errorMsg)
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // 目录不存在，创建新目录
      try {
        logger.debug(`Creating new directory: ${absoluteOutputDir}`)
        await fs.mkdir(absoluteOutputDir, { recursive: true })
        logger.info(`Output directory created successfully: ${absoluteOutputDir}`)
      } catch (createError) {
        const errorMsg = `Failed to create output directory ${absoluteOutputDir}: ${createError instanceof Error ? createError.message : String(createError)}`
        logger.error(errorMsg)
        throw new Error(errorMsg)
      }
    } else {
      logger.error(`Error checking output directory: ${error instanceof Error ? error.message : String(error)}`)
      throw error
    }
  }
}

/**
 * 清空目录内容
 * @param dirPath 目录路径
 * @returns Promise<void>
 */
async function clearDirectory(dirPath: string): Promise<void> {
  try {
    logger.debug(`Clearing directory: ${dirPath}`)
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)
      
      try {
        if (entry.isDirectory()) {
          logger.debug(`Removing directory: ${fullPath}`)
          await fs.rmdir(fullPath, { recursive: true })
        } else {
          logger.debug(`Removing file: ${fullPath}`)
          await fs.unlink(fullPath)
        }
      } catch (entryError) {
        const errorMsg = `Failed to remove ${fullPath}: ${entryError instanceof Error ? entryError.message : String(entryError)}`
        logger.warn(errorMsg)
        // 继续删除其他文件，不让单个文件删除失败影响整体清理
        continue
      }
    }
    logger.debug(`Directory cleared successfully: ${dirPath}`)
  } catch (error) {
    const errorMsg = `Failed to clear directory ${dirPath}: ${error instanceof Error ? error.message : String(error)}`
    logger.error(errorMsg)
    throw new Error(errorMsg)
  }
}

/**
 * 在输出目录中重建目录结构
 * @param outputDir 输出目录根路径
 * @param relativePath 相对路径
 * @returns Promise<string> 创建的目录路径
 */
export async function ensureOutputDirectoryStructure(outputDir: string, relativePath: string): Promise<string> {
  const targetDir = path.dirname(path.join(outputDir, relativePath))
  
  try {
    logger.debug(`Ensuring directory structure: ${targetDir}`)
    await fs.mkdir(targetDir, { recursive: true })
    logger.debug(`Directory structure created: ${targetDir}`)
    return targetDir
  } catch (error) {
    const errorMsg = `Failed to create directory structure ${targetDir}: ${error instanceof Error ? error.message : String(error)}`
    logger.error(errorMsg)
    throw new Error(errorMsg)
  }
}

/**
 * 将转换后的 markdown 文件写入输出目录
 * @param outputDir 输出目录根路径
 * @param relativePath 文件的相对路径
 * @param content 文件内容
 * @returns Promise<void>
 */
export async function writeMarkdownFile(outputDir: string, relativePath: string, content: string): Promise<void> {
  try {
    // 确保目录结构存在
    await ensureOutputDirectoryStructure(outputDir, relativePath)
    
    const outputPath = path.join(outputDir, relativePath)
    logger.debug(`Writing markdown file: ${outputPath}`)
    
    await fs.writeFile(outputPath, content, 'utf-8')
    logger.debug(`Successfully wrote file: ${outputPath}`)
  } catch (error) {
    const outputPath = path.join(outputDir, relativePath)
    const errorMsg = `Failed to write file ${outputPath}: ${error instanceof Error ? error.message : String(error)}`
    logger.error(errorMsg)
    throw new Error(errorMsg)
  }
}

/**
 * 生成默认的输出目录名称
 * @param sourceDir 源目录路径
 * @returns string 默认输出目录名称
 */
export function generateDefaultOutputDir(sourceDir: string): string {
  const baseName = path.basename(path.resolve(sourceDir))
  return `${baseName}-base64`
}