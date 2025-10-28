/**
 * Framer Data Transformers Tests
 * Test the data transformation functions for Framer
 */

import {
  transformPropertyForFramer,
  transformMediaForFramer,
  createImageSet,
  generateResponsiveSrcSet,
  generateResponsiveSizes,
  createPlaceholderImage,
  sanitizeImageFilename,
  extractImageMetadata
} from '../../src/framer/dataTransformers';
import { PropertyAdvertising, PropertyMedia } from '../../src/types';

describe('Framer Data Transformers', () => {
  describe('transformPropertyForFramer', () => {
    const mockProperty: PropertyAdvertising = {
      propref: '123',
      displayaddress: '123 Test Street, London',
      displayprice: '£1,500 pcm',
      rentmonth: '1500.00',
      rentorbuy: '1',
      number: '123',
      street: 'Test Street',
      address3: 'London',
      address4: 'England',
      postcode: 'SW1A 1AA',
      area: 'Westminster',
      TYPE: 'Apartment',
      beds: '2',
      singles: '0',
      doubles: '2',
      baths: '1',
      receps: '1',
      furnished: '3',
      bullets: 'Modern apartment in central London',
      FLOOR: 'APT',
      heating: 'GCH',
      available: '2024-01-01',
      STATUS: 'Available',
      shortlet: '0000',
      rating: '4.5',
      age: 'Modern',
      DESCRIPTION: 'A beautiful modern apartment',
      comments: 'Great location',
      strapline: 'Modern 2 Bed Apartment',
      floorplan: 'floorplan.jpg',
      url: 'https://example.com',
      photo1: 'main-photo.jpg'
    };

    test('should transform property correctly', () => {
      const result = transformPropertyForFramer(mockProperty);

      expect(result).toMatchObject({
        id: '123',
        address: '123 Test Street, London',
        price: '£1,500 pcm',
        rentMonth: 1500,
        type: 'Apartment',
        beds: 2,
        singles: 0,
        doubles: 2,
        baths: 1,
        receptions: 1,
        furnished: '3',
        heating: 'GCH',
        available: '2024-01-01',
        status: 'Available',
        rating: 4,
        age: 'Modern',
        description: 'A beautiful modern apartment',
        strapline: 'Modern 2 Bed Apartment',
        postcode: 'SW1A 1AA',
        area: 'Westminster',
        url: 'https://example.com'
      });
    });

    test('should include image structure', () => {
      const result = transformPropertyForFramer(mockProperty);

      expect(result.images).toHaveProperty('main');
      expect(result.images).toHaveProperty('floorplan');
      expect(result.images).toHaveProperty('gallery');
      expect(Array.isArray(result.images.gallery)).toBe(true);
    });

    test('should handle missing optional fields', () => {
      const minimalProperty = {
        ...mockProperty,
        floorplan: '',
        photo1: ''
      };

      const result = transformPropertyForFramer(minimalProperty);

      expect(result.images.floorplan).toBeUndefined();
      expect(result.images.main.thumb).toContain('_thumb.webp');
    });
  });

  describe('transformMediaForFramer', () => {
    const mockMedia: PropertyMedia = {
      propref: '123',
      filename: 'test-image.jpg',
      caption: 'Living Room',
      base64data: 'base64data...',
      imgorder: '1'
    };

    test('should transform media correctly', () => {
      const result = transformMediaForFramer(mockMedia);

      expect(result).toMatchObject({
        id: 'test-image.jpg',
        caption: 'Living Room',
        order: 1
      });
    });

    test('should include image URLs', () => {
      const result = transformMediaForFramer(mockMedia);

      expect(result.urls).toHaveProperty('thumb');
      expect(result.urls).toHaveProperty('medium');
      expect(result.urls).toHaveProperty('large');
      expect(result.urls).toHaveProperty('original');
    });

    test('should handle invalid order', () => {
      const mediaWithInvalidOrder = {
        ...mockMedia,
        imgorder: 'invalid'
      };

      const result = transformMediaForFramer(mediaWithInvalidOrder);

      expect(result.order).toBe(0);
    });
  });

  describe('createImageSet', () => {
    test('should create image set with correct URLs', () => {
      const result = createImageSet('test-image.jpg');

      expect(result).toEqual({
        thumb: '/api/images/test-image_thumb.webp',
        medium: '/api/images/test-image_medium.webp',
        large: '/api/images/test-image_large.webp',
        original: '/api/images/test-image_original.webp'
      });
    });

    test('should handle filename without extension', () => {
      const result = createImageSet('test-image');

      expect(result.thumb).toContain('test-image_thumb.webp');
    });
  });

  describe('generateResponsiveSrcSet', () => {
    test('should generate correct srcset', () => {
      const result = generateResponsiveSrcSet('test-image.jpg');

      expect(result).toContain('/api/images/test-image_thumb.webp 300w');
      expect(result).toContain('/api/images/test-image_medium.webp 800w');
      expect(result).toContain('/api/images/test-image_large.webp 1200w');
    });
  });

  describe('generateResponsiveSizes', () => {
    test('should generate correct sizes attribute', () => {
      const result = generateResponsiveSizes();

      expect(result).toBe('(max-width: 600px) 300px, (max-width: 1200px) 800px, 1200px');
    });
  });

  describe('createPlaceholderImage', () => {
    test('should create placeholder URL', () => {
      const result = createPlaceholderImage();

      expect(result).toBe('/api/images/placeholder_medium.webp');
    });

    test('should create placeholder URL with specific size', () => {
      const result = createPlaceholderImage('thumb');

      expect(result).toBe('/api/images/placeholder_thumb.webp');
    });
  });

  describe('sanitizeImageFilename', () => {
    test('should sanitize filename correctly', () => {
      const result = sanitizeImageFilename('Test Image (1).jpg');

      expect(result).toBe('test_image_1_.jpg');
    });

    test('should handle special characters', () => {
      const result = sanitizeImageFilename('image@#$%^&*().jpg');

      expect(result).toBe('image_.jpg');
    });

    test('should handle empty filename', () => {
      const result = sanitizeImageFilename('');

      expect(result).toBe('');
    });
  });

  describe('extractImageMetadata', () => {
    test('should extract metadata from filename', () => {
      const result = extractImageMetadata('test-image_medium.webp');

      expect(result).toEqual({
        name: 'test-image_medium',
        extension: 'webp',
        isOptimized: false,
        size: undefined
      });
    });

    test('should handle unoptimized filename', () => {
      const result = extractImageMetadata('test-image.jpg');

      expect(result).toEqual({
        name: 'test-image',
        extension: 'jpg',
        isOptimized: false,
        size: undefined
      });
    });

    test('should handle filename without extension', () => {
      const result = extractImageMetadata('test-image');

      expect(result).toEqual({
        name: '',
        extension: 'test-image',
        isOptimized: false,
        size: undefined
      });
    });
  });
});
