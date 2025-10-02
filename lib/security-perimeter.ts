// Security Perimeter Agent - Core Library
// Provides comprehensive security monitoring, threat detection, and access control

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Security configuration constants
export const SECURITY_CONFIG = {
  RATE_LIMITS: {
    GUEST: { requests: 10, window: 60000 }, // 10 requests per minute
    AUTHENTICATED: { requests: 100, window: 60000 }, // 100 requests per minute
    PREMIUM: { requests: 1000, window: 60000 }, // 1000 requests per minute
  },
  THREAT_THRESHOLDS: {
    SUSPICIOUS_ACTIVITY: 0.7,
    HIGH_RISK: 0.8,
    CRITICAL_THREAT: 0.9,
  },
  SESSION_SECURITY: {
    MAX_IDLE_TIME: 30 * 60 * 1000, // 30 minutes
    TOKEN_ROTATION_INTERVAL: 15 * 60 * 1000, // 15 minutes
    MAX_CONCURRENT_SESSIONS: 5,
  },
  DDOS_PROTECTION: {
    MAX_REQUESTS_PER_SECOND: 20,
    BURST_THRESHOLD: 50,
    BLOCK_DURATION: 5 * 60 * 1000, // 5 minutes
  },
};

// Types
export interface SecurityEvent {
  id?: string;
  userId?: string;
  sessionId: string;
  eventType: 'request' | 'login' | 'logout' | 'threat_detected' | 'rate_limit_exceeded' | 'ddos_attempt';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  riskScore: number;
}

export interface UserTier {
  tier: 'guest' | 'authenticated' | 'premium';
  userId?: string;
  permissions: string[];
  rateLimit: { requests: number; window: number };
}

export interface ThreatAnalysis {
  riskScore: number;
  threats: string[];
  recommendations: string[];
  shouldBlock: boolean;
}

export interface SessionInfo {
  sessionId: string;
  userId?: string;
  tier: UserTier['tier'];
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  lastActivity: Date;
  requestCount: number;
  riskScore: number;
}

// Security Perimeter Agent Class
export class SecurityPerimeterAgent {
  private requestCounts = new Map<string, { count: number; resetTime: number }>();
  private blockedIPs = new Map<string, number>(); // IP -> unblock timestamp
  private sessions = new Map<string, SessionInfo>();

  constructor() {
    // Clean up expired entries periodically
    setInterval(() => this.cleanupExpiredEntries(), 60000); // Every minute
  }

  /**
   * Analyze incoming request and determine security posture
   */
  async analyzeRequest(request: {
    ip: string;
    userAgent: string;
    path: string;
    method: string;
    headers: Record<string, string>;
    sessionId?: string;
    userId?: string;
  }): Promise<{ allowed: boolean; analysis: ThreatAnalysis; tier: UserTier }> {

    // Check if IP is blocked
    if (this.isIPBlocked(request.ip)) {
      return {
        allowed: false,
        analysis: {
          riskScore: 1.0,
          threats: ['IP_BLOCKED'],
          recommendations: ['Wait for block to expire'],
          shouldBlock: true,
        },
        tier: this.getGuestTier(),
      };
    }

    // Determine user tier and permissions
    const tier = await this.determineUserTier(request.userId, request.sessionId);

    // Perform threat analysis
    const analysis = await this.performThreatAnalysis(request);

    // Check rate limits
    const rateLimitResult = this.checkRateLimit(request.ip, tier);

    // Update session information
    if (request.sessionId) {
      this.updateSessionInfo(request.sessionId, request.userId, request.ip, request.userAgent, tier.tier);
    }

    // Combine results
    const finalAnalysis: ThreatAnalysis = {
      riskScore: Math.max(analysis.riskScore, rateLimitResult.exceeded ? 0.8 : 0),
      threats: [...analysis.threats, ...(rateLimitResult.exceeded ? ['RATE_LIMIT_EXCEEDED'] : [])],
      recommendations: [...analysis.recommendations, ...(rateLimitResult.exceeded ? ['Reduce request frequency'] : [])],
      shouldBlock: analysis.shouldBlock || rateLimitResult.exceeded,
    };

    // Log security event
    await this.logSecurityEvent({
      sessionId: request.sessionId || 'anonymous',
      userId: request.userId,
      eventType: 'request',
      severity: this.getSeverityFromRiskScore(finalAnalysis.riskScore),
      details: {
        path: request.path,
        method: request.method,
        analysis: finalAnalysis,
        tier: tier.tier,
      },
      ipAddress: request.ip,
      userAgent: request.userAgent,
      timestamp: new Date(),
      riskScore: finalAnalysis.riskScore,
    });

    // Block IP if threat is critical
    if (finalAnalysis.riskScore >= SECURITY_CONFIG.THREAT_THRESHOLDS.CRITICAL_THREAT) {
      this.blockIP(request.ip, SECURITY_CONFIG.DDOS_PROTECTION.BLOCK_DURATION);
    }

    return {
      allowed: !finalAnalysis.shouldBlock,
      analysis: finalAnalysis,
      tier,
    };
  }

