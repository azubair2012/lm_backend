/**
 * Properties Routes
 * Framer-optimized endpoints for property data
 */

import { Router, Request, Response } from 'express';
import { RentmanApiClient } from '../../client/RentmanApiClient';
import { FramerProperty, FramerApiResponse, FramerSearchResponse } from '../../types';
import { transformPropertyForFramer, transformPropertyForFramerSync, transformMediaForFramer } from '../../framer/dataTransformers';
import { FramerImage } from '../../types';

export default function propertyRoutes(client: RentmanApiClient): Router {
  const router = Router();

  /**
   * GET /api/properties
   * Get all properties with Framer-optimized format
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
      
      // Transform properties for Framer (sync version for fast loading)
      const framerProperties: FramerProperty[] = response.data.map(property => 
        transformPropertyForFramerSync(property)
      );

      const framerResponse: FramerApiResponse<FramerProperty[]> = {
        success: true,
        data: framerProperties,
        message: `Found ${framerProperties.length} properties`,
        timestamp: new Date().toISOString()
      };

      res.json(framerResponse);
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
        limit = 25 
      } = req.query;

      // Build search parameters
      const params: any = {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        noimage: 1
      };

      if (area) params.area = 1;
      if (featured === 'true') params.featured = 1;
      if (type) params.rob = type;

      const response = await client.getPropertyAdvertising(params);
      
      // Apply client-side filters
      let filteredProperties = Array.isArray(response.data) ? response.data : [response.data];

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
        filteredProperties = filteredProperties.filter(prop => 
          parseInt(prop.beds) >= bedCount
        );
      }

      if ((minPrice && typeof minPrice === 'string' && minPrice !== '') || (maxPrice && typeof maxPrice === 'string' && maxPrice !== '')) {
        filteredProperties = filteredProperties.filter(prop => {
          const price = parseFloat(prop.rentmonth);
          if (minPrice && typeof minPrice === 'string' && minPrice !== '' && price < parseFloat(minPrice)) return false;
          if (maxPrice && typeof maxPrice === 'string' && maxPrice !== '' && price > parseFloat(maxPrice)) return false;
          return true;
        });
      }

      // Transform properties for Framer (sync version for performance)
      const framerProperties: FramerProperty[] = filteredProperties.map(property => 
        transformPropertyForFramerSync(property)
      );

      // Calculate pagination
      const totalPages = Math.ceil(framerProperties.length / parseInt(limit as string));
      const currentPage = parseInt(page as string);

      const searchResponse: FramerApiResponse<FramerSearchResponse> = {
        success: true,
        data: {
          properties: framerProperties,
          pagination: {
            page: currentPage,
            limit: parseInt(limit as string),
            total: framerProperties.length,
            totalPages,
            hasNext: currentPage < totalPages,
            hasPrev: currentPage > 1
          },
          filters: {
            areas: [...new Set(filteredProperties.map(p => p.area))],
            types: [...new Set(filteredProperties.map(p => p.TYPE))],
            priceRange: {
              min: Math.min(...filteredProperties.map(p => parseFloat(p.rentmonth))),
              max: Math.max(...filteredProperties.map(p => parseFloat(p.rentmonth)))
            }
          }
        },
        message: `Found ${framerProperties.length} properties matching search criteria`,
        timestamp: new Date().toISOString()
      };

      res.json(searchResponse);
    } catch (error) {
      console.error('Error searching properties:', error);
      res.status(500).json({
        success: false,
        data: {
          properties: [],
          pagination: {
            page: 1,
            limit: 25,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false
          },
          filters: {
            areas: [],
            types: [],
            priceRange: { min: 0, max: 0 }
          }
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
      
      // Transform properties for Framer (sync version for performance)
      const framerProperties: FramerProperty[] = properties.map(property => 
        transformPropertyForFramerSync(property)
      );

      const framerResponse: FramerApiResponse<FramerProperty[]> = {
        success: true,
        data: framerProperties,
        message: `Found ${framerProperties.length} featured properties`,
        timestamp: new Date().toISOString()
      };

      res.json(framerResponse);
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
   * Get specific property by ID
   */
  router.get('/:id', async (req: Request, res: Response) => {
    console.log('🔍 ID route called with id:', req.params.id);
    try {
      const { id } = req.params;
      const { noimage = 1 } = req.query;

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

      // Transform property for Framer with media fetching
      const framerProperty = await transformPropertyForFramer(response.data[0], client);

      const framerResponse: FramerApiResponse<FramerProperty> = {
        success: true,
        data: framerProperty,
        message: 'Property found',
        timestamp: new Date().toISOString()
      };

      res.json(framerResponse);
    } catch (error) {
      console.error(`Error fetching property ${req.params.id}:`, error);
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
   * Get gallery images for a specific property (lazy loading)
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

      // Transform media for Framer
      const galleryImages = mediaResponse.data.map(transformMediaForFramer);

      const framerResponse: FramerApiResponse<FramerImage[]> = {
        success: true,
        data: galleryImages,
        message: `Found ${galleryImages.length} gallery images for property ${id}`,
        timestamp: new Date().toISOString()
      };

      res.json(framerResponse);
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
