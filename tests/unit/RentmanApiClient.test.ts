/**
 * RentmanApiClient Unit Tests
 */

import { RentmanApiClient } from '../../src/client/RentmanApiClient';
import { RentmanApiConfig } from '../../src/types';

// Mock axios
jest.mock('axios');
const mockedAxios = require('axios');

// Mock axios.create to return a mock instance
const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  interceptors: {
    request: {
      use: jest.fn()
    },
    response: {
      use: jest.fn()
    }
  }
};

mockedAxios.create.mockReturnValue(mockAxiosInstance);

describe('RentmanApiClient', () => {
  let client: RentmanApiClient;
  const mockConfig: RentmanApiConfig = {
    token: 'test-token',
    baseURL: 'https://test.rentman.online'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    client = new RentmanApiClient(mockConfig);
  });

  describe('Constructor', () => {
    test('should create client with correct configuration', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: mockConfig.baseURL,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'token': mockConfig.token
        }
      });
    });

    test('should use default values for optional config', () => {
      const minimalConfig = {
        token: 'test-token',
        baseURL: 'https://test.rentman.online'
      };
      
      new RentmanApiClient(minimalConfig);
      
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: minimalConfig.baseURL,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'token': minimalConfig.token
        }
      });
    });
  });

  describe('getPropertyAdvertising', () => {
    test('should make GET request to propertyadvertising.php', async () => {
      const mockData = [{ propref: '1', displayaddress: 'Test Property' }];
      mockAxiosInstance.get.mockResolvedValue({
        data: mockData,
        status: 200,
        statusText: 'OK'
      });

      await client.getPropertyAdvertising();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/propertyadvertising.php',
        expect.objectContaining({
          params: {},
          headers: { 'ACCEPT': 'application/json' }
        })
      );
    });

    test('should pass parameters correctly', async () => {
      const params = { limit: 10, page: 1 };
      mockAxiosInstance.get.mockResolvedValue({
        data: [],
        status: 200,
        statusText: 'OK'
      });

      await client.getPropertyAdvertising(params);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/propertyadvertising.php',
        expect.objectContaining({
          params
        })
      );
    });

    test('should return formatted response', async () => {
      const mockData = [{ propref: '1', displayaddress: 'Test Property' }];
      mockAxiosInstance.get.mockResolvedValue({
        data: mockData,
        status: 200,
        statusText: 'OK'
      });

      const result = await client.getPropertyAdvertising();

      expect(result).toEqual({
        data: mockData,
        status: 200,
        statusText: 'OK',
        success: true
      });
    });
  });

  describe('getPropertyMedia', () => {
    test('should require propref or filename', async () => {
      await expect(client.getPropertyMedia({})).rejects.toThrow(
        'Either propref or filename must be provided'
      );
    });

    test('should make GET request to propertymedia.php', async () => {
      const mockData = [{ propref: '1', filename: 'test.jpg' }];
      mockAxiosInstance.get.mockResolvedValue({
        data: mockData,
        status: 200,
        statusText: 'OK'
      });

      await client.getPropertyMedia({ propref: '1' });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/propertymedia.php',
        expect.objectContaining({
          params: { propref: '1' },
          headers: { 'ACCEPT': 'application/json' }
        })
      );
    });
  });

  describe('healthCheck', () => {
    test('should return true for successful health check', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        status: 200
      });

      const result = await client.healthCheck();

      expect(result).toBe(true);
    });

    test('should return false for failed health check', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Network error'));

      const result = await client.healthCheck();

      expect(result).toBe(false);
    });
  });
});
