// Security Monitoring Middleware
// Integrates with SecurityPerimeterAgent to monitor all requests

import { NextRequest, NextResponse } from 'next/server';
import { securityAgent } from '../lib/security-perimeter';
import { getToken } from 'next-auth/jwt';

// Security monitoring configuration
const SECURITY_CONFIG = {
  ENABLED_PATHS: [
    '/api/',
    '/dashboard/',
    '/admin/',
    '/auth/',
  ],
  EXCLUDED_PATHS: [
    '/api/health',
    '/api/auth/session',
    '/_next/',
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml',
  ],
  PUBLIC_API_PATHS: [
    '/api/public/',
    '/api/auth/',
  ],
  PROTECTED_API_PATHS: [
    '/api/admin/',
    '/api/agents/',
    '/api/google/',
  ],
};

/**
 * Extract request information for security analysis
 */
function extractRequestInfo(request: NextRequest) {
  const ip = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || '';
  const path = request.nextUrl.pathname;
  const method = request.method;

  // Extract headers as object
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  // Extract session ID from cookies
  const sessionId = request.cookies.get('next-auth.session-token')?.value ||
                   request.cookies.get('__Secure-next-auth.session-token')?.value ||
                   generateSessionId(ip, userAgent);

  return {
    ip,
    userAgent,
    path,
    method,
    headers,
    sessionId,
  };
}

/**
 * Get client IP address from request
 */
function getClientIP(request: NextRequest): string {
  // Check various headers for the real IP
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  // Fallback to connection remote address
  return request.ip || '127.0.0.1';
}

/**
 * Generate a session ID for anonymous users
 */
function generateSessionId(ip: string, userAgent: string): string {
  const hash = Buffer.from(`${ip}:${userAgent}:${Date.now()}`).toString('base64');
  return `anon_${hash.substring(0, 16)}`;
}

/**
 * Check if path should be monitored
 */
function shouldMonitorPath(path: string): boolean {
  // Skip excluded paths
  if (SECURITY_CONFIG.EXCLUDED_PATHS.some(excluded => path.startsWith(excluded))) {
    return false;
  }

  // Monitor enabled paths
  return SECURITY_CONFIG.ENABLED_PATHS.some(enabled => path.startsWith(enabled));
}

/**
 * Check if path requires authentication
 */
function requiresAuthentication(path: string): boolean {
  // Public API paths don't require auth
  if (SECURITY_CONFIG.PUBLIC_API_PATHS.some(publicPath => path.startsWith(publicPath))) {
    return false;
  }

  // Protected paths require auth
  return SECURITY_CONFIG.PROTECTED_API_PATHS.some(protectedPath => path.startsWith(protectedPath));
}

/**
 * Create security headers for response
 */
function createSecurityHeaders(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {
    // Basic security headers
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',

    // Content Security Policy
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self' https://api.openai.com https://*.supabase.co",
      "frame-src 'self' https://accounts.google.com",
    ].join('; '),
  };

  // Add CORS headers for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    headers['Access-Control-Allow-Origin'] = process.env.NODE_ENV === 'production'
      ? 'https://kimbleai.com'
      : '*';
    headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With';
    headers['Access-Control-Max-Age'] = '86400'; // 24 hours
  }

  return headers;
}

/**
 * Create error response for security violations
 */
function createSecurityErrorResponse(
  analysis: any,
  status: number = 429
): NextResponse {
  const errorResponse = {
    error: 'Security violation detected',
    message: 'Your request has been blocked due to security concerns.',
    riskScore: analysis.riskScore,
    threats: analysis.threats,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(errorResponse, {
    status,
    headers: {
      'Retry-After': '60', // Suggest retry after 60 seconds
      'X-RateLimit-Limit': '10',
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': Math.floor(Date.now() / 1000 + 60).toString(),
    }
  });
}

/**
 * Main security monitoring middleware
 */
export async function securityMiddleware(request: NextRequest): Promise<NextResponse | null> {
  const path = request.nextUrl.pathname;

  // Skip monitoring for certain paths
  if (!shouldMonitorPath(path)) {
    return null; // Continue to next middleware
  }

  try {
    // Extract request information
    const requestInfo = extractRequestInfo(request);

    // Get user information from JWT token
    let userId: string | undefined;
    try {
      const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET
      });
      userId = token?.email === 'zach.kimble@gmail.com' ? 'zach' :
               token?.email === 'rebecca@kimbleai.com' ? 'rebecca' : undefined;
    } catch (error) {
      // Token validation failed, continue as anonymous
      console.warn('Token validation failed:', error);
    }

    // Perform security analysis
    const securityResult = await securityAgent.analyzeRequest({
      ...requestInfo,
      userId,
    });

    // Handle blocked requests
    if (!securityResult.allowed) {
      console.warn('Security violation detected:', {
        ip: requestInfo.ip,
        path: requestInfo.path,
        analysis: securityResult.analysis,
      });

      return createSecurityErrorResponse(securityResult.analysis);
    }

    // Check authentication requirements
    if (requiresAuthentication(path) && !userId) {
      return NextResponse.json(
        {
          error: 'Authentication required',
          message: 'This endpoint requires authentication.',
          loginUrl: '/api/auth/signin',
        },
        { status: 401 }
      );
    }

    // Create response with security headers
    const response = NextResponse.next();

    // Add security headers
    const securityHeaders = createSecurityHeaders(request);
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    // Add rate limit headers
    const rateLimit = securityResult.tier.rateLimit;
    response.headers.set('X-RateLimit-Limit', rateLimit.requests.toString());
    response.headers.set('X-RateLimit-Window', (rateLimit.window / 1000).toString());

    // Add security metadata headers (for debugging in development)
    if (process.env.NODE_ENV === 'development') {
      response.headers.set('X-Security-Tier', securityResult.tier.tier);
      response.headers.set('X-Security-Risk-Score', securityResult.analysis.riskScore.toString());
    }

    return response;

  } catch (error) {
    console.error('Security middleware error:', error);

    // In case of security middleware failure, allow request but log the error
    return NextResponse.next();
  }
}

/**
 * Handle preflight OPTIONS requests
 */
export function handleCORS(request: NextRequest): NextResponse | null {
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: createSecurityHeaders(request),
    });
  }

  return null;
}

/**
 * DDoS protection middleware
 */
export async function ddosProtection(request: NextRequest): Promise<NextResponse | null> {
  const ip = getClientIP(request);

  // Simple burst detection (in production, use Redis or similar)
  const key = `ddos_${ip}`;

  // This is a simplified version - in production you'd use a proper store
  // For now, rely on the security agent's rate limiting

  return null; // Continue to next middleware
}

// Export all middleware functions
export default securityMiddleware;