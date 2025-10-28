/**
 * Media Routes
 * API endpoints for property media
 */

import { Router, Request, Response } from 'express';
import { RentmanApiClient } from '../../client/RentmanApiClient';
import { PropertyMedia, ApiResponse } from '../../types';

export default function mediaRoutes(client: RentmanApiClient): Router {
  const router = Router();

  /**
   * GET /api/media/:propertyId
   * Get all media for a specific property
   */
  router.get('/:propertyId', async (req: Request, res: Response) => {
    try {
      const { propertyId } = req.params;

      const response = await client.getPropertyMedia({ propref: propertyId });
      
      const apiResponse: ApiResponse<PropertyMedia[]> = {
        success: true,
        data: response.data,
        message: `Found ${response.data.length} media files for property ${propertyId}`,
        timestamp: new Date().toISOString()
      };

      res.json(apiResponse);
    } catch (error) {
      console.error(`Error fetching media for property ${req.params.propertyId}:`, error);
      res.status(500).json({
        success: false,
        data: [],
        message: 'Failed to fetch media',
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * GET /api/media/:propertyId/:mediaId
   * Get specific media item
   */
  router.get('/:propertyId/:mediaId', async (req: Request, res: Response) => {
    try {
      const { propertyId, mediaId } = req.params;

      const response = await client.getPropertyMedia({ 
        propref: propertyId,
        mediaId: mediaId
      });

      if (response.data.length === 0) {
        return res.status(404).json({
          success: false,
          data: null,
          message: `Media item ${mediaId} not found for property ${propertyId}`,
          timestamp: new Date().toISOString()
        });
      }

      const apiResponse: ApiResponse<PropertyMedia> = {
        success: true,
        data: response.data[0],
        message: 'Media item found',
        timestamp: new Date().toISOString()
      };

      res.json(apiResponse);
    } catch (error) {
      console.error(`Error fetching media item ${req.params.mediaId}:`, error);
      res.status(500).json({
        success: false,
        data: null,
        message: 'Failed to fetch media item',
        timestamp: new Date().toISOString()
      });
    }
  });

  return router;
}