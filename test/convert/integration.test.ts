import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { promises as fs } from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { TestTools } from '../helpers/TestTools'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const cliPath = path.join(__dirname, '../../bin/index.js')

describe('Convert CLI Integration Tests', () => {
  let testTools: TestTools

  beforeEach(() => {
    testTools = new TestTools()
  })

  afterEach(() => {
    testTools.cleanup()
  })

  // Helper function to check stderr for actual errors (not spinner text)
  const hasActualError = (stderr: string): boolean => {
    return stderr.includes('Error:') || stderr.includes('Failed:') || stderr.includes('Exception:')
  }

  it('should successfully convert markdown files with images', async () => {
    // Create test directory structure
    const sourceDir = path.join(testTools.cwd, 'test-source')
    const imagesDir = path.join(sourceDir, 'images')
    await fs.mkdir(sourceDir, { recursive: true })
    await fs.mkdir(imagesDir, { recursive: true })

    // Create test image (simple PNG)
    const pngBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
      0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0x00, 0x00, 0x00,
      0x01, 0x00, 0x01, 0x21, 0x18, 0xE6, 0x27, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ])
    await fs.writeFile(path.join(imagesDir, 'test.png'), pngBuffer)

    // Create markdown file with image reference
    const markdownContent = `# Test Document

This is a test document with an image:

![Test Image](./images/test.png)

Some more content here.`

    await fs.writeFile(path.join(sourceDir, 'test.md'), markdownContent)

    // Run convert command
    const { stdout, stderr, exitCode } = await testTools.fork(cliPath, [
      'convert',
      'test-source'
    ])

    expect(exitCode).toBe(0)
    expect(hasActualError(stderr)).toBe(false)
    expect(stdout).toContain('转换完成')

    // Check that output directory was created
    const outputDir = path.join(testTools.cwd, 'test-source-base64')
    const outputExists = await fs.access(outputDir).then(() => true).catch(() => false)
    expect(outputExists).toBe(true)

    // Check that converted file exists and contains base64 data
    const outputFile = path.join(outputDir, 'test.md')
    const outputContent = await fs.readFile(outputFile, 'utf-8')
    expect(outputContent).toContain('data:image/png;base64,')
    expect(outputContent).not.toContain('./images/test.png')
  }, 30000)

  it('should handle custom output directory', async () => {
    // Create test structure
    const sourceDir = path.join(testTools.cwd, 'source')
    await fs.mkdir(sourceDir, { recursive: true })
    await fs.writeFile(path.join(sourceDir, 'doc.md'), '# Simple Document')

    // Run convert command with custom output
    const { stdout, exitCode } = await testTools.fork(cliPath, [
      'convert',
      'source',
      '-o',
      'custom-output'
    ])

    expect(exitCode).toBe(0)
    expect(stdout).toContain('转换完成')

    // Check that custom output directory was created
    const customOutput = path.join(testTools.cwd, 'custom-output')
    const outputExists = await fs.access(customOutput).then(() => true).catch(() => false)
    expect(outputExists).toBe(true)

    // Check that file was created in custom directory
    const outputFile = path.join(customOutput, 'doc.md')
    const fileExists = await fs.access(outputFile).then(() => true).catch(() => false)
    expect(fileExists).toBe(true)
  }, 30000)

  it('should handle non-existent source directory', async () => {
    const { stdout, exitCode } = await testTools.fork(cliPath, [
      'convert',
      'non-existent-directory'
    ])

    expect(exitCode).toBe(1)
    expect(stdout).toContain('源目录不存在')
  }, 30000)

  it('should display help for convert command', async () => {
    const { stdout, exitCode } = await testTools.fork(cliPath, [
      'convert',
      '--help'
    ])

    expect(exitCode).toBe(0)
    expect(stdout).toContain('convert <sourceDir>')
    expect(stdout).toContain('--output')
    expect(stdout).toContain('--overwrite')
  }, 30000)

  it('should handle overwrite option', async () => {
    // Create test structure
    const sourceDir = path.join(testTools.cwd, 'source')
    const outputDir = path.join(testTools.cwd, 'source-base64')
    await fs.mkdir(sourceDir, { recursive: true })
    await fs.mkdir(outputDir, { recursive: true })
    await fs.writeFile(path.join(sourceDir, 'doc.md'), '# Document')
    await fs.writeFile(path.join(outputDir, 'existing.txt'), 'existing content')

    // First run without overwrite should fail
    const { exitCode: exitCode1 } = await testTools.fork(cliPath, [
      'convert',
      'source'
    ])
    expect(exitCode1).toBe(1)

    // Second run with overwrite should succeed
    const { stdout, exitCode: exitCode2 } = await testTools.fork(cliPath, [
      'convert',
      'source',
      '--overwrite'
    ])

    expect(exitCode2).toBe(0)
    expect(stdout).toContain('转换完成')

    // Check that file was created
    const outputFile = path.join(outputDir, 'doc.md')
    const fileExists = await fs.access(outputFile).then(() => true).catch(() => false)
    expect(fileExists).toBe(true)
  }, 30000)

  it('should preserve directory structure', async () => {
    // Create nested directory structure
    const sourceDir = path.join(testTools.cwd, 'nested-source')
    const level1 = path.join(sourceDir, 'level1')
    const level2 = path.join(level1, 'level2')

    await fs.mkdir(level2, { recursive: true })

    // Create files at different levels
    await fs.writeFile(path.join(sourceDir, 'root.md'), '# Root Document')
    await fs.writeFile(path.join(level1, 'level1.md'), '# Level 1 Document')
    await fs.writeFile(path.join(level2, 'level2.md'), '# Level 2 Document')

    // Run conversion
    const { stdout, exitCode } = await testTools.fork(cliPath, [
      'convert',
      'nested-source'
    ])

    expect(exitCode).toBe(0)
    expect(stdout).toContain('处理文件数: 3')

    // Check that directory structure is preserved
    const outputDir = path.join(testTools.cwd, 'nested-source-base64')
    
    const rootExists = await fs.access(path.join(outputDir, 'root.md')).then(() => true).catch(() => false)
    const level1Exists = await fs.access(path.join(outputDir, 'level1', 'level1.md')).then(() => true).catch(() => false)
    const level2Exists = await fs.access(path.join(outputDir, 'level1', 'level2', 'level2.md')).then(() => true).catch(() => false)

    expect(rootExists).toBe(true)
    expect(level1Exists).toBe(true)
    expect(level2Exists).toBe(true)
  }, 30000)

  it('should handle mixed local and remote images', async () => {
    // Create test structure
    const sourceDir = path.join(testTools.cwd, 'mixed-source')
    const imagesDir = path.join(sourceDir, 'images')
    await fs.mkdir(sourceDir, { recursive: true })
    await fs.mkdir(imagesDir, { recursive: true })

    // Create local image
    const pngBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
      0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0x00, 0x00, 0x00,
      0x01, 0x00, 0x01, 0x21, 0x18, 0xE6, 0x27, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ])
    await fs.writeFile(path.join(imagesDir, 'local.png'), pngBuffer)

    // Create markdown with mixed image types
    const mixedContent = `# Mixed Images Document

## Local Images (should be converted)
![Local Image](./images/local.png)

## Remote Images (should remain unchanged)
![Remote HTTPS](https://example.com/image.png)

## Text Content
Some regular text content.`

    await fs.writeFile(path.join(sourceDir, 'mixed.md'), mixedContent)

    // Run conversion
    const { stdout, exitCode } = await testTools.fork(cliPath, [
      'convert',
      'mixed-source'
    ])

    expect(exitCode).toBe(0)
    expect(stdout).toContain('转换完成')

    // Check output content
    const outputDir = path.join(testTools.cwd, 'mixed-source-base64')
    const outputContent = await fs.readFile(path.join(outputDir, 'mixed.md'), 'utf-8')

    // Local image should be converted
    expect(outputContent).toContain('data:image/png;base64,')
    expect(outputContent).not.toContain('./images/local.png')

    // Remote images should remain unchanged
    expect(outputContent).toContain('https://example.com/image.png')
  }, 30000)
})