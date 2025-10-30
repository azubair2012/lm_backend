/**
 * Configuration Management
 * Centralized configuration for the Rentman API Client
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface AppConfig {
  server: {
    port: number;
    host: string;
    corsOrigin: string;
    rateLimit: {
      windowMs: number;
      max: number;
    };
  };
  rentman: {
    baseUrl: string;
    token: string;
    timeout: number;
    retries: number;
  };
  images: {
    cdnUrl?: string;
    cacheDir: string;
    maxFileSize: number;
    allowedFormats: string[];
    quality: {
      thumb: number;
      medium: number;
      large: number;
    };
  };
  cache: {
    ttl: number;
    maxSize: number;
  };
  cloudinary: {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
    folder: string;
    secure: boolean;
  };
  logging: {
    level: string;
    format: string;
  };
}

const config: AppConfig = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || 'localhost',
    corsOrigin: process.env.CORS_ORIGIN || '*',
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
      max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10) // 100 requests per window
    }
  },
  rentman: {
    baseUrl: process.env.RENTMAN_BASE_URL || 'https://www.rentman.online',
    token: process.env.RENTMAN_TOKEN || '',
    timeout: parseInt(process.env.RENTMAN_TIMEOUT || '30000', 10), // 30 seconds
    retries: parseInt(process.env.RENTMAN_RETRIES || '3', 10)
  },
  images: {
    cdnUrl: process.env.IMAGE_CDN_URL,
    cacheDir: process.env.IMAGE_CACHE_DIR || './public/images',
    maxFileSize: parseInt(process.env.IMAGE_MAX_FILE_SIZE || '10485760', 10), // 10MB
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    quality: {
      thumb: parseInt(process.env.IMAGE_QUALITY_THUMB || '80', 10),
      medium: parseInt(process.env.IMAGE_QUALITY_MEDIUM || '85', 10),
      large: parseInt(process.env.IMAGE_QUALITY_LARGE || '90', 10)
    }
  },
  cache: {
    ttl: parseInt(process.env.CACHE_TTL || '3600', 10), // 1 hour
    maxSize: parseInt(process.env.CACHE_MAX_SIZE || '100', 10) // 100 items
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    folder: process.env.CLOUDINARY_FOLDER || 'rentman-properties',
    secure: process.env.NODE_ENV === 'production'
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined'
  }
};

// Validation
export function validateConfig(): void {
  const errors: string[] = [];

  if (!config.rentman.token) {
    errors.push('RENTMAN_TOKEN is required');
  }

  if (!config.rentman.baseUrl) {
    errors.push('RENTMAN_BASE_URL is required');
  }

  if (config.server.port < 1 || config.server.port > 65535) {
    errors.push('PORT must be between 1 and 65535');
  }

  if (config.rentman.timeout < 1000) {
    errors.push('RENTMAN_TIMEOUT must be at least 1000ms');
  }

  if (config.rentman.retries < 0 || config.rentman.retries > 10) {
    errors.push('RENTMAN_RETRIES must be between 0 and 10');
  }

  if (!config.cloudinary.cloudName) {
    errors.push('CLOUDINARY_CLOUD_NAME is required');
  }

  if (!config.cloudinary.apiKey) {
    errors.push('CLOUDINARY_API_KEY is required');
  }

  if (!config.cloudinary.apiSecret) {
    errors.push('CLOUDINARY_API_SECRET is required');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

export { config };
export default config;
