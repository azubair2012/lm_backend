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
import { cache } from '../utils/cache';
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

    // Static files for images
    this.app.use('/api/images', express.static(path.join(__dirname, '../../public/images')));

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

    // Image serving route with caching
    this.app.get('/api/images/:filename', asyncHandler(async (req: any, res: any) => {
      const { filename } = req.params;
      const cacheDir = path.join(__dirname, '../../public/images/cache');
      const imagePath = path.join(cacheDir, filename);
      
      try {
        // Check if image exists in cache
        if (fs.existsSync(imagePath)) {
          console.log(`Serving cached image: ${filename}`);
          
          // Serve from cache
          const imageBuffer = fs.readFileSync(imagePath);
          const extension = filename.split('.').pop()?.toLowerCase();
          const contentType = extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' : 
                             extension === 'png' ? 'image/png' : 
                             extension === 'webp' ? 'image/webp' : 'image/jpeg';
          
          res.set({
            'Content-Type': contentType,
            'Content-Length': imageBuffer.length,
            'Cache-Control': 'public, max-age=31536000', // 1 year cache
            'ETag': `"${filename}"`,
            'X-Cache': 'HIT'
          });
          
          return res.send(imageBuffer);
        }
        
        console.log(`Cache miss, fetching image: ${filename}`);
        
        // Image not in cache, fetch from external API
        const mediaResponse = await this.client.getPropertyMedia({ filename });
        
        if (mediaResponse.data.length === 0) {
          return res.status(404).json({
            success: false,
            message: `Image ${filename} not found`,
            timestamp: new Date().toISOString()
          });
        }
        
        const media = mediaResponse.data[0];
        const imageBuffer = Buffer.from(media.base64data, 'base64');
        
        // Ensure cache directory exists
        if (!fs.existsSync(cacheDir)) {
          fs.mkdirSync(cacheDir, { recursive: true });
          console.log(`Created cache directory: ${cacheDir}`);
        }
        
        // Save to cache
        fs.writeFileSync(imagePath, imageBuffer);
        console.log(`Cached image: ${filename} (${imageBuffer.length} bytes)`);
        
        // Determine content type based on file extension
        const extension = filename.split('.').pop()?.toLowerCase();
        const contentType = extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' : 
                           extension === 'png' ? 'image/png' : 
                           extension === 'webp' ? 'image/webp' : 'image/jpeg';
        
        // Set appropriate headers
        res.set({
          'Content-Type': contentType,
          'Content-Length': imageBuffer.length,
          'Cache-Control': 'public, max-age=31536000', // 1 year cache
          'ETag': `"${filename}"`,
          'X-Cache': 'MISS'
        });
        
        // Send the image data
        res.send(imageBuffer);
        
      } catch (error) {
        console.error(`Error serving image ${filename}:`, error);
        res.status(500).json({
          success: false,
          message: 'Failed to serve image',
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
