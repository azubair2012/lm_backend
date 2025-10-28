/**
 * Rentman API Client
 * Core client for interacting with Rentman Advertising API
 */

import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import {
  PropertyAdvertising,
  PropertyMedia,
  PropertyAdvertisingParams,
  PropertyMediaParams,
  ApiResponse,
  RentmanApiConfig,
  RequestOptions,
  ErrorResponse
} from '../types';

export class RentmanApiClient {
  private client: AxiosInstance;
  private config: RentmanApiConfig;

  constructor(config: RentmanApiConfig) {
    this.config = {
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      ...config
    };

    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'token': this.config.token
      }
    });

    this.setupInterceptors();
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`[RentmanAPI] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[RentmanAPI] Request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config;
        
        if (this.shouldRetry(error) && originalRequest) {
          return this.retryRequest(originalRequest);
        }

        console.error('[RentmanAPI] Response error:', error.response?.data || error.message);
        return Promise.reject(this.formatError(error));
      }
    );
  }

  /**
   * Check if request should be retried
   */
  private shouldRetry(error: AxiosError): boolean {
    if (!error.config) return false;
    
    const retryCount = (error.config as any)['retryCount'] || 0;
    if (retryCount >= this.config.retries!) return false;

    // Retry on network errors or 5xx status codes
    return !error.response || (error.response.status >= 500 && error.response.status < 600);
  }

  /**
   * Retry failed request
   */
  private async retryRequest(config: any): Promise<AxiosResponse> {
    const retryCount = config['retryCount'] || 0;
    config['retryCount'] = retryCount + 1;

    // Wait before retrying
    await new Promise(resolve => 
      setTimeout(resolve, this.config.retryDelay! * Math.pow(2, retryCount))
    );

    return this.client.request(config);
  }

  /**
   * Format error response
   */
  private formatError(error: AxiosError): ErrorResponse {
    return {
      success: false,
      error: error.code || 'UNKNOWN_ERROR',
      message: (error.response?.data as any)?.message || error.message || 'An unknown error occurred',
      code: error.response?.status?.toString(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get property advertising data
   */
  async getPropertyAdvertising(
    params: PropertyAdvertisingParams = {},
    options: RequestOptions = {}
  ): Promise<ApiResponse<PropertyAdvertising[]>> {
    try {
      const response: AxiosResponse<PropertyAdvertising[]> = await this.client.get(
        '/propertyadvertising.php',
        {
          params,
          headers: {
            'ACCEPT': 'application/json',
            ...options.headers
          },
          ...options
        }
      );

      return {
        data: response.data,
        status: response.status,
        statusText: response.statusText,
        success: true
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get property media data
   */
  async getPropertyMedia(
    params: PropertyMediaParams,
    options: RequestOptions = {}
  ): Promise<ApiResponse<PropertyMedia[]>> {
    if (!params.propref && !params.filename) {
      throw new Error('Either propref or filename must be provided');
    }

    try {
      const response: AxiosResponse<PropertyMedia[]> = await this.client.get(
        '/propertymedia.php',
        {
          params,
          headers: {
            'ACCEPT': 'application/json',
            ...options.headers
          },
          ...options
        }
      );

      return {
        data: response.data,
        status: response.status,
        statusText: response.statusText,
        success: true
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all properties with pagination
   */
  async getAllProperties(
    page: number = 1,
    limit: number = 25,
    filters: Omit<PropertyAdvertisingParams, 'page' | 'limit'> = {}
  ): Promise<PropertyAdvertising[]> {
    const allProperties: PropertyAdvertising[] = [];
    let currentPage = page;
    let hasMore = true;

    while (hasMore) {
      try {
        const response = await this.getPropertyAdvertising({
          ...filters,
          page: currentPage,
          limit
        });

        if (response.data.length === 0) {
          hasMore = false;
        } else {
          allProperties.push(...response.data);
          currentPage++;
        }
      } catch (error) {
        console.error(`Error fetching page ${currentPage}:`, error);
        hasMore = false;
      }
    }

    return allProperties;
  }

  /**
   * Get property with all its media
   */
  async getPropertyWithMedia(propref: string): Promise<{
    property: PropertyAdvertising;
    media: PropertyMedia[];
  }> {
    const [propertyResponse, mediaResponse] = await Promise.all([
      this.getPropertyAdvertising({ propref }),
      this.getPropertyMedia({ propref })
    ]);

    if (propertyResponse.data.length === 0) {
      throw new Error(`Property with reference ${propref} not found`);
    }

    return {
      property: propertyResponse.data[0],
      media: mediaResponse.data
    };
  }

  /**
   * Search properties by area
   */
  async searchPropertiesByArea(
    area: string,
    limit: number = 25
  ): Promise<PropertyAdvertising[]> {
    const response = await this.getPropertyAdvertising({
      area: 1,
      limit
    });

    return response.data.filter(property => 
      property.area.toLowerCase().includes(area.toLowerCase())
    );
  }

  /**
   * Get featured properties
   */
  async getFeaturedProperties(limit: number = 25): Promise<PropertyAdvertising[]> {
    const response = await this.getPropertyAdvertising({
      featured: 1,
      limit
    });

    return response.data;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/propertyadvertising.php', {
        params: { limit: 1 }
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}
