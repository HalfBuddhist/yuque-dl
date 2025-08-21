import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { promises as fs } from 'fs'
import * as path from 'path'
import { MarkdownImageConverter } from '../../src/convert/converter'
import { convertImageToBase64 } from '../../src/convert/imageUtils'
import { extractImageReferences, convertMarkdownImages } from '../../src/convert/markdownProcessor'

describe('Convert Edge Cases', () => {
  let tempDir: string
  let sourceDir: string
  let outputDir: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(__dirname, 'temp-edge-'))
    sourceDir = path.join(tempDir, 'source')
    outputDir = path.join(tempDir, 'output')
    
    await fs.mkdir(sourceDir, { recursive: true })
  })

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true })
    } catch (error) {
      // Ignore cleanup errors
    }
  })

  describe('File System Edge Cases', () => {
    it('should handle files with special characters in names', async () => {
      const specialFiles = [
        'file with spaces.md',
        'file-with-dashes.md',
        'file_with_underscores.md',
        'file.with.dots.md',
        'file(with)parentheses.md'
      ]
      
      for (const filename of specialFiles) {
        await fs.writeFile(path.join(sourceDir, filename), `# ${filename}\n\nContent`)
      }
      
      const converter = new MarkdownImageConverter(sourceDir, outputDir)
      const result = await converter.convert()
      
      expect(result.totalFiles).toBe(specialFiles.length)
      expect(result.errors).toHaveLength(0)
      
      // Verify all files were created
      for (const filename of specialFiles) {
        const outputFile = path.join(outputDir, filename)
        const exists = await fs.access(outputFile).then(() => true).catch(() => false)
        expect(exists).toBe(true)
      }
    })

    it('should handle deeply nested directory structures', async () => {
      const deepPath = path.join(sourceDir, 'level1', 'level2', 'level3', 'level4')
      await fs.mkdir(deepPath, { recursive: true })
      
      await fs.writeFile(path.join(deepPath, 'deep.md'), '# Deep Document')
      
      const converter = new MarkdownImageConverter(sourceDir, outputDir)
      const result = await converter.convert()
      
      expect(result.totalFiles).toBe(1)
      expect(result.errors).toHaveLength(0)
      
      const outputFile = path.join(outputDir, 'level1', 'level2', 'level3', 'level4', 'deep.md')
      const exists = await fs.access(outputFile).then(() => true).catch(() => false)
      expect(exists).toBe(true)
    })

    it('should handle empty markdown files', async () => {
      await fs.writeFile(path.join(sourceDir, 'empty.md'), '')
      
      const converter = new MarkdownImageConverter(sourceDir, outputDir)
      const result = await converter.convert()
      
      expect(result.totalFiles).toBe(1)
      expect(result.errors).toHaveLength(0)
      
      const outputContent = await fs.readFile(path.join(outputDir, 'empty.md'), 'utf-8')
      expect(outputContent).toBe('')
    })

    it('should handle very large markdown files', async () => {
      // Create a large markdown file (1MB+)
      const largeContent = '# Large Document\n\n' + 'This is a large document. '.repeat(50000)
      await fs.writeFile(path.join(sourceDir, 'large.md'), largeContent)
      
      const converter = new MarkdownImageConverter(sourceDir, outputDir)
      const result = await converter.convert()
      
      expect(result.totalFiles).toBe(1)
      expect(result.errors).toHaveLength(0)
      
      const outputContent = await fs.readFile(path.join(outputDir, 'large.md'), 'utf-8')
      expect(outputContent).toBe(largeContent)
    })
  })

  describe('Image Processing Edge Cases', () => {
    it('should handle corrupted image files', async () => {
      // Create a corrupted image file (has .png extension but invalid content)
      await fs.writeFile(path.join(sourceDir, 'corrupted.png'), 'This is not a valid PNG file')
      
      const result = await convertImageToBase64(path.join(sourceDir, 'corrupted.png'))
      
      // The function will succeed in reading the file but create invalid base64 data
      // This is expected behavior - the function doesn't validate image content
      expect(result.success).toBe(true)
      expect(result.dataUri).toContain('data:image/png;base64,')
    })

    it('should handle zero-byte image files', async () => {
      // Create an empty image file
      await fs.writeFile(path.join(sourceDir, 'empty.png'), '')
      
      const result = await convertImageToBase64(path.join(sourceDir, 'empty.png'))
      
      // The function will succeed in reading the empty file
      expect(result.success).toBe(true)
      expect(result.dataUri).toBe('data:image/png;base64,')
    })

    it('should handle very large image files', async () => {
      // Create a large fake image file (1MB)
      const largeBuffer = Buffer.alloc(1024 * 1024, 0xFF)
      // Add PNG header to make it a valid PNG
      const pngHeader = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
      ])
      const largeImage = Buffer.concat([pngHeader, largeBuffer])
      await fs.writeFile(path.join(sourceDir, 'large.png'), largeImage)
      
      const result = await convertImageToBase64(path.join(sourceDir, 'large.png'))
      
      // Should succeed in converting the large file
      expect(result.success).toBe(true)
      expect(result.dataUri).toContain('data:image/png;base64,')
    })
  })

  describe('Markdown Processing Edge Cases', () => {
    it('should handle malformed markdown image syntax', async () => {
      const malformedContent = `
        # Test Document
        
        ![Incomplete image syntax
        ![Missing closing bracket](image.png
        ![Missing parentheses]
        ![](missing-path)
        ![]()
        ![Valid](./valid.png)
      `
      
      const references = extractImageReferences(malformedContent, '/test/path.md')
      
      // The regex will extract some malformed references too, but we expect at least the valid ones
      expect(references.length).toBeGreaterThanOrEqual(1)
      
      // Find the valid reference
      const validRef = references.find(ref => ref.imagePath === './valid.png')
      expect(validRef).toBeDefined()
      expect(validRef?.altText).toBe('Valid')
    })

    it('should handle images with complex paths', async () => {
      const complexContent = `
        ![Relative up](../../images/up.png)
        ![Relative down](./sub/down.png)
        ![Absolute](/absolute/path.png)
        ![With query](./image.png?v=123&size=large)
        ![With anchor](./image.png#section)
        ![With both](./image.png?v=1#top)
      `
      
      const references = extractImageReferences(complexContent, '/test/path.md')
      
      expect(references).toHaveLength(6)
      expect(references[0].imagePath).toBe('../../images/up.png')
      expect(references[3].imagePath).toBe('./image.png?v=123&size=large')
      expect(references[4].imagePath).toBe('./image.png#section')
      expect(references[5].imagePath).toBe('./image.png?v=1#top')
    })

    it('should handle markdown with mixed content types', async () => {
      const mixedContent = `
        # Document with Mixed Content
        
        Regular text paragraph.
        
        ![Image 1](./img1.png)
        
        \`\`\`javascript
        // Code block with fake image syntax
        const img = "![Not an image](./fake.png)";
        \`\`\`
        
        > Blockquote with ![real image](./real.png) inside
        
        | Table | Header |
        |-------|--------|
        | ![Table image](./table.png) | Cell |
        
        - List item with ![list image](./list.png)
        - Regular list item
        
        [Link with ![embedded image](./embedded.png) text](http://example.com)
      `
      
      const references = extractImageReferences(mixedContent, '/test/path.md')
      
      // Should extract all real image references, including those in blockquotes, tables, and lists
      expect(references.length).toBeGreaterThan(0)
      const imagePaths = references.map(ref => ref.imagePath)
      expect(imagePaths).toContain('./img1.png')
      expect(imagePaths).toContain('./real.png')
      expect(imagePaths).toContain('./table.png')
      expect(imagePaths).toContain('./list.png')
      expect(imagePaths).toContain('./embedded.png')
    })

    it('should handle unicode and special characters in image paths', async () => {
      const unicodeContent = `
        ![Chinese](./图片/测试.png)
        ![Japanese](./画像/テスト.jpg)
        ![Emoji](./😀/image.png)
        ![Spaces](./path with spaces/image.png)
        ![Special](./special-chars_123/image.png)
      `
      
      const references = extractImageReferences(unicodeContent, '/test/path.md')
      
      expect(references).toHaveLength(5)
      expect(references[0].imagePath).toBe('./图片/测试.png')
      expect(references[1].imagePath).toBe('./画像/テスト.jpg')
      expect(references[2].imagePath).toBe('./😀/image.png')
    })
  })

  describe('Integration Edge Cases', () => {
    it('should handle conversion with mixed success and failure scenarios', async () => {
      // Create test structure
      await fs.mkdir(path.join(sourceDir, 'images'), { recursive: true })
      
      // Create valid image
      const validPng = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
        0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0x00, 0x00, 0x00,
        0x01, 0x00, 0x01, 0x21, 0x18, 0xE6, 0x27, 0x00, 0x00, 0x00, 0x00, 0x49,
        0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
      ])
      await fs.writeFile(path.join(sourceDir, 'images', 'valid.png'), validPng)
      
      // Create invalid image
      await fs.writeFile(path.join(sourceDir, 'images', 'invalid.png'), 'not an image')
      
      // Create markdown with mixed references
      const markdownContent = `
        # Mixed Scenarios
        
        ![Valid local](./images/valid.png)
        ![Invalid local](./images/invalid.png)
        ![Missing local](./images/missing.png)
        ![Remote](https://example.com/remote.png)
        ![Unsupported](./document.pdf)
      `
      
      await fs.writeFile(path.join(sourceDir, 'mixed.md'), markdownContent)
      
      const result = await convertMarkdownImages(markdownContent, path.join(sourceDir, 'mixed.md'))
      
      expect(result.convertedImages).toBeGreaterThanOrEqual(1) // At least valid.png should convert
      expect(result.skippedImages).toBeGreaterThanOrEqual(1) // At least remote images should be skipped
      expect(result.warnings.length).toBeGreaterThan(0)
      
      // Check that valid image was converted
      expect(result.content).toContain('data:image/png;base64,')
      // Check that remote images remain unchanged
      expect(result.content).toContain('https://example.com/remote.png')
      // Check that missing images remain unchanged
      expect(result.content).toContain('./images/missing.png')
    })

    it('should handle concurrent processing of multiple files', async () => {
      // Create multiple files with images
      const fileCount = 10
      const promises = []
      
      for (let i = 0; i < fileCount; i++) {
        const content = `# Document ${i}\n\n![Remote](https://example.com/image${i}.png)`
        promises.push(fs.writeFile(path.join(sourceDir, `doc${i}.md`), content))
      }
      
      await Promise.all(promises)
      
      const converter = new MarkdownImageConverter(sourceDir, outputDir)
      const result = await converter.convert()
      
      expect(result.totalFiles).toBe(fileCount)
      expect(result.skippedImages).toBe(fileCount) // All remote images
      expect(result.errors).toHaveLength(0)
    })
  })
})