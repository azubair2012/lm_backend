/**
 * Image Processing Utilities
 * Handle image optimization and multiple size generation
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { ImageProcessingConfig, ImageSize } from '../types';
import { cloudinaryService } from './cloudinaryService';

export class ImageProcessor {
  private config: ImageProcessingConfig;

  constructor(config?: Partial<ImageProcessingConfig>) {
    this.config = {
      quality: 85,
      formats: ['webp', 'jpeg'],
      sizes: [
        { name: 'thumb', width: 300, height: 200, suffix: '_thumb' },
        { name: 'medium', width: 800, height: 600, suffix: '_medium' },
        { name: 'large', width: 1200, height: 900, suffix: '_large' },
        { name: 'original', width: 0, height: 0, suffix: '_original' }
      ],
      cacheTTL: 86400, // 24 hours
      ...config
    };
  }

  /**
   * Process and optimize an image from base64 data
   */
  async processBase64Image(
    base64Data: string,
    filename: string,
    outputDir: string = './public/images'
  ): Promise<{ [key: string]: string }> {
    try {
      // Ensure output directory exists
      await fs.promises.mkdir(outputDir, { recursive: true });

      // Convert base64 to buffer
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Get base filename without extension
      const baseName = path.parse(filename).name;
      const results: { [key: string]: string } = {};

      // Process each size
      for (const size of this.config.sizes) {
        const outputPath = path.join(outputDir, `${baseName}${size.suffix}.webp`);
        
        let sharpInstance = sharp(buffer);
        
        // Resize if not original
        if (size.width > 0 && size.height > 0) {
          sharpInstance = sharpInstance.resize(size.width, size.height, {
            fit: 'cover',
            position: 'center'
          });
        }

        // Apply optimization
        await sharpInstance
          .webp({ quality: this.config.quality })
          .toFile(outputPath);

        results[size.name] = `/api/images/${baseName}${size.suffix}.webp`;
      }

      return results;
    } catch (error) {
      console.error('Error processing image:', error);
      throw new Error(`Failed to process image ${filename}: ${error}`);
    }
  }

  /**
   * Process an image file
   */
  async processImageFile(
    inputPath: string,
    filename: string,
    outputDir: string = './public/images'
  ): Promise<{ [key: string]: string }> {
    try {
      // Ensure output directory exists
      await fs.promises.mkdir(outputDir, { recursive: true });

      // Check if input file exists
      if (!fs.existsSync(inputPath)) {
        throw new Error(`Input file not found: ${inputPath}`);
      }

      const baseName = path.parse(filename).name;
      const results: { [key: string]: string } = {};

      // Process each size
      for (const size of this.config.sizes) {
        const outputPath = path.join(outputDir, `${baseName}${size.suffix}.webp`);
        
        let sharpInstance = sharp(inputPath);
        
        // Resize if not original
        if (size.width > 0 && size.height > 0) {
          sharpInstance = sharpInstance.resize(size.width, size.height, {
            fit: 'cover',
            position: 'center'
          });
        }

        // Apply optimization
        await sharpInstance
          .webp({ quality: this.config.quality })
          .toFile(outputPath);

        results[size.name] = `/api/images/${baseName}${size.suffix}.webp`;
      }

      return results;
    } catch (error) {
      console.error('Error processing image file:', error);
      throw new Error(`Failed to process image file ${filename}: ${error}`);
    }
  }

  /**
   * Generate responsive image srcset
   */
  generateSrcSet(baseName: string): string {
    return this.config.sizes
      .filter(size => size.width > 0) // Exclude original
      .map(size => `/api/images/${baseName}${size.suffix}.webp ${size.width}w`)
      .join(', ');
  }

  /**
   * Generate responsive image sizes attribute
   */
  generateSizes(): string {
    return '(max-width: 600px) 300px, (max-width: 1200px) 800px, 1200px';
  }

  /**
   * Create placeholder image
   */
  async createPlaceholder(
    width: number,
    height: number,
    text: string = 'No Image',
    outputDir: string = './public/images'
  ): Promise<string> {
    try {
      await fs.promises.mkdir(outputDir, { recursive: true });

      const svg = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#f0f0f0"/>
          <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="Arial, sans-serif" font-size="14" fill="#666">
            ${text}
          </text>
        </svg>
      `;

      const filename = `placeholder_${width}x${height}.webp`;
      const outputPath = path.join(outputDir, filename);

      await sharp(Buffer.from(svg))
        .webp({ quality: 80 })
        .toFile(outputPath);

      return `/api/images/${filename}`;
    } catch (error) {
      console.error('Error creating placeholder:', error);
      throw new Error(`Failed to create placeholder image: ${error}`);
    }
  }

  /**
   * Check if image exists and is not expired
   */
  async isImageValid(imagePath: string): Promise<boolean> {
    try {
      const stats = await fs.promises.stat(imagePath);
      const now = Date.now();
      const imageTime = stats.mtime.getTime();
      const age = (now - imageTime) / 1000; // Age in seconds

      return age < this.config.cacheTTL;
    } catch (error) {
      return false;
    }
  }

  /**
   * Clean up expired images
   */
  async cleanupExpiredImages(outputDir: string = './public/images'): Promise<void> {
    try {
      const files = await fs.promises.readdir(outputDir);
      
      for (const file of files) {
        const filePath = path.join(outputDir, file);
        const isValid = await this.isImageValid(filePath);
        
        if (!isValid) {
          await fs.promises.unlink(filePath);
          console.log(`Cleaned up expired image: ${file}`);
        }
      }
    } catch (error) {
      console.error('Error cleaning up images:', error);
    }
  }

  /**
   * Get image metadata
   */
  async getImageMetadata(imagePath: string): Promise<{
    width: number;
    height: number;
    format: string;
    size: number;
  }> {
    try {
      const metadata = await sharp(imagePath).metadata();
      const stats = await fs.promises.stat(imagePath);

      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        size: stats.size
      };
    } catch (error) {
      console.error('Error getting image metadata:', error);
      throw new Error(`Failed to get image metadata: ${error}`);
    }
  }

  /**
   * Process and upload image to Cloudinary (NEW METHOD)
   */
  async processAndUploadImage(
    base64Data: string,
    filename: string
  ): Promise<{ [key: string]: string }> {
    try {
      // Upload multiple sizes to Cloudinary
      const results = await cloudinaryService.uploadMultipleSizes(base64Data, filename);
      
      return results;
    } catch (error) {
      console.error('Error processing and uploading image:', error);
      throw new Error(`Failed to process and upload image ${filename}: ${error}`);
    }
  }

  /**
   * Generate Cloudinary URL for different image sizes (NEW METHOD)
   */
  generateCloudinaryUrl(
    publicId: string,
    size: 'thumb' | 'medium' | 'large' | 'original' = 'medium'
  ): string {
    return cloudinaryService.generateSizeUrl(publicId, size);
  }

  /**
   * Generate Cloudinary srcset for responsive images (NEW METHOD)
   */
  generateCloudinarySrcSet(publicId: string): string {
    const sizes = ['thumb', 'medium', 'large'];
    return sizes
      .map(size => {
        const url = this.generateCloudinaryUrl(publicId, size as any);
        const width = size === 'thumb' ? 300 : size === 'medium' ? 800 : 1200;
        return `${url} ${width}w`;
      })
      .join(', ');
  }

  /**
   * Dynamically fetch and cache image from Rentman API to Cloudinary
   */
  async fetchAndCacheImage(
    filename: string,
    client: any
  ): Promise<{ [key: string]: string }> {
    try {
      console.log(`🔄 Fetching image ${filename} from Rentman API...`);
      
      // Fetch from Rentman API
      const mediaResponse = await client.getPropertyMedia({ filename });
      
      if (mediaResponse.data.length === 0) {
        throw new Error(`Image ${filename} not found in Rentman API`);
      }
      
      const media = mediaResponse.data[0];
      
      if (!media.base64data) {
        throw new Error(`No base64 data for image ${filename}`);
      }
      
      // Upload to Cloudinary
      const results = await cloudinaryService.uploadMultipleSizes(
        media.base64data,
        filename
      );
      
      console.log(`✅ Successfully cached ${filename} to Cloudinary`);
      
      return results;
      
    } catch (error) {
      console.error(`❌ Failed to fetch and cache image ${filename}:`, error);
      throw new Error(`Failed to fetch and cache image ${filename}: ${error}`);
    }
  }
}
