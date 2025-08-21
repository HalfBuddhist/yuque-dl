import { extname } from 'path'
import { readFile, access } from 'fs/promises'
import { constants } from 'fs'
import { logger } from '../utils/log'

/**
 * MIME type mappings for supported image formats
 */
export const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
  '.tiff': 'image/tiff',
  '.tif': 'image/tiff'
}

/**
 * Supported image file extensions
 */
export const SUPPORTED_IMAGE_EXTENSIONS = Object.keys(MIME_TYPES)

/**
 * Detects if a file is a supported image format based on its extension
 * @param filePath - The file path to check
 * @returns true if the file is a supported image format
 */
export function isImageFile(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase()
  return ext in MIME_TYPES
}

/**
 * Gets the MIME type for an image file based on its extension
 * @param filePath - The image file path
 * @returns The MIME type string or null if not supported
 */
export function getImageMimeType(filePath: string): string | null {
  const ext = extname(filePath).toLowerCase()
  return MIME_TYPES[ext] || null
}

/**
 * Generates a base64 data URI from image buffer and MIME type
 * @param imageBuffer - The image file buffer
 * @param mimeType - The MIME type of the image
 * @returns The base64 data URI string
 */
export function generateDataUri(imageBuffer: Buffer, mimeType: string): string {
  const base64Data = imageBuffer.toString('base64')
  return `data:${mimeType};base64,${base64Data}`
}

/**
 * Generates a base64 data URI from image buffer and file path
 * @param imageBuffer - The image file buffer
 * @param filePath - The image file path (used to determine MIME type)
 * @returns The base64 data URI string or null if unsupported format
 */
export function generateDataUriFromPath(imageBuffer: Buffer, filePath: string): string | null {
  const mimeType = getImageMimeType(filePath)
  if (!mimeType) {
    return null
  }
  return generateDataUri(imageBuffer, mimeType)
}

/**
 * Result of image conversion operation
 */
export interface ImageConversionResult {
  /** Whether the conversion was successful */
  success: boolean
  /** The base64 data URI if successful */
  dataUri?: string
  /** Error message if conversion failed */
  error?: string
}

/**
 * Checks if a file exists and is readable
 * @param filePath - The file path to check
 * @returns true if file exists and is readable
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK | constants.R_OK)
    logger.debug(`File exists and is readable: ${filePath}`)
    return true
  } catch (error) {
    logger.debug(`File does not exist or is not readable: ${filePath}`)
    return false
  }
}

/**
 * Converts an image file to base64 data URI
 * @param imagePath - The path to the image file
 * @returns Promise resolving to conversion result
 */
export async function convertImageToBase64(imagePath: string): Promise<ImageConversionResult> {
  try {
    logger.debug(`Converting image to base64: ${imagePath}`)

    // Check if file exists and is readable
    if (!(await fileExists(imagePath))) {
      const errorMsg = `Image file not found or not readable: ${imagePath}`
      logger.warn(errorMsg)
      return {
        success: false,
        error: errorMsg
      }
    }

    // Check if file is a supported image format
    if (!isImageFile(imagePath)) {
      const errorMsg = `Unsupported image format: ${imagePath}`
      logger.warn(errorMsg)
      return {
        success: false,
        error: errorMsg
      }
    }

    // Read the image file
    let imageBuffer: Buffer
    try {
      imageBuffer = await readFile(imagePath)
      logger.debug(`Successfully read image file: ${imagePath} (${imageBuffer.length} bytes)`)
    } catch (readError) {
      const errorMsg = `Failed to read image file ${imagePath}: ${readError instanceof Error ? readError.message : String(readError)}`
      logger.error(errorMsg)
      return {
        success: false,
        error: errorMsg
      }
    }
    
    // Generate data URI
    const dataUri = generateDataUriFromPath(imageBuffer, imagePath)
    if (!dataUri) {
      const errorMsg = `Failed to generate data URI for: ${imagePath}`
      logger.error(errorMsg)
      return {
        success: false,
        error: errorMsg
      }
    }

    logger.debug(`Successfully converted image to base64: ${imagePath}`)
    return {
      success: true,
      dataUri
    }
  } catch (error) {
    const errorMsg = `Unexpected error converting image ${imagePath}: ${error instanceof Error ? error.message : String(error)}`
    logger.error(errorMsg, error)
    return {
      success: false,
      error: errorMsg
    }
  }
}