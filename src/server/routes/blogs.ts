/**
 * Blog Routes
 * API endpoints for blog post management
 */

import { Router, Request, Response } from 'express';
import { BlogPost, BlogPostInput } from '../../types/blog';
import { asyncHandler } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';
import fs from 'fs';
import path from 'path';

// Use process.cwd() to get the project root, works in both dev and production
const BLOGS_FILE_PATH = path.join(process.cwd(), 'data', 'blogs.json');

/**
 * Read blogs from JSON file
 */
function readBlogs(): BlogPost[] {
  try {
    if (!fs.existsSync(BLOGS_FILE_PATH)) {
      // Create empty array if file doesn't exist
      writeBlogs([]);
      return [];
    }
    const data = fs.readFileSync(BLOGS_FILE_PATH, 'utf-8');
    return JSON.parse(data) as BlogPost[];
  } catch (error) {
    logger.error('Error reading blogs file', { error: error instanceof Error ? error.message : 'Unknown error' });
    return [];
  }
}

/**
 * Write blogs to JSON file
 */
function writeBlogs(blogs: BlogPost[]): void {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(BLOGS_FILE_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(BLOGS_FILE_PATH, JSON.stringify(blogs, null, 2), 'utf-8');
  } catch (error) {
    logger.error('Error writing blogs file', { error: error instanceof Error ? error.message : 'Unknown error' });
    throw error;
  }
}

/**
 * Get next available ID
 */
function getNextId(blogs: BlogPost[]): number {
  if (blogs.length === 0) return 1;
  return Math.max(...blogs.map(b => b.id)) + 1;
}

/**
 * Validate blog post input
 */
function validateBlogPostInput(input: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!input.category || typeof input.category !== 'string' || input.category.trim() === '') {
    errors.push('Category is required');
  }

  if (!input.title || typeof input.title !== 'string' || input.title.trim() === '') {
    errors.push('Title is required');
  }

  if (!input.subtitle || typeof input.subtitle !== 'string' || input.subtitle.trim() === '') {
    errors.push('Subtitle is required');
  }

  if (!input.excerpt || typeof input.excerpt !== 'string' || input.excerpt.trim() === '') {
    errors.push('Excerpt is required');
  }

  if (!Array.isArray(input.content) || input.content.length === 0) {
    errors.push('Content must be a non-empty array');
  }

  if (!Array.isArray(input.links)) {
    errors.push('Links must be an array');
  } else {
    input.links.forEach((link: any, index: number) => {
      if (!link.label || typeof link.label !== 'string' || link.label.trim() === '') {
        errors.push(`Link ${index + 1}: label is required`);
      }
      if (!link.href || typeof link.href !== 'string' || link.href.trim() === '') {
        errors.push(`Link ${index + 1}: href is required`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export default function blogRoutes(): Router {
  const router = Router();

  /**
   * GET /api/blogs
   * Get all blog posts
   */
  router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const blogs = readBlogs();
    
    res.json({
      success: true,
      data: blogs,
      message: `Found ${blogs.length} blog post(s)`,
      timestamp: new Date().toISOString()
    });
  }));

  /**
   * GET /api/blogs/:id
   * Get a single blog post by ID
   */
  router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_ID',
        message: 'Invalid blog post ID',
        timestamp: new Date().toISOString()
      });
    }

    const blogs = readBlogs();
    const blog = blogs.find(b => b.id === id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: `Blog post with ID ${id} not found`,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: blog,
      timestamp: new Date().toISOString()
    });
  }));

  /**
   * POST /api/blogs
   * Create a new blog post
   */
  router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const input: BlogPostInput = req.body;

    // Validate input
    const validation = validateBlogPostInput(input);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: validation.errors,
        timestamp: new Date().toISOString()
      });
    }

    const blogs = readBlogs();
    const newBlog: BlogPost = {
      ...input,
      id: getNextId(blogs),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    blogs.push(newBlog);
    writeBlogs(blogs);

    logger.info('Blog post created', { id: newBlog.id, title: newBlog.title });

    res.status(201).json({
      success: true,
      data: newBlog,
      message: 'Blog post created successfully',
      timestamp: new Date().toISOString()
    });
  }));

  /**
   * PUT /api/blogs/:id
   * Update an existing blog post
   */
  router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_ID',
        message: 'Invalid blog post ID',
        timestamp: new Date().toISOString()
      });
    }

    const input: Partial<BlogPostInput> = req.body;
    const blogs = readBlogs();
    const blogIndex = blogs.findIndex(b => b.id === id);

    if (blogIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: `Blog post with ID ${id} not found`,
        timestamp: new Date().toISOString()
      });
    }

    // Validate input (only validate fields that are being updated)
    const existingBlog = blogs[blogIndex];
    const updatedInput: BlogPostInput = {
      category: input.category ?? existingBlog.category,
      title: input.title ?? existingBlog.title,
      subtitle: input.subtitle ?? existingBlog.subtitle,
      excerpt: input.excerpt ?? existingBlog.excerpt,
      content: input.content ?? existingBlog.content,
      links: input.links ?? existingBlog.links
    };

    const validation = validateBlogPostInput(updatedInput);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: validation.errors,
        timestamp: new Date().toISOString()
      });
    }

    // Update blog post
    const updatedBlog: BlogPost = {
      ...existingBlog,
      ...updatedInput,
      updatedAt: new Date().toISOString()
    };

    blogs[blogIndex] = updatedBlog;
    writeBlogs(blogs);

    logger.info('Blog post updated', { id: updatedBlog.id, title: updatedBlog.title });

    res.json({
      success: true,
      data: updatedBlog,
      message: 'Blog post updated successfully',
      timestamp: new Date().toISOString()
    });
  }));

  /**
   * DELETE /api/blogs/:id
   * Delete a blog post
   */
  router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_ID',
        message: 'Invalid blog post ID',
        timestamp: new Date().toISOString()
      });
    }

    const blogs = readBlogs();
    const blogIndex = blogs.findIndex(b => b.id === id);

    if (blogIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: `Blog post with ID ${id} not found`,
        timestamp: new Date().toISOString()
      });
    }

    const deletedBlog = blogs[blogIndex];
    blogs.splice(blogIndex, 1);
    writeBlogs(blogs);

    logger.info('Blog post deleted', { id: deletedBlog.id, title: deletedBlog.title });

    res.json({
      success: true,
      message: 'Blog post deleted successfully',
      timestamp: new Date().toISOString()
    });
  }));

  return router;
}

