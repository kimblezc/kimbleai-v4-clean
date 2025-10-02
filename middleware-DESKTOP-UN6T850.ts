import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { securityMiddleware, handleCORS } from './middleware/security-monitoring';

export async function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname;

  try {
    // Handle CORS preflight requests
    const corsResponse = handleCORS(request);
    if (corsResponse) {
      return corsResponse;
    }

    // Apply security monitoring
    const securityResponse = await securityMiddleware(request);
    if (securityResponse) {
      return securityResponse;
    }

    // Allow all other paths to proceed normally
    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);

    // In case of middleware failure, allow request to proceed
    // but add a warning header for debugging
    const response = NextResponse.next();
    if (process.env.NODE_ENV === 'development') {
      response.headers.set('X-Middleware-Warning', 'Security middleware failed');
    }
    return response;
  }
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - robots.txt, sitemap.xml (SEO files)
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
