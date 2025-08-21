import { logger as baseLogger } from '../utils/log'

/**
 * 转换过程专用的日志工具
 * 提供更详细的日志分类和统计功能
 */
export class ConvertLogger {
  private static instance: ConvertLogger
  private startTime: number = 0
  private statistics = {
    filesProcessed: 0,
    filesSkipped: 0,
    imagesSucess: 0,
    imagesSkipped: 0,
    warnings: 0,
    errors: 0
  }

  private constructor() {}

  static getInstance(): ConvertLogger {
    if (!ConvertLogger.instance) {
      ConvertLogger.instance = new ConvertLogger()
    }
    return ConvertLogger.instance
  }

  /**
   * 开始转换过程
   */
  startConversion(): void {
    this.startTime = Date.now()
    this.resetStatistics()
    baseLogger.info('=== Markdown Image Base64 Conversion Started ===')
  }

  /**
   * 结束转换过程
   */
  endConversion(): void {
    const duration = Date.now() - this.startTime
    baseLogger.info(`=== Conversion Completed in ${duration}ms ===`)
    this.logFinalStatistics(duration)
  }

  /**
   * 重置统计信息
   */
  private resetStatistics(): void {
    this.statistics = {
      filesProcessed: 0,
      filesSkipped: 0,
      imagesSucess: 0,
      imagesSkipped: 0,
      warnings: 0,
      errors: 0
    }
  }

  /**
   * 记录文件处理开始
   */
  logFileProcessingStart(filePath: string, index: number, total: number): void {
    baseLogger.debug(`[${index}/${total}] Processing file: ${filePath}`)
  }

  /**
   * 记录文件处理成功
   */
  logFileProcessingSuccess(filePath: string, convertedImages: number, skippedImages: number): void {
    this.statistics.filesProcessed++
    this.statistics.imagesSucess += convertedImages
    this.statistics.imagesSkipped += skippedImages
    
    baseLogger.info(`✅ File processed: ${filePath} (${convertedImages} converted, ${skippedImages} skipped)`)
  }

  /**
   * 记录文件处理失败
   */
  logFileProcessingError(filePath: string, error: string): void {
    this.statistics.filesSkipped++
    this.statistics.errors++
    
    baseLogger.error(`❌ File processing failed: ${filePath} - ${error}`)
  }

  /**
   * 记录图片转换成功
   */
  logImageConversionSuccess(imagePath: string): void {
    baseLogger.debug(`🖼️  Image converted: ${imagePath}`)
  }

  /**
   * 记录图片转换跳过
   */
  logImageConversionSkipped(imagePath: string, reason: string): void {
    this.statistics.warnings++
    baseLogger.warn(`⏭️  Image skipped: ${imagePath} - ${reason}`)
  }

  /**
   * 记录图片转换失败
   */
  logImageConversionError(imagePath: string, error: string): void {
    this.statistics.errors++
    baseLogger.error(`❌ Image conversion failed: ${imagePath} - ${error}`)
  }

  /**
   * 记录远程图片跳过
   */
  logRemoteImageSkipped(imagePath: string): void {
    this.statistics.warnings++
    baseLogger.info(`🌐 Remote image skipped: ${imagePath}`)
  }

  /**
   * 记录不支持的图片格式
   */
  logUnsupportedImageFormat(imagePath: string): void {
    this.statistics.warnings++
    baseLogger.warn(`🚫 Unsupported image format: ${imagePath}`)
  }

  /**
   * 记录目录操作
   */
  logDirectoryOperation(operation: string, path: string): void {
    baseLogger.debug(`📁 Directory ${operation}: ${path}`)
  }

  /**
   * 记录目录操作成功
   */
  logDirectoryOperationSuccess(operation: string, path: string): void {
    baseLogger.info(`✅ Directory ${operation} successful: ${path}`)
  }

  /**
   * 记录目录操作失败
   */
  logDirectoryOperationError(operation: string, path: string, error: string): void {
    this.statistics.errors++
    baseLogger.error(`❌ Directory ${operation} failed: ${path} - ${error}`)
  }

  /**
   * 记录警告信息
   */
  logWarning(message: string): void {
    this.statistics.warnings++
    baseLogger.warn(`⚠️  ${message}`)
  }

  /**
   * 记录错误信息
   */
  logError(message: string, error?: Error): void {
    this.statistics.errors++
    baseLogger.error(`❌ ${message}`)
    if (error && error.stack) {
      baseLogger.debug(`Stack trace: ${error.stack}`)
    }
  }

  /**
   * 记录调试信息
   */
  logDebug(message: string): void {
    baseLogger.debug(`🔍 ${message}`)
  }

  /**
   * 记录信息
   */
  logInfo(message: string): void {
    baseLogger.info(`ℹ️  ${message}`)
  }

  /**
   * 获取当前统计信息
   */
  getStatistics() {
    return { ...this.statistics }
  }

  /**
   * 记录最终统计信息
   */
  private logFinalStatistics(duration: number): void {
    baseLogger.info('=== Final Statistics ===')
    baseLogger.info(`⏱️  Total execution time: ${duration}ms`)
    baseLogger.info(`📄 Files processed: ${this.statistics.filesProcessed}`)
    baseLogger.info(`📄 Files skipped: ${this.statistics.filesSkipped}`)
    baseLogger.info(`🖼️  Images converted: ${this.statistics.imagesSucess}`)
    baseLogger.info(`⏭️  Images skipped: ${this.statistics.imagesSkipped}`)
    baseLogger.info(`⚠️  Warnings: ${this.statistics.warnings}`)
    baseLogger.info(`❌ Errors: ${this.statistics.errors}`)
    
    const totalFiles = this.statistics.filesProcessed + this.statistics.filesSkipped
    if (totalFiles > 0) {
      const successRate = (this.statistics.filesProcessed / totalFiles * 100).toFixed(1)
      baseLogger.info(`📊 File success rate: ${successRate}%`)
    }
    
    const totalImages = this.statistics.imagesSucess + this.statistics.imagesSkipped
    if (totalImages > 0) {
      const conversionRate = (this.statistics.imagesSucess / totalImages * 100).toFixed(1)
      baseLogger.info(`📊 Image conversion rate: ${conversionRate}%`)
    }
    
    baseLogger.info('=== End Statistics ===')
  }
}

/**
 * 获取转换日志器实例
 */
export const convertLogger = ConvertLogger.getInstance()