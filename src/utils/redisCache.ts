/**
 * Redis Cache Client
 * Manages Redis connection and cache operations
 */

import Redis from 'ioredis';
import { config } from '../config';
import { logger } from './logger';

export class RedisCache {
  private client: Redis;
  private isConnected: boolean = false;

  constructor() {
    const redisConfig = {
      host: config.redis?.host || 'localhost',
      port: config.redis?.port || 6379,
      password: config.redis?.password || undefined,
      db: config.redis?.db || 0,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      lazyConnect: true, // Don't connect immediately
      maxRetriesPerRequest: 3
    };

    this.client = new Redis(redisConfig);

    this.client.on('connect', () => {
      logger.info('✅ Redis connected successfully');
      this.isConnected = true;
    });

    this.client.on('ready', () => {
      logger.info('✅ Redis ready to accept commands');
      this.isConnected = true;
    });

    this.client.on('error', (err) => {
      logger.error('❌ Redis error:', err);
      this.isConnected = false;
    });

    this.client.on('close', () => {
      logger.warn('⚠️ Redis connection closed');
      this.isConnected = false;
    });

    this.client.on('reconnecting', () => {
      logger.info('🔄 Redis reconnecting...');
    });
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    if (!this.isConnected) {
      try {
        await this.client.connect();
        logger.info('✅ Redis connection established');
      } catch (error) {
        logger.error('❌ Failed to connect to Redis:', error);
        throw error;
      }
    }
  }

  /**
   * Check if Redis is connected
   */
  isReady(): boolean {
    return this.isConnected && this.client.status === 'ready';
  }

  /**
   * Get value from Redis
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (!this.isReady()) {
        logger.warn('⚠️ Redis not connected, returning null');
        return null;
      }

      const data = await this.client.get(key);
      if (!data) {
        logger.debug(`Cache miss: ${key}`);
        return null;
      }

      logger.debug(`Cache hit: ${key}`);
      return JSON.parse(data) as T;
    } catch (error) {
      logger.error(`Error getting key ${key} from Redis:`, error);
      return null;
    }
  }

  /**
   * Set value in Redis
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      if (!this.isReady()) {
        logger.warn('⚠️ Redis not connected, skipping cache set');
        return;
      }

      const serialized = JSON.stringify(value);
      
      if (ttl) {
        await this.client.setex(key, ttl, serialized);
        logger.debug(`Cache set: ${key} (TTL: ${ttl}s)`);
      } else {
        await this.client.set(key, serialized);
        logger.debug(`Cache set: ${key} (no TTL)`);
      }
    } catch (error) {
      logger.error(`Error setting key ${key} in Redis:`, error);
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      if (!this.isReady()) {
        return false;
      }
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Error checking existence of key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete key from Redis
   */
  async delete(key: string): Promise<void> {
    try {
      if (!this.isReady()) {
        return;
      }
      await this.client.del(key);
      logger.debug(`Cache deleted: ${key}`);
    } catch (error) {
      logger.error(`Error deleting key ${key} from Redis:`, error);
    }
  }

  /**
   * Delete keys matching pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      if (!this.isReady()) {
        return 0;
      }

      const keys = await this.client.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }

      await this.client.del(...keys);
      logger.info(`Deleted ${keys.length} keys matching pattern: ${pattern}`);
      return keys.length;
    } catch (error) {
      logger.error(`Error deleting pattern ${pattern} from Redis:`, error);
      return 0;
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    try {
      if (!this.isReady()) {
        return;
      }
      await this.client.flushdb();
      logger.info('Cache cleared');
    } catch (error) {
      logger.error('Error clearing cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    connected: boolean;
    keys: number;
    memory: string;
    uptime: number;
  }> {
    try {
      if (!this.isReady()) {
        return {
          connected: false,
          keys: 0,
          memory: '0',
          uptime: 0
        };
      }

      const info = await this.client.info('stats');
      const dbsize = await this.client.dbsize();
      const memory = await this.client.info('memory');

      return {
        connected: true,
        keys: dbsize,
        memory: this.parseMemoryInfo(memory),
        uptime: this.parseUptime(info)
      };
    } catch (error) {
      logger.error('Error getting Redis stats:', error);
      return {
        connected: false,
        keys: 0,
        memory: '0',
        uptime: 0
      };
    }
  }

  /**
   * Parse memory usage from info string
   */
  private parseMemoryInfo(info: string): string {
    const match = info.match(/used_memory_human:([^\r\n]+)/);
    return match ? match[1] : '0';
  }

  /**
   * Parse uptime from info string
   */
  private parseUptime(info: string): number {
    const match = info.match(/uptime_in_seconds:(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    try {
      await this.client.quit();
      logger.info('Redis connection closed');
    } catch (error) {
      logger.error('Error disconnecting from Redis:', error);
    }
  }

  /**
   * Get underlying Redis client (for advanced operations)
   */
  getClient(): Redis {
    return this.client;
  }
}

// Create and export singleton instance
export const redisCache = new RedisCache();

// Cache key generators
export const RedisCacheKeys = {
  allProperties: () => 'properties:all',
  property: (id: string) => `property:${id}`,
  searchResults: (params: any) => `search:${JSON.stringify(params)}`,
  metadata: () => 'properties:metadata',
  syncLock: () => 'sync:lock'
};


