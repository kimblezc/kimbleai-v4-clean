import { getServerSession } from 'next-auth/next';
import { getToken } from 'next-auth/jwt';
import { NextRequest } from 'next/server';

// SECURITY: Centralized email whitelist
// CRITICAL: This MUST match the lists in middleware.ts and auth route
export const AUTHORIZED_EMAILS = [
  'zach.kimble@gmail.com',
  'becky.aza.kimble@gmail.com'
] as const;

export type AuthorizedEmail = typeof AUTHORIZED_EMAILS[number];

/**
 * Validate if an email is authorized to access the application
 */
export function isEmailAuthorized(email: string | null | undefined): boolean {
  if (!email) return false;

  const normalizedEmail = email.toLowerCase().trim();
  return AUTHORIZED_EMAILS.some(
    authorizedEmail => authorizedEmail.toLowerCase() === normalizedEmail
  );
}

/**
 * Get the user ID from email
 */
export function getUserIdFromEmail(email: string): 'zach' | 'rebecca' | null {
  const normalizedEmail = email.toLowerCase().trim();

  if (normalizedEmail === 'zach.kimble@gmail.com') return 'zach';
  if (normalizedEmail === 'becky.aza.kimble@gmail.com') return 'rebecca';

  return null;
}

/**
 * Verify user session and return user info
 * Use this in API routes to validate authentication
 */
export async function verifySession(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token || !token.email) {
      return {
        authenticated: false,
        authorized: false,
        error: 'No valid session token',
      };
    }

    const isAuthorized = isEmailAuthorized(token.email);

    if (!isAuthorized) {
      return {
        authenticated: true,
        authorized: false,
        error: 'Email not authorized',
        email: token.email,
      };
    }

    return {
      authenticated: true,
      authorized: true,
      email: token.email,
      userId: getUserIdFromEmail(token.email),
      token,
    };
  } catch (error) {
    console.error('Session verification error:', error);
    return {
      authenticated: false,
      authorized: false,
      error: 'Session verification failed',
    };
  }
}

/**
 * Require authentication - use in API routes
 * Throws error if not authenticated
 */
export async function requireAuth(req: NextRequest) {
  const session = await verifySession(req);

  if (!session.authenticated) {
    throw new Error('Authentication required');
  }

  if (!session.authorized) {
    throw new Error('Not authorized to access this resource');
  }

  return {
    email: session.email!,
    userId: session.userId!,
    token: session.token!,
  };
}

/**
 * Security audit log entry
 */
export interface SecurityAuditLog {
  timestamp: string;
  event_type: string;
  email: string | null;
  success: boolean;
  reason: string;
  ip?: string;
  path?: string;
  metadata?: Record<string, any>;
}

/**
 * Create a security audit log
 */
export function createSecurityLog(
  eventType: string,
  email: string | null,
  success: boolean,
  reason: string,
  metadata?: Record<string, any>
): SecurityAuditLog {
  return {
    timestamp: new Date().toISOString(),
    event_type: eventType,
    email: email || null,
    success,
    reason,
    metadata,
  };
}

/**
 * Format security log for console output
 */
export function formatSecurityLog(log: SecurityAuditLog): string {
  const lines = [
    '='.repeat(80),
    `🔐 SECURITY EVENT: ${log.event_type}`,
    `⏰ Time: ${log.timestamp}`,
    `📧 Email: ${log.email || 'UNKNOWN'}`,
    `${log.success ? '✅ SUCCESS' : '❌ FAILED'}: ${log.reason}`,
  ];

  if (log.ip) lines.push(`📍 IP: ${log.ip}`);
  if (log.path) lines.push(`🌐 Path: ${log.path}`);
  if (log.metadata) lines.push(`📊 Metadata: ${JSON.stringify(log.metadata)}`);

  lines.push('='.repeat(80));

  return lines.join('\n');
}

/**
 * Rate limiting configuration
 */
export const RATE_LIMITS = {
  LOGIN_ATTEMPTS: {
    MAX_ATTEMPTS: 5,
    WINDOW_MINUTES: 15,
  },
  API_REQUESTS: {
    MAX_REQUESTS: 100,
    WINDOW_MINUTES: 1,
  },
} as const;

/**
 * Check if rate limit is exceeded (basic implementation)
 * In production, use Redis or similar for distributed rate limiting
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  identifier: string,
  maxAttempts: number,
  windowMinutes: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const key = identifier;
  const existing = rateLimitStore.get(key);

  if (!existing || now > existing.resetAt) {
    // Create new window
    const resetAt = now + windowMinutes * 60 * 1000;
    rateLimitStore.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: maxAttempts - 1, resetAt };
  }

  // Increment counter
  existing.count += 1;

  if (existing.count > maxAttempts) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  return {
    allowed: true,
    remaining: maxAttempts - existing.count,
    resetAt: existing.resetAt,
  };
}

/**
 * Clean up old rate limit entries
 */
export function cleanupRateLimits() {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

// Clean up rate limits every 5 minutes
if (typeof window === 'undefined') {
  // Only run on server
  setInterval(cleanupRateLimits, 5 * 60 * 1000);
}
