/**
 * Jest Test Setup
 * Global test configuration and utilities
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.RENTMAN_TOKEN = 'test-token';
process.env.RENTMAN_BASE_URL = 'https://test.rentman.online';
process.env.PORT = '3001';

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Global test timeout
jest.setTimeout(10000);
