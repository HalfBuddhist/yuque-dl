import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { promises as fs } from 'fs'
import path from 'path'
import { 
  scanMarkdownFiles, 
  createOutputDirectory, 
  ensureOutputDirectoryStructure,
  writeMarkdownFile,
  generateDefaultOutputDir,
  resolveAbsolutePath,
  calculateRelativePath
} from '../../src/convert/fileScanner.js'

const testDir = path.join(process.cwd(), 'test-temp')
const sourceDir = path.join(testDir, 'source')
const outputDir = path.join(testDir, 'output')

describe('fileScanner', () => {
  beforeEach(async () => {
    // 创建测试目录结构
    await fs.mkdir(sourceDir, { recursive: true })
    await fs.mkdir(path.join(sourceDir, 'subfolder'), { recursive: true })
    
    // 创建测试文件
    await fs.writeFile(path.join(sourceDir, 'test1.md'), '# Test 1\n![image](./img/test.png)')
    await fs.writeFile(path.join(sourceDir, 'test2.txt'), 'Not a markdown file')
    await fs.writeFile(path.join(sourceDir, 'subfolder', 'test3.md'), '# Test 3\n![image](../img/test2.png)')
  })

  afterEach(async () => {
    // 清理测试目录
    try {
      await fs.rmdir(testDir, { recursive: true })
    } catch (error) {
      // 忽略清理错误
    }
  })

  describe('scanMarkdownFiles', () => {
    it('should find all markdown files recursively', async () => {
      const files = await scanMarkdownFiles(sourceDir)
      
      expect(files).toHaveLength(2)
      expect(files.map(f => f.relativePath).sort()).toEqual(['subfolder/test3.md', 'test1.md'])
      expect(files[0].content).toContain('# Test')
    })

    it('should throw error for non-existent directory', async () => {
      await expect(scanMarkdownFiles('/non-existent')).rejects.toThrow('Source directory does not exist')
    })
  })

  describe('createOutputDirectory', () => {
    it('should create new output directory', async () => {
      await createOutputDirectory(outputDir)
      const stats = await fs.stat(outputDir)
      expect(stats.isDirectory()).toBe(true)
    })

    it('should throw error if directory exists and overwrite is false', async () => {
      await fs.mkdir(outputDir, { recursive: true })
      await expect(createOutputDirectory(outputDir, false)).rejects.toThrow('Output directory already exists')
    })

    it('should clear directory if overwrite is true', async () => {
      await fs.mkdir(outputDir, { recursive: true })
      await fs.writeFile(path.join(outputDir, 'existing.txt'), 'test')
      
      await createOutputDirectory(outputDir, true)
      
      const files = await fs.readdir(outputDir)
      expect(files).toHaveLength(0)
    })
  })

  describe('writeMarkdownFile', () => {
    it('should write file and create directory structure', async () => {
      await createOutputDirectory(outputDir)
      await writeMarkdownFile(outputDir, 'subfolder/test.md', '# Test Content')
      
      const content = await fs.readFile(path.join(outputDir, 'subfolder', 'test.md'), 'utf-8')
      expect(content).toBe('# Test Content')
    })
  })

  describe('generateDefaultOutputDir', () => {
    it('should generate default output directory name', () => {
      const result = generateDefaultOutputDir('/path/to/source')
      expect(result).toBe('source-base64')
    })
  })

  describe('path utilities', () => {
    it('should resolve absolute path correctly', () => {
      const result = resolveAbsolutePath('/base', 'relative/path')
      expect(result).toBe(path.resolve('/base/relative/path'))
    })

    it('should calculate relative path correctly', () => {
      const result = calculateRelativePath('/base', '/base/sub/file.txt')
      expect(result).toBe('sub/file.txt')
    })
  })
})