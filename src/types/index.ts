/**
 * Main types export file
 * Re-exports all type definitions for easy importing
 */

// Property types
export * from './property';

// Framer types
export * from './framer';

// API types
export * from './api';

// Re-export commonly used types
export type {
  PropertyAdvertising,
  PropertyMedia,
  PropertyAdvertisingParams,
  PropertyMediaParams,
  ApiResponse
} from './property';

export type {
  FramerProperty,
  FramerImage,
  FramerImageSet,
  FramerSearchParams,
  FramerSearchResponse,
  FramerApiResponse
} from './framer';

export type {
  RentmanApiConfig,
  HttpClientConfig,
  RequestOptions,
  CacheConfig,
  ImageProcessingConfig,
  ErrorResponse,
  PaginationParams,
  PaginationResponse
} from './api';
