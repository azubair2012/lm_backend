/**
 * Properties Routes
 * API endpoints for property data
 */

import { Router, Request, Response } from 'express';
import { RentmanApiClient } from '../../client/RentmanApiClient';
import { PropertyAdvertising, PropertyMedia, ApiResponse } from '../../types';
import { cloudinaryService } from '../../utils/cloudinaryService';
import { config } from '../../config';
import { cache, CacheKeys } from '../../utils/cache';
import { redisCache, RedisCacheKeys } from '../../utils/redisCache';

/**
 * Process property images from raw photo fields
 */
function processPropertyImages(property: any) {
  const images: any = {
    main: null,
    gallery: [],
    thumbnails: []
  };

  // Extract all photo fields (photo1, photo2, etc.)
  const photoFields = Object.keys(property).filter(key => key.startsWith('photo') && property[key]);
  const photos = photoFields.map(key => property[key]).filter(Boolean);

  if (photos.length > 0) {
    // Set main image (first photo)
    images.main = {
      url: `/api/images/${photos[0]}`,
      alt: `Property Image 1`,
      width: 1200,
      height: 800
    };

    // Create gallery array
    images.gallery = photos.map((photo, index) => ({
      url: `/api/images/${photo}`,
      alt: `Property Image ${index + 1}`,
      width: 1200,
      height: 800,
      thumbnail: `/api/images/${photo}?w=300&h=200&fit=crop`
    }));

    // Create thumbnails array
    images.thumbnails = photos.map((photo, index) => ({
      url: `/api/images/${photo}?w=300&h=200&fit=crop`,
      alt: `Property Image ${index + 1} thumbnail`,
      width: 300,
      height: 200
    }));
  }

  // Add floorplan if available
  if (property.floorplan && property.floorplan.trim()) {
    images.floorplan = {
      thumb: `/api/images/${property.floorplan}`,
      medium: `/api/images/${property.floorplan}`,
      large: `/api/images/${property.floorplan}`,
      original: `/api/images/${property.floorplan}`,
    };
  }

  return images;
}

