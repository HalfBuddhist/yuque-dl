import * as path from 'path'
import { stdout, env } from 'node:process'
import ora, { type Ora } from 'ora'
import { IConvertOptions, IConvertResult, IMarkdownFile } from '../types/index'
import { scanMarkdownFiles, createOutputDirectory, writeMarkdownFile, generateDefaultOutputDir } from './fileScanner'
import { convertMarkdownImages, MarkdownConversionResult } from './markdownProcessor'
import { convertLogger } from './logger'

/**
 * 主要的 Markdown 图片转换服务类
 * 协调各个模块完成从本地图片链接到 base64 嵌入的转换流程
 */
export class MarkdownImageConverter {
  private sourceDir: string
  private outputDir: string
  private options: IConvertOptions

  /**
   * 构造函数
   * @param sourceDir 源目录路径
   * @param outputDir 输出目录路径（可选，如果未提供将使用默认名称）
   * @param options 转换选项
   */
  constructor(sourceDir: string, outputDir?: string, options: IConvertOptions = { overwrite: false }) {
    this.sourceDir = path.resolve(sourceDir)
    this.outputDir = outputDir ? path.resolve(outputDir) : path.resolve(generateDefaultOutputDir(sourceDir))
    this.options = options
  }

  /**
   * 执行转换流程
   * @returns Promise<IConvertResult> 转换结果统计
   */
  async convert(): Promise<IConvertResult> {
    const result: IConvertResult = {
      totalFiles: 0,
      convertedImages: 0,
      skippedImages: 0,
      warnings: [],
      errors: []
    }

    let spinner: Ora | undefined

    try {
      convertLogger.startConversion()
      convertLogger.logInfo(`Starting conversion process`)
      convertLogger.logInfo(`Source directory: ${this.sourceDir}`)
      convertLogger.logInfo(`Output directory: ${this.outputDir}`)
      convertLogger.logInfo(`Options: ${JSON.stringify(this.options)}`)

      // 1. 扫描 markdown 文件
      if (env.NODE_ENV !== 'test') {
        spinner = ora({
          text: '扫描 markdown 文件中...',
          stream: stdout
        })
        spinner.start()
      }

      let markdownFiles: IMarkdownFile[]
      try {
        markdownFiles = await this.scanMarkdownFiles()
        result.totalFiles = markdownFiles.length
        convertLogger.logInfo(`Found ${markdownFiles.length} markdown files`)
      } catch (scanError) {
        const errorMessage = scanError instanceof Error ? scanError.message : String(scanError)
        result.errors.push(`Failed to scan markdown files: ${errorMessage}`)
        convertLogger.logError(`Failed to scan markdown files: ${errorMessage}`, scanError instanceof Error ? scanError : undefined)
        
        if (spinner) {
          spinner.fail(`扫描失败: ${errorMessage}`)
        }
        return result
      }

      if (markdownFiles.length === 0) {
        const warningMsg = `No markdown files found in source directory: ${this.sourceDir}`
        result.warnings.push(warningMsg)
        convertLogger.logWarning(warningMsg)
        
        if (spinner) {
          spinner.fail(`未在源目录中找到 markdown 文件: ${this.sourceDir}`)
        }
        return result
      }

      if (spinner) {
        spinner.succeed(`找到 ${markdownFiles.length} 个 markdown 文件`)
      }

      // 2. 创建输出目录
      if (env.NODE_ENV !== 'test') {
        spinner = ora({
          text: '创建输出目录中...',
          stream: stdout
        })
        spinner.start()
      }

      try {
        await this.createOutputDirectory()
        convertLogger.logDirectoryOperationSuccess('creation', this.outputDir)
      } catch (dirError) {
        const errorMessage = dirError instanceof Error ? dirError.message : String(dirError)
        result.errors.push(`Failed to create output directory: ${errorMessage}`)
        convertLogger.logDirectoryOperationError('creation', this.outputDir, errorMessage)
        
        if (spinner) {
          spinner.fail(`创建输出目录失败: ${errorMessage}`)
        }
        return result
      }

      if (spinner) {
        spinner.succeed(`输出目录已创建: ${this.outputDir}`)
      }

      // 3. 处理每个 markdown 文件
      let processedFiles = 0
      let failedFiles = 0
      
      for (let i = 0; i < markdownFiles.length; i++) {
        const file = markdownFiles[i]
        
        if (env.NODE_ENV !== 'test') {
          spinner = ora({
            text: `处理文件 (${i + 1}/${markdownFiles.length}): ${file.relativePath}`,
            stream: stdout
          })
          spinner.start()
        }

        try {
          convertLogger.logFileProcessingStart(file.relativePath, i + 1, markdownFiles.length)
          const fileResult = await this.processMarkdownFile(file, result)
          processedFiles++
          
          convertLogger.logFileProcessingSuccess(file.relativePath, fileResult.convertedImages, fileResult.skippedImages)
          
          if (spinner) {
            spinner.succeed(`已处理: ${file.relativePath}`)
          }
        } catch (error) {
          failedFiles++
          const errorMessage = error instanceof Error ? error.message : String(error)
          const errorMsg = `Failed to process file ${file.relativePath}: ${errorMessage}`
          result.errors.push(errorMsg)
          convertLogger.logFileProcessingError(file.relativePath, errorMessage)
          
          if (spinner) {
            spinner.fail(`处理失败: ${file.relativePath} - ${errorMessage}`)
          }
          
          // 继续处理下一个文件，不让单个文件的错误影响整体流程
          continue
        }
      }

      // 记录处理统计
      convertLogger.logInfo(`File processing completed: ${processedFiles} successful, ${failedFiles} failed`)

      // 显示最终统计信息
      if (env.NODE_ENV !== 'test') {
        console.log('\n转换完成!')
        console.log(`📁 处理文件: ${result.totalFiles} 个`)
        console.log(`🖼️  转换图片: ${result.convertedImages} 个`)
        console.log(`⏭️  跳过图片: ${result.skippedImages} 个`)
        
        if (result.warnings.length > 0) {
          console.log(`⚠️  警告: ${result.warnings.length} 个`)
        }
        
        if (result.errors.length > 0) {
          console.log(`❌ 错误: ${result.errors.length} 个`)
        }
      }

      convertLogger.endConversion()
      convertLogger.logInfo(`Conversion process completed successfully`)

      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorMsg = `Conversion process failed: ${errorMessage}`
      result.errors.push(errorMsg)
      convertLogger.logError(errorMsg, error instanceof Error ? error : undefined)
      
      if (spinner) {
        spinner.fail(`转换失败: ${errorMessage}`)
      }
      
      return result
    }
  }

