/**
 * Properties Routes
 * Framer-optimized endpoints for property data
 */

import { Router, Request, Response } from 'express';
import { RentmanApiClient } from '../../client/RentmanApiClient';
import { FramerProperty, FramerApiResponse, FramerSearchResponse } from '../../types';
import { transformPropertyForFramer, transformMediaForFramer } from '../../framer/dataTransformers';

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
      
      // Transform properties for Framer
      const framerProperties: FramerProperty[] = response.data.map(transformPropertyForFramer);

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
   * GET /api/properties/:id
   * Get specific property by ID
   */
  router.get('/:id', async (req: Request, res: Response) => {
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

      // Transform property for Framer
      const framerProperty = transformPropertyForFramer(response.data[0]);

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
   * GET /api/properties/featured
   * Get featured properties
   */
  router.get('/featured', async (req: Request, res: Response) => {
    try {
      const { limit = 10 } = req.query;

      const properties = await client.getFeaturedProperties(parseInt(limit as string));
      
      // Transform properties for Framer
      const framerProperties: FramerProperty[] = properties.map(transformPropertyForFramer);

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
   * GET /api/properties/search
   * Search properties with filters
   */
  router.get('/search', async (req: Request, res: Response) => {
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
      if (featured) params.featured = 1;
      if (type) params.rob = type;

      const response = await client.getPropertyAdvertising(params);
      
      // Apply client-side filters
      let filteredProperties = response.data;

      if (q) {
        const query = (q as string).toLowerCase();
        filteredProperties = filteredProperties.filter(prop => 
          prop.displayaddress.toLowerCase().includes(query) ||
          prop.area.toLowerCase().includes(query) ||
          prop.DESCRIPTION.toLowerCase().includes(query)
        );
      }

      if (beds) {
        const bedCount = parseInt(beds as string);
        filteredProperties = filteredProperties.filter(prop => 
          parseInt(prop.beds) >= bedCount
        );
      }

      if (minPrice || maxPrice) {
        filteredProperties = filteredProperties.filter(prop => {
          const price = parseFloat(prop.rentmonth);
          if (minPrice && price < parseFloat(minPrice as string)) return false;
          if (maxPrice && price > parseFloat(maxPrice as string)) return false;
          return true;
        });
      }

      // Transform properties for Framer
      const framerProperties: FramerProperty[] = filteredProperties.map(transformPropertyForFramer);

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
            areas: [...new Set(response.data.map(p => p.area))],
            types: [...new Set(response.data.map(p => p.TYPE))],
            priceRange: {
              min: Math.min(...response.data.map(p => parseFloat(p.rentmonth))),
              max: Math.max(...response.data.map(p => parseFloat(p.rentmonth)))
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
        message: 'Search failed',
        timestamp: new Date().toISOString()
      });
    }
  });

  return router;
}
