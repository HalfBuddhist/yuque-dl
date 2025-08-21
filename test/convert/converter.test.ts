import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { promises as fs } from 'fs'
import * as path from 'path'
import { MarkdownImageConverter } from '../../src/convert/converter'
import { IConvertOptions } from '../../src/types'

describe('MarkdownImageConverter', () => {
  let tempDir: string
  let sourceDir: string
  let outputDir: string

  beforeEach(async () => {
    // Create temporary directory for testing
    tempDir = await fs.mkdtemp(path.join(__dirname, 'temp-converter-'))
    sourceDir = path.join(tempDir, 'source')
    outputDir = path.join(tempDir, 'output')
    
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

  describe('constructor', () => {
    it('should create converter with default options', () => {
      const converter = new MarkdownImageConverter(sourceDir)
      
      expect(converter.getSourceDir()).toBe(path.resolve(sourceDir))
      expect(converter.getOptions()).toEqual({ overwrite: false })
    })

    it('should create converter with custom output directory', () => {
      const converter = new MarkdownImageConverter(sourceDir, outputDir)
      
      expect(converter.getSourceDir()).toBe(path.resolve(sourceDir))
      expect(converter.getOutputDir()).toBe(path.resolve(outputDir))
    })

    it('should create converter with custom options', () => {
      const options: IConvertOptions = { overwrite: true }
      const converter = new MarkdownImageConverter(sourceDir, outputDir, options)
      
      expect(converter.getOptions()).toEqual(options)
    })
  })

  describe('convert', () => {
    it('should handle empty directory', async () => {
      const converter = new MarkdownImageConverter(sourceDir, outputDir)
      const result = await converter.convert()
      
      expect(result.totalFiles).toBe(0)
      expect(result.convertedImages).toBe(0)
      expect(result.skippedImages).toBe(0)
      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0]).toContain('No markdown files found')
      expect(result.errors).toHaveLength(0)
    })

    it('should process markdown files without images', async () => {
      // Create a markdown file without images
      const markdownContent = '# Test Document\n\nThis is a test document without images.'
      await fs.writeFile(path.join(sourceDir, 'test.md'), markdownContent)
      
      const converter = new MarkdownImageConverter(sourceDir, outputDir)
      const result = await converter.convert()
      
      expect(result.totalFiles).toBe(1)
      expect(result.convertedImages).toBe(0)
      expect(result.skippedImages).toBe(0)
      expect(result.errors).toHaveLength(0)
      
      // Check that output file was created
      const outputFile = path.join(outputDir, 'test.md')
      const outputContent = await fs.readFile(outputFile, 'utf-8')
      expect(outputContent).toBe(markdownContent)
    })

    it('should handle non-existent source directory', async () => {
      const nonExistentDir = path.join(tempDir, 'non-existent')
      const converter = new MarkdownImageConverter(nonExistentDir, outputDir)
      const result = await converter.convert()
      
      expect(result.totalFiles).toBe(0)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('Failed to scan markdown files')
    })

    it('should process markdown files with remote images', async () => {
      // Create a markdown file with remote images
      const markdownContent = `# Test Document

This document has remote images:

![Remote Image](https://example.com/image.png)
![Another Remote](http://example.com/another.jpg)

And some text.`
      
      await fs.writeFile(path.join(sourceDir, 'remote.md'), markdownContent)
      
      const converter = new MarkdownImageConverter(sourceDir, outputDir)
      const result = await converter.convert()
      
      expect(result.totalFiles).toBe(1)
      expect(result.convertedImages).toBe(0)
      expect(result.skippedImages).toBe(2)
      expect(result.warnings.length).toBeGreaterThanOrEqual(2)
      
      // Check that output file was created with original content
      const outputFile = path.join(outputDir, 'remote.md')
      const outputContent = await fs.readFile(outputFile, 'utf-8')
      expect(outputContent).toBe(markdownContent)
    })

    it('should process multiple markdown files', async () => {
      // Create multiple markdown files
      const file1Content = '# Document 1\n\nFirst document.'
      const file2Content = '# Document 2\n\nSecond document.'
      
      await fs.writeFile(path.join(sourceDir, 'doc1.md'), file1Content)
      await fs.writeFile(path.join(sourceDir, 'doc2.md'), file2Content)
      
      const converter = new MarkdownImageConverter(sourceDir, outputDir)
      const result = await converter.convert()
      
      expect(result.totalFiles).toBe(2)
      expect(result.convertedImages).toBe(0)
      expect(result.skippedImages).toBe(0)
      expect(result.errors).toHaveLength(0)
      
      // Check that both output files were created
      const output1 = await fs.readFile(path.join(outputDir, 'doc1.md'), 'utf-8')
      const output2 = await fs.readFile(path.join(outputDir, 'doc2.md'), 'utf-8')
      expect(output1).toBe(file1Content)
      expect(output2).toBe(file2Content)
    })

    it('should handle nested directory structure', async () => {
      // Create nested directory structure
      const subDir = path.join(sourceDir, 'subdir')
      await fs.mkdir(subDir, { recursive: true })
      
      const rootContent = '# Root Document'
      const subContent = '# Sub Document'
      
      await fs.writeFile(path.join(sourceDir, 'root.md'), rootContent)
      await fs.writeFile(path.join(subDir, 'sub.md'), subContent)
      
      const converter = new MarkdownImageConverter(sourceDir, outputDir)
      const result = await converter.convert()
      
      expect(result.totalFiles).toBe(2)
      expect(result.errors).toHaveLength(0)
      
      // Check that nested structure is preserved
      const rootOutput = await fs.readFile(path.join(outputDir, 'root.md'), 'utf-8')
      const subOutput = await fs.readFile(path.join(outputDir, 'subdir', 'sub.md'), 'utf-8')
      expect(rootOutput).toBe(rootContent)
      expect(subOutput).toBe(subContent)
    })

    it('should handle overwrite option correctly', async () => {
      // Create initial output directory with existing file
      await fs.mkdir(outputDir, { recursive: true })
      await fs.writeFile(path.join(outputDir, 'existing.txt'), 'existing content')
      
      // Create source markdown file
      await fs.writeFile(path.join(sourceDir, 'test.md'), '# Test')
      
      // Test without overwrite (should fail)
      const converter1 = new MarkdownImageConverter(sourceDir, outputDir, { overwrite: false })
      const result1 = await converter1.convert()
      expect(result1.errors).toHaveLength(1)
      expect(result1.errors[0]).toContain('already exists')
      
      // Test with overwrite (should succeed)
      const converter2 = new MarkdownImageConverter(sourceDir, outputDir, { overwrite: true })
      const result2 = await converter2.convert()
      expect(result2.totalFiles).toBe(1)
      expect(result2.errors).toHaveLength(0)
    })
  })

  describe('displayDetailedResults', () => {
    it('should not output in test environment', () => {
      const converter = new MarkdownImageConverter(sourceDir, outputDir)
      const result = {
        totalFiles: 1,
        convertedImages: 2,
        skippedImages: 1,
        warnings: ['warning 1'],
        errors: ['error 1']
      }
      
      // Should not throw and should complete silently in test environment
      expect(() => converter.displayDetailedResults(result)).not.toThrow()
    })
  })

  describe('convertWithDetailedOutput', () => {
    it('should return same result as convert method', async () => {
      await fs.writeFile(path.join(sourceDir, 'test.md'), '# Test')
      
      const converter = new MarkdownImageConverter(sourceDir, outputDir)
      const result1 = await converter.convert()
      
      // Create a new converter instance to avoid output directory conflict
      const converter2 = new MarkdownImageConverter(sourceDir, path.join(tempDir, 'output2'))
      const result2 = await converter2.convertWithDetailedOutput()
      
      expect(result2.totalFiles).toBe(result1.totalFiles)
      expect(result2.convertedImages).toBe(result1.convertedImages)
      expect(result2.skippedImages).toBe(result1.skippedImages)
      expect(result2.warnings).toEqual(result1.warnings)
      expect(result2.errors).toEqual(result1.errors)
    })
  })
})