/**
 * Cloudinary Helper Functions
 * Utility functions for integrating Cloudinary with property data
 */

import { cloudinaryService } from './cloudinaryService';
import { PropertyMedia } from '../types';

export interface ProcessedImageUrls {
  thumb: string;
  medium: string;
  large: string;
  original: string;
}

/**
 * Process property media and upload to Cloudinary
 */
export async function processPropertyMediaToCloudinary(
  media: PropertyMedia[]
): Promise<{ [key: string]: ProcessedImageUrls }> {
  const results: { [key: string]: ProcessedImageUrls } = {};

  for (const item of media) {
    try {
      // Upload to Cloudinary with multiple sizes
      const cloudinaryUrls = await cloudinaryService.uploadMultipleSizes(
        item.base64data,
        item.filename
      );

      results[item.filename] = {
        thumb: cloudinaryUrls.thumb,
        medium: cloudinaryUrls.medium,
        large: cloudinaryUrls.large,
        original: cloudinaryUrls.original
      };

      console.log(`✅ Uploaded ${item.filename} to Cloudinary`);
    } catch (error) {
      console.error(`❌ Failed to upload ${item.filename} to Cloudinary:`, error);
      // Continue with other images even if one fails
    }
  }

  return results;
}

/**
 * Generate Cloudinary URLs for existing images
 */
export function generateCloudinaryUrls(
  publicId: string,
  sizes: ('thumb' | 'medium' | 'large' | 'original')[] = ['thumb', 'medium', 'large', 'original']
): ProcessedImageUrls {
  const result: Partial<ProcessedImageUrls> = {};

  sizes.forEach(size => {
    result[size] = cloudinaryService.generateSizeUrl(publicId, size);
  });

  return result as ProcessedImageUrls;
}

/**
 * Extract public ID from Cloudinary URL
 */
export function extractPublicIdFromUrl(url: string): string | null {
  try {
    const match = url.match(/\/v\d+\/(.+?)\./);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Check if URL is a Cloudinary URL
 */
export function isCloudinaryUrl(url: string): boolean {
  return url.includes('res.cloudinary.com');
}