  /**
   * 扫描源目录中的所有 markdown 文件
   * @returns Promise<IMarkdownFile[]> markdown 文件列表
   */
  private async scanMarkdownFiles(): Promise<IMarkdownFile[]> {
    return await scanMarkdownFiles(this.sourceDir)
  }

  /**
   * 创建输出目录
   * @returns Promise<void>
   */
  private async createOutputDirectory(): Promise<void> {
    await createOutputDirectory(this.outputDir, this.options.overwrite)
  }

  /**
   * 处理单个 markdown 文件
   * @param file markdown 文件信息
   * @param result 累积的转换结果
   * @returns Promise<MarkdownConversionResult> 单个文件的转换结果
   */
  private async processMarkdownFile(file: IMarkdownFile, result: IConvertResult): Promise<MarkdownConversionResult> {
    try {
      convertLogger.logDebug(`Starting to process markdown file: ${file.relativePath}`)
      
      // 转换文件中的图片链接
      const conversionResult: MarkdownConversionResult = await convertMarkdownImages(
        file.content,
        file.absolutePath
      )

      // 累积统计信息
      result.convertedImages += conversionResult.convertedImages
      result.skippedImages += conversionResult.skippedImages
      result.warnings.push(...conversionResult.warnings)
      result.errors.push(...conversionResult.errors)

      convertLogger.logDebug(`Image conversion completed for ${file.relativePath}: ${conversionResult.convertedImages} converted, ${conversionResult.skippedImages} skipped`)

      // 写入转换后的文件到输出目录
      try {
        await writeMarkdownFile(this.outputDir, file.relativePath, conversionResult.content)
        convertLogger.logDebug(`Successfully wrote converted file: ${file.relativePath}`)
      } catch (writeError) {
        const errorMessage = writeError instanceof Error ? writeError.message : String(writeError)
        const errorMsg = `Failed to write converted file ${file.relativePath}: ${errorMessage}`
        result.errors.push(errorMsg)
        convertLogger.logError(errorMsg, writeError instanceof Error ? writeError : undefined)
        throw writeError // Re-throw to be caught by the caller
      }

      return conversionResult

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorMsg = `Error processing file ${file.relativePath}: ${errorMessage}`
      result.errors.push(errorMsg)
      convertLogger.logError(errorMsg, error instanceof Error ? error : undefined)
      throw error // Re-throw to be caught by the caller
    }
  }

  /**
   * 获取源目录路径
   * @returns string 源目录的绝对路径
   */
  getSourceDir(): string {
    return this.sourceDir
  }

  /**
   * 获取输出目录路径
   * @returns string 输出目录的绝对路径
   */
  getOutputDir(): string {
    return this.outputDir
  }

  /**
   * 获取转换选项
   * @returns IConvertOptions 当前的转换选项
   */
  getOptions(): IConvertOptions {
    return { ...this.options }
  }

  /**
   * 显示详细的转换结果统计信息
   * @param result 转换结果
   */
  displayDetailedResults(result: IConvertResult): void {
    if (env.NODE_ENV === 'test') {
      return
    }

    console.log('\n=== 转换结果详情 ===')
    console.log(`📊 总计处理文件: ${result.totalFiles} 个`)
    console.log(`✅ 成功转换图片: ${result.convertedImages} 个`)
    console.log(`⏭️  跳过的图片: ${result.skippedImages} 个`)
    
    if (result.warnings.length > 0) {
      console.log(`\n⚠️  警告信息 (${result.warnings.length} 个):`)
      result.warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning}`)
      })
    }
    
    if (result.errors.length > 0) {
      console.log(`\n❌ 错误信息 (${result.errors.length} 个):`)
      result.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`)
      })
    }

    console.log(`\n📂 输出目录: ${this.outputDir}`)
    console.log('===================\n')
  }

  /**
   * 执行转换流程并显示详细结果
   * @returns Promise<IConvertResult> 转换结果统计
   */
  async convertWithDetailedOutput(): Promise<IConvertResult> {
    const result = await this.convert()
    this.displayDetailedResults(result)
    return result
  }
}