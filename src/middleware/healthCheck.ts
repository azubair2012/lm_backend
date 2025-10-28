/**
 * Health Check Middleware
 * Comprehensive health monitoring and status reporting
 */

import { Request, Response, NextFunction } from 'express';
import { RentmanApiClient } from '../client/RentmanApiClient';
import { cache } from '../utils/cache';
import { logger } from '../utils/logger';
import { config } from '../config';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    server: CheckResult;
    database?: CheckResult;
    external: CheckResult;
    cache: CheckResult;
    memory: CheckResult;
  };
  metrics: {
    requests: {
      total: number;
      successful: number;
      failed: number;
      rate: number;
    };
    responseTime: {
      average: number;
      p95: number;
      p99: number;
    };
    cache: {
      hitRate: number;
      size: number;
      maxSize: number;
    };
  };
}

interface CheckResult {
  status: 'pass' | 'fail' | 'warn';
  message: string;
  responseTime?: number;
  details?: any;
}

class HealthMonitor {
  private startTime: number;
  private requestCounts = {
    total: 0,
    successful: 0,
    failed: 0
  };
  private responseTimes: number[] = [];
  private apiClient: RentmanApiClient;

  constructor(apiClient: RentmanApiClient) {
    this.startTime = Date.now();
    this.apiClient = apiClient;
  }

