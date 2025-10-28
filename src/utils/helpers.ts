/**
 * Helper Utilities
 * General utility functions for the application
 */

import { PropertyAdvertising, PropertyMedia } from '../types';

/**
 * Generate unique ID
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }

  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }

  if (typeof obj === 'object') {
    const cloned = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }

  return obj;
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Sleep function
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      await sleep(delay);
      return retry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

/**
 * Check if value is empty
 */
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  
  if (typeof value === 'string') {
    return value.trim().length === 0;
  }
  
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  
  if (typeof value === 'object') {
    return Object.keys(value).length === 0;
  }
  
  return false;
}

/**
 * Remove empty values from object
 */
export function removeEmptyValues<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key) && !isEmpty(obj[key])) {
      result[key] = obj[key];
    }
  }
  
  return result;
}

/**
 * Group array by key
 */
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const group = String(item[key]);
    groups[group] = groups[group] || [];
    groups[group].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

/**
 * Sort array by key
 */
export function sortBy<T>(array: T[], key: keyof T, direction: 'asc' | 'desc' = 'asc'): T[] {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    
    if (aVal < bVal) {
      return direction === 'asc' ? -1 : 1;
    }
    if (aVal > bVal) {
      return direction === 'asc' ? 1 : -1;
    }
    return 0;
  });
}

/**
 * Get unique values from array
 */
export function unique<T>(array: T[]): T[] {
  return [...new Set(array)];
}

/**
 * Chunk array into smaller arrays
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  
  return chunks;
}

/**
 * Calculate pagination info
 */
export function calculatePagination(
  page: number,
  limit: number,
  total: number
): {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  offset: number;
} {
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
    offset
  };
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Generate random string
 */
export function randomString(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Get environment variable with default
 */
export function getEnv(key: string, defaultValue?: string): string | undefined {
  return process.env[key] || defaultValue;
}

/**
 * Parse JSON safely
 */
export function parseJSON<T>(json: string, defaultValue: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return defaultValue;
  }
}

/**
 * Stringify JSON safely
 */
export function stringifyJSON(obj: any, defaultValue: string = '{}'): string {
  try {
    return JSON.stringify(obj);
  } catch {
    return defaultValue;
  }
}

/**
 * Create error object
 */
export function createError(message: string, code?: string, statusCode?: number): Error & { code?: string; statusCode?: number } {
  const error = new Error(message) as Error & { code?: string; statusCode?: number };
  if (code) error.code = code;
  if (statusCode) error.statusCode = statusCode;
  return error;
}

/**
 * Log with timestamp
 */
export function logWithTimestamp(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  
  switch (level) {
    case 'error':
      console.error(logMessage);
      break;
    case 'warn':
      console.warn(logMessage);
      break;
    default:
      console.log(logMessage);
  }
}
