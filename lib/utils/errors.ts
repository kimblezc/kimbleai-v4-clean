/**
 * Error Handling Utilities
 *
 * Standardized error types and handling across the application
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from './logger';

/**
 * Custom error types
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message, 'AUTH_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class BudgetExceededError extends AppError {
  constructor(message = 'Monthly budget exceeded') {
    super(402, message, 'BUDGET_EXCEEDED');
    this.name = 'BudgetExceededError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(400, message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super(429, message, 'RATE_LIMIT');
    this.name = 'RateLimitError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: any) {
    super(500, message, 'DATABASE_ERROR', details);
    this.name = 'DatabaseError';
  }
}

export class AIServiceError extends AppError {
  constructor(message: string, details?: any) {
    super(500, message, 'AI_SERVICE_ERROR', details);
    this.name = 'AIServiceError';
  }
}

/**
 * Error handler for API routes
 */
export function handleAPIError(error: unknown, context?: any): NextResponse {
  // Log error
  logger.error('API Error', error as Error, context);

  // Handle known error types
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.code || 'ERROR',
        message: error.message,
        details: error.details,
      },
      { status: error.statusCode }
    );
  }

  // Handle unknown errors
  const message = error instanceof Error ? error.message : 'Unknown error occurred';

  return NextResponse.json(
    {
      error: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'development' ? message : 'Internal server error',
    },
    { status: 500 }
  );
}

/**
 * Async error wrapper for API routes
 */
export function asyncHandler(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      return await handler(req, context);
    } catch (error) {
      return handleAPIError(error, {
        url: req.url,
        method: req.method,
      });
    }
  };
}

/**
 * Validate required fields
 */
export function validateRequired(
  data: any,
  fields: string[]
): asserts data is Record<string, any> {
  const missing = fields.filter(field => !data[field]);

  if (missing.length > 0) {
    throw new ValidationError(
      `Missing required fields: ${missing.join(', ')}`,
      { missing }
    );
  }
}

/**
 * Sanitize error for client
 */
export function sanitizeError(error: unknown): {
  error: string;
  message: string;
  details?: any;
} {
  if (error instanceof AppError) {
    return {
      error: error.code || 'ERROR',
      message: error.message,
      details: error.details,
    };
  }

  return {
    error: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred',
  };
}

/**
 * Assert condition or throw error
 */
export function assert(
  condition: boolean,
  message: string,
  ErrorClass: typeof AppError = AppError
): asserts condition {
  if (!condition) {
    throw new ErrorClass(500, message);
  }
}

/**
 * Retry async function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
    onRetry?: (error: Error, attempt: number) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    onRetry,
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        break;
      }

      const delay = Math.min(initialDelay * Math.pow(backoffFactor, attempt), maxDelay);

      if (onRetry) {
        onRetry(lastError, attempt + 1);
      }

      logger.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`, {
        error: lastError.message,
      });

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}
