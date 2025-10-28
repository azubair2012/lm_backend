/**
 * Server Integration Tests
 * Test the Express.js server endpoints
 */

import request from 'supertest';
import { RentmanServer } from '../../src/server/app';

// Mock the RentmanApiClient
jest.mock('../../src/client/RentmanApiClient', () => {
  return {
    RentmanApiClient: jest.fn().mockImplementation(() => ({
      getPropertyAdvertising: jest.fn().mockResolvedValue({
        data: [
          {
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
            bullets: 'Modern apartment',
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
          }
        ],
        status: 200,
        statusText: 'OK',
        success: true
      }),
      getPropertyMedia: jest.fn().mockResolvedValue({
        data: [
          {
            propref: '123',
            filename: 'test.jpg',
            caption: 'Living Room',
            base64data: 'base64data...',
            imgorder: '1'
          }
        ],
        status: 200,
        statusText: 'OK',
        success: true
      }),
      getFeaturedProperties: jest.fn().mockResolvedValue([
        {
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
          bullets: 'Modern apartment',
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
        }
      ]),
      searchPropertiesByArea: jest.fn().mockResolvedValue([
        {
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
          bullets: 'Modern apartment',
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
        }
      ]),
      healthCheck: jest.fn().mockResolvedValue(true)
    }))
  };
});

describe('Server Integration Tests', () => {
  let server: RentmanServer;
  let app: any;

  beforeAll(() => {
    // Set test environment variables
    process.env.RENTMAN_TOKEN = 'test-token';
    process.env.RENTMAN_BASE_URL = 'https://test.rentman.online';
    process.env.PORT = '3001';
    
    server = new RentmanServer();
    app = server.getApp();
  });

  afterAll(() => {
    // Clean up
  });

  describe('Health Check Endpoint', () => {
    test('GET /api/health should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Root Endpoint', () => {
    test('GET / should return API information', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Rentman API Client Server');
      expect(response.body).toHaveProperty('endpoints');
    });
  });

  describe('Properties Endpoints', () => {
    test('GET /api/properties should return properties', async () => {
      const response = await request(app)
        .get('/api/properties?limit=5')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('GET /api/properties/:id should return specific property', async () => {
      const response = await request(app)
        .get('/api/properties/123')
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
    });

    test('GET /api/properties/featured should return featured properties', async () => {
      const response = await request(app)
        .get('/api/properties/featured?limit=3')
        .expect(200);

      console.log('Featured response body:', response.body);
      console.log('Data type:', typeof response.body.data);
      console.log('Is array:', Array.isArray(response.body.data));
      console.log('Data value:', response.body.data);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('GET /api/properties/search should handle search parameters', async () => {
      const response = await request(app)
        .get('/api/properties/search?q=London&limit=5')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });
  });

  describe('Media Endpoints', () => {
    test('GET /api/media/:propertyId should return media', async () => {
      const response = await request(app)
        .get('/api/media/123')
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
    });

    test('GET /api/media/file/:filename should return specific media', async () => {
      const response = await request(app)
        .get('/api/media/file/test.jpg')
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
    });
  });

  describe('Search Endpoints', () => {
    test('GET /api/search/properties should return search results', async () => {
      const response = await request(app)
        .get('/api/search/properties?q=London&limit=5')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('properties');
      expect(response.body.data).toHaveProperty('pagination');
    });

    test('GET /api/search/suggestions should return suggestions', async () => {
      const response = await request(app)
        .get('/api/search/suggestions?q=London')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('areas');
      expect(response.body.data).toHaveProperty('types');
    });
  });

  describe('Error Handling', () => {
    test('GET /api/nonexistent should return 404', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Not Found');
    });

    test('Invalid parameters should be handled gracefully', async () => {
      const response = await request(app)
        .get('/api/properties?limit=invalid')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('CORS Headers', () => {
    test('Should include CORS headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });
});
