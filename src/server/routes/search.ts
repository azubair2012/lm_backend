/**
 * Search Routes
 * Advanced search functionality for Framer
 */

import { Router, Request, Response } from 'express';
import { RentmanApiClient } from '../../client/RentmanApiClient';
import { FramerSearchResponse, FramerApiResponse } from '../../types';

export default function searchRoutes(client: RentmanApiClient): Router {
  const router = Router();

  /**
   * GET /api/search/properties
   * Advanced property search
   */
  router.get('/properties', async (req: Request, res: Response) => {
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
          prop.DESCRIPTION.toLowerCase().includes(query) ||
          prop.strapline.toLowerCase().includes(query)
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

      // Calculate pagination
      const totalPages = Math.ceil(filteredProperties.length / parseInt(limit as string));
      const currentPage = parseInt(page as string);

      const searchResponse: FramerApiResponse<FramerSearchResponse> = {
        success: true,
        data: {
          properties: filteredProperties.map(prop => ({
            id: prop.propref,
            address: prop.displayaddress,
            price: prop.displayprice,
            rentMonth: parseFloat(prop.rentmonth),
            type: prop.TYPE,
            beds: parseInt(prop.beds),
            singles: parseInt(prop.singles),
            doubles: parseInt(prop.doubles),
            baths: parseInt(prop.baths),
            receptions: parseInt(prop.receps),
            furnished: prop.furnished,
            heating: prop.heating,
            available: prop.available,
            status: prop.STATUS,
            rating: parseInt(prop.rating),
            age: prop.age,
            description: prop.DESCRIPTION,
            strapline: prop.strapline,
            postcode: prop.postcode,
            area: prop.area,
            url: prop.url,
            images: {
              main: {
                thumb: `/api/images/${prop.photo1}_thumb.webp`,
                medium: `/api/images/${prop.photo1}_medium.webp`,
                large: `/api/images/${prop.photo1}_large.webp`,
                original: `/api/images/${prop.photo1}_original.webp`
              },
              floorplan: prop.floorplan ? {
                thumb: `/api/images/${prop.floorplan}_thumb.webp`,
                medium: `/api/images/${prop.floorplan}_medium.webp`,
                large: `/api/images/${prop.floorplan}_large.webp`,
                original: `/api/images/${prop.floorplan}_original.webp`
              } : undefined,
              gallery: []
            }
          })),
          pagination: {
            page: currentPage,
            limit: parseInt(limit as string),
            total: filteredProperties.length,
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
        message: `Found ${filteredProperties.length} properties matching search criteria`,
        timestamp: new Date().toISOString()
      };

      res.json(searchResponse);
    } catch (error) {
      console.error('Error in property search:', error);
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

  /**
   * GET /api/search/suggestions
   * Get search suggestions for autocomplete
   */
  router.get('/suggestions', async (req: Request, res: Response) => {
    try {
      const { q } = req.query;

      if (!q || (q as string).length < 2) {
        return res.json({
          success: true,
          data: {
            areas: [],
            types: [],
            addresses: []
          },
          message: 'Query too short',
          timestamp: new Date().toISOString()
        });
      }

      const response = await client.getPropertyAdvertising({ 
        limit: 100,
        noimage: 1 
      });

      const query = (q as string).toLowerCase();
      
      const suggestions = {
        areas: [...new Set(
          response.data
            .map(p => p.area)
            .filter(area => area.toLowerCase().includes(query))
        )].slice(0, 10),
        
        types: [...new Set(
          response.data
            .map(p => p.TYPE)
            .filter(type => type.toLowerCase().includes(query))
        )].slice(0, 10),
        
        addresses: [...new Set(
          response.data
            .map(p => p.displayaddress)
            .filter(addr => addr.toLowerCase().includes(query))
        )].slice(0, 10)
      };

      res.json({
        success: true,
        data: suggestions,
        message: 'Search suggestions generated',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error generating search suggestions:', error);
      res.status(500).json({
        success: false,
        data: {
          areas: [],
          types: [],
          addresses: []
        },
        message: 'Failed to generate suggestions',
        timestamp: new Date().toISOString()
      });
    }
  });

  return router;
}
