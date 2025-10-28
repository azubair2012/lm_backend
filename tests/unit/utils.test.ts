/**
 * Utility Functions Tests
 * Test the utility functions
 */

import {
  validatePropertyAdvertisingParams,
  validatePropertyMediaParams,
  validateSearchParams,
  validateImageFilename,
  sanitizeString,
  isValidEmail,
  isValidUrl,
  validatePaginationParams,
  validatePropertyRef,
  validatePriceRange
} from '../../src/utils/validators';

import {
  formatPrice,
  formatAddress,
  formatPropertyType,
  formatBedrooms,
  formatBathrooms,
  formatStatus,
  formatDate,
  formatDescription,
  formatFeatures,
  formatRating,
  formatAge,
  formatImageCaption,
  formatSearchQuery,
  formatAreaName
} from '../../src/utils/formatters';

import {
  generateId,
  deepClone,
  debounce,
  throttle,
  sleep,
  retry,
  isEmpty,
  removeEmptyValues,
  groupBy,
  sortBy,
  unique,
  chunk,
  calculatePagination,
  formatFileSize,
  randomString,
  isDevelopment,
  isProduction,
  getEnv,
  parseJSON,
  stringifyJSON,
  createError,
  logWithTimestamp
} from '../../src/utils/helpers';

describe('Validators', () => {
  describe('validatePropertyAdvertisingParams', () => {
    test('should validate correct parameters', () => {
      const params = {
        propref: '123',
        noimage: '1',
        rob: 'rent',
        featured: '1',
        area: '1',
        limit: '10',
        page: '2'
      };

      const result = validatePropertyAdvertisingParams(params);

      expect(result).toEqual({
        propref: '123',
        noimage: 1,
        rob: 'rent',
        featured: 1,
        area: 1,
        limit: 10,
        page: 2
      });
    });

    test('should filter invalid parameters', () => {
      const params = {
        propref: '123',
        noimage: 'invalid',
        rob: 'invalid',
        limit: '1001', // Too high
        page: '0' // Too low
      };

      const result = validatePropertyAdvertisingParams(params);

      expect(result).toEqual({
        propref: '123'
      });
    });
  });

  describe('validatePropertyMediaParams', () => {
    test('should validate correct parameters', () => {
      const params = {
        propref: '123',
        filename: 'test.jpg'
      };

      const result = validatePropertyMediaParams(params);

      expect(result).toEqual({
        propref: '123',
        filename: 'test.jpg'
      });
    });
  });

  describe('validateSearchParams', () => {
    test('should validate search parameters', () => {
      const params = {
        q: 'London',
        area: 'Westminster',
        type: 'rent',
        beds: '2',
        minPrice: '1000',
        maxPrice: '2000',
        featured: 'true',
        limit: '10',
        page: '1'
      };

      const result = validateSearchParams(params);

      expect(result).toEqual({
        q: 'London',
        area: 'Westminster',
        type: 'rent',
        beds: 2,
        minPrice: 1000,
        maxPrice: 2000,
        featured: true,
        limit: 10,
        page: 1
      });
    });
  });

  describe('validateImageFilename', () => {
    test('should validate correct image filenames', () => {
      expect(validateImageFilename('test.jpg')).toBe(true);
      expect(validateImageFilename('test.png')).toBe(true);
      expect(validateImageFilename('test.webp')).toBe(true);
    });

    test('should reject invalid filenames', () => {
      expect(validateImageFilename('test.txt')).toBe(false);
      expect(validateImageFilename('')).toBe(false);
      expect(validateImageFilename(null as any)).toBe(false);
    });
  });

  describe('isValidEmail', () => {
    test('should validate correct emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
    });

    test('should reject invalid emails', () => {
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    test('should validate correct URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://localhost:3000')).toBe(true);
    });

    test('should reject invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('')).toBe(false);
    });
  });
});

describe('Formatters', () => {
  describe('formatPrice', () => {
    test('should format price correctly', () => {
      expect(formatPrice('1500.50')).toBe('£1,501');
      expect(formatPrice(2000)).toBe('£2,000');
    });

    test('should handle invalid prices', () => {
      expect(formatPrice('invalid')).toBe('Price on request');
      expect(formatPrice('')).toBe('Price on request');
    });
  });

  describe('formatAddress', () => {
    test('should format address correctly', () => {
      const property = {
        number: '123',
        street: 'Test Street',
        address3: 'London',
        address4: 'England',
        postcode: 'SW1A 1AA'
      } as any;

      expect(formatAddress(property)).toBe('123, Test Street, London, England, SW1A 1AA');
    });
  });

  describe('formatBedrooms', () => {
    test('should format bedroom count correctly', () => {
      expect(formatBedrooms('2')).toBe('2 bedrooms');
      expect(formatBedrooms(1)).toBe('1 bedroom');
      expect(formatBedrooms('0')).toBe('Studio');
    });
  });

  describe('formatBathrooms', () => {
    test('should format bathroom count correctly', () => {
      expect(formatBathrooms('2')).toBe('2 bathrooms');
      expect(formatBathrooms(1)).toBe('1 bathroom');
      expect(formatBathrooms('0')).toBe('No bathrooms');
    });
  });
});

describe('Helpers', () => {
  describe('generateId', () => {
    test('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();

      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
      expect(id1.length).toBeGreaterThan(0);
    });
  });

  describe('deepClone', () => {
    test('should clone objects deeply', () => {
      const original = { a: 1, b: { c: 2 } };
      const cloned = deepClone(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.b).not.toBe(original.b);
    });
  });

  describe('isEmpty', () => {
    test('should identify empty values', () => {
      expect(isEmpty(null)).toBe(true);
      expect(isEmpty(undefined)).toBe(true);
      expect(isEmpty('')).toBe(true);
      expect(isEmpty('   ')).toBe(true);
      expect(isEmpty([])).toBe(true);
      expect(isEmpty({})).toBe(true);
    });

    test('should identify non-empty values', () => {
      expect(isEmpty('test')).toBe(false);
      expect(isEmpty(0)).toBe(false);
      expect(isEmpty(false)).toBe(false);
      expect(isEmpty([1, 2, 3])).toBe(false);
      expect(isEmpty({ a: 1 })).toBe(false);
    });
  });

  describe('groupBy', () => {
    test('should group array by key', () => {
      const items = [
        { type: 'A', value: 1 },
        { type: 'B', value: 2 },
        { type: 'A', value: 3 }
      ];

      const result = groupBy(items, 'type');

      expect(result).toEqual({
        A: [{ type: 'A', value: 1 }, { type: 'A', value: 3 }],
        B: [{ type: 'B', value: 2 }]
      });
    });
  });

  describe('calculatePagination', () => {
    test('should calculate pagination correctly', () => {
      const result = calculatePagination(2, 10, 25);

      expect(result).toEqual({
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNext: true,
        hasPrev: true,
        offset: 10
      });
    });
  });

  describe('formatFileSize', () => {
    test('should format file sizes correctly', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(0)).toBe('0 Bytes');
    });
  });
});
