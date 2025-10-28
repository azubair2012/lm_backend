/**
 * Formatting Utilities
 * Data formatting and transformation functions
 */

import { PropertyAdvertising, PropertyMedia } from '../types';

/**
 * Format property price for display
 */
export function formatPrice(price: string | number): string {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  
  if (isNaN(numPrice)) {
    return 'Price on request';
  }

  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(numPrice);
}

/**
 * Format property address
 */
export function formatAddress(property: PropertyAdvertising): string {
  const parts = [
    property.number,
    property.street,
    property.address3,
    property.address4,
    property.postcode
  ].filter(part => part && part.trim());

  return parts.join(', ');
}

/**
 * Format property type
 */
export function formatPropertyType(type: string): string {
  if (!type) return 'Property';
  
  return type
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Format bedroom count
 */
export function formatBedrooms(beds: string | number): string {
  const numBeds = typeof beds === 'string' ? parseInt(beds) : beds;
  
  if (isNaN(numBeds) || numBeds === 0) {
    return 'Studio';
  }
  
  if (numBeds === 1) {
    return '1 bedroom';
  }
  
  return `${numBeds} bedrooms`;
}

/**
 * Format bathroom count
 */
export function formatBathrooms(baths: string | number): string {
  const numBaths = typeof baths === 'string' ? parseInt(baths) : baths;
  
  if (isNaN(numBaths) || numBaths === 0) {
    return 'No bathrooms';
  }
  
  if (numBaths === 1) {
    return '1 bathroom';
  }
  
  return `${numBaths} bathrooms`;
}

/**
 * Format property status
 */
export function formatStatus(status: string): string {
  if (!status) return 'Available';
  
  const statusMap: { [key: string]: string } = {
    'under offer': 'Under Offer',
    'let agreed': 'Let Agreed',
    'sold': 'Sold',
    'available': 'Available',
    'let': 'Let'
  };
  
  return statusMap[status.toLowerCase()] || status;
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  if (!dateString) return 'Available now';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
}

/**
 * Format property description
 */
export function formatDescription(description: string, maxLength: number = 200): string {
  if (!description) return '';
  
  const cleaned = description
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
  
  if (cleaned.length <= maxLength) {
    return cleaned;
  }
  
  return cleaned.substring(0, maxLength).trim() + '...';
}

/**
 * Format property features
 */
export function formatFeatures(property: PropertyAdvertising): string[] {
  const features: string[] = [];
  
  if (property.beds && property.beds !== '0') {
    features.push(formatBedrooms(property.beds));
  }
  
  if (property.baths && property.baths !== '0') {
    features.push(formatBathrooms(property.baths));
  }
  
  if (property.receps && property.receps !== '0') {
    const receptions = parseInt(property.receps);
    if (!isNaN(receptions)) {
      features.push(`${receptions} reception${receptions === 1 ? '' : 's'}`);
    }
  }
  
  if (property.heating) {
    features.push(property.heating);
  }
  
  if (property.furnished && property.furnished !== '0') {
    const furnished = parseInt(property.furnished);
    if (!isNaN(furnished)) {
      if (furnished === 1) {
        features.push('Unfurnished');
      } else if (furnished === 2) {
        features.push('Part furnished');
      } else if (furnished === 3) {
        features.push('Furnished');
      }
    }
  }
  
  return features;
}

/**
 * Format property rating
 */
export function formatRating(rating: string | number): string {
  const numRating = typeof rating === 'string' ? parseFloat(rating) : rating;
  
  if (isNaN(numRating) || numRating === 0) {
    return 'No rating';
  }
  
  return `${numRating}/5`;
}

/**
 * Format property age
 */
export function formatAge(age: string): string {
  if (!age) return 'Age not specified';
  
  const ageMap: { [key: string]: string } = {
    'brand new': 'Brand New',
    'new': 'New',
    'modern': 'Modern',
    'period': 'Period',
    'victorian': 'Victorian',
    'edwardian': 'Edwardian',
    'contemporary': 'Contemporary'
  };
  
  return ageMap[age.toLowerCase()] || age;
}

/**
 * Format image caption
 */
export function formatImageCaption(caption: string): string {
  if (!caption) return 'Property image';
  
  return caption
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Format search query
 */
export function formatSearchQuery(query: string): string {
  if (!query) return '';
  
  return query
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' '); // Normalize whitespace
}

/**
 * Format area name
 */
export function formatAreaName(area: string): string {
  if (!area) return '';
  
  return area
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Format property URL
 */
export function formatPropertyUrl(url: string, propref: string): string {
  if (url && isValidUrl(url)) {
    return url;
  }
  
  // Generate default URL if none provided
  return `https://www.rentman.online/property/${propref}`;
}

/**
 * Check if URL is valid
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
