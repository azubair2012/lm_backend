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

function extractEpcAndTaxBand(property: any): { epcrating: number | null; taxband: string | null } {
  const gradeToOrdinal: { [key: string]: number } = {
    A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7
  };
  const scoreToGrade = (score: number): string | null => {
    if (score >= 92) return 'A';
    if (score >= 81) return 'B';
    if (score >= 69) return 'C';
    if (score >= 55) return 'D';
    if (score >= 39) return 'E';
    if (score >= 21) return 'F';
    if (score >= 1) return 'G';
    return null;
  };

  // Prefer explicit grade in bullets if present (format: "Energy Rating : C")
  let grade: string | null = null;
  if (property.bullets) {
    const energyMatch = property.bullets.match(/Energy Rating\s*:\s*([A-G])/i);
    if (energyMatch) {
      grade = energyMatch[1].toUpperCase();
    }
  }

  // Otherwise normalize existing API value (can be letter or numeric score)
  if (!grade && property.epcrating !== null && property.epcrating !== undefined && property.epcrating !== '') {
    if (typeof property.epcrating === 'string') {
      const maybeGrade = property.epcrating.trim().toUpperCase();
      if (gradeToOrdinal[maybeGrade]) {
        grade = maybeGrade;
      } else {
        const numeric = Number(property.epcrating);
        if (Number.isFinite(numeric)) {
          grade = scoreToGrade(numeric);
        }
      }
    } else if (typeof property.epcrating === 'number') {
      grade = scoreToGrade(property.epcrating);
    }
  }

  const epcrating = grade ? (gradeToOrdinal[grade] || null) : null;

  // Extract council tax band from bullets field (format: "Council Tax Band B")
  let taxband = property.taxband || null;
  if (!taxband && property.bullets) {
    const taxMatch = property.bullets.match(/Council Tax Band\s+([A-H])/i);
    if (taxMatch) {
      taxband = taxMatch[1];
    }
  }

  return { epcrating, taxband };
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

      // Debug: log first property
      if (response.data && response.data.length > 0) {
        console.log('🔍 Raw API eprating:', response.data[0].epcrating);
        console.log('🔍 Raw API taxband:', response.data[0].taxband);
        console.log('🔍 Raw API bullets:', response.data[0].bullets);
      }

      // Process each property to add images object and extract EPC/tax ratings from bullets
      const processedProperties = response.data.map((property: any) => {
        const { epcrating, taxband } = extractEpcAndTaxBand(property);

        console.log('🔍 Processing property', property.propref, 'epcrating:', epcrating, 'taxband:', taxband);

        return {
          ...property,
          // Map API fields to our interface
          epcrating: epcrating,
          taxband: taxband,
          // Preserve geolocation field
          geolocation: property.geolocation || '',
          images: processPropertyImages(property)
        };
      });

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
        minSalePrice,
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
          const min = minPrice && typeof minPrice === 'string' ? parseFloat(minPrice) : 0;
          const max = maxPrice && typeof maxPrice === 'string' ? parseFloat(maxPrice) : Infinity;
          return price >= min && price <= max;
        });
      }

      if (minSalePrice && typeof minSalePrice === 'string' && minSalePrice !== '') {
        filteredProperties = filteredProperties.filter(prop => {
          const salePrice = prop.saleprice ? parseFloat(prop.saleprice) : 0;
          const min = parseFloat(minSalePrice);
          return salePrice >= min;
        });
      }

      if (featured === 'true') {
        filteredProperties = filteredProperties.filter(prop => (prop as any).featured === 1);
      }

      // Pagination
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;

      const paginatedProperties = filteredProperties.slice(startIndex, endIndex);

      // Extract unique areas and types
      const areas = [...new Set(allProperties.map(prop => prop.area).filter(Boolean))];
      const types = [...new Set(allProperties.map(prop => prop.TYPE).filter(Boolean))];

      // Calculate price range
      const prices = allProperties.map(prop => parseFloat(prop.rentmonth)).filter(price => !isNaN(price));
      const priceRange = {
        min: prices.length > 0 ? Math.min(...prices) : 0,
        max: prices.length > 0 ? Math.max(...prices) : 0
      };

      const searchData = {
        properties: paginatedProperties.map((property: any) => ({
          ...property,
          images: processPropertyImages(property)
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: filteredProperties.length,
          totalPages: Math.ceil(filteredProperties.length / limitNum),
          hasNext: endIndex < filteredProperties.length,
          hasPrev: pageNum > 1
        },
        filters: {
          areas,
          types,
          priceRange
        }
      };

      res.json({
        success: true,
        data: searchData,
        message: `Found ${paginatedProperties.length} properties matching search criteria (source: ${cacheSource})`,
        timestamp: new Date().toISOString()
      });
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
   * Get single property by ID
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { noimage = 1 } = req.query;

      let property: PropertyAdvertising | null = null;
      let cacheSource = 'cache';

      // Try to get property from Redis cache first
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
      const { epcrating, taxband } = extractEpcAndTaxBand(property);
      const processedProperty = {
        ...property,
        epcrating,
        taxband,
        geolocation: property.geolocation || '',
        images: processPropertyImages(property)
      };

      const apiResponse: ApiResponse<PropertyAdvertising> = {
        success: true,
        data: processedProperty as any,
        message: `Property found (source: ${cacheSource})`,
        timestamp: new Date().toISOString()
      };

      res.json(apiResponse);
    } catch (error) {
      console.error('Error fetching property:', error);
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
   * Get property gallery images
   */
  router.get('/:id/gallery', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Try to get property from Redis cache first
      let property = await redisCache.get<PropertyAdvertising>(RedisCacheKeys.property(id));

      // Fallback to API if not in cache
      if (!property) {
        const response = await client.getPropertyAdvertising({
          propref: id,
          noimage: 0 // We need images for gallery
        });
        property = response.data[0];
      }

      if (!property) {
        return res.status(404).json({
          success: false,
          data: null,
          message: `Property with ID ${id} not found`,
          timestamp: new Date().toISOString()
        });
      }

      const images = processPropertyImages(property);

      const apiResponse: ApiResponse<any> = {
        success: true,
        data: images,
        message: `Found gallery images for property ${id}`,
        timestamp: new Date().toISOString()
      };

      res.json(apiResponse);
    } catch (error) {
      console.error('Error fetching property gallery:', error);
      res.status(500).json({
        success: false,
        data: null,
        message: 'Failed to fetch property gallery',
        timestamp: new Date().toISOString()
      });
    }
  });

  return router;
}