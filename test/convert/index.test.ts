import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { promises as fs } from 'fs'
import * as path from 'path'
import { convertMarkdownImages } from '../../src/convert/index'
import type { IConvertOptions } from '../../src/types'

// Mock ora spinner
vi.mock('ora', () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
    text: ''
  }))
}))

// Mock logger to avoid console output during tests
vi.mock('../../src/utils', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}))

describe('convert/index', () => {
  let tempDir: string
  let sourceDir: string

  beforeEach(async () => {
    // Create temporary directory for testing
    tempDir = await fs.mkdtemp(path.join(__dirname, 'temp-index-'))
    sourceDir = path.join(tempDir, 'source')
    
    // Create source directory
    await fs.mkdir(sourceDir, { recursive: true })
  })

  afterEach(async () => {
    // Clean up temporary files
    try {
      await fs.rm(tempDir, { recursive: true, force: true })
    } catch (error) {
      // Ignore cleanup errors
    }
  })

  describe('convertMarkdownImages', () => {
    it('should successfully convert markdown files', async () => {
      // Create test markdown file
      const markdownContent = '# Test Document\n\nThis is a test document.'
      await fs.writeFile(path.join(sourceDir, 'test.md'), markdownContent)
      
      const options: IConvertOptions = { overwrite: false }
      
      // Should not throw
      await expect(convertMarkdownImages(sourceDir, options)).resolves.toBeUndefined()
      
      // Check that output directory was created
      const outputDir = sourceDir + '-base64'
      const outputExists = await fs.access(outputDir).then(() => true).catch(() => false)
      expect(outputExists).toBe(true)
      
      // Check that output file was created
      const outputFile = path.join(outputDir, 'test.md')
      const outputContent = await fs.readFile(outputFile, 'utf-8')
      expect(outputContent).toBe(markdownContent)
    })

    it('should use custom output directory when specified', async () => {
      // Create test markdown file
      await fs.writeFile(path.join(sourceDir, 'test.md'), '# Test')
      
      const customOutputDir = path.join(tempDir, 'custom-output')
      const options: IConvertOptions = { 
        output: customOutputDir,
        overwrite: false 
      }
      
      await convertMarkdownImages(sourceDir, options)
      
      // Check that custom output directory was created
      const outputExists = await fs.access(customOutputDir).then(() => true).catch(() => false)
      expect(outputExists).toBe(true)
      
      // Check that file was created in custom directory
      const outputFile = path.join(customOutputDir, 'test.md')
      const outputExists2 = await fs.access(outputFile).then(() => true).catch(() => false)
      expect(outputExists2).toBe(true)
    })

    it('should throw error for non-existent source directory', async () => {
      const nonExistentDir = path.join(tempDir, 'non-existent')
      const options: IConvertOptions = { overwrite: false }
      
      await expect(convertMarkdownImages(nonExistentDir, options))
        .rejects.toThrow('源目录不存在')
    })

    it('should throw error when output directory exists and overwrite is false', async () => {
      // Create test markdown file
      await fs.writeFile(path.join(sourceDir, 'test.md'), '# Test')
      
      // Create output directory
      const outputDir = sourceDir + '-base64'
      await fs.mkdir(outputDir, { recursive: true })
      
      const options: IConvertOptions = { overwrite: false }
      
      await expect(convertMarkdownImages(sourceDir, options))
        .rejects.toThrow('输出目录已存在')
    })

    it('should succeed when output directory exists and overwrite is true', async () => {
      // Create test markdown file
      await fs.writeFile(path.join(sourceDir, 'test.md'), '# Test')
      
      // Create output directory with existing file
      const outputDir = sourceDir + '-base64'
      await fs.mkdir(outputDir, { recursive: true })
      await fs.writeFile(path.join(outputDir, 'existing.txt'), 'existing content')
      
      const options: IConvertOptions = { overwrite: true }
      
      // Should not throw
      await expect(convertMarkdownImages(sourceDir, options)).resolves.toBeUndefined()
      
      // Check that output file was created
      const outputFile = path.join(outputDir, 'test.md')
      const outputExists = await fs.access(outputFile).then(() => true).catch(() => false)
      expect(outputExists).toBe(true)
    })

    it('should handle empty source directory', async () => {
      const options: IConvertOptions = { overwrite: false }
      
      // Should not throw even with empty directory
      await expect(convertMarkdownImages(sourceDir, options)).resolves.toBeUndefined()
    })

    it('should process multiple markdown files', async () => {
      // Create multiple test files
      await fs.writeFile(path.join(sourceDir, 'doc1.md'), '# Document 1')
      await fs.writeFile(path.join(sourceDir, 'doc2.md'), '# Document 2')
      
      // Create subdirectory with file
      const subDir = path.join(sourceDir, 'subdir')
      await fs.mkdir(subDir, { recursive: true })
      await fs.writeFile(path.join(subDir, 'doc3.md'), '# Document 3')
      
      const options: IConvertOptions = { overwrite: false }
      
      await convertMarkdownImages(sourceDir, options)
      
      // Check that all files were processed
      const outputDir = sourceDir + '-base64'
      const doc1Exists = await fs.access(path.join(outputDir, 'doc1.md')).then(() => true).catch(() => false)
      const doc2Exists = await fs.access(path.join(outputDir, 'doc2.md')).then(() => true).catch(() => false)
      const doc3Exists = await fs.access(path.join(outputDir, 'subdir', 'doc3.md')).then(() => true).catch(() => false)
      
      expect(doc1Exists).toBe(true)
      expect(doc2Exists).toBe(true)
      expect(doc3Exists).toBe(true)
    })

    it('should handle conversion with images', async () => {
      // Create test image file (simple PNG)
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
        0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0x00, 0x00, 0x00,
        0x01, 0x00, 0x01, 0x21, 0x18, 0xE6, 0x27, 0x00, 0x00, 0x00, 0x00, 0x49,
        0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
      ])
      await fs.writeFile(path.join(sourceDir, 'test.png'), pngBuffer)
      
      // Create markdown file with image reference
      const markdownContent = '# Test\n\n![Test Image](./test.png)'
      await fs.writeFile(path.join(sourceDir, 'test.md'), markdownContent)
      
      const options: IConvertOptions = { overwrite: false }
      
      await convertMarkdownImages(sourceDir, options)
      
      // Check that output file contains base64 data
      const outputDir = sourceDir + '-base64'
      const outputFile = path.join(outputDir, 'test.md')
      const outputContent = await fs.readFile(outputFile, 'utf-8')
      
      expect(outputContent).toContain('data:image/png;base64,')
    })
  })
})