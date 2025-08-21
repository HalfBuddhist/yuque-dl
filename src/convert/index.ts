import { existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import ora from 'ora'

import { MarkdownImageConverter } from './converter'
import { logger } from '../utils'
// Note: fixPath is for cleaning directory names, not full paths

import type { IConvertOptions, IConvertResult } from '../types'

/**
 * 转换 markdown 文件中的图片为 base64 嵌入
 * @param sourceDir 源目录路径
 * @param options 转换选项
 */
export async function convertMarkdownImages(
  sourceDir: string,
  options: IConvertOptions
): Promise<void> {
  const startTime = Date.now()
  logger.info('=== Markdown Image Base64 Conversion Started ===')
  logger.info(`Source directory: ${sourceDir}`)
  logger.info(`Options: ${JSON.stringify(options)}`)
  
  const spinner = ora('正在初始化转换...').start()

  try {
    // 验证源目录
    const resolvedSourceDir = resolve(sourceDir)
    logger.debug(`Resolved source directory: ${resolvedSourceDir}`)
    
    if (!existsSync(resolvedSourceDir)) {
      const errorMsg = `源目录不存在: ${resolvedSourceDir}`
      logger.error(errorMsg)
      throw new Error(errorMsg)
    }
    logger.debug(`Source directory verified: ${resolvedSourceDir}`)

    // 确定输出目录
    const outputDir = options.output 
      ? resolve(options.output)
      : join(resolvedSourceDir + '-base64')
    
    logger.info(`Output directory: ${outputDir}`)

    // 检查输出目录是否存在
    if (existsSync(outputDir) && !options.overwrite) {
      spinner.stop()
      const errorMsg = `输出目录已存在: ${outputDir}\n请使用 --overwrite 选项覆盖，或指定不同的输出目录`
      logger.error(errorMsg)
      throw new Error(errorMsg)
    }

    spinner.text = '正在扫描 markdown 文件...'

    // 创建转换器实例
    const converter = new MarkdownImageConverter(
      resolvedSourceDir,
      outputDir,
      options
    )

    // 执行转换
    logger.info('Starting conversion process...')
    const result: IConvertResult = await converter.convert()

    spinner.stop()

    // 计算执行时间
    const executionTime = Date.now() - startTime
    logger.info(`Conversion completed in ${executionTime}ms`)

    // 显示转换结果
    displayConvertResult(result, resolvedSourceDir, outputDir, executionTime)

    // 记录详细统计信息
    logDetailedStatistics(result, executionTime)

  } catch (error) {
    spinner.stop()
    const executionTime = Date.now() - startTime
    const errorMsg = error instanceof Error ? error.message : String(error)
    logger.error(`Conversion failed after ${executionTime}ms: ${errorMsg}`)
    logger.error('=== Markdown Image Base64 Conversion Failed ===')
    throw error
  }
}

/**
 * 显示转换结果统计信息
 */
function displayConvertResult(
  result: IConvertResult,
  sourceDir: string,
  outputDir: string,
  executionTime: number
): void {
  console.log('\n' + '='.repeat(60))
  console.log('📊 转换结果统计')
  console.log('='.repeat(60))
  
  logger.info(`✅ 转换完成! (耗时: ${executionTime}ms)`)
  logger.info(`📁 源目录: ${sourceDir}`)
  logger.info(`📁 输出目录: ${outputDir}`)
  logger.info(`📄 处理文件数: ${result.totalFiles}`)
  logger.info(`🖼️  转换图片数: ${result.convertedImages}`)
  
  if (result.skippedImages > 0) {
    logger.warn(`⚠️  跳过图片数: ${result.skippedImages}`)
  }

  // 显示警告信息摘要
  if (result.warnings.length > 0) {
    logger.warn(`\n⚠️  警告信息 (${result.warnings.length} 个):`)
    
    // 按类型分组显示警告
    const warningGroups = groupWarningsByType(result.warnings)
    Object.entries(warningGroups).forEach(([type, warnings]) => {
      logger.warn(`  ${type}: ${warnings.length} 个`)
      if (warnings.length <= 3) {
        warnings.forEach(warning => logger.warn(`    • ${warning}`))
      } else {
        warnings.slice(0, 2).forEach(warning => logger.warn(`    • ${warning}`))
        logger.warn(`    • ... 还有 ${warnings.length - 2} 个类似警告`)
      }
    })
  }

  // 显示错误信息摘要
  if (result.errors.length > 0) {
    logger.error(`\n❌ 错误信息 (${result.errors.length} 个):`)
    
    // 按类型分组显示错误
    const errorGroups = groupErrorsByType(result.errors)
    Object.entries(errorGroups).forEach(([type, errors]) => {
      logger.error(`  ${type}: ${errors.length} 个`)
      if (errors.length <= 3) {
        errors.forEach(error => logger.error(`    • ${error}`))
      } else {
        errors.slice(0, 2).forEach(error => logger.error(`    • ${error}`))
        logger.error(`    • ... 还有 ${errors.length - 2} 个类似错误`)
      }
    })
  }

  // 显示最终状态
  console.log('\n' + '='.repeat(60))
  if (result.errors.length === 0) {
    logger.info('🎉 所有文件转换成功!')
  } else {
    logger.warn(`⚠️  转换完成，但有 ${result.errors.length} 个错误`)
  }
  console.log('='.repeat(60))
}

/**
 * 按类型分组警告信息
 */
function groupWarningsByType(warnings: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {}
  
  warnings.forEach(warning => {
    let type = '其他警告'
    
    if (warning.includes('Skipped remote image')) {
      type = '跳过远程图片'
    } else if (warning.includes('Skipped unsupported image format')) {
      type = '跳过不支持的图片格式'
    } else if (warning.includes('Failed to convert image')) {
      type = '图片转换失败'
    } else if (warning.includes('No markdown files found')) {
      type = '未找到文件'
    }
    
    if (!groups[type]) {
      groups[type] = []
    }
    groups[type].push(warning)
  })
  
  return groups
}

/**
 * 按类型分组错误信息
 */
function groupErrorsByType(errors: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {}
  
  errors.forEach(error => {
    let type = '其他错误'
    
    if (error.includes('Failed to process file')) {
      type = '文件处理错误'
    } else if (error.includes('Error processing image')) {
      type = '图片处理错误'
    } else if (error.includes('Failed to scan')) {
      type = '文件扫描错误'
    } else if (error.includes('Failed to create')) {
      type = '目录创建错误'
    } else if (error.includes('Failed to write')) {
      type = '文件写入错误'
    }
    
    if (!groups[type]) {
      groups[type] = []
    }
    groups[type].push(error)
  })
  
  return groups
}

/**
 * 记录详细的统计信息到日志
 */
function logDetailedStatistics(result: IConvertResult, executionTime: number): void {
  logger.info('=== Detailed Conversion Statistics ===')
  logger.info(`Execution time: ${executionTime}ms`)
  logger.info(`Total files processed: ${result.totalFiles}`)
  logger.info(`Images converted: ${result.convertedImages}`)
  logger.info(`Images skipped: ${result.skippedImages}`)
  logger.info(`Warnings count: ${result.warnings.length}`)
  logger.info(`Errors count: ${result.errors.length}`)
  
  if (result.totalFiles > 0) {
    const successRate = ((result.totalFiles - result.errors.filter(e => e.includes('Failed to process file')).length) / result.totalFiles * 100).toFixed(1)
    logger.info(`File processing success rate: ${successRate}%`)
  }
  
  if (result.convertedImages + result.skippedImages > 0) {
    const conversionRate = (result.convertedImages / (result.convertedImages + result.skippedImages) * 100).toFixed(1)
    logger.info(`Image conversion rate: ${conversionRate}%`)
  }
  
  logger.info('=== End Statistics ===')
}