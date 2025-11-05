/**
 * Express.js Application Setup
 * Main server configuration for API endpoints
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { config, validateConfig } from '../config';
import { RentmanApiClient } from '../client/RentmanApiClient';
import { RentmanApiConfig } from '../types';
import { logger, serverLogger } from '../utils/logger';
import { cache, CacheKeys } from '../utils/cache';
import { rateLimit, ipRateLimit } from '../middleware/rateLimiter';
import { 
  errorHandler, 
  notFoundHandler, 
  requestIdMiddleware,
  asyncHandler 
} from '../middleware/errorHandler';
import { 
  healthCheck, 
  metricsMiddleware, 
  initializeHealthMonitor 
} from '../middleware/healthCheck';
import { cloudinaryService } from '../utils/cloudinaryService';

// Validate configuration
try {
  validateConfig();
} catch (error) {
  logger.error('Configuration validation failed', { error: error instanceof Error ? error.message : 'Unknown error' });
  process.exit(1);
}

// Import routes
import propertyRoutes from './routes/properties';
import mediaRoutes from './routes/media';
import searchRoutes from './routes/search';

export class RentmanServer {
  private app: express.Application;
  private client: RentmanApiClient;
  private port: number;
  private uploadingImages: Map<string, Promise<Record<string, string>>> = new Map();

  constructor() {
    this.app = express();
    this.port = config.server.port;
    
    // Initialize Rentman API client
    const apiConfig: RentmanApiConfig = {
      token: config.rentman.token,
      baseURL: config.rentman.baseUrl,
      timeout: config.rentman.timeout,
      retries: config.rentman.retries
    };
    
    this.client = new RentmanApiClient(apiConfig);
    
    // Initialize health monitor
    initializeHealthMonitor(this.client);
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Setup middleware
   */
  private setupMiddleware(): void {
    // Request ID middleware
    this.app.use(requestIdMiddleware);

    // CORS configuration
    this.app.use(cors({
      origin: config.server.corsOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID']
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Static files for images - REMOVED: Now handled by dynamic Cloudinary fetching
    // this.app.use('/api/images', express.static(path.join(__dirname, '../../public/images')));

    // Request logging
    this.app.use((req, res, next) => {
      const requestId = req.headers['x-request-id'] as string;
      serverLogger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        requestId
      });
      next();
    });

    // Metrics middleware
    this.app.use(metricsMiddleware);

    // Rate limiting
    this.app.use('/api', ipRateLimit);
  }

  /**
   * Setup routes
   */
  private setupRoutes(): void {
    // Health check endpoints
    this.app.get('/api/health', asyncHandler(healthCheck));
    this.app.get('/health', (req, res) => {
      res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    // API routes
    this.app.use('/api/properties', propertyRoutes(this.client));
    this.app.use('/api/media', mediaRoutes(this.client));
    this.app.use('/api/search', searchRoutes(this.client));

    // Image serving route with dynamic Cloudinary fetching
    this.app.get('/api/images/:filename', asyncHandler(async (req: any, res: any) => {
      const { filename } = req.params;
      const { size } = req.query;
      
      // Log request for debugging
      console.log(`📸 Image request: ${filename}, size: ${size || 'default'}`);
      
      try {
        // Extract size from filename or query parameter (e.g., image_thumb.webp -> thumb)
        let imageSize = size as string || 'medium';
        const sizeMatch = filename.match(/_(\w+)\./);
        if (sizeMatch) {
          imageSize = sizeMatch[1];
        }
        
        // Extract base filename without size suffix
        const baseFilename = filename.replace(/_\w+\./, '.');
        const baseNameWithoutExt = baseFilename.replace(/\.[^/.]+$/, '');
        // Ensure publicId doesn't include version prefix
        const publicId = `${config.cloudinary.folder}/${baseNameWithoutExt}`.replace(/^v\d+\//, '');
        
        console.log(`🔍 Looking for image: publicId=${publicId}, baseFilename=${baseFilename}`);
        
        // Check cache first - avoid unnecessary Cloudinary API calls
        const cacheKey = CacheKeys.image(baseFilename, imageSize);
        const cachedUrl = cache.get<string>(cacheKey);
        
        if (cachedUrl) {
          console.log(`✅ Image found in cache: ${filename}`);
          return res.redirect(302, cachedUrl);
        }
        
        // Check if image exists in Cloudinary first
        // Note: uploadMultipleSizes now uploads the original image (no suffix), transformations applied on-the-fly
        try {
          const imageInfo = await cloudinaryService.getImageInfo(publicId);
          const version = imageInfo.version?.toString() || undefined;
          
          // Generate Cloudinary URL with transformations (including version)
          const imageUrl = cloudinaryService.generateSizeUrl(
            publicId, 
            imageSize as 'thumb' | 'medium' | 'large' | 'original',
            version
          );
          
          console.log(`✅ Image found in Cloudinary: ${filename} (version: ${version})`);
          
          // Cache the URL for 1 hour (matching nginx cache TTL)
          cache.set(cacheKey, imageUrl, 3600);
          
          // Redirect to Cloudinary URL
          res.redirect(302, imageUrl);
          
        } catch (cloudinaryError) {
          // Log the error for debugging
          console.log(`⚠️ Cloudinary check failed for ${publicId}:`, cloudinaryError instanceof Error ? cloudinaryError.message : cloudinaryError);
          console.log(`❌ Image ${filename} not found in Cloudinary, fetching from Rentman API...`);
          
          try {
            // Check if this image is already being uploaded
            const uploadKey = baseFilename;
            
            // Check and atomically acquire lock - if another request already started, wait for it
            let uploadPromise = this.uploadingImages.get(uploadKey);
            
            if (uploadPromise) {
              console.log(`⏳ Image ${filename} is already being uploaded, waiting for completion...`);
              const cloudinaryResults = await uploadPromise;
              const imageUrl = cloudinaryResults[imageSize] || cloudinaryResults['medium'];
              return res.redirect(302, imageUrl);
            }
            
            // No upload in progress - create new upload promise and acquire lock atomically
            console.log(`🔒 Acquiring upload lock for ${filename}...`);
            uploadPromise = (async () => {
              // Fetch image from Rentman API
              const mediaResponse = await this.client.getPropertyMedia({ 
                filename: baseFilename 
              });
              
              if (mediaResponse.data.length === 0) {
                throw new Error(`Image ${filename} not found in Rentman API`);
              }
              
              const media = mediaResponse.data[0];
              
              if (!media.base64data) {
                throw new Error(`No base64 data for image ${filename}`);
              }
              
              console.log(`📥 Fetched image ${filename} from Rentman API, uploading to Cloudinary...`);
              
              // Upload to Cloudinary with multiple sizes (returns URLs with proper versions)
              const cloudinaryResults = await cloudinaryService.uploadMultipleSizes(
                media.base64data,
                baseFilename
              );
              
              console.log(`✅ Uploaded ${filename} to Cloudinary successfully`);
              
              // Cache all size URLs for 1 hour (matching nginx cache TTL)
              Object.entries(cloudinaryResults).forEach(([size, url]) => {
                const sizeCacheKey = CacheKeys.image(baseFilename, size);
                cache.set(sizeCacheKey, url as string, 3600);
              });
              
              return cloudinaryResults;
            })();
            
            // Store the promise IMMEDIATELY to prevent race conditions
            this.uploadingImages.set(uploadKey, uploadPromise);
            console.log(`✅ Upload lock acquired for ${filename}`);
            
            try {
              const cloudinaryResults = await uploadPromise;
              const imageUrl = cloudinaryResults[imageSize] || cloudinaryResults['medium'];
              res.redirect(302, imageUrl);
            } finally {
              // Clean up after upload completes (success or failure)
              this.uploadingImages.delete(uploadKey);
              console.log(`🔓 Upload lock released for ${filename}`);
            }
            
          } catch (rentmanError) {
            console.error(`❌ Failed to fetch image ${filename} from Rentman API:`, rentmanError);
            
            // Log full error details for debugging
            if (rentmanError instanceof Error) {
              console.error(`Error message: ${rentmanError.message}`);
              console.error(`Error stack: ${rentmanError.stack}`);
            }
            
            res.status(404).json({
              success: false,
              message: `Image ${filename} not found in Rentman API`,
              details: rentmanError instanceof Error ? rentmanError.message : String(rentmanError),
              timestamp: new Date().toISOString()
            });
          }
        }
        
      } catch (error) {
        console.error(`❌ Error serving image ${filename}:`, error);
        if (error instanceof Error) {
          console.error(`Error message: ${error.message}`);
          console.error(`Error stack: ${error.stack}`);
        }
        res.status(500).json({
          success: false,
          message: `Failed to serve image ${filename}`,
          details: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        });
      }
    }));

    // Image upload route to Cloudinary
    this.app.post('/api/images/upload', asyncHandler(async (req: any, res: any) => {
      try {
        const { base64Data, filename } = req.body;
        
        if (!base64Data || !filename) {
          return res.status(400).json({
            success: false,
            message: 'base64Data and filename are required',
            timestamp: new Date().toISOString()
          });
        }
        
        // Upload to Cloudinary
        const results = await cloudinaryService.uploadMultipleSizes(base64Data, filename);
        
        res.json({
          success: true,
          data: results,
          message: 'Image uploaded successfully to Cloudinary',
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error('Error uploading image to Cloudinary:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to upload image to Cloudinary',
          timestamp: new Date().toISOString()
        });
      }
    }));

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        success: true,
        message: 'Rentman API Client Server',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        endpoints: {
          health: '/api/health',
          properties: '/api/properties',
          media: '/api/media',
          search: '/api/search',
          images: '/api/images'
        },
        documentation: {
          api: '/docs/api-reference'
        },
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  /**
   * Start the server
   */
  public async start(): Promise<void> {
    try {
      // Test API connection
      const isHealthy = await this.client.healthCheck();
      if (!isHealthy) {
        serverLogger.warn('Warning: Rentman API connection test failed');
      }

      const server = this.app.listen(this.port, () => {
        serverLogger.serverReady(this.port, config.server.host);
        logger.info('Server started successfully', {
          port: this.port,
          environment: process.env.NODE_ENV || 'development',
          version: '1.0.0'
        });
      });

      // Graceful shutdown
      process.on('SIGTERM', () => {
        serverLogger.info('SIGTERM received, shutting down gracefully');
        server.close(() => {
          logger.info('Server closed');
          process.exit(0);
        });
      });

      process.on('SIGINT', () => {
        serverLogger.info('SIGINT received, shutting down gracefully');
        server.close(() => {
          logger.info('Server closed');
          process.exit(0);
        });
      });

      // Handle uncaught exceptions
      process.on('uncaughtException', (error) => {
        logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
        process.exit(1);
      });

      process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled Rejection', { reason, promise });
        process.exit(1);
      });

    } catch (error) {
      logger.error('Failed to start server', { error: error instanceof Error ? error.message : 'Unknown error' });
      process.exit(1);
    }
  }

  /**
   * Get Express app instance
   */
  public getApp(): express.Application {
    return this.app;
  }
}
