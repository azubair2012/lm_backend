/**
 * Error Handling Middleware
 * Centralized error handling and response formatting
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { config } from '../config';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
  details?: any;
}

export class CustomError extends Error implements AppError {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;
  public details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Predefined error types
export const ErrorTypes = {
  // Client errors (4xx)
  BAD_REQUEST: (message: string = 'Bad Request', details?: any) =>
    new CustomError(message, 400, 'BAD_REQUEST', true, details),
  
  UNAUTHORIZED: (message: string = 'Unauthorized', details?: any) =>
    new CustomError(message, 401, 'UNAUTHORIZED', true, details),
  
  FORBIDDEN: (message: string = 'Forbidden', details?: any) =>
    new CustomError(message, 403, 'FORBIDDEN', true, details),
  
  NOT_FOUND: (message: string = 'Not Found', details?: any) =>
    new CustomError(message, 404, 'NOT_FOUND', true, details),
  
  METHOD_NOT_ALLOWED: (message: string = 'Method Not Allowed', details?: any) =>
    new CustomError(message, 405, 'METHOD_NOT_ALLOWED', true, details),
  
  CONFLICT: (message: string = 'Conflict', details?: any) =>
    new CustomError(message, 409, 'CONFLICT', true, details),
  
  UNPROCESSABLE_ENTITY: (message: string = 'Unprocessable Entity', details?: any) =>
    new CustomError(message, 422, 'UNPROCESSABLE_ENTITY', true, details),
  
  TOO_MANY_REQUESTS: (message: string = 'Too Many Requests', details?: any) =>
    new CustomError(message, 429, 'TOO_MANY_REQUESTS', true, details),

  // Server errors (5xx)
  INTERNAL_ERROR: (message: string = 'Internal Server Error', details?: any) =>
    new CustomError(message, 500, 'INTERNAL_ERROR', false, details),
  
  BAD_GATEWAY: (message: string = 'Bad Gateway', details?: any) =>
    new CustomError(message, 502, 'BAD_GATEWAY', false, details),
  
  SERVICE_UNAVAILABLE: (message: string = 'Service Unavailable', details?: any) =>
    new CustomError(message, 503, 'SERVICE_UNAVAILABLE', false, details),
  
  GATEWAY_TIMEOUT: (message: string = 'Gateway Timeout', details?: any) =>
    new CustomError(message, 504, 'GATEWAY_TIMEOUT', false, details),

  // API-specific errors
  RENTMAN_API_ERROR: (message: string = 'Rentman API Error', details?: any) =>
    new CustomError(message, 502, 'RENTMAN_API_ERROR', false, details),
  
  RENTMAN_API_TIMEOUT: (message: string = 'Rentman API Timeout', details?: any) =>
    new CustomError(message, 504, 'RENTMAN_API_TIMEOUT', false, details),
  
  RENTMAN_API_UNAVAILABLE: (message: string = 'Rentman API Unavailable', details?: any) =>
    new CustomError(message, 503, 'RENTMAN_API_UNAVAILABLE', false, details),

  // Image processing errors
  IMAGE_PROCESSING_ERROR: (message: string = 'Image Processing Error', details?: any) =>
    new CustomError(message, 500, 'IMAGE_PROCESSING_ERROR', false, details),
  
  IMAGE_NOT_FOUND: (message: string = 'Image Not Found', details?: any) =>
    new CustomError(message, 404, 'IMAGE_NOT_FOUND', true, details),
  
  IMAGE_TOO_LARGE: (message: string = 'Image Too Large', details?: any) =>
    new CustomError(message, 413, 'IMAGE_TOO_LARGE', true, details),
  
  UNSUPPORTED_IMAGE_FORMAT: (message: string = 'Unsupported Image Format', details?: any) =>
    new CustomError(message, 415, 'UNSUPPORTED_IMAGE_FORMAT', true, details),

  // Validation errors
  VALIDATION_ERROR: (message: string = 'Validation Error', details?: any) =>
    new CustomError(message, 422, 'VALIDATION_ERROR', true, details),
  
  INVALID_PARAMETERS: (message: string = 'Invalid Parameters', details?: any) =>
    new CustomError(message, 400, 'INVALID_PARAMETERS', true, details),

  // Cache errors
  CACHE_ERROR: (message: string = 'Cache Error', details?: any) =>
    new CustomError(message, 500, 'CACHE_ERROR', false, details)
};

/**
 * Convert error to AppError
 */
function normalizeError(error: any): AppError {
  if (error instanceof CustomError) {
    return error;
  }

  if (error instanceof Error) {
    return new CustomError(
      error.message,
      500,
      'INTERNAL_ERROR',
      false,
      { originalError: error.name, stack: error.stack }
    );
  }

  return new CustomError(
    'An unknown error occurred',
    500,
    'UNKNOWN_ERROR',
    false,
    { originalError: error }
  );
}

/**
 * Format error response
 */
function formatErrorResponse(error: AppError, req: Request): any {
  const isDevelopment = config.logging.level === 'debug';
  
  const response: any = {
    success: false,
    error: error.code || 'INTERNAL_ERROR',
    message: error.message,
    timestamp: new Date().toISOString()
  };

  // Add request ID if available
  if (req.headers['x-request-id']) {
    response.requestId = req.headers['x-request-id'];
  }

  // Add details in development mode
  if (isDevelopment && error.details) {
    response.details = error.details;
  }

  // Add stack trace in development mode
  if (isDevelopment && error.stack) {
    response.stack = error.stack;
  }

  return response;
}

/**
 * Log error
 */
function logError(error: AppError, req: Request): void {
  const logData = {
    error: error.message,
    code: error.code,
    statusCode: error.statusCode,
    isOperational: error.isOperational,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: req.headers['x-request-id'],
    details: error.details
  };

  if (error.statusCode && error.statusCode >= 500) {
    logger.error('Server error', logData);
  } else if (error.statusCode && error.statusCode >= 400) {
    logger.warn('Client error', logData);
  } else {
    logger.info('Error occurred', logData);
  }
}

/**
 * Main error handling middleware
 */
export function errorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const normalizedError = normalizeError(error);
  
  logError(normalizedError, req);
  
  const response = formatErrorResponse(normalizedError, req);
  
  res.status(normalizedError.statusCode || 500).json(response);
}

/**
 * 404 handler for unmatched routes
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  const error = ErrorTypes.NOT_FOUND(`Route ${req.method} ${req.path} not found`);
  next(error);
}

/**
 * Async error wrapper
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Validation error handler
 */
export function validationErrorHandler(error: any, req: Request, res: Response, next: NextFunction): void {
  if (error.name === 'ValidationError') {
    const validationError = ErrorTypes.VALIDATION_ERROR('Validation failed', {
      fields: error.details?.map((detail: any) => ({
        field: detail.path?.join('.'),
        message: detail.message,
        value: detail.context?.value
      }))
    });
    return next(validationError);
  }
  next(error);
}

/**
 * Request ID middleware
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = req.headers['x-request-id'] as string || 
                   req.headers['x-correlation-id'] as string ||
                   `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  req.headers['x-request-id'] = requestId;
  res.set('X-Request-ID', requestId);
  
  next();
}

export default errorHandler;