  /**
   * Determine user tier based on authentication status
   */
  private async determineUserTier(userId?: string, sessionId?: string): Promise<UserTier> {
    if (!userId) {
      return this.getGuestTier();
    }

    try {
      // Check user subscription/premium status from database
      const { data: user } = await supabase
        .from('users')
        .select('role, permissions, metadata')
        .eq('id', userId)
        .single();

      if (!user) {
        return this.getGuestTier();
      }

      // Determine tier based on role and metadata
      const isPremium = user.metadata?.subscription?.tier === 'premium' || user.role === 'admin';

      if (isPremium) {
        return {
          tier: 'premium',
          userId,
          permissions: [
            'read:all',
            'write:all',
            'admin:dashboard',
            'export:data',
            'api:unlimited',
          ],
          rateLimit: SECURITY_CONFIG.RATE_LIMITS.PREMIUM,
        };
      }

      return {
        tier: 'authenticated',
        userId,
        permissions: [
          'read:own',
          'write:own',
          'api:standard',
        ],
        rateLimit: SECURITY_CONFIG.RATE_LIMITS.AUTHENTICATED,
      };
    } catch (error) {
      console.error('Error determining user tier:', error);
      return this.getGuestTier();
    }
  }

  /**
   * Get guest tier configuration
   */
  private getGuestTier(): UserTier {
    return {
      tier: 'guest',
      permissions: ['read:public'],
      rateLimit: SECURITY_CONFIG.RATE_LIMITS.GUEST,
    };
  }

  /**
   * Perform comprehensive threat analysis
   */
  private async performThreatAnalysis(request: {
    ip: string;
    userAgent: string;
    path: string;
    method: string;
    headers: Record<string, string>;
  }): Promise<ThreatAnalysis> {
    const threats: string[] = [];
    const recommendations: string[] = [];
    let riskScore = 0;

    // User Agent Analysis
    const uaAnalysis = this.analyzeUserAgent(request.userAgent);
    riskScore += uaAnalysis.risk;
    threats.push(...uaAnalysis.threats);

    // Path Analysis
    const pathAnalysis = this.analyzePath(request.path);
    riskScore += pathAnalysis.risk;
    threats.push(...pathAnalysis.threats);

    // Header Analysis
    const headerAnalysis = this.analyzeHeaders(request.headers);
    riskScore += headerAnalysis.risk;
    threats.push(...headerAnalysis.threats);

    // Request Pattern Analysis
    const patternAnalysis = await this.analyzeRequestPatterns(request.ip);
    riskScore += patternAnalysis.risk;
    threats.push(...patternAnalysis.threats);

    // Geolocation Analysis (simplified)
    const geoAnalysis = this.analyzeGeolocation(request.ip);
    riskScore += geoAnalysis.risk;
    threats.push(...geoAnalysis.threats);

    // Normalize risk score
    riskScore = Math.min(riskScore, 1.0);

    // Generate recommendations
    if (riskScore > SECURITY_CONFIG.THREAT_THRESHOLDS.SUSPICIOUS_ACTIVITY) {
      recommendations.push('Monitor user activity closely');
    }
    if (riskScore > SECURITY_CONFIG.THREAT_THRESHOLDS.HIGH_RISK) {
      recommendations.push('Require additional authentication');
    }
    if (riskScore > SECURITY_CONFIG.THREAT_THRESHOLDS.CRITICAL_THREAT) {
      recommendations.push('Block access immediately');
    }

    return {
      riskScore,
      threats: threats.filter(Boolean),
      recommendations,
      shouldBlock: riskScore >= SECURITY_CONFIG.THREAT_THRESHOLDS.HIGH_RISK,
    };
  }

  /**
   * Analyze User Agent for suspicious patterns
   */
  private analyzeUserAgent(userAgent: string): { risk: number; threats: string[] } {
    const threats: string[] = [];
    let risk = 0;

    if (!userAgent || userAgent.length < 10) {
      threats.push('SUSPICIOUS_USER_AGENT');
      risk += 0.3;
    }

    // Check for bot patterns
    const botPatterns = [
      /bot/i, /crawler/i, /spider/i, /scraper/i,
      /wget/i, /curl/i, /python/i, /java/i,
    ];

    if (botPatterns.some(pattern => pattern.test(userAgent))) {
      threats.push('BOT_DETECTED');
      risk += 0.2;
    }

    // Check for unusual browsers
    const browserPatterns = [
      /chrome/i, /firefox/i, /safari/i, /edge/i, /opera/i
    ];

    if (!browserPatterns.some(pattern => pattern.test(userAgent))) {
      threats.push('UNUSUAL_BROWSER');
      risk += 0.1;
    }

    return { risk, threats };
  }

