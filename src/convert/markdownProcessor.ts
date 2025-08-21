import * as path from 'path'
import { IImageReference } from '../types'
import { convertImageToBase64, ImageConversionResult } from './imageUtils'
import { logger } from '../utils/log'

/**
 * 正则表达式匹配 markdown 图片语法：![alt](path)
 */
const IMAGE_REGEX = /!\[([^\]]*)\]\(([^)]+)\)/g

/**
 * 检查是否为远程图片链接
 * @param imagePath 图片路径
 * @returns 是否为远程链接
 */
export function isRemoteImage(imagePath: string): boolean {
  return imagePath.startsWith('http://') || imagePath.startsWith('https://')
}

/**
 * 从 markdown 内容中提取图片引用信息
 * @param content markdown 文件内容
 * @param markdownFilePath markdown 文件的绝对路径，用于解析相对路径
 * @returns 图片引用信息数组
 */
export function extractImageReferences(content: string, markdownFilePath: string): IImageReference[] {
  const imageReferences: IImageReference[] = []
  const markdownDir = path.dirname(markdownFilePath)
  
  let match: RegExpExecArray | null
  
  // 重置正则表达式的 lastIndex，确保每次调用都从头开始匹配
  IMAGE_REGEX.lastIndex = 0
  
  while ((match = IMAGE_REGEX.exec(content)) !== null) {
    const [originalMarkdown, altText, imagePath] = match
    
    // 跳过远程图片链接
    if (isRemoteImage(imagePath)) {
      continue
    }
    
    // 解析相对路径为绝对路径
    const absoluteImagePath = path.isAbsolute(imagePath) 
      ? imagePath 
      : path.resolve(markdownDir, imagePath)
    
    imageReferences.push({
      originalMarkdown,
      imagePath,
      absoluteImagePath,
      altText: altText || '' // 如果没有 alt 文本，使用空字符串
    })
  }
  
  return imageReferences
}

/**
 * 清理和标准化图片路径
 * @param imagePath 原始图片路径
 * @returns 清理后的路径
 */
export function cleanImagePath(imagePath: string): string {
  // 移除查询参数和锚点
  return imagePath.split('?')[0].split('#')[0]
}

/**
 * 验证图片路径是否为支持的格式
 * @param imagePath 图片路径
 * @returns 是否为支持的图片格式
 */
export function isSupportedImageFormat(imagePath: string): boolean {
  const cleanPath = cleanImagePath(imagePath).toLowerCase()
  const supportedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.bmp']
  
  return supportedExtensions.some(ext => cleanPath.endsWith(ext))
}

/**
 * Markdown 内容转换结果
 */
export interface MarkdownConversionResult {
  /** 转换后的 markdown 内容 */
  content: string
  /** 成功转换的图片数量 */
  convertedImages: number
  /** 跳过的图片数量（远程链接等） */
  skippedImages: number
  /** 警告信息列表 */
  warnings: string[]
  /** 错误信息列表 */
  errors: string[]
}

/**
 * 将 markdown 内容中的本地图片链接转换为 base64 数据 URI
 * @param content markdown 文件内容
 * @param markdownFilePath markdown 文件的绝对路径，用于解析相对路径
 * @returns 转换结果
 */
