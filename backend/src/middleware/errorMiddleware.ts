import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger.js';

// Custom error class for API errors
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Error response interface
interface ErrorResponse {
  error: {
    message: string;
    code?: string;
    details?: any;
  };
  requestId?: string;
}

/**
 * Central error handling middleware
 */
export function errorMiddleware(
  err: Error | ApiError | z.ZodError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Generate request ID for tracking
  const requestId = req.headers['x-request-id'] as string || `req_${Date.now()}`;

  // Log the error
  logger.error('Request error:', {
    requestId,
    method: req.method,
    path: req.path,
    error: err.message,
    stack: err.stack,
    body: req.body,
    query: req.query,
  });

  let statusCode = 500;
  let errorResponse: ErrorResponse = {
    error: {
      message: 'Internal server error',
    },
    requestId,
  };

  // Handle different error types
  if (err instanceof ApiError) {
    // Custom API errors
    statusCode = err.statusCode;
    errorResponse.error.message = err.message;
    if (err.details) {
      errorResponse.error.details = err.details;
    }
  } else if (err instanceof z.ZodError) {
    // Validation errors from Zod
    statusCode = 400;
    errorResponse.error = {
      message: 'Validation error',
      code: 'VALIDATION_ERROR',
      details: err.errors.map(error => ({
        path: error.path.join('.'),
        message: error.message,
      })),
    };
  } else if (err.name === 'UnauthorizedError') {
    // JWT authentication errors
    statusCode = 401;
    errorResponse.error = {
      message: 'Unauthorized',
      code: 'UNAUTHORIZED',
    };
  } else if (err.name === 'Neo4jError') {
    // Neo4j database errors
    const neo4jError = err as any;

    if (neo4jError.code === 'Neo.ClientError.Schema.ConstraintValidationFailed') {
      statusCode = 409;
      errorResponse.error = {
        message: 'Resource already exists',
        code: 'CONFLICT',
      };
    } else if (neo4jError.code === 'Neo.ClientError.Statement.EntityNotFound') {
      statusCode = 404;
      errorResponse.error = {
        message: 'Resource not found',
        code: 'NOT_FOUND',
      };
    } else {
      statusCode = 500;
      errorResponse.error = {
        message: 'Database error',
        code: 'DATABASE_ERROR',
      };
    }
  } else if (err.message.includes('ECONNREFUSED')) {
    // Connection errors
    statusCode = 503;
    errorResponse.error = {
      message: 'Service temporarily unavailable',
      code: 'SERVICE_UNAVAILABLE',
    };
  }

  // In development, include stack trace
  if (process.env.NODE_ENV === 'development' && err.stack) {
    errorResponse.error.details = {
      ...errorResponse.error.details,
      stack: err.stack.split('\n'),
    };
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
}

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Not found handler for undefined routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      message: `Route ${req.method} ${req.path} not found`,
      code: 'ROUTE_NOT_FOUND',
    },
  });
}