  /**
   * Analyze request path for suspicious patterns
   */
  private analyzePath(path: string): { risk: number; threats: string[] } {
    const threats: string[] = [];
    let risk = 0;

    // SQL injection patterns
    const sqlPatterns = [
      /union.*select/i, /drop.*table/i, /exec.*xp_/i,
      /script.*alert/i, /'.*or.*'.*=/i,
    ];

    if (sqlPatterns.some(pattern => pattern.test(path))) {
      threats.push('SQL_INJECTION_ATTEMPT');
      risk += 0.8;
    }

    // XSS patterns
    const xssPatterns = [
      /<script/i, /javascript:/i, /onload=/i, /onerror=/i,
    ];

    if (xssPatterns.some(pattern => pattern.test(path))) {
      threats.push('XSS_ATTEMPT');
      risk += 0.7;
    }

    // Directory traversal
    if (path.includes('..') || path.includes('//')) {
      threats.push('DIRECTORY_TRAVERSAL');
      risk += 0.6;
    }

    // Admin paths without authentication
    if (path.includes('/admin') || path.includes('/dashboard')) {
      threats.push('ADMIN_PATH_ACCESS');
      risk += 0.3;
    }

    return { risk, threats };
  }

  /**
   * Analyze request headers for suspicious patterns
   */
  private analyzeHeaders(headers: Record<string, string>): { risk: number; threats: string[] } {
    const threats: string[] = [];
    let risk = 0;

    // Check for missing standard headers
    if (!headers['accept'] || !headers['accept-language']) {
      threats.push('MISSING_STANDARD_HEADERS');
      risk += 0.2;
    }

    // Check for suspicious headers
    if (headers['x-forwarded-for'] && headers['x-forwarded-for'].split(',').length > 3) {
      threats.push('SUSPICIOUS_PROXY_CHAIN');
      risk += 0.3;
    }

    // Check for automation tools
    const automationHeaders = ['x-requested-with', 'x-automation', 'x-selenium'];
    if (automationHeaders.some(header => headers[header])) {
      threats.push('AUTOMATION_DETECTED');
      risk += 0.4;
    }

    return { risk, threats };
  }

  /**
   * Analyze request patterns from IP
   */
  private async analyzeRequestPatterns(ip: string): Promise<{ risk: number; threats: string[] }> {
    const threats: string[] = [];
    let risk = 0;

    try {
      // Get recent requests from this IP
      const { data: recentEvents } = await supabase
        .from('security_events')
        .select('*')
        .eq('ip_address', ip)
        .gte('timestamp', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
        .order('timestamp', { ascending: false });

      if (recentEvents && recentEvents.length > 0) {
        // Check request frequency
        if (recentEvents.length > 50) {
          threats.push('HIGH_FREQUENCY_REQUESTS');
          risk += 0.6;
        }

        // Check for pattern diversity (legitimate users vary their requests)
        const uniquePaths = new Set(recentEvents.map(e => e.details?.path)).size;
        if (recentEvents.length > 10 && uniquePaths < 3) {
          threats.push('REPETITIVE_PATTERN');
          risk += 0.4;
        }

        // Check for escalating risk scores
        const avgRiskScore = recentEvents.reduce((sum, e) => sum + (e.risk_score || 0), 0) / recentEvents.length;
        if (avgRiskScore > 0.5) {
          threats.push('ESCALATING_THREAT_PATTERN');
          risk += 0.5;
        }
      }
    } catch (error) {
      console.error('Error analyzing request patterns:', error);
    }

    return { risk, threats };
  }

  /**
   * Simple geolocation analysis (would use actual geolocation service in production)
   */
  private analyzeGeolocation(ip: string): { risk: number; threats: string[] } {
    const threats: string[] = [];
    let risk = 0;

    // Simple checks (in production, use proper geolocation service)
    if (ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('172.')) {
      // Private IP, likely local/testing
      risk = 0;
    } else if (ip === '127.0.0.1' || ip === '::1') {
      // Localhost
      risk = 0;
    } else {
      // External IP - would check against threat intelligence feeds
      // For now, apply minimal risk
      risk = 0.1;
    }

    return { risk, threats };
  }

  /**
   * Check rate limits for IP and tier
   */
  private checkRateLimit(ip: string, tier: UserTier): { exceeded: boolean; resetTime: number } {
    const now = Date.now();
    const key = `${ip}:${tier.tier}`;
    const current = this.requestCounts.get(key);

    if (!current || now > current.resetTime) {
      // Reset or initialize counter
      this.requestCounts.set(key, {
        count: 1,
        resetTime: now + tier.rateLimit.window,
      });
      return { exceeded: false, resetTime: now + tier.rateLimit.window };
    }

    current.count++;

    return {
      exceeded: current.count > tier.rateLimit.requests,
      resetTime: current.resetTime,
    };
  }

  /**
   * Update session information
   */
  private updateSessionInfo(
    sessionId: string,
    userId: string | undefined,
    ip: string,
    userAgent: string,
    tier: UserTier['tier']
  ): void {
    const now = new Date();
    const existing = this.sessions.get(sessionId);

    if (existing) {
      existing.lastActivity = now;
      existing.requestCount++;
      existing.userId = userId || existing.userId;
    } else {
      this.sessions.set(sessionId, {
        sessionId,
        userId,
        tier,
        ipAddress: ip,
        userAgent,
        createdAt: now,
        lastActivity: now,
        requestCount: 1,
        riskScore: 0,
      });
    }
  }

  /**
   * Block IP address for specified duration
   */
  private blockIP(ip: string, duration: number): void {
    this.blockedIPs.set(ip, Date.now() + duration);
  }

  /**
   * Check if IP is currently blocked
   */
  private isIPBlocked(ip: string): boolean {
    const unblockTime = this.blockedIPs.get(ip);
    if (!unblockTime) return false;

    if (Date.now() > unblockTime) {
      this.blockedIPs.delete(ip);
      return false;
    }

    return true;
  }

  /**
   * Log security event to database
   */
  private async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      await supabase.from('security_events').insert({
        user_id: event.userId,
        session_id: event.sessionId,
        event_type: event.eventType,
        severity: event.severity,
        details: event.details,
        ip_address: event.ipAddress,
        user_agent: event.userAgent,
        timestamp: event.timestamp.toISOString(),
        risk_score: event.riskScore,
      });
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }

