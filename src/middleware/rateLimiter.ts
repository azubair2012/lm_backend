/**
 * Rate Limiting Middleware
 * Implements rate limiting using sliding window algorithm
 */

import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { logger } from '../utils/logger';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private requests = new Map<string, RateLimitEntry>();
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number = config.server.rateLimit.windowMs, maxRequests: number = config.server.rateLimit.max) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  /**
   * Check if request is within rate limit
   */
  isAllowed(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.requests.get(identifier);

    if (!entry || now > entry.resetTime) {
      // New window or expired entry
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs
      });

      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime: now + this.windowMs
      };
    }

    if (entry.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime
      };
    }

    // Increment count
    entry.count++;
    this.requests.set(identifier, entry);

    return {
      allowed: true,
      remaining: this.maxRequests - entry.count,
      resetTime: entry.resetTime
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.requests.entries()) {
      if (now > entry.resetTime) {
        this.requests.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`Cleaned up ${cleaned} expired rate limit entries`);
    }
  }

  /**
   * Get rate limit info for identifier
   */
  getInfo(identifier: string): { count: number; remaining: number; resetTime: number } {
    const entry = this.requests.get(identifier);
    const now = Date.now();

    if (!entry || now > entry.resetTime) {
      return {
        count: 0,
        remaining: this.maxRequests,
        resetTime: now + this.windowMs
      };
    }

    return {
      count: entry.count,
      remaining: Math.max(0, this.maxRequests - entry.count),
      resetTime: entry.resetTime
    };
  }
}

// Create rate limiter instance
const rateLimiter = new RateLimiter();

// Clean up expired entries every 5 minutes
setInterval(() => {
  rateLimiter.cleanup();
}, 5 * 60 * 1000);

/**
 * Rate limiting middleware
 */
export function rateLimit(options?: {
  windowMs?: number;
  max?: number;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
}) {
  const {
    windowMs = config.server.rateLimit.windowMs,
    max = config.server.rateLimit.max,
    keyGenerator = (req: Request) => req.ip || 'unknown',
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    message = 'Too many requests, please try again later.'
  } = options || {};

  const limiter = new RateLimiter(windowMs, max);

  return (req: Request, res: Response, next: NextFunction) => {
    const identifier = keyGenerator(req);
    const result = limiter.isAllowed(identifier);

    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': max.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
    });

    if (!result.allowed) {
      logger.warn(`Rate limit exceeded for ${identifier}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method
      });

      return res.status(429).json({
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message,
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        timestamp: new Date().toISOString()
      });
    }

    // Track response for conditional rate limiting
    if (skipSuccessfulRequests || skipFailedRequests) {
      const originalSend = res.send;
      res.send = function (body: any) {
        const statusCode = res.statusCode;
        const isSuccess = statusCode >= 200 && statusCode < 300;
        const isFailure = statusCode >= 400;

        if ((skipSuccessfulRequests && isSuccess) || (skipFailedRequests && isFailure)) {
          // Don't count this request - access private property through any
          const entry = (limiter as any).requests.get(identifier);
          if (entry) {
            entry.count = Math.max(0, entry.count - 1);
            (limiter as any).requests.set(identifier, entry);
          }
        }

        return originalSend.call(this, body);
      };
    }

    next();
  };
}

/**
 * IP-based rate limiting (default)
 */
export const ipRateLimit = rateLimit();

/**
 * User-based rate limiting (requires authentication)
 */
export const userRateLimit = rateLimit({
  keyGenerator: (req: Request) => {
    // In a real app, you'd get user ID from JWT or session
    return req.get('X-User-ID') || req.ip || 'anonymous';
  }
});

/**
 * Strict rate limiting for sensitive endpoints
 */
export const strictRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per 15 minutes
  message: 'Too many requests to sensitive endpoint, please try again later.'
});

/**
 * Lenient rate limiting for public endpoints
 */
export const lenientRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // 1000 requests per minute
});

export default rateLimiter;
