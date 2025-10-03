import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// SECURITY: Email whitelist - MUST match the list in auth route
const AUTHORIZED_EMAILS = [
  'zach.kimble@gmail.com',
  'becky.aza.kimble@gmail.com'
];

// Public paths that don't require authentication
const PUBLIC_PATHS = [
  '/api/auth',
  '/api/sync', // Device continuity endpoints
  '/api/costs', // Cost monitoring endpoints
  '/api/health', // Health check endpoint (for monitoring)
  '/api/status', // Status endpoint (for monitoring)
  '/auth/signin',
  '/auth/error',
  '/auth/signout',
  '/_next',
  '/favicon.ico',
];

// Security logging function
function logSecurityEvent(
  path: string,
  email: string | null,
  allowed: boolean,
  reason: string,
  ip?: string
) {
  const timestamp = new Date().toISOString();
  console.log('='.repeat(80));
  console.log('🛡️ SECURITY CHECK');
  console.log(`⏰ Time: ${timestamp}`);
  console.log(`🌐 Path: ${path}`);
  console.log(`📧 Email: ${email || 'UNAUTHENTICATED'}`);
  console.log(`📍 IP: ${ip || 'UNKNOWN'}`);
  console.log(`${allowed ? '✅ ALLOWED' : '🚫 BLOCKED'}: ${reason}`);
  console.log('='.repeat(80));
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'UNKNOWN';

  // Skip authentication for public paths
  const isPublicPath = PUBLIC_PATHS.some(publicPath =>
    path.startsWith(publicPath)
  );

  if (isPublicPath) {
    return NextResponse.next();
  }

  // Get the session token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Check if user is authenticated
  if (!token || !token.email) {
    logSecurityEvent(path, null, false, 'No valid session token', ip);

    // For API routes, return 401 Unauthorized
    if (path.startsWith('/api/')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          message: 'You must be signed in to access this resource.',
        },
        { status: 401 }
      );
    }

    // For page routes, redirect to sign-in
    const signInUrl = new URL('/auth/signin', request.url);
    signInUrl.searchParams.set('callbackUrl', path);
    return NextResponse.redirect(signInUrl);
  }

  // Validate email is in authorized list
  const email = token.email.toLowerCase();
  const isAuthorized = AUTHORIZED_EMAILS.some(
    authorizedEmail => authorizedEmail.toLowerCase() === email
  );

  if (!isAuthorized) {
    logSecurityEvent(path, email, false, 'Email not in authorized whitelist', ip);

    // CRITICAL: Block unauthorized access
    if (path.startsWith('/api/')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden',
          message: 'Your account is not authorized to access this application.',
        },
        { status: 403 }
      );
    }

    // Redirect to error page for unauthorized users
    const errorUrl = new URL('/auth/error', request.url);
    errorUrl.searchParams.set('error', 'AccessDenied');
    return NextResponse.redirect(errorUrl);
  }

  // Additional security headers
  const response = NextResponse.next();

  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );

  // Log successful access
  logSecurityEvent(path, email, true, 'Authorized access', ip);

  return response;
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * All API routes and pages are now protected by default
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
