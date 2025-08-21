import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { promises as fs } from 'fs'
import * as path from 'path'
import { 
  extractImageReferences, 
  isRemoteImage, 
  cleanImagePath, 
  isSupportedImageFormat,
  convertMarkdownImages
} from '../../src/convert/markdownProcessor'

describe('markdownProcessor', () => {
  describe('isRemoteImage', () => {
    it('should identify remote HTTP images', () => {
      expect(isRemoteImage('http://example.com/image.png')).toBe(true)
      expect(isRemoteImage('https://example.com/image.jpg')).toBe(true)
    })

    it('should identify local images', () => {
      expect(isRemoteImage('./local/image.png')).toBe(false)
      expect(isRemoteImage('/absolute/path/image.jpg')).toBe(false)
      expect(isRemoteImage('relative/image.gif')).toBe(false)
    })
  })

  describe('cleanImagePath', () => {
    it('should remove query parameters', () => {
      expect(cleanImagePath('image.png?v=123')).toBe('image.png')
    })

    it('should remove anchors', () => {
      expect(cleanImagePath('image.png#section')).toBe('image.png')
    })

    it('should remove both query and anchor', () => {
      expect(cleanImagePath('image.png?v=123#section')).toBe('image.png')
    })

    it('should leave clean paths unchanged', () => {
      expect(cleanImagePath('image.png')).toBe('image.png')
    })
  })

  describe('isSupportedImageFormat', () => {
    it('should support common image formats', () => {
      expect(isSupportedImageFormat('image.jpg')).toBe(true)
      expect(isSupportedImageFormat('image.jpeg')).toBe(true)
      expect(isSupportedImageFormat('image.png')).toBe(true)
      expect(isSupportedImageFormat('image.gif')).toBe(true)
      expect(isSupportedImageFormat('image.svg')).toBe(true)
      expect(isSupportedImageFormat('image.webp')).toBe(true)
      expect(isSupportedImageFormat('image.bmp')).toBe(true)
    })

    it('should reject unsupported formats', () => {
      expect(isSupportedImageFormat('document.pdf')).toBe(false)
      expect(isSupportedImageFormat('video.mp4')).toBe(false)
      expect(isSupportedImageFormat('text.txt')).toBe(false)
    })

    it('should be case insensitive', () => {
      expect(isSupportedImageFormat('IMAGE.PNG')).toBe(true)
      expect(isSupportedImageFormat('Image.Jpg')).toBe(true)
    })
  })

  describe('extractImageReferences', () => {
    const testMarkdownPath = '/test/path/document.md'

    it('should extract basic image references', () => {
      const content = '![Alt text](./images/test.png)'
      const references = extractImageReferences(content, testMarkdownPath)
      
      expect(references).toHaveLength(1)
      expect(references[0].originalMarkdown).toBe('![Alt text](./images/test.png)')
      expect(references[0].altText).toBe('Alt text')
      expect(references[0].imagePath).toBe('./images/test.png')
      expect(references[0].absoluteImagePath).toBe(path.resolve('/test/path', './images/test.png'))
    })

    it('should extract multiple image references', () => {
      const content = `
        ![First](./img1.png)
        Some text here
        ![Second](../img2.jpg)
      `
      const references = extractImageReferences(content, testMarkdownPath)
      
      expect(references).toHaveLength(2)
      expect(references[0].altText).toBe('First')
      expect(references[1].altText).toBe('Second')
    })

    it('should skip remote images', () => {
      const content = `
        ![Local](./local.png)
        ![Remote](https://example.com/remote.jpg)
        ![Another Local](./another.gif)
      `
      const references = extractImageReferences(content, testMarkdownPath)
      
      expect(references).toHaveLength(2)
      expect(references[0].imagePath).toBe('./local.png')
      expect(references[1].imagePath).toBe('./another.gif')
    })

    it('should handle images without alt text', () => {
      const content = '![](./image.png)'
      const references = extractImageReferences(content, testMarkdownPath)
      
      expect(references).toHaveLength(1)
      expect(references[0].altText).toBe('')
    })

    it('should handle absolute paths', () => {
      const content = '![Test](/absolute/path/image.png)'
      const references = extractImageReferences(content, testMarkdownPath)
      
      expect(references).toHaveLength(1)
      expect(references[0].absoluteImagePath).toBe('/absolute/path/image.png')
    })
  })

  describe('convertMarkdownImages', () => {
    let tempDir: string
    let testImagePath: string
    let testMarkdownPath: string

    beforeEach(async () => {
      // Create temporary directory and test files
      tempDir = await fs.mkdtemp(path.join(__dirname, 'temp-'))
      testImagePath = path.join(tempDir, 'test.png')
      testMarkdownPath = path.join(tempDir, 'test.md')
      
      // Create a simple PNG file (1x1 pixel transparent PNG)
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
        0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
        0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
      ])
      await fs.writeFile(testImagePath, pngBuffer)
    })

    afterEach(async () => {
      // Clean up temporary files
      try {
        await fs.rm(tempDir, { recursive: true, force: true })
      } catch (error) {
        // Ignore cleanup errors
      }
    })

    it('should convert local images to base64', async () => {
      const content = `![Test image](./test.png)`
      const result = await convertMarkdownImages(content, testMarkdownPath)
      
      expect(result.convertedImages).toBe(1)
      expect(result.skippedImages).toBe(0)
      expect(result.errors).toHaveLength(0)
      expect(result.content).toContain('data:image/png;base64,')
      expect(result.content).toContain('![Test image](data:image/png;base64,')
    })

    it('should skip remote images', async () => {
      const content = `![Remote](https://example.com/image.png)`
      const result = await convertMarkdownImages(content, testMarkdownPath)
      
      expect(result.convertedImages).toBe(0)
      expect(result.skippedImages).toBe(1)
      expect(result.warnings).toContain('Skipped remote image: https://example.com/image.png')
      expect(result.content).toBe(content) // Content should remain unchanged
    })

    it('should handle missing images gracefully', async () => {
      const content = `![Missing](./missing.png)`
      const result = await convertMarkdownImages(content, testMarkdownPath)
      
      expect(result.convertedImages).toBe(0)
      expect(result.skippedImages).toBe(1)
      expect(result.warnings.some(w => w.includes('Failed to convert image'))).toBe(true)
      expect(result.content).toBe(content) // Content should remain unchanged
    })

    it('should handle mixed scenarios', async () => {
      const content = `
        ![Local](./test.png)
        ![Remote](https://example.com/remote.jpg)
        ![Missing](./missing.png)
      `
      const result = await convertMarkdownImages(content, testMarkdownPath)
      
      expect(result.convertedImages).toBe(1)
      expect(result.skippedImages).toBe(2)
      expect(result.warnings).toHaveLength(2)
    })
  })
})