export default function propertyRoutes(client: RentmanApiClient): Router {
  const router = Router();

  /**
   * GET /api/properties
   * Get all properties
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const { 
        page = 1, 
        limit = 25, 
        featured, 
        area, 
        rob,
        noimage = 1 
      } = req.query;

      const params = {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        ...(featured && { featured: parseInt(featured as string) }),
        ...(area && { area: parseInt(area as string) }),
        ...(rob && { rob: rob as 'rent' | 'sale' }),
        noimage: parseInt(noimage as string)
      };

      const response = await client.getPropertyAdvertising(params);
      
      // Process each property to add images object
      // Explicitly preserve geolocation field
      const processedProperties = response.data.map((property: any) => ({
        ...property,
        geolocation: property.geolocation || '',
        images: processPropertyImages(property)
      }));
      
      const apiResponse: ApiResponse<PropertyAdvertising[]> = {
        success: true,
        data: processedProperties,
        message: `Found ${processedProperties.length} properties`,
        timestamp: new Date().toISOString()
      };

      res.json(apiResponse);
      
    } catch (error) {
      console.error('Error fetching properties:', error);
      res.status(500).json({
        success: false,
        data: [],
        message: 'Failed to fetch properties',
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * GET /api/properties/search
   * Search properties with filters
   */
  router.get('/search', async (req: Request, res: Response) => {
    console.log('🔍 Search route called with query:', req.query);
    try {
      const { 
        q, 
        area, 
        type, 
        beds, 
        minPrice, 
        maxPrice, 
        featured,
        page = 1, 
        limit = 12 
      } = req.query;

      // Try to get properties from Redis cache first
      let allProperties: PropertyAdvertising[] = [];
      let cacheSource = 'redis';

      if (config.redis.enabled && redisCache.isReady()) {
        const cachedProperties = await redisCache.get<PropertyAdvertising[]>(RedisCacheKeys.allProperties());
        
        if (cachedProperties && cachedProperties.length > 0) {
          allProperties = cachedProperties;
          console.log(`✅ Using ${cachedProperties.length} properties from Redis cache`);
        }
      }

      // Fallback to API if Redis cache miss or disabled
      if (allProperties.length === 0) {
        cacheSource = 'api';
        console.log('⚠️ Redis cache miss or disabled, fetching from Rentman API');
        
      const params: any = {
        noimage: 1,
        limit: 1000 // Fetch all properties
      };

      if (area) params.area = 1;
      if (featured === 'true') params.featured = 1;
      if (type) params.rob = type;

      const response = await client.getPropertyAdvertising(params);
        allProperties = Array.isArray(response.data) ? response.data : [response.data];
        
        // Cache in Redis for 15 minutes as emergency backup
        if (config.redis.enabled && redisCache.isReady()) {
          await redisCache.set(RedisCacheKeys.allProperties(), allProperties, 900);
        }
      }
      
      // Apply client-side filters
      let filteredProperties = allProperties;

      if (q && typeof q === 'string' && q.trim() !== '') {
        const query = q.toLowerCase();
        filteredProperties = filteredProperties.filter(prop => 
          prop.displayaddress?.toLowerCase().includes(query) ||
          prop.address3?.toLowerCase().includes(query) ||
          prop.area?.toLowerCase().includes(query) ||
          prop.DESCRIPTION?.toLowerCase().includes(query) ||
          prop.strapline?.toLowerCase().includes(query)
        );
      }

      if (beds && typeof beds === 'string' && beds !== '') {
        const bedCount = parseInt(beds);
        filteredProperties = filteredProperties.filter(prop => {
          const totalBeds = parseInt(prop.beds) + parseInt(prop.singles) + parseInt(prop.doubles);
          return totalBeds === bedCount;
        });
      }

      if ((minPrice && typeof minPrice === 'string' && minPrice !== '') || (maxPrice && typeof maxPrice === 'string' && maxPrice !== '')) {
        filteredProperties = filteredProperties.filter(prop => {
          const price = parseFloat(prop.rentmonth);
          if (minPrice && typeof minPrice === 'string' && minPrice !== '' && price < parseFloat(minPrice)) return false;
          if (maxPrice && typeof maxPrice === 'string' && maxPrice !== '' && price > parseFloat(maxPrice)) return false;
          return true;
        });
      }

      const total = filteredProperties.length;
      const requestedLimit = parseInt(limit as string);
      const totalPages = Math.ceil(total / requestedLimit);
      const currentPage = parseInt(page as string);

      console.log('📊 Search pagination:', { 
        total, 
        limit: requestedLimit, 
        totalPages, 
        currentPage,
        hasNext: currentPage < totalPages
      });

      // Apply pagination by slicing the filtered array
      const startIndex = (currentPage - 1) * requestedLimit;
      const endIndex = startIndex + requestedLimit;
      const paginatedProperties = filteredProperties.slice(startIndex, endIndex);

      // Process each property to add images object
      // Explicitly preserve geolocation field
      const processedProperties = paginatedProperties.map((property: any) => ({
        ...property,
        geolocation: property.geolocation || '',
        images: processPropertyImages(property)
      }));

      const searchResponse: ApiResponse<{
        properties: PropertyAdvertising[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
          hasNext: boolean;
          hasPrev: boolean;
        };
        filters: {
          areas: string[];
          types: string[];
          priceRange: { min: number; max: number };
        };
      }> = {
        success: true,
        data: {
          properties: processedProperties,
          pagination: {
            page: currentPage,
            limit: parseInt(limit as string),
            total: total,
            totalPages,
            hasNext: currentPage < totalPages,
            hasPrev: currentPage > 1
          },
          filters: {
            areas: [...new Set(processedProperties.map(p => p.area))],
            types: [...new Set(processedProperties.map(p => p.TYPE))],
            priceRange: {
              min: Math.min(...processedProperties.map(p => parseFloat(p.rentmonth))),
              max: Math.max(...processedProperties.map(p => parseFloat(p.rentmonth)))
            }
          }
        },
        message: `Found ${processedProperties.length} properties matching search criteria (source: ${cacheSource})`,
        timestamp: new Date().toISOString()
      };
      res.json(searchResponse);
    } catch (error) {
      console.error('Error searching properties:', error);
      res.status(500).json({
        success: false,
        data: {
          properties: [],
          pagination: { page: 1, limit: 25, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
          filters: { areas: [], types: [], priceRange: { min: 0, max: 0 } }
        },
        message: 'Failed to search properties',
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * GET /api/properties/featured
   * Get featured properties
   */
  router.get('/featured', async (req: Request, res: Response) => {
    try {
      const { limit = 10 } = req.query;

      const properties = await client.getFeaturedProperties(parseInt(limit as string));
      
      // Process each property to add images object
      // Explicitly preserve geolocation field
      const processedProperties = properties.map((property: any) => ({
        ...property,
        geolocation: property.geolocation || '',
        images: processPropertyImages(property)
      }));
      
      const apiResponse: ApiResponse<PropertyAdvertising[]> = {
        success: true,
        data: processedProperties,
        message: `Found ${processedProperties.length} featured properties`,
        timestamp: new Date().toISOString()
      };

      res.json(apiResponse);
    } catch (error) {
      console.error('Error fetching featured properties:', error);
      res.status(500).json({
        success: false,
        data: [],
        message: 'Failed to fetch featured properties',
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * GET /api/properties/:id
   * Get a specific property by ID
   */
  router.get('/:id', async (Request, res: Response) => {
    console.log('🔍 ID route called with id:', Request.params.id);
    try {
      const { id } = Request.params;
      const { noimage = 1 } = Request.query;

      let property: PropertyAdvertising | null = null;
      let cacheSource = 'redis';

      // Try Redis cache first
      if (config.redis.enabled && redisCache.isReady()) {
        property = await redisCache.get<PropertyAdvertising>(RedisCacheKeys.property(id));
        if (property) {
          console.log(`✅ Property ${id} found in Redis cache`);
        }
      }

      // Fallback to API if not in cache
      if (!property) {
        cacheSource = 'api';
        console.log(`⚠️ Property ${id} not in Redis cache, fetching from API`);

      const response = await client.getPropertyAdvertising({
        propref: id,
        noimage: parseInt(noimage as string)
      });

      if (response.data.length === 0) {
        return res.status(404).json({
          success: false,
          data: null,
          message: `Property with ID ${id} not found`,
          timestamp: new Date().toISOString()
        });
        }

        property = response.data[0];
        
        // Cache in Redis for 2 hours
        if (config.redis.enabled && redisCache.isReady()) {
          await redisCache.set(RedisCacheKeys.property(id), property, 7200);
        }
      }

      // Process the property data to add images object
      // Explicitly preserve geolocation field to ensure it's not lost
      const processedProperty: any = {
        ...property,
        geolocation: (property as any).geolocation || property.geolocation || '',
        images: processPropertyImages(property)
      };

      // Debug logging for geolocation
      console.log('🔍 Property geolocation debug:', {
        propref: property.propref,
        hasGeolocation: 'geolocation' in property,
        geolocation: (property as any).geolocation,
        geolocationType: typeof (property as any).geolocation,
        processedGeolocation: processedProperty.geolocation,
      });

      const apiResponse: ApiResponse<PropertyAdvertising> = {
        success: true,
        data: processedProperty,
        message: `Property found (source: ${cacheSource})`,
        timestamp: new Date().toISOString()
      };

      res.json(apiResponse);
    } catch (error) {
      console.error(`Error fetching property ${Request.params.id}:`, error);
      res.status(500).json({
        success: false,
        data: null,
        message: 'Failed to fetch property',
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * GET /api/properties/:id/gallery
   * Get gallery images for a specific property
   */
  router.get('/:id/gallery', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Fetch media for this property
      const mediaResponse = await client.getPropertyMedia({ propref: id });
      
      if (mediaResponse.data.length === 0) {
        return res.json({
          success: true,
          data: [],
          message: `No gallery images found for property ${id}`,
          timestamp: new Date().toISOString()
        });
      }

      // Upload all gallery images to Cloudinary immediately to ensure they're available
      // This prevents 404s when the frontend requests images by filename
      console.log(`📤 Uploading ${mediaResponse.data.length} gallery images to Cloudinary for property ${id}...`);
      
      const uploadPromises = mediaResponse.data.map(async (media) => {
        if (!media.base64data) {
          console.warn(`⚠️ No base64 data for gallery image ${media.filename}`);
          return { success: false, filename: media.filename, reason: 'No base64 data' };
        }

        try {
          // Upload to Cloudinary with multiple sizes (returns URLs with proper versions)
          const cloudinaryResults = await cloudinaryService.uploadMultipleSizes(
            media.base64data,
            media.filename
          );

          // Cache the URLs returned from upload (already have correct versions)
          Object.entries(cloudinaryResults).forEach(([size, url]) => {
            cache.set(CacheKeys.image(media.filename, size), url, 3600);
          });

          console.log(`✅ Uploaded and cached gallery image: ${media.filename}`);
          return { success: true, filename: media.filename };
        } catch (uploadError) {
          console.error(`❌ Failed to upload gallery image ${media.filename}:`, uploadError);
          return { 
            success: false, 
            filename: media.filename, 
            reason: uploadError instanceof Error ? uploadError.message : String(uploadError) 
          };
        }
      });

      // Wait for all uploads to complete (using allSettled to handle errors gracefully)
      const uploadResults = await Promise.allSettled(uploadPromises);
      const successfulUploads = uploadResults.filter(r => r.status === 'fulfilled' && r.value?.success).length;
      const failedUploads = uploadResults.length - successfulUploads;
      
      if (failedUploads > 0) {
        console.warn(`⚠️ Failed to upload ${failedUploads} out of ${uploadResults.length} gallery images for property ${id}`);
      } else {
        console.log(`✅ Successfully uploaded all ${successfulUploads} gallery images for property ${id}`);
      }

      const apiResponse: ApiResponse<PropertyMedia[]> = {
        success: true,
        data: mediaResponse.data,
        message: `Found ${mediaResponse.data.length} gallery images for property ${id}`,
        timestamp: new Date().toISOString()
      };

      res.json(apiResponse);
    } catch (error) {
      console.error(`Error fetching gallery for property ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        data: [],
        message: 'Failed to fetch gallery images',
        timestamp: new Date().toISOString()
      });
    }
  });

  return router;
}