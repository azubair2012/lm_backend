/**
 * Logging Utility
 * Centralized logging with different levels and formats
 */

import { config } from '../config';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: any;
  service?: string;
  requestId?: string;
}

class Logger {
  private level: LogLevel;
  private service: string;

  constructor(service: string = 'RentmanAPI') {
    this.service = service;
    this.level = this.getLogLevel(config.logging.level);
  }

  private getLogLevel(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'error': return LogLevel.ERROR;
      case 'warn': return LogLevel.WARN;
      case 'info': return LogLevel.INFO;
      case 'debug': return LogLevel.DEBUG;
      default: return LogLevel.INFO;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.level;
  }

  private formatMessage(level: string, message: string, data?: any, requestId?: string): string {
    const timestamp = new Date().toISOString();
    const logEntry: LogEntry = {
      timestamp,
      level,
      message,
      service: this.service,
      requestId
    };

    if (data) {
      logEntry.data = data;
    }

    if (config.logging.format === 'json') {
      return JSON.stringify(logEntry);
    }

    // Default format
    let formatted = `[${timestamp}] ${level.toUpperCase()} [${this.service}]`;
    if (requestId) {
      formatted += ` [${requestId}]`;
    }
    formatted += `: ${message}`;

    if (data) {
      formatted += ` ${JSON.stringify(data)}`;
    }

    return formatted;
  }

  private log(level: LogLevel, levelName: string, message: string, data?: any, requestId?: string): void {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(levelName, message, data, requestId);
    
    switch (level) {
      case LogLevel.ERROR:
        console.error(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        break;
      case LogLevel.DEBUG:
        console.debug(formattedMessage);
        break;
    }
  }

  error(message: string, data?: any, requestId?: string): void {
    this.log(LogLevel.ERROR, 'ERROR', message, data, requestId);
  }

  warn(message: string, data?: any, requestId?: string): void {
    this.log(LogLevel.WARN, 'WARN', message, data, requestId);
  }

  info(message: string, data?: any, requestId?: string): void {
    this.log(LogLevel.INFO, 'INFO', message, data, requestId);
  }

  debug(message: string, data?: any, requestId?: string): void {
    this.log(LogLevel.DEBUG, 'DEBUG', message, data, requestId);
  }

  // API-specific logging methods
  apiRequest(method: string, url: string, requestId?: string): void {
    this.info(`API Request: ${method} ${url}`, undefined, requestId);
  }

  apiResponse(method: string, url: string, status: number, duration: number, requestId?: string): void {
    this.info(`API Response: ${method} ${url} - ${status} (${duration}ms)`, undefined, requestId);
  }

  apiError(method: string, url: string, error: any, requestId?: string): void {
    this.error(`API Error: ${method} ${url}`, { error: error.message, stack: error.stack }, requestId);
  }

  // Server-specific logging methods
  serverStart(port: number, host: string): void {
    this.info(`Server starting on ${host}:${port}`);
  }

  serverReady(port: number, host: string): void {
    this.info(`Server ready on ${host}:${port}`);
  }

  serverError(error: any): void {
    this.error('Server error', { error: error.message, stack: error.stack });
  }

  // Cache-specific logging methods
  cacheHit(key: string): void {
    this.debug(`Cache hit: ${key}`);
  }

  cacheMiss(key: string): void {
    this.debug(`Cache miss: ${key}`);
  }

  cacheSet(key: string, ttl: number): void {
    this.debug(`Cache set: ${key} (TTL: ${ttl}s)`);
  }

  cacheClear(pattern?: string): void {
    this.debug(`Cache cleared${pattern ? `: ${pattern}` : ''}`);
  }

  // Image processing logging methods
  imageProcess(filename: string, size: string, duration: number): void {
    this.debug(`Image processed: ${filename} (${size}) - ${duration}ms`);
  }

  imageError(filename: string, error: any): void {
    this.error(`Image processing error: ${filename}`, { error: error.message });
  }

  // Performance logging
  performance(operation: string, duration: number, requestId?: string): void {
    this.info(`Performance: ${operation} completed in ${duration}ms`, undefined, requestId);
  }
}

// Create default logger instance
export const logger = new Logger();

// Create specialized loggers
export const apiLogger = new Logger('RentmanAPI');
export const serverLogger = new Logger('Server');
export const cacheLogger = new Logger('Cache');
export const imageLogger = new Logger('ImageProcessor');

export default logger;

