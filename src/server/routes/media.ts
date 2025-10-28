/**
 * Media Routes
 * Framer-optimized endpoints for property media
 */

import { Router, Request, Response } from 'express';
import { RentmanApiClient } from '../../client/RentmanApiClient';
import { FramerImage, FramerApiResponse } from '../../types';
import { transformMediaForFramer } from '../../framer/dataTransformers';

export default function mediaRoutes(client: RentmanApiClient): Router {
  const router = Router();

  /**
   * GET /api/media/:propertyId
   * Get all media for a specific property
   */
  router.get('/:propertyId', async (req: Request, res: Response) => {
    try {
      const { propertyId } = req.params;
      const { format = 'json' } = req.query;

      const response = await client.getPropertyMedia({ propref: propertyId });

      if (response.data.length === 0) {
        return res.status(404).json({
          success: false,
          data: [],
          message: `No media found for property ${propertyId}`,
          timestamp: new Date().toISOString()
        });
      }

      // Transform media for Framer
      const framerMedia: FramerImage[] = response.data.map(transformMediaForFramer);

      const framerResponse: FramerApiResponse<FramerImage[]> = {
        success: true,
        data: framerMedia,
        message: `Found ${framerMedia.length} media files for property ${propertyId}`,
        timestamp: new Date().toISOString()
      };

      res.json(framerResponse);
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
   * GET /api/media/file/:filename
   * Get specific media file
   */
  router.get('/file/:filename', async (req: Request, res: Response) => {
    try {
      const { filename } = req.params;
      const { format = 'json' } = req.query;

      const response = await client.getPropertyMedia({ filename });

      if (response.data.length === 0) {
        return res.status(404).json({
          success: false,
          data: null,
          message: `Media file ${filename} not found`,
          timestamp: new Date().toISOString()
        });
      }

      // Transform media for Framer
      const framerMedia = transformMediaForFramer(response.data[0]);

      const framerResponse: FramerApiResponse<FramerImage> = {
        success: true,
        data: framerMedia,
        message: 'Media file found',
        timestamp: new Date().toISOString()
      };

      res.json(framerResponse);
    } catch (error) {
      console.error(`Error fetching media file ${req.params.filename}:`, error);
      res.status(500).json({
        success: false,
        data: null,
        message: 'Failed to fetch media file',
        timestamp: new Date().toISOString()
      });
    }
  });

  return router;
}
