/**
 * Framer-optimized data types
 * Transformed data structures for Framer frontend consumption
 */

export interface FramerProperty {
  id: string;
  address: string;
  price: string;
  rentMonth: number;
  type: string;
  beds: number;
  singles: number;
  doubles: number;
  baths: number;
  receptions: number;
  furnished: string;
  heating: string;
  available: string;
  status: string;
  rating: number;
  age: string;
  description: string;
  strapline: string;
  postcode: string;
  area: string;
  url: string;
  
  // Framer-optimized image structure
  images: {
    main: FramerImageSet;
    floorplan?: FramerImageSet;
    gallery: FramerImage[];
  };
}

export interface FramerImage {
  id: string;
  caption: string;
  order: number;
  urls: FramerImageSet;
}

export interface FramerImageSet {
  thumb: string;
  medium: string;
  large: string;
  original: string;
}

export interface FramerImageUrls {
  thumb: string;
  medium: string;
  large: string;
  original: string;
}

export interface FramerSearchParams {
  q?: string;
  area?: string;
  type?: string;
  beds?: number;
  minPrice?: number;
  maxPrice?: number;
  featured?: boolean;
  limit?: number;
  page?: number;
}

export interface FramerSearchResponse {
  properties: FramerProperty[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: {
    areas: string[];
    types: string[];
    priceRange: {
      min: number;
      max: number;
    };
  };
}

export interface FramerApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}