export async function convertMarkdownImages(content: string, markdownFilePath: string): Promise<MarkdownConversionResult> {
  const result: MarkdownConversionResult = {
    content,
    convertedImages: 0,
    skippedImages: 0,
    warnings: [],
    errors: []
  }

  try {
    logger.debug(`Processing markdown file: ${markdownFilePath}`)
    const markdownDir = path.dirname(markdownFilePath)
    let updatedContent = content
    
    // 使用正则表达式找到所有图片引用（包括远程的）
    let match: RegExpExecArray | null
    IMAGE_REGEX.lastIndex = 0
    
    const imageMatches: Array<{ originalMarkdown: string, altText: string, imagePath: string }> = []
    
    // 首先收集所有匹配项，避免在替换过程中正则表达式状态混乱
    while ((match = IMAGE_REGEX.exec(content)) !== null) {
      const [originalMarkdown, altText, imagePath] = match
      imageMatches.push({ originalMarkdown, altText, imagePath })
    }
    
    logger.debug(`Found ${imageMatches.length} image references in ${markdownFilePath}`)
    
    for (const { originalMarkdown, altText, imagePath } of imageMatches) {
      try {
        logger.debug(`Processing image reference: ${imagePath}`)
        
        // 检查是否为远程图片链接
        if (isRemoteImage(imagePath)) {
          result.skippedImages++
          const warningMsg = `Skipped remote image: ${imagePath}`
          result.warnings.push(warningMsg)
          logger.info(warningMsg)
          continue
        }

        // 检查是否为支持的图片格式
        if (!isSupportedImageFormat(imagePath)) {
          result.skippedImages++
          const warningMsg = `Skipped unsupported image format: ${imagePath}`
          result.warnings.push(warningMsg)
          logger.warn(warningMsg)
          continue
        }

        // 解析相对路径为绝对路径
        const absoluteImagePath = path.isAbsolute(imagePath) 
          ? imagePath 
          : path.resolve(markdownDir, imagePath)

        logger.debug(`Resolved image path: ${imagePath} -> ${absoluteImagePath}`)

        // 转换图片为 base64
        const conversionResult: ImageConversionResult = await convertImageToBase64(absoluteImagePath)
        
        if (conversionResult.success && conversionResult.dataUri) {
          // 替换原始的图片链接为 base64 数据 URI
          const newMarkdown = `![${altText || ''}](${conversionResult.dataUri})`
          updatedContent = updatedContent.replace(originalMarkdown, newMarkdown)
          result.convertedImages++
          logger.debug(`Successfully converted image: ${imagePath}`)
        } else {
          // 转换失败，记录警告但保留原始链接
          result.skippedImages++
          const warningMsg = `Failed to convert image: ${imagePath} - ${conversionResult.error}`
          result.warnings.push(warningMsg)
          logger.warn(warningMsg)
        }
      } catch (error) {
        // 处理单个图片转换时的异常
        result.skippedImages++
        const errorMessage = error instanceof Error ? error.message : String(error)
        const errorMsg = `Error processing image ${imagePath}: ${errorMessage}`
        result.errors.push(errorMsg)
        logger.error(errorMsg, error)
        
        // 继续处理下一个图片，不让单个图片的错误影响整体流程
        continue
      }
    }

    result.content = updatedContent
    logger.info(`Markdown processing completed for ${markdownFilePath}: ${result.convertedImages} converted, ${result.skippedImages} skipped`)
    return result

  } catch (error) {
    // 处理整体内容处理的异常
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorMsg = `Error processing markdown content in ${markdownFilePath}: ${errorMessage}`
    result.errors.push(errorMsg)
    logger.error(errorMsg, error)
    return result
  }
}

/**
 * 批量处理多个 markdown 文件的图片转换
 * @param markdownFiles markdown 文件信息数组
 * @returns 转换结果汇总
 */
export async function convertMultipleMarkdownFiles(markdownFiles: Array<{ content: string, filePath: string }>): Promise<MarkdownConversionResult[]> {
  const results: MarkdownConversionResult[] = []
  
  logger.info(`Starting batch conversion of ${markdownFiles.length} markdown files`)
  
  for (let i = 0; i < markdownFiles.length; i++) {
    const file = markdownFiles[i]
    try {
      logger.debug(`Processing file ${i + 1}/${markdownFiles.length}: ${file.filePath}`)
      const result = await convertMarkdownImages(file.content, file.filePath)
      results.push(result)
    } catch (error) {
      // 如果单个文件处理完全失败，创建一个错误结果
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorMsg = `Failed to process file ${file.filePath}: ${errorMessage}`
      logger.error(errorMsg, error)
      
      results.push({
        content: file.content, // 保留原始内容
        convertedImages: 0,
        skippedImages: 0,
        warnings: [],
        errors: [errorMsg]
      })
      
      // 继续处理下一个文件，不让单个文件的错误影响整体流程
      continue
    }
  }
  
  logger.info(`Batch conversion completed: ${results.length} files processed`)
  return results
}