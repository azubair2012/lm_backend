/**
 * Framer Data Transformers
 * Convert Rentman API data to Framer-optimized format
 */

import { PropertyAdvertising, PropertyMedia, FramerProperty, FramerImage, FramerImageSet } from '../types';
import { RentmanApiClient } from '../client/RentmanApiClient';

/**
 * Transform property data for Framer consumption
 */
export async function transformPropertyForFramer(
  property: PropertyAdvertising, 
  client?: RentmanApiClient
): Promise<FramerProperty> {
  const baseProperty: FramerProperty = {
    id: property.propref,
    address: property.displayaddress,
    price: property.displayprice,
    rentMonth: parseFloat(property.rentmonth) || 0,
    type: property.TYPE,
    beds: parseInt(property.beds) || 0,
    singles: parseInt(property.singles) || 0,
    doubles: parseInt(property.doubles) || 0,
    baths: parseInt(property.baths) || 0,
    receptions: parseInt(property.receps) || 0,
    furnished: property.furnished,
    heating: property.heating,
    available: property.available,
    status: property.STATUS,
    rating: parseInt(property.rating) || 0,
    age: property.age,
    description: property.DESCRIPTION,
    strapline: property.strapline,
    postcode: property.postcode,
    area: property.area,
    url: property.url,
    images: {
      main: createImageSet(property.photo1),
      floorplan: property.floorplan ? createImageSet(property.floorplan) : undefined,
      gallery: [] // Will be populated below if client is provided
    }
  };

  // If client is provided, fetch additional media (with timeout protection)
  if (client) {
    try {
      // Set a shorter timeout for media fetching to prevent overall timeout
      const mediaResponse = await Promise.race([
        client.getPropertyMedia({ propref: property.propref }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Media fetch timeout')), 5000)
        )
      ]) as any;
      
      if (mediaResponse.data.length > 0) {
        baseProperty.images.gallery = mediaResponse.data.map(transformMediaForFramer);
        console.log(`Fetched ${mediaResponse.data.length} gallery images for property ${property.propref}`);
      }
    } catch (error) {
      console.warn(`Failed to fetch media for property ${property.propref}:`, error);
      // Continue without gallery images if media fetch fails
    }
  }

  return baseProperty;
}

/**
 * Transform property data for Framer consumption (synchronous version without media fetching)
 */
export function transformPropertyForFramerSync(property: PropertyAdvertising): FramerProperty {
  return {
    id: property.propref,
    address: property.displayaddress,
    price: property.displayprice,
    rentMonth: parseFloat(property.rentmonth) || 0,
    type: property.TYPE,
    beds: parseInt(property.beds) || 0,
    singles: parseInt(property.singles) || 0,
    doubles: parseInt(property.doubles) || 0,
    baths: parseInt(property.baths) || 0,
    receptions: parseInt(property.receps) || 0,
    furnished: property.furnished,
    heating: property.heating,
    available: property.available,
    status: property.STATUS,
    rating: parseInt(property.rating) || 0,
    age: property.age,
    description: property.DESCRIPTION,
    strapline: property.strapline,
    postcode: property.postcode,
    area: property.area,
    url: property.url,
    images: {
      main: createImageSet(property.photo1),
      floorplan: property.floorplan ? createImageSet(property.floorplan) : undefined,
      gallery: [] // Empty gallery for performance
    }
  };
}

/**
 * Transform media data for Framer consumption
 */
export function transformMediaForFramer(media: PropertyMedia): FramerImage {
  return {
    id: media.filename,
    caption: media.caption,
    order: parseInt(media.imgorder) || 0,
    urls: createImageSet(media.filename)
  };
}

/**
 * Create image set with multiple sizes for responsive design
 */
export function createImageSet(filename: string): FramerImageSet {
  // Use the original filename as-is since the API serves the actual files
  return {
    thumb: `/api/images/${filename}`,
    medium: `/api/images/${filename}`,
    large: `/api/images/${filename}`,
    original: `/api/images/${filename}`
  };
}

/**
 * Generate responsive image srcset for Framer
 */
export function generateResponsiveSrcSet(filename: string): string {
  const baseName = filename.replace(/\.[^/.]+$/, '');
  
  return [
    `/api/images/${baseName}_thumb.webp 300w`,
    `/api/images/${baseName}_medium.webp 800w`,
    `/api/images/${baseName}_large.webp 1200w`
  ].join(', ');
}

/**
 * Generate responsive image sizes attribute
 */
export function generateResponsiveSizes(): string {
  return '(max-width: 600px) 300px, (max-width: 1200px) 800px, 1200px';
}

/**
 * Create placeholder image URL for missing images
 */
export function createPlaceholderImage(size: 'thumb' | 'medium' | 'large' | 'original' = 'medium'): string {
  return `/api/images/placeholder_${size}.webp`;
}

/**
 * Validate and sanitize image filename
 */
export function sanitizeImageFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .toLowerCase();
}

/**
 * Extract image metadata from filename
 */
export function extractImageMetadata(filename: string): {
  name: string;
  extension: string;
  isOptimized: boolean;
  size?: string;
} {
  const parts = filename.split('.');
  const extension = parts.pop() || '';
  const nameWithoutExt = parts.join('.');
  
  // Check if it's an optimized image (has size suffix)
  const sizeMatch = nameWithoutExt.match(/_(_thumb|_medium|_large|_original)$/);
  const isOptimized = !!sizeMatch;
  const size = sizeMatch ? sizeMatch[1].substring(1) : undefined;
  
  return {
    name: isOptimized ? nameWithoutExt.replace(/_(_thumb|_medium|_large|_original)$/, '') : nameWithoutExt,
    extension,
    isOptimized,
    size
  };
}
