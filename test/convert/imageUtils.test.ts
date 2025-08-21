import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { writeFile, mkdir, rm } from 'fs/promises'
import { join } from 'path'
import {
  MIME_TYPES,
  SUPPORTED_IMAGE_EXTENSIONS,
  isImageFile,
  getImageMimeType,
  generateDataUri,
  generateDataUriFromPath,
  fileExists,
  convertImageToBase64,
  type ImageConversionResult
} from '../../src/convert/imageUtils'

const TEST_DIR = join(__dirname, 'temp-test-images')

describe('imageUtils', () => {
  beforeAll(async () => {
    // Create test directory
    await mkdir(TEST_DIR, { recursive: true })
    
    // Create test image files (simple 1x1 pixel images)
    const testImages = {
      'test.png': Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
        0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0x00, 0x00, 0x00,
        0x01, 0x00, 0x01, 0x21, 0x18, 0xE6, 0x27, 0x00, 0x00, 0x00, 0x00, 0x49,
        0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
      ]),
      'test.jpg': Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
        0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
        0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
        0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
        0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
        0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
        0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x11, 0x08, 0x00, 0x01,
        0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
        0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0xFF, 0xC4,
        0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xDA, 0x00, 0x0C,
        0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3F, 0x00, 0xB2, 0xC0,
        0x07, 0xFF, 0xD9
      ]),
      'test.gif': Buffer.from([
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00,
        0x00, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0xFF, 0x21, 0xF9, 0x04, 0x01, 0x00,
        0x00, 0x00, 0x00, 0x2C, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
        0x00, 0x02, 0x02, 0x04, 0x01, 0x00, 0x3B
      ])
    }

    for (const [filename, buffer] of Object.entries(testImages)) {
      await writeFile(join(TEST_DIR, filename), buffer)
    }
  })

  afterAll(async () => {
    // Clean up test directory
    await rm(TEST_DIR, { recursive: true, force: true })
  })

  describe('MIME_TYPES constant', () => {
    it('should contain expected image MIME types', () => {
      expect(MIME_TYPES['.jpg']).toBe('image/jpeg')
      expect(MIME_TYPES['.jpeg']).toBe('image/jpeg')
      expect(MIME_TYPES['.png']).toBe('image/png')
      expect(MIME_TYPES['.gif']).toBe('image/gif')
      expect(MIME_TYPES['.svg']).toBe('image/svg+xml')
      expect(MIME_TYPES['.webp']).toBe('image/webp')
      expect(MIME_TYPES['.bmp']).toBe('image/bmp')
    })
  })

  describe('SUPPORTED_IMAGE_EXTENSIONS constant', () => {
    it('should contain all MIME_TYPES keys', () => {
      const expectedExtensions = Object.keys(MIME_TYPES)
      expect(SUPPORTED_IMAGE_EXTENSIONS).toEqual(expectedExtensions)
    })
  })

  describe('isImageFile', () => {
    it('should return true for supported image extensions', () => {
      expect(isImageFile('test.jpg')).toBe(true)
      expect(isImageFile('test.jpeg')).toBe(true)
      expect(isImageFile('test.png')).toBe(true)
      expect(isImageFile('test.gif')).toBe(true)
      expect(isImageFile('test.svg')).toBe(true)
      expect(isImageFile('test.webp')).toBe(true)
      expect(isImageFile('test.bmp')).toBe(true)
    })

    it('should return false for unsupported extensions', () => {
      expect(isImageFile('test.txt')).toBe(false)
      expect(isImageFile('test.pdf')).toBe(false)
      expect(isImageFile('test.doc')).toBe(false)
      expect(isImageFile('test')).toBe(false)
    })

    it('should be case insensitive', () => {
      expect(isImageFile('test.JPG')).toBe(true)
      expect(isImageFile('test.PNG')).toBe(true)
      expect(isImageFile('test.GIF')).toBe(true)
    })

    it('should handle paths with directories', () => {
      expect(isImageFile('/path/to/image.jpg')).toBe(true)
      expect(isImageFile('relative/path/image.png')).toBe(true)
    })
  })

  describe('getImageMimeType', () => {
    it('should return correct MIME type for supported extensions', () => {
      expect(getImageMimeType('test.jpg')).toBe('image/jpeg')
      expect(getImageMimeType('test.png')).toBe('image/png')
      expect(getImageMimeType('test.gif')).toBe('image/gif')
    })

    it('should return null for unsupported extensions', () => {
      expect(getImageMimeType('test.txt')).toBeNull()
      expect(getImageMimeType('test.pdf')).toBeNull()
    })

    it('should be case insensitive', () => {
      expect(getImageMimeType('test.JPG')).toBe('image/jpeg')
      expect(getImageMimeType('test.PNG')).toBe('image/png')
    })
  })

  describe('generateDataUri', () => {
    it('should generate correct data URI format', () => {
      const buffer = Buffer.from('test data')
      const mimeType = 'image/png'
      const result = generateDataUri(buffer, mimeType)
      
      expect(result).toMatch(/^data:image\/png;base64,/)
      expect(result).toBe(`data:${mimeType};base64,${buffer.toString('base64')}`)
    })

    it('should handle different MIME types', () => {
      const buffer = Buffer.from('test')
      
      expect(generateDataUri(buffer, 'image/jpeg')).toMatch(/^data:image\/jpeg;base64,/)
      expect(generateDataUri(buffer, 'image/gif')).toMatch(/^data:image\/gif;base64,/)
    })
  })

  describe('generateDataUriFromPath', () => {
    it('should generate data URI for supported image formats', () => {
      const buffer = Buffer.from('test data')
      
      const pngResult = generateDataUriFromPath(buffer, 'test.png')
      expect(pngResult).toMatch(/^data:image\/png;base64,/)
      
      const jpgResult = generateDataUriFromPath(buffer, 'test.jpg')
      expect(jpgResult).toMatch(/^data:image\/jpeg;base64,/)
    })

    it('should return null for unsupported formats', () => {
      const buffer = Buffer.from('test data')
      
      expect(generateDataUriFromPath(buffer, 'test.txt')).toBeNull()
      expect(generateDataUriFromPath(buffer, 'test.pdf')).toBeNull()
    })
  })

  describe('fileExists', () => {
    it('should return true for existing files', async () => {
      const existingFile = join(TEST_DIR, 'test.png')
      expect(await fileExists(existingFile)).toBe(true)
    })

    it('should return false for non-existing files', async () => {
      const nonExistingFile = join(TEST_DIR, 'nonexistent.png')
      expect(await fileExists(nonExistingFile)).toBe(false)
    })
  })

  describe('convertImageToBase64', () => {
    it('should successfully convert existing image files', async () => {
      const imagePath = join(TEST_DIR, 'test.png')
      const result = await convertImageToBase64(imagePath)
      
      expect(result.success).toBe(true)
      expect(result.dataUri).toMatch(/^data:image\/png;base64,/)
      expect(result.error).toBeUndefined()
    })

    it('should handle different image formats', async () => {
      const pngPath = join(TEST_DIR, 'test.png')
      const jpgPath = join(TEST_DIR, 'test.jpg')
      const gifPath = join(TEST_DIR, 'test.gif')
      
      const pngResult = await convertImageToBase64(pngPath)
      const jpgResult = await convertImageToBase64(jpgPath)
      const gifResult = await convertImageToBase64(gifPath)
      
      expect(pngResult.success).toBe(true)
      expect(pngResult.dataUri).toMatch(/^data:image\/png;base64,/)
      
      expect(jpgResult.success).toBe(true)
      expect(jpgResult.dataUri).toMatch(/^data:image\/jpeg;base64,/)
      
      expect(gifResult.success).toBe(true)
      expect(gifResult.dataUri).toMatch(/^data:image\/gif;base64,/)
    })

    it('should fail gracefully for non-existing files', async () => {
      const nonExistingPath = join(TEST_DIR, 'nonexistent.png')
      const result = await convertImageToBase64(nonExistingPath)
      
      expect(result.success).toBe(false)
      expect(result.dataUri).toBeUndefined()
      expect(result.error).toContain('not found or not readable')
    })

    it('should fail gracefully for unsupported formats', async () => {
      // Create a text file
      const textFilePath = join(TEST_DIR, 'test.txt')
      await writeFile(textFilePath, 'test content')
      
      const result = await convertImageToBase64(textFilePath)
      
      expect(result.success).toBe(false)
      expect(result.dataUri).toBeUndefined()
      expect(result.error).toContain('Unsupported image format')
    })
  })
})