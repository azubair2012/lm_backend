/**
 * Caching System
 * In-memory cache with TTL support
 */

import { config } from '../config';
import { cacheLogger } from './logger';

interface CacheItem<T = any> {
  value: T;
  expires: number;
  created: number;
}

export class Cache {
  private cache = new Map<string, CacheItem>();
  private maxSize: number;
  private ttl: number;

  constructor(maxSize: number = config.cache.maxSize, ttl: number = config.cache.ttl) {
    this.maxSize = maxSize;
    this.ttl = ttl * 1000; // Convert to milliseconds
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      cacheLogger.cacheMiss(key);
      return null;
    }

    // Check if expired
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      cacheLogger.cacheMiss(key);
      return null;
    }

    cacheLogger.cacheHit(key);
    return item.value as T;
  }

  /**
   * Set value in cache
   */
  set<T>(key: string, value: T, customTtl?: number): void {
    // Remove oldest items if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    const ttl = customTtl ? customTtl * 1000 : this.ttl;
    const item: CacheItem<T> = {
      value,
      expires: Date.now() + ttl,
      created: Date.now()
    };

    this.cache.set(key, item);
    cacheLogger.cacheSet(key, ttl / 1000);
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Delete key from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      cacheLogger.debug(`Cache deleted: ${key}`);
    }
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    cacheLogger.cacheClear();
  }

  /**
   * Clear cache entries matching pattern
   */
  clearPattern(pattern: string): void {
    const regex = new RegExp(pattern);
    let cleared = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        cleared++;
      }
    }

    cacheLogger.cacheClear(pattern);
    cacheLogger.debug(`Cleared ${cleared} cache entries matching pattern: ${pattern}`);
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    oldestEntry: number;
    newestEntry: number;
  } {
    const now = Date.now();
    let oldest = now;
    let newest = 0;

    for (const item of this.cache.values()) {
      if (item.created < oldest) oldest = item.created;
      if (item.created > newest) newest = item.created;
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0, // Would need to track hits/misses for this
      oldestEntry: oldest === now ? 0 : now - oldest,
      newestEntry: newest === 0 ? 0 : now - newest
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      cacheLogger.debug(`Cleaned up ${cleaned} expired cache entries`);
    }
  }

  /**
   * Evict oldest entry when cache is full
   */
  private evictOldest(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (item.created < oldestTime) {
        oldestTime = item.created;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      cacheLogger.debug(`Evicted oldest cache entry: ${oldestKey}`);
    }
  }
}

// Create default cache instance
export const cache = new Cache();

// Cache key generators
export const CacheKeys = {
  properties: (params: any) => `properties:${JSON.stringify(params)}`,
  property: (id: string) => `property:${id}`,
  media: (propertyId: string) => `media:${propertyId}`,
  mediaFile: (filename: string) => `mediafile:${filename}`,
  search: (query: string, params: any) => `search:${query}:${JSON.stringify(params)}`,
  suggestions: (query: string) => `suggestions:${query}`,
  image: (filename: string, size: string) => `image:${filename}:${size}`,
  health: () => 'health'
};

// Cache decorator for methods
export function cached<T extends (...args: any[]) => Promise<any>>(
  keyGenerator: (...args: Parameters<T>) => string,
  ttl?: number
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: Parameters<T>) {
      const key = keyGenerator(...args);
      const cached = cache.get(key);

      if (cached !== null) {
        return cached;
      }

      const result = await originalMethod.apply(this, args);
      cache.set(key, result, ttl);
      return result;
    };

    return descriptor;
  };
}

export default cache;

