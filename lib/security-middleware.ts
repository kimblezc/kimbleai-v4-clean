// lib/security-middleware.ts
// Security middleware for KimbleAI API routes

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Rate limiting storage (in-memory for now, should use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number;  // Maximum requests per window
}

/**
 * Rate limiting middleware to prevent DoS attacks
 * @param identifier - Unique identifier (userId, IP, etc.)
 * @param config - Rate limit configuration
 * @returns Object with allowed status and remaining requests
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = { windowMs: 60000, maxRequests: 60 }
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  // Reset if window expired
  if (!record || now > record.resetTime) {
    const resetTime = now + config.windowMs;
    rateLimitStore.set(identifier, { count: 1, resetTime });
    return { allowed: true, remaining: config.maxRequests - 1, resetTime };
  }

  // Increment counter
  record.count++;
  rateLimitStore.set(identifier, record);

  const allowed = record.count <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - record.count);

  return { allowed, remaining, resetTime: record.resetTime };
}

/**
 * Clean up expired rate limit records
 */
export function cleanupRateLimits() {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimits, 5 * 60 * 1000);
}

/**
 * Validate and authenticate user from request
 * @param userId - User identifier from request
 * @returns User data or null if invalid
 */
export async function authenticateUser(userId: string): Promise<any> {
  // Validate userId format (basic validation)
  if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
    return null;
  }

  // Map simple IDs to database names (backwards compatibility)
  let userName = userId === 'rebecca' ? 'Rebecca' : 'Zach';

  // For more complex user IDs, use them directly
  if (userId !== 'zach' && userId !== 'rebecca') {
    userName = userId;
  }

  try {
    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('name', userName)
      .single();

    if (error || !userData) {
      console.error('User authentication failed:', error);
      return null;
    }

    return userData;
  } catch (error) {
    console.error('User authentication error:', error);
    return null;
  }
}

/**
 * Verify user owns a resource
 * @param resourceUserId - User ID associated with the resource
 * @param requestUserId - User ID from the request
 * @returns True if user owns the resource
 */
export function verifyOwnership(resourceUserId: string, requestUserId: string): boolean {
  return resourceUserId === requestUserId;
}

/**
 * Sanitize input to prevent injection attacks
 * @param input - User input string
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Escape single quotes for SQL/API queries
  return input.replace(/'/g, "\\'");
}

/**
 * Validate file upload
 * @param file - Uploaded file
 * @param config - Validation configuration
 * @returns Validation result
 */
export interface FileValidationConfig {
  maxSizeBytes?: number;
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFileUpload(
  file: File,
  config: FileValidationConfig = {}
): FileValidationResult {
  const {
    maxSizeBytes = 50 * 1024 * 1024, // 50MB default
    allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/webm',
      'audio/mp4',
      'text/plain',
      'text/csv',
      'application/pdf'
    ],
    allowedExtensions = [
      '.jpg', '.jpeg', '.png', '.webp',
      '.mp3', '.wav', '.webm', '.m4a',
      '.txt', '.csv', '.pdf', '.md'
    ]
  } = config;

  // Check file size
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${Math.round(maxSizeBytes / 1024 / 1024)}MB`
    };
  }

  // Check MIME type
  if (allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type: ${file.type}. Allowed types: ${allowedMimeTypes.join(', ')}`
    };
  }

  // Check file extension
  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (allowedExtensions.length > 0 && !allowedExtensions.includes(fileExtension)) {
    return {
      valid: false,
      error: `Invalid file extension: ${fileExtension}. Allowed: ${allowedExtensions.join(', ')}`
    };
  }

  return { valid: true };
}

/**
 * Check if request has valid API key (for webhook endpoints)
 * @param request - Next.js request object
 * @param expectedKey - Expected API key
 * @returns True if key is valid
 */
export function validateApiKey(request: NextRequest, expectedKey?: string): boolean {
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');

  if (!expectedKey) {
    expectedKey = process.env.ZAPIER_WEBHOOK_SECRET;
  }

  return apiKey === expectedKey;
}

/**
 * Get client IP address from request
 * @param request - Next.js request object
 * @returns IP address or 'unknown'
 */
export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');

  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  return 'unknown';
}

/**
 * Create a standardized error response
 * @param message - Error message
 * @param status - HTTP status code
 * @param details - Additional error details
 * @returns NextResponse with error
 */
export function createErrorResponse(
  message: string,
  status: number = 500,
  details?: string
): NextResponse {
  return NextResponse.json(
    {
      error: message,
      details: details,
      timestamp: new Date().toISOString()
    },
    { status }
  );
}

/**
 * Log security events for monitoring
 * @param event - Security event type
 * @param details - Event details
 */
export async function logSecurityEvent(
  event: 'rate_limit' | 'auth_failure' | 'injection_attempt' | 'unauthorized_access',
  details: Record<string, any>
): Promise<void> {
  console.warn(`[SECURITY EVENT] ${event}:`, details);

  // In production, send to monitoring service (e.g., Sentry, DataDog)
  try {
    await supabase.from('security_logs').insert({
      event_type: event,
      details: details,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

/**
 * Middleware to apply rate limiting and authentication
 * @param request - Next.js request
 * @param handler - Route handler function
 * @param config - Security configuration
 * @returns Response from handler or error
 */
export async function withSecurity(
  request: NextRequest,
  handler: (request: NextRequest, userId?: string, userData?: any) => Promise<NextResponse>,
  config: {
    requireAuth?: boolean;
    rateLimit?: RateLimitConfig;
    skipRateLimitForAuth?: boolean;
  } = {}
): Promise<NextResponse> {
  const {
    requireAuth = true,
    rateLimit = { windowMs: 60000, maxRequests: 60 },
    skipRateLimitForAuth = false
  } = config;

  // Get client identifier for rate limiting
  const clientIp = getClientIp(request);

  // Apply rate limiting
  if (rateLimit && !skipRateLimitForAuth) {
    const rateLimitResult = checkRateLimit(clientIp, rateLimit);

    if (!rateLimitResult.allowed) {
      await logSecurityEvent('rate_limit', {
        ip: clientIp,
        path: request.nextUrl.pathname,
        remaining: rateLimitResult.remaining
      });

      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          details: 'Too many requests. Please try again later.',
          resetTime: new Date(rateLimitResult.resetTime).toISOString()
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
          }
        }
      );
    }
  }

  // Handle authentication if required
  if (requireAuth) {
    try {
      const body = await request.clone().json();
      const userId = body.userId;

      if (!userId) {
        await logSecurityEvent('auth_failure', {
          reason: 'Missing userId',
          path: request.nextUrl.pathname,
          ip: clientIp
        });
        return createErrorResponse('Authentication required', 401, 'Missing userId');
      }

      const userData = await authenticateUser(userId);

      if (!userData) {
        await logSecurityEvent('auth_failure', {
          reason: 'Invalid userId',
          userId: userId,
          path: request.nextUrl.pathname,
          ip: clientIp
        });
        return createErrorResponse('Authentication failed', 401, 'Invalid user credentials');
      }

      // Pass authenticated user data to handler
      return await handler(request, userId, userData);

    } catch (error) {
      console.error('Security middleware error:', error);
      return createErrorResponse('Internal server error', 500);
    }
  }

  // No auth required, proceed with handler
  return await handler(request);
}
