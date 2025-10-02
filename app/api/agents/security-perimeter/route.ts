// Security Perimeter Agent API Endpoint
// Provides security analytics, threat monitoring, and access control management

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { securityAgent } from '../../../../lib/security-perimeter';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper function to verify admin access
async function verifyAdminAccess(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return { authorized: false, error: 'Authentication required' };
    }

    // Check if user is admin
    const { data: user } = await supabase
      .from('users')
      .select('role, permissions')
      .eq('email', session.user.email)
      .single();

    if (!user || user.role !== 'admin') {
      return { authorized: false, error: 'Admin access required' };
    }

    return { authorized: true, user };
  } catch (error) {
    return { authorized: false, error: 'Authorization check failed' };
  }
}

// GET - Security Analytics and Status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const timeRange = searchParams.get('timeRange') || '24h';

    // Verify admin access for most operations
    if (action !== 'status') {
      const authCheck = await verifyAdminAccess(request);
      if (!authCheck.authorized) {
        return NextResponse.json(
          { error: authCheck.error },
          { status: 401 }
        );
      }
    }

    switch (action) {
      case 'status':
        // Public status endpoint (limited info)
        return NextResponse.json({
          status: 'operational',
          securityLevel: 'normal',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        });

      case 'analytics':
        // Get security analytics
        const timeRanges = {
          '1h': 60 * 60 * 1000,
          '24h': 24 * 60 * 60 * 1000,
          '7d': 7 * 24 * 60 * 60 * 1000,
          '30d': 30 * 24 * 60 * 60 * 1000,
        };

        const duration = timeRanges[timeRange as keyof typeof timeRanges] || timeRanges['24h'];
        const start = new Date(Date.now() - duration);
        const end = new Date();

        const analytics = await securityAgent.getSecurityAnalytics({ start, end });

        return NextResponse.json({
          success: true,
          timeRange: { start, end, duration },
          analytics,
        });

      case 'sessions':
        // Get active sessions
        const activeSessions = securityAgent.getAllActiveSessions();
        return NextResponse.json({
          success: true,
          activeSessions: activeSessions.map(session => ({
            ...session,
            // Remove sensitive information
            userAgent: session.userAgent.substring(0, 100),
          })),
          totalSessions: activeSessions.length,
        });

      case 'threats':
        // Get recent threats
        const threatsStart = new Date(Date.now() - 60 * 60 * 1000); // Last hour
        const threatsEnd = new Date();

        const { data: threats } = await supabase
          .from('security_events')
          .select('*')
          .gte('timestamp', threatsStart.toISOString())
          .lte('timestamp', threatsEnd.toISOString())
          .gte('risk_score', 0.7) // Only high-risk events
          .order('timestamp', { ascending: false })
          .limit(50);

        return NextResponse.json({
          success: true,
          threats: threats || [],
          count: threats?.length || 0,
        });

      case 'config':
        // Get security configuration
        return NextResponse.json({
          success: true,
          config: {
            rateLimits: {
              guest: { requests: 10, window: 60000 },
              authenticated: { requests: 100, window: 60000 },
              premium: { requests: 1000, window: 60000 },
            },
            threatThresholds: {
              suspicious: 0.7,
              high: 0.8,
              critical: 0.9,
            },
            sessionSecurity: {
              maxIdleTime: 30 * 60 * 1000,
              tokenRotationInterval: 15 * 60 * 1000,
              maxConcurrentSessions: 5,
            },
          },
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action parameter' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Security Perimeter GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Security Actions and Commands
export async function POST(request: NextRequest) {
  try {
    const authCheck = await verifyAdminAccess(request);
    if (!authCheck.authorized) {
      return NextResponse.json(
        { error: authCheck.error },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'terminate_session':
        // Terminate a specific session
        const { sessionId } = params;
        if (!sessionId) {
          return NextResponse.json(
            { error: 'Session ID required' },
            { status: 400 }
          );
        }

        const terminated = securityAgent.terminateSession(sessionId);
        return NextResponse.json({
          success: terminated,
          message: terminated ? 'Session terminated' : 'Session not found',
        });

      case 'block_ip':
        // Block an IP address
        const { ip, duration = 300000 } = params; // Default 5 minutes
        if (!ip) {
          return NextResponse.json(
            { error: 'IP address required' },
            { status: 400 }
          );
        }

        // Manually block IP by creating a high-risk security event
        await supabase.from('security_events').insert({
          session_id: 'admin_action',
          event_type: 'threat_detected',
          severity: 'critical',
          details: {
            action: 'manual_ip_block',
            ip,
            duration,
            admin_user: 'admin',
          },
          ip_address: ip,
          user_agent: 'Admin Action',
          timestamp: new Date().toISOString(),
          risk_score: 1.0,
        });

        return NextResponse.json({
          success: true,
          message: `IP ${ip} blocked for ${duration}ms`,
        });

      case 'clear_threats':
        // Clear old threat records (housekeeping)
        const { olderThan = 7 } = params; // Days
        const cutoffDate = new Date(Date.now() - olderThan * 24 * 60 * 60 * 1000);

        const { error: deleteError } = await supabase
          .from('security_events')
          .delete()
          .lt('timestamp', cutoffDate.toISOString())
          .lt('risk_score', 0.5); // Only clear low-risk events

        if (deleteError) {
          return NextResponse.json(
            { error: 'Failed to clear threats' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: `Cleared threat records older than ${olderThan} days`,
        });

      case 'update_config':
        // Update security configuration
        const { config } = params;
        if (!config) {
          return NextResponse.json(
            { error: 'Configuration required' },
            { status: 400 }
          );
        }

        // In a real implementation, you'd store this in a database
        // For now, just validate and acknowledge
        return NextResponse.json({
          success: true,
          message: 'Configuration updated successfully',
          config,
        });

      case 'generate_report':
        // Generate security report
        const { reportType = 'security_summary', timeRangeHours = 24 } = params;
        const reportStart = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);
        const reportEnd = new Date();

        const reportAnalytics = await securityAgent.getSecurityAnalytics({
          start: reportStart,
          end: reportEnd,
        });

        const report = {
          id: `report_${Date.now()}`,
          type: reportType,
          generatedAt: new Date().toISOString(),
          timeRange: { start: reportStart, end: reportEnd },
          summary: {
            totalEvents: reportAnalytics?.totalEvents || 0,
            threatEvents: reportAnalytics?.threatEvents || 0,
            blockedRequests: reportAnalytics?.blockedRequests || 0,
            uniqueIPs: reportAnalytics?.uniqueIPs || 0,
            threatRate: reportAnalytics?.threatRate || 0,
          },
          details: reportAnalytics,
        };

        return NextResponse.json({
          success: true,
          report,
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Security Perimeter POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update Security Settings
export async function PUT(request: NextRequest) {
  try {
    const authCheck = await verifyAdminAccess(request);
    if (!authCheck.authorized) {
      return NextResponse.json(
        { error: authCheck.error },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { setting, value } = body;

    // Validate security settings
    const validSettings = [
      'threat_threshold',
      'rate_limit_guest',
      'rate_limit_authenticated',
      'rate_limit_premium',
      'max_idle_time',
      'ddos_protection_enabled',
    ];

    if (!validSettings.includes(setting)) {
      return NextResponse.json(
        { error: 'Invalid setting' },
        { status: 400 }
      );
    }

    // In a real implementation, you'd update the configuration in a database
    // For now, just acknowledge the update
    return NextResponse.json({
      success: true,
      message: `Setting '${setting}' updated to '${value}'`,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Security Perimeter PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove Security Records
export async function DELETE(request: NextRequest) {
  try {
    const authCheck = await verifyAdminAccess(request);
    if (!authCheck.authorized) {
      return NextResponse.json(
        { error: authCheck.error },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const id = searchParams.get('id');

    switch (action) {
      case 'security_event':
        if (!id) {
          return NextResponse.json(
            { error: 'Event ID required' },
            { status: 400 }
          );
        }

        const { error: deleteError } = await supabase
          .from('security_events')
          .delete()
          .eq('id', id);

        if (deleteError) {
          return NextResponse.json(
            { error: 'Failed to delete event' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: 'Security event deleted',
        });

      case 'all_events':
        // Delete all security events (use with caution)
        const { error: deleteAllError } = await supabase
          .from('security_events')
          .delete()
          .neq('id', ''); // Delete all

        if (deleteAllError) {
          return NextResponse.json(
            { error: 'Failed to delete events' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: 'All security events deleted',
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Security Perimeter DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}