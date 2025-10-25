import { NextRequest, NextResponse } from 'next/server';
import { SecurityAuditAgent } from '@/lib/security-audit-agent';

/**
 * Security Audit API Endpoint
 *
 * POST /api/security/audit
 *
 * Runs comprehensive security audit and returns findings
 *
 * Authentication: Requires CRON_SECRET or valid session
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authorization - either CRON_SECRET or valid session
    const authHeader = request.headers.get('authorization');
    const cronSecret = authHeader?.replace('Bearer ', '');

    const isAuthorized = cronSecret === process.env.CRON_SECRET;

    if (!isAuthorized) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          message: 'Valid CRON_SECRET required to run security audit'
        },
        { status: 401 }
      );
    }

    console.log('🔒 Starting security audit...');

    // Run security audit
    const agent = SecurityAuditAgent.getInstance();
    const result = await agent.run();

    console.log(`✅ Security audit completed: Score ${result.securityScore}/100`);

    return NextResponse.json(
      {
        success: true,
        message: `Security audit completed successfully`,
        data: {
          securityScore: result.securityScore,
          executionTime: result.executionTime,
          summary: {
            total: result.findings.length,
            critical: result.criticalCount,
            high: result.highCount,
            medium: result.mediumCount,
            low: result.lowCount
          },
          findings: result.findings,
          timestamp: new Date().toISOString()
        }
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ Security audit failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Security audit failed',
        message: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/security/audit
 *
 * Returns security audit status and recent results
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization');
    const cronSecret = authHeader?.replace('Bearer ', '');

    const isAuthorized = cronSecret === process.env.CRON_SECRET;

    if (!isAuthorized) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          message: 'Valid CRON_SECRET required to view security audit status'
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Security Audit Agent is ready',
        data: {
          status: 'ready',
          endpoint: '/api/security/audit',
          method: 'POST',
          authMethod: 'Bearer token (CRON_SECRET)',
          capabilities: [
            'Environment variable validation',
            'Google OAuth configuration audit',
            'Public route security analysis',
            'Middleware authentication audit',
            'Security headers verification',
            'API route protection audit',
            'Session security analysis',
            'Secrets exposure detection',
            'Database security audit',
            'Failed authentication monitoring'
          ]
        }
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get audit status',
        message: error.message
      },
      { status: 500 }
    );
  }
}
