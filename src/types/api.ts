/**
 * API Configuration and Client Types
 */

export interface RentmanApiConfig {
  token: string;
  baseURL: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export interface HttpClientConfig {
  baseURL: string;
  timeout: number;
  headers: Record<string, string>;
}

export interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, any>;
  timeout?: number;
}

export interface CacheConfig {
  ttl: number; // Time to live in seconds
  maxSize: number; // Maximum cache size
  enabled: boolean;
}

export interface ImageProcessingConfig {
  quality: number;
  formats: string[];
  sizes: ImageSize[];
  cacheTTL: number;
}

export interface ImageSize {
  name: string;
  width: number;
  height: number;
  suffix: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  code?: string;
  timestamp: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
