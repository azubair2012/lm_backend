/**
 * Cloudinary Service
 * Handle image uploads and transformations
 */

import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config';

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
  secure: config.cloudinary.secure
});

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  version: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

export interface CloudinaryTransformation {
  width?: number;
  height?: number;
  quality?: number | 'auto';
  format?: string;
  crop?: string;
  gravity?: string;
}

export class CloudinaryService {
  private folder: string;

  constructor() {
    this.folder = config.cloudinary.folder;
  }

  /**
   * Upload base64 image to Cloudinary
   */
  async uploadBase64Image(
    base64Data: string,
    filename: string,
    transformations?: CloudinaryTransformation
  ): Promise<CloudinaryUploadResult> {
    try {
      // Remove extension and construct publicId without version prefix
      const baseName = filename.replace(/\.[^/.]+$/, '');
      const publicId = `${this.folder}/${baseName}`;
      
      const result = await cloudinary.uploader.upload(
        `data:image/jpeg;base64,${base64Data}`,
        {
          public_id: publicId,
          folder: this.folder,
          transformation: transformations ? [transformations] : undefined,
          resource_type: 'image',
          overwrite: true,
          invalidate: true
        }
      );

      // Ensure publicId doesn't have version prefix
      const cleanPublicId = result.public_id.replace(/^v\d+\//, '');
      
      // Extract version from result (Cloudinary assigns a timestamp as version)
      const version = result.version?.toString() || '';

      return {
        public_id: cleanPublicId,
        secure_url: result.secure_url,
        version: version,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes
      };
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw new Error(`Failed to upload image to Cloudinary: ${error}`);
    }
  }

  /**
   * Upload original image to Cloudinary (transformations applied on-the-fly)
   */
  async uploadMultipleSizes(
    base64Data: string,
    filename: string
  ): Promise<{ [key: string]: string }> {
    try {
      // Upload original image once (no transformations - we'll use on-the-fly transformations)
      const result = await this.uploadBase64Image(
        base64Data,
        filename,
        undefined // No transformations during upload
      );

      // Use the publicId and version returned from Cloudinary
      const publicId = result.public_id;
      const version = result.version;

      // Generate URLs for different sizes using on-the-fly transformations
      const results: { [key: string]: string } = {
        thumb: this.generateSizeUrl(publicId, 'thumb', version),
        medium: this.generateSizeUrl(publicId, 'medium', version),
        large: this.generateSizeUrl(publicId, 'large', version),
        original: this.generateSizeUrl(publicId, 'original', version)
      };

      return results;
    } catch (error) {
      console.error(`Error uploading image ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Generate Cloudinary URL with transformations
   */
  generateUrl(
    publicId: string,
    transformations?: CloudinaryTransformation,
    version?: string
  ): string {
    // Remove any version prefix from the publicId itself (not from the final URL)
    const cleanPublicId = publicId.replace(/^v\d+\//, '').replace(/\/v\d+\//, '/');
    
    const url = cloudinary.url(cleanPublicId, {
      transformation: transformations ? [transformations] : undefined,
      secure: config.cloudinary.secure,
      version: version // Include the actual version number from upload
    });
    
    // Return the URL as-is - Cloudinary needs the version number for caching
    return url;
  }

  /**
   * Delete image from Cloudinary
   */
  async deleteImage(publicId: string): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === 'ok';
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      return false;
    }
  }

  /**
   * Get image info from Cloudinary
   */
  async getImageInfo(publicId: string): Promise<any> {
    try {
      return await cloudinary.api.resource(publicId);
    } catch (error) {
      console.error('Cloudinary info error:', error);
      throw new Error(`Failed to get image info: ${error}`);
    }
  }

  /**
   * Generate Cloudinary URL for different image sizes
   */
  generateSizeUrl(
    publicId: string,
    size: 'thumb' | 'medium' | 'large' | 'original' = 'medium',
    version?: string
  ): string {
    const transformations: { [key: string]: CloudinaryTransformation } = {
      thumb: { width: 300, height: 200, quality: 80, crop: 'fill', gravity: 'auto' },
      medium: { width: 800, height: 600, quality: 85, crop: 'fill', gravity: 'auto' },
      large: { width: 1200, height: 900, quality: 90, crop: 'fill', gravity: 'auto' },
      original: { quality: 'auto' }
    };

    return this.generateUrl(publicId, transformations[size], version);
  }
}

export const cloudinaryService = new CloudinaryService();