  /**
   * Record request metrics
   */
  recordRequest(success: boolean, responseTime: number): void {
    this.requestCounts.total++;
    if (success) {
      this.requestCounts.successful++;
    } else {
      this.requestCounts.failed++;
    }
    this.responseTimes.push(responseTime);

    // Keep only last 1000 response times
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000);
    }
  }

  /**
   * Check server health
   */
  private async checkServer(): Promise<CheckResult> {
    try {
      const start = Date.now();
      
      // Basic server checks
      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();
      
      const responseTime = Date.now() - start;
      
      return {
        status: 'pass',
        message: 'Server is running normally',
        responseTime,
        details: {
          uptime,
          memoryUsage: {
            rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
            external: Math.round(memoryUsage.external / 1024 / 1024) // MB
          }
        }
      };
    } catch (error) {
      return {
        status: 'fail',
        message: 'Server health check failed',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Check external API health
   */
  private async checkExternalApi(): Promise<CheckResult> {
    try {
      const start = Date.now();
      const isHealthy = await this.apiClient.healthCheck();
      const responseTime = Date.now() - start;

      if (isHealthy) {
        return {
          status: 'pass',
          message: 'External API is accessible',
          responseTime
        };
      } else {
        return {
          status: 'fail',
          message: 'External API health check failed',
          responseTime
        };
      }
    } catch (error) {
      return {
        status: 'fail',
        message: 'External API is unreachable',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Check cache health
   */
  private async checkCache(): Promise<CheckResult> {
    try {
      const start = Date.now();
      
      // Test cache operations
      const testKey = 'health_check_test';
      const testValue = { test: true, timestamp: Date.now() };
      
      cache.set(testKey, testValue, 1); // 1 second TTL
      const retrieved = cache.get(testKey);
      cache.delete(testKey);
      
      const responseTime = Date.now() - start;
      const stats = cache.getStats();

      if (retrieved && (retrieved as any).test === true) {
        return {
          status: 'pass',
          message: 'Cache is functioning normally',
          responseTime,
          details: stats
        };
      } else {
        return {
          status: 'fail',
          message: 'Cache read/write test failed',
          responseTime
        };
      }
    } catch (error) {
      return {
        status: 'fail',
        message: 'Cache health check failed',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Check memory usage
   */
  private async checkMemory(): Promise<CheckResult> {
    try {
      const memoryUsage = process.memoryUsage();
      const totalMemory = require('os').totalmem();
      const freeMemory = require('os').freemem();
      const usedMemory = totalMemory - freeMemory;
      const memoryUsagePercent = (usedMemory / totalMemory) * 100;

      const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
      const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024;
      const heapUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

      let status: 'pass' | 'warn' | 'fail' = 'pass';
      let message = 'Memory usage is normal';

      if (memoryUsagePercent > 90) {
        status = 'fail';
        message = 'System memory usage is critically high';
      } else if (memoryUsagePercent > 80) {
        status = 'warn';
        message = 'System memory usage is high';
      }

      if (heapUsagePercent > 90) {
        status = 'fail';
        message = 'Heap memory usage is critically high';
      } else if (heapUsagePercent > 80 && status !== 'fail') {
        status = 'warn';
        message = 'Heap memory usage is high';
      }

      return {
        status,
        message,
        details: {
          system: {
            total: Math.round(totalMemory / 1024 / 1024), // MB
            used: Math.round(usedMemory / 1024 / 1024), // MB
            free: Math.round(freeMemory / 1024 / 1024), // MB
            usagePercent: Math.round(memoryUsagePercent * 100) / 100
          },
          heap: {
            used: Math.round(heapUsedMB),
            total: Math.round(heapTotalMB),
            usagePercent: Math.round(heapUsagePercent * 100) / 100
          }
        }
      };
    } catch (error) {
      return {
        status: 'fail',
        message: 'Memory check failed',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Calculate response time metrics
   */
  private calculateResponseTimeMetrics(): { average: number; p95: number; p99: number } {
    if (this.responseTimes.length === 0) {
      return { average: 0, p95: 0, p99: 0 };
    }

    const sorted = [...this.responseTimes].sort((a, b) => a - b);
    const average = this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);

    return {
      average: Math.round(average),
      p95: sorted[p95Index] || 0,
      p99: sorted[p99Index] || 0
    };
  }

  /**
   * Get overall health status
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const [serverCheck, externalCheck, cacheCheck, memoryCheck] = await Promise.all([
      this.checkServer(),
      this.checkExternalApi(),
      this.checkCache(),
      this.checkMemory()
    ]);

    const checks = {
      server: serverCheck,
      external: externalCheck,
      cache: cacheCheck,
      memory: memoryCheck
    };

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    const failedChecks = Object.values(checks).filter(check => check.status === 'fail');
    const warningChecks = Object.values(checks).filter(check => check.status === 'warn');

    if (failedChecks.length > 0) {
      status = 'unhealthy';
    } else if (warningChecks.length > 0) {
      status = 'degraded';
    }

    const cacheStats = cache.getStats();
    const responseTimeMetrics = this.calculateResponseTimeMetrics();

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks,
      metrics: {
        requests: {
          total: this.requestCounts.total,
          successful: this.requestCounts.successful,
          failed: this.requestCounts.failed,
          rate: this.requestCounts.total / (this.uptime / 60) // requests per minute
        },
        responseTime: responseTimeMetrics,
        cache: {
          hitRate: 0, // Would need to track hits/misses
          size: cacheStats.size,
          maxSize: cacheStats.maxSize
        }
      }
    };
  }

  get uptime(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }
}

// Create health monitor instance
let healthMonitor: HealthMonitor;

export function initializeHealthMonitor(apiClient: RentmanApiClient): void {
  healthMonitor = new HealthMonitor(apiClient);
}

/**
 * Health check endpoint
 */
export async function healthCheck(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!healthMonitor) {
      throw new Error('Health monitor not initialized');
    }

    const healthStatus = await healthMonitor.getHealthStatus();
    
    // Set appropriate HTTP status code
    const statusCode = healthStatus.status === 'healthy' ? 200 : 
                      healthStatus.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json(healthStatus);
  } catch (error) {
    logger.error('Health check failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      message: 'Health check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Metrics recording middleware
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!healthMonitor) {
    return next();
  }

  const start = Date.now();

  res.on('finish', () => {
    const responseTime = Date.now() - start;
    const success = res.statusCode >= 200 && res.statusCode < 400;
    healthMonitor.recordRequest(success, responseTime);
  });

  next();
}

/**
 * Simple health check (lighter version)
 */
export function simpleHealthCheck(req: Request, res: Response, next: NextFunction): void {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
}

export { healthMonitor };
export default healthCheck;