  /**
   * Get severity level from risk score
   */
  private getSeverityFromRiskScore(riskScore: number): SecurityEvent['severity'] {
    if (riskScore >= SECURITY_CONFIG.THREAT_THRESHOLDS.CRITICAL_THREAT) return 'critical';
    if (riskScore >= SECURITY_CONFIG.THREAT_THRESHOLDS.HIGH_RISK) return 'high';
    if (riskScore >= SECURITY_CONFIG.THREAT_THRESHOLDS.SUSPICIOUS_ACTIVITY) return 'medium';
    return 'low';
  }

  /**
   * Clean up expired entries from memory
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();

    // Clean up expired rate limit counters
    for (const [key, value] of this.requestCounts.entries()) {
      if (now > value.resetTime) {
        this.requestCounts.delete(key);
      }
    }

    // Clean up expired IP blocks
    for (const [ip, unblockTime] of this.blockedIPs.entries()) {
      if (now > unblockTime) {
        this.blockedIPs.delete(ip);
      }
    }

    // Clean up expired sessions
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastActivity.getTime() > SECURITY_CONFIG.SESSION_SECURITY.MAX_IDLE_TIME) {
        this.sessions.delete(sessionId);
      }
    }
  }

  /**
   * Get security analytics
   */
  async getSecurityAnalytics(timeRange: { start: Date; end: Date }) {
    try {
      const { data: events } = await supabase
        .from('security_events')
        .select('*')
        .gte('timestamp', timeRange.start.toISOString())
        .lte('timestamp', timeRange.end.toISOString())
        .order('timestamp', { ascending: false });

      if (!events) return null;

      // Calculate analytics
      const totalEvents = events.length;
      const threatEvents = events.filter(e => e.risk_score >= SECURITY_CONFIG.THREAT_THRESHOLDS.SUSPICIOUS_ACTIVITY);
      const blockedRequests = events.filter(e => e.details?.analysis?.shouldBlock);
      const uniqueIPs = new Set(events.map(e => e.ip_address)).size;

      // Group by severity
      const severityBreakdown = events.reduce((acc, event) => {
        acc[event.severity] = (acc[event.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Top threat types
      const threatTypes = threatEvents.flatMap(e => e.details?.analysis?.threats || []);
      const threatTypeCount = threatTypes.reduce((acc, threat) => {
        acc[threat] = (acc[threat] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalEvents,
        threatEvents: threatEvents.length,
        blockedRequests: blockedRequests.length,
        uniqueIPs,
        threatRate: threatEvents.length / totalEvents,
        severityBreakdown,
        threatTypeCount,
        recentEvents: events.slice(0, 50), // Last 50 events
      };
    } catch (error) {
      console.error('Error getting security analytics:', error);
      return null;
    }
  }

  /**
   * Get current session information
   */
  getSessionInfo(sessionId: string): SessionInfo | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all active sessions
   */
  getAllActiveSessions(): SessionInfo[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Force logout session
   */
  terminateSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }
}

// Global instance
export const securityAgent = new SecurityPerimeterAgent();

// Export helper functions
export { securityAgent as default };