import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { asyncHandler } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';
import { SiteContentEntry, SiteContentType, SiteContentUpdateInput } from '../../types/content';

const CONTENT_FILE_PATH = path.join(process.cwd(), 'data', 'site-content.json');
const ALLOWED_TYPES: SiteContentType[] = ['text', 'textarea', 'richtext', 'json'];

function readContentEntries(): SiteContentEntry[] {
  try {
    if (!fs.existsSync(CONTENT_FILE_PATH)) {
      writeContentEntries([]);
      return [];
    }

    const data = fs.readFileSync(CONTENT_FILE_PATH, 'utf-8');
    const parsed = JSON.parse(data) as SiteContentEntry[];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed;
  } catch (error) {
    logger.error('Error reading site content file', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return [];
  }
}

function writeContentEntries(entries: SiteContentEntry[]): void {
  const dataDir = path.dirname(CONTENT_FILE_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(CONTENT_FILE_PATH, JSON.stringify(entries, null, 2), 'utf-8');
}

function sanitizeValue(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

function validateType(type: unknown): type is SiteContentType {
  return typeof type === 'string' && ALLOWED_TYPES.includes(type as SiteContentType);
}

export default function contentRoutes(): Router {
  const router = Router();

  router.get(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
      const keysParam = typeof req.query.keys === 'string' ? req.query.keys : '';
      const group = typeof req.query.group === 'string' ? req.query.group : undefined;
      const includeUnpublished = req.query.includeUnpublished === 'true';

      const requestedKeys = keysParam
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);

      let entries = readContentEntries();

      if (requestedKeys.length > 0) {
        const keySet = new Set(requestedKeys);
        entries = entries.filter((entry) => keySet.has(entry.key));
      }

      if (group) {
        entries = entries.filter((entry) => entry.group === group);
      }

      if (!includeUnpublished) {
        entries = entries.filter((entry) => entry.isPublished);
      }

      res.json({
        success: true,
        data: entries,
        message: `Found ${entries.length} content entr${entries.length === 1 ? 'y' : 'ies'}`,
        timestamp: new Date().toISOString(),
      });
    })
  );

  router.put(
    '/:key',
    asyncHandler(async (req: Request, res: Response) => {
      const key = (req.params.key || '').trim();
      if (!key) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_KEY',
          message: 'Content key is required',
          timestamp: new Date().toISOString(),
        });
      }

      const body = req.body as Partial<SiteContentUpdateInput>;
      const value = sanitizeValue(body.value);
      if (!value) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Content value is required',
          timestamp: new Date().toISOString(),
        });
      }

      const entries = readContentEntries();
      const now = new Date().toISOString();
      const index = entries.findIndex((entry) => entry.key === key);

      if (body.type !== undefined && !validateType(body.type)) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: `Invalid type. Allowed: ${ALLOWED_TYPES.join(', ')}`,
          timestamp: new Date().toISOString(),
        });
      }

      if (index === -1) {
        const newEntry: SiteContentEntry = {
          key,
          label: sanitizeValue(body.label) || key,
          group: sanitizeValue(body.group) || 'general',
          type: body.type || 'textarea',
          value,
          isPublished: body.isPublished ?? true,
          updatedAt: now,
          updatedBy: sanitizeValue(body.updatedBy) || undefined,
        };
        entries.push(newEntry);
        writeContentEntries(entries);

        logger.info('Site content created', { key });
        return res.status(201).json({
          success: true,
          data: newEntry,
          message: 'Content created successfully',
          timestamp: now,
        });
      }

      const existing = entries[index];
      const updated: SiteContentEntry = {
        ...existing,
        value,
        label: sanitizeValue(body.label) || existing.label,
        group: sanitizeValue(body.group) || existing.group,
        type: body.type || existing.type,
        isPublished: body.isPublished ?? existing.isPublished,
        updatedAt: now,
        updatedBy: sanitizeValue(body.updatedBy) || existing.updatedBy,
      };

      entries[index] = updated;
      writeContentEntries(entries);

      logger.info('Site content updated', { key });
      return res.json({
        success: true,
        data: updated,
        message: 'Content updated successfully',
        timestamp: now,
      });
    })
  );

  return router;
}
