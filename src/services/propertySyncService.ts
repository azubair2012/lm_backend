/**
 * Property Sync Service
 * Scheduled synchronization of properties from Rentman API to Redis
 */

import * as cron from 'node-cron';
import { RentmanApiClient } from '../client/RentmanApiClient';
import { redisCache, RedisCacheKeys } from '../utils/redisCache';
import { logger } from '../utils/logger';
import { config } from '../config';
import { PropertyAdvertising } from '../types';

export class PropertySyncService {
  private client: RentmanApiClient;
  private syncTask: cron.ScheduledTask | null = null;
  private isSyncing: boolean = false;
  private lastSyncTime: Date | null = null;
  private syncCount: number = 0;
  private errorCount: number = 0;

  constructor(client: RentmanApiClient) {
    this.client = client;
  }

  /**
   * Start the sync service
   */
  async start(): Promise<void> {
    if (!config.sync.enabled) {
      logger.info('⏸️ Property sync is disabled in configuration');
      return;
    }

    if (!config.redis.enabled) {
      logger.warn('⚠️ Redis is disabled, property sync cannot start');
      return;
    }

    logger.info(`🔄 Starting property sync service (interval: ${config.sync.interval})`);

    // Connect to Redis first
    try {
      await redisCache.connect();
    } catch (error) {
      logger.error('❌ Failed to connect to Redis, sync service cannot start:', error);
      return;
    }

    // Run initial sync if configured
    if (config.sync.onStartup) {
      logger.info('🚀 Running initial property sync on startup...');
      await this.syncProperties();
    }

    // Schedule recurring sync
    try {
      this.syncTask = cron.schedule(config.sync.interval, async () => {
        logger.info('⏰ Scheduled sync triggered');
        await this.syncProperties();
      });

      logger.info(`✅ Property sync scheduled: ${config.sync.interval}`);
    } catch (error) {
      logger.error('❌ Failed to schedule sync task:', error);
    }
  }

  /**
   * Stop the sync service
   */
  stop(): void {
    if (this.syncTask) {
      this.syncTask.stop();
      logger.info('🛑 Property sync service stopped');
    }
  }

  /**
   * Sync properties from Rentman API to Redis
   */
  async syncProperties(): Promise<void> {
    // Prevent concurrent syncs
    if (this.isSyncing) {
      logger.warn('⚠️ Sync already in progress, skipping...');
      return;
    }

    // Check for sync lock in Redis
    const hasLock = await redisCache.exists(RedisCacheKeys.syncLock());
    if (hasLock) {
      logger.warn('⚠️ Another instance is syncing, skipping...');
      return;
    }

    this.isSyncing = true;
    const startTime = Date.now();

    try {
      // Set sync lock (expires in 5 minutes as safety)
      await redisCache.set(RedisCacheKeys.syncLock(), true, 300);

      logger.info('🔄 Starting property sync from Rentman API...');

      // Fetch all properties from Rentman API
      const response = await this.client.getPropertyAdvertising({
        limit: 1000,
        noimage: 1
      });

      const properties: PropertyAdvertising[] = Array.isArray(response.data) 
        ? response.data 
        : [response.data];

      logger.info(`📥 Fetched ${properties.length} properties from Rentman API`);

      // Store all properties as a single entry
      const allPropertiesKey = RedisCacheKeys.allProperties();
      await redisCache.set(allPropertiesKey, properties, 7200); // 2 hours TTL

      // Also cache individual properties for faster lookups
      let cachedCount = 0;
      for (const property of properties) {
        const propKey = RedisCacheKeys.property(property.propref);
        await redisCache.set(propKey, property, 7200);
        cachedCount++;
      }

      // Store sync metadata
      const metadata = {
        count: properties.length,
        lastSync: new Date().toISOString(),
        syncDuration: Date.now() - startTime,
        syncNumber: this.syncCount + 1
      };

      await redisCache.set(RedisCacheKeys.metadata(), metadata, 7200);

      // Update statistics
      this.syncCount++;
      this.lastSyncTime = new Date();

      const duration = Date.now() - startTime;
      logger.info(`✅ Property sync completed successfully`);
      logger.info(`   - Properties synced: ${properties.length}`);
      logger.info(`   - Individual cache entries: ${cachedCount}`);
      logger.info(`   - Duration: ${duration}ms`);
      logger.info(`   - Total syncs: ${this.syncCount}`);

    } catch (error) {
      this.errorCount++;
      logger.error('❌ Property sync failed:', error);
      logger.error(`   - Error count: ${this.errorCount}`);
    } finally {
      // Release lock
      await redisCache.delete(RedisCacheKeys.syncLock());
      this.isSyncing = false;
    }
  }

  /**
   * Manual sync trigger (useful for API endpoints or testing)
   */
  async manualSync(): Promise<{ success: boolean; message: string; duration?: number }> {
    const startTime = Date.now();
    
    try {
      await this.syncProperties();
      const duration = Date.now() - startTime;
      
      return {
        success: true,
        message: `Properties synced successfully in ${duration}ms`,
        duration
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Sync failed'
      };
    }
  }

  /**
   * Get sync service statistics
   */
  getStats(): {
    enabled: boolean;
    isSyncing: boolean;
    lastSyncTime: string | null;
    syncCount: number;
    errorCount: number;
    interval: string;
  } {
    return {
      enabled: config.sync.enabled,
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime?.toISOString() || null,
      syncCount: this.syncCount,
      errorCount: this.errorCount,
      interval: config.sync.interval
    };
  }

  /**
   * Check if sync is currently running
   */
  isRunning(): boolean {
    return this.isSyncing;
  }
}

