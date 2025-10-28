/**
 * Validation Utilities
 * Input validation and sanitization functions
 */

import { PropertyAdvertisingParams, PropertyMediaParams } from '../types';

/**
 * Validate property advertising parameters
 */
export function validatePropertyAdvertisingParams(params: any): PropertyAdvertisingParams {
  const validated: PropertyAdvertisingParams = {};

  if (params.propref && typeof params.propref === 'string') {
    validated.propref = params.propref.trim();
  }

  if (params.noimage !== undefined) {
    const noimage = parseInt(params.noimage);
    if (!isNaN(noimage) && (noimage === 0 || noimage === 1)) {
      validated.noimage = noimage;
    }
  }

  if (params.rob && typeof params.rob === 'string') {
    const rob = params.rob.toLowerCase();
    if (rob === 'rent' || rob === 'sale') {
      validated.rob = rob as 'rent' | 'sale';
    }
  }

  if (params.featured !== undefined) {
    const featured = parseInt(params.featured);
    if (!isNaN(featured) && (featured === 0 || featured === 1)) {
      validated.featured = featured;
    }
  }

  if (params.area !== undefined) {
    const area = parseInt(params.area);
    if (!isNaN(area) && (area === 0 || area === 1)) {
      validated.area = area;
    }
  }

  if (params.limit !== undefined) {
    const limit = parseInt(params.limit);
    if (!isNaN(limit) && limit > 0 && limit <= 1000) {
      validated.limit = limit;
    }
  }

  if (params.page !== undefined) {
    const page = parseInt(params.page);
    if (!isNaN(page) && page > 0) {
      validated.page = page;
    }
  }

  return validated;
}

/**
 * Validate property media parameters
 */
export function validatePropertyMediaParams(params: any): PropertyMediaParams {
  const validated: PropertyMediaParams = {};

  if (params.propref && typeof params.propref === 'string') {
    validated.propref = params.propref.trim();
  }

  if (params.filename && typeof params.filename === 'string') {
    validated.filename = params.filename.trim();
  }

  return validated;
}

/**
 * Validate search query parameters
 */
export function validateSearchParams(params: any): {
  q?: string;
  area?: string;
  type?: string;
  beds?: number;
  minPrice?: number;
  maxPrice?: number;
  featured?: boolean;
  limit?: number;
  page?: number;
} {
  const validated: any = {};

  if (params.q && typeof params.q === 'string') {
    validated.q = params.q.trim();
  }

  if (params.area && typeof params.area === 'string') {
    validated.area = params.area.trim();
  }

  if (params.type && typeof params.type === 'string') {
    const type = params.type.toLowerCase();
    if (type === 'rent' || type === 'sale') {
      validated.type = type;
    }
  }

  if (params.beds !== undefined) {
    const beds = parseInt(params.beds);
    if (!isNaN(beds) && beds >= 0) {
      validated.beds = beds;
    }
  }

  if (params.minPrice !== undefined) {
    const minPrice = parseFloat(params.minPrice);
    if (!isNaN(minPrice) && minPrice >= 0) {
      validated.minPrice = minPrice;
    }
  }

  if (params.maxPrice !== undefined) {
    const maxPrice = parseFloat(params.maxPrice);
    if (!isNaN(maxPrice) && maxPrice >= 0) {
      validated.maxPrice = maxPrice;
    }
  }

  if (params.featured !== undefined) {
    validated.featured = params.featured === 'true' || params.featured === true;
  }

  if (params.limit !== undefined) {
    const limit = parseInt(params.limit);
    if (!isNaN(limit) && limit > 0 && limit <= 1000) {
      validated.limit = limit;
    }
  }

  if (params.page !== undefined) {
    const page = parseInt(params.page);
    if (!isNaN(page) && page > 0) {
      validated.page = page;
    }
  }

  return validated;
}

/**
 * Validate image filename
 */
export function validateImageFilename(filename: string): boolean {
  if (!filename || typeof filename !== 'string') {
    return false;
  }

  // Check for valid image extensions
  const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  
  return validExtensions.includes(extension);
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000); // Limit length
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate pagination parameters
 */
export function validatePaginationParams(params: any): {
  page: number;
  limit: number;
} {
  const page = parseInt(params.page) || 1;
  const limit = parseInt(params.limit) || 25;

  return {
    page: Math.max(1, page),
    limit: Math.min(Math.max(1, limit), 1000)
  };
}

/**
 * Validate property reference format
 */
export function validatePropertyRef(propref: string): boolean {
  if (!propref || typeof propref !== 'string') {
    return false;
  }

  // Property reference should be alphanumeric and reasonable length
  return /^[a-zA-Z0-9_-]{1,50}$/.test(propref.trim());
}

/**
 * Validate price range
 */
export function validatePriceRange(minPrice?: number, maxPrice?: number): boolean {
  if (minPrice !== undefined && (isNaN(minPrice) || minPrice < 0)) {
    return false;
  }

  if (maxPrice !== undefined && (isNaN(maxPrice) || maxPrice < 0)) {
    return false;
  }

  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    return false;
  }

  return true;
}
