/**
 * Security Audit Agent
 *
 * FOCUS: Comprehensive security auditing for digital security expert
 *
 * Capabilities:
 * - Audit middleware authentication and authorization
 * - Validate environment variables and Google OAuth configuration
 * - Detect publicly accessible sensitive routes
 * - Verify security headers configuration
 * - Check API route protection
 * - Audit session security
 * - Detect secrets exposure risks
 * - Verify database security settings
 * - Monitor failed authentication attempts
 * - Audit token storage and rotation
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface SecurityFinding {
  type: 'auth_misconfiguration' | 'public_sensitive_route' | 'missing_env_var' | 'weak_security_headers' |
        'unprotected_api' | 'session_security' | 'secrets_exposure' | 'oauth_misconfiguration' |
        'database_security' | 'failed_auth_spike';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionable: boolean;
  metadata: Record<string, any>;
  suggestedAction?: string;
  cve?: string; // Common Vulnerabilities and Exposures reference
}

export class SecurityAuditAgent {
  private static instance: SecurityAuditAgent;
  private sessionId: string;
  private projectRoot: string;

  private constructor() {
    this.sessionId = `security_audit_${Date.now()}`;
    this.projectRoot = process.cwd();
  }

  static getInstance(): SecurityAuditAgent {
    if (!SecurityAuditAgent.instance) {
      SecurityAuditAgent.instance = new SecurityAuditAgent();
    }
    return SecurityAuditAgent.instance;
  }

  /**
   * Main execution - run comprehensive security audit
   */
  async run(): Promise<{
    findings: SecurityFinding[];
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    executionTime: number;
    securityScore: number; // 0-100
  }> {
    const startTime = Date.now();
    await this.log('info', '🔒 Security Audit Agent starting comprehensive audit');

    const findings: SecurityFinding[] = [];

    try {
      // 1. Audit environment variables
      const envFindings = await this.auditEnvironmentVariables();
      findings.push(...envFindings);

      // 2. Audit Google OAuth configuration
      const oauthFindings = await this.auditGoogleOAuthConfig();
      findings.push(...oauthFindings);

      // 3. Detect publicly accessible sensitive routes
      const routeFindings = await this.auditPublicRoutes();
      findings.push(...routeFindings);

      // 4. Verify middleware authentication
      const middlewareFindings = await this.auditMiddlewareConfig();
      findings.push(...middlewareFindings);

      // 5. Check security headers
      const headerFindings = await this.auditSecurityHeaders();
      findings.push(...headerFindings);

      // 6. Audit API route protection
      const apiFindings = await this.auditAPIRouteProtection();
      findings.push(...apiFindings);

      // 7. Check session security
      const sessionFindings = await this.auditSessionSecurity();
      findings.push(...sessionFindings);

      // 8. Detect secrets exposure
      const secretsFindings = await this.auditSecretsExposure();
      findings.push(...secretsFindings);

      // 9. Verify database security
      const dbFindings = await this.auditDatabaseSecurity();
      findings.push(...dbFindings);

      // 10. Monitor failed authentication attempts
      const authFailFindings = await this.monitorFailedAuthAttempts();
      findings.push(...authFailFindings);

      // Calculate severity counts
      const criticalCount = findings.filter(f => f.severity === 'critical').length;
      const highCount = findings.filter(f => f.severity === 'high').length;
      const mediumCount = findings.filter(f => f.severity === 'medium').length;
      const lowCount = findings.filter(f => f.severity === 'low').length;

      // Calculate security score (100 = perfect, 0 = critical issues)
      const securityScore = this.calculateSecurityScore(findings);

      const executionTime = Date.now() - startTime;
      await this.log('info', `✅ Security Audit completed: ${findings.length} findings, Score: ${securityScore}/100`, {
        executionTime,
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
        securityScore
      });

      return {
        findings,
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
        executionTime,
        securityScore
      };
    } catch (error: any) {
      await this.log('error', 'Security Audit execution failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Audit environment variables for missing/weak configurations
   */
  private async auditEnvironmentVariables(): Promise<SecurityFinding[]> {
    await this.log('info', '🔐 Auditing environment variables');
    const findings: SecurityFinding[] = [];

    const requiredEnvVars = [
      { name: 'NEXTAUTH_SECRET', minLength: 32 },
      { name: 'GOOGLE_CLIENT_ID', minLength: 20 },
      { name: 'GOOGLE_CLIENT_SECRET', minLength: 20 },
      { name: 'NEXT_PUBLIC_SUPABASE_URL', minLength: 10 },
      { name: 'SUPABASE_SERVICE_ROLE_KEY', minLength: 40 },
      { name: 'CRON_SECRET', minLength: 16 }
    ];

    for (const { name, minLength } of requiredEnvVars) {
      const value = process.env[name];

      if (!value) {
        findings.push({
          type: 'missing_env_var',
          severity: 'critical',
          title: `Missing critical environment variable: ${name}`,
          description: `The environment variable ${name} is not set. This will cause authentication or service failures.`,
          actionable: true,
          metadata: { envVarName: name },
          suggestedAction: `Set ${name} in your environment configuration`
        });
      } else if (value.length < minLength) {
        findings.push({
          type: 'missing_env_var',
          severity: 'high',
          title: `Weak environment variable: ${name}`,
          description: `The environment variable ${name} is too short (${value.length} chars, min: ${minLength}). This may indicate a weak secret.`,
          actionable: true,
          metadata: { envVarName: name, length: value.length, minLength },
          suggestedAction: `Regenerate ${name} with a stronger, longer value`
        });
      }
    }

    await this.log('info', `Found ${findings.length} environment variable issues`);
    return findings;
  }

  /**
   * Audit Google OAuth configuration
   */
  private async auditGoogleOAuthConfig(): Promise<SecurityFinding[]> {
    await this.log('info', '🔑 Auditing Google OAuth configuration');
    const findings: SecurityFinding[] = [];

    try {
      // Check if OAuth config file exists and is properly configured
      const authConfigPath = path.join(this.projectRoot, 'app', 'api', 'auth', '[...nextauth]', 'route.ts');

      if (fs.existsSync(authConfigPath)) {
        const authConfig = fs.readFileSync(authConfigPath, 'utf-8');

        // Check for proper scopes
        const requiredScopes = [
          'openid',
          'email',
          'profile',
          'https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/calendar'
        ];

        for (const scope of requiredScopes) {
          if (!authConfig.includes(scope)) {
            findings.push({
              type: 'oauth_misconfiguration',
              severity: 'medium',
              title: `Missing Google OAuth scope: ${scope}`,
              description: `The OAuth configuration is missing the required scope: ${scope}. This may limit functionality.`,
              actionable: true,
              metadata: { missingScope: scope },
              suggestedAction: `Add ${scope} to the OAuth scopes in ${authConfigPath}`
            });
          }
        }

        // Check for access_type: offline (required for refresh tokens)
        if (!authConfig.includes("access_type: 'offline'")) {
          findings.push({
            type: 'oauth_misconfiguration',
            severity: 'high',
            title: 'OAuth missing offline access',
            description: 'OAuth is not configured for offline access. Refresh tokens will not be issued.',
            actionable: true,
            metadata: { configFile: authConfigPath },
            suggestedAction: 'Set access_type to "offline" in OAuth configuration'
          });
        }

        // Check for prompt: consent (ensures refresh token is always granted)
        if (!authConfig.includes("prompt: 'consent'")) {
          findings.push({
            type: 'oauth_misconfiguration',
            severity: 'medium',
            title: 'OAuth missing consent prompt',
            description: 'OAuth is not configured to always prompt for consent. Refresh tokens may not be reliably issued.',
            actionable: true,
            metadata: { configFile: authConfigPath },
            suggestedAction: 'Set prompt to "consent" in OAuth configuration'
          });
        }

        // Check if tokens are being stored in database
        if (!authConfig.includes('user_tokens')) {
          findings.push({
            type: 'oauth_misconfiguration',
            severity: 'high',
            title: 'OAuth tokens not stored in database',
            description: 'OAuth tokens are not being persisted to the database. This may cause loss of access.',
            actionable: true,
            metadata: { configFile: authConfigPath },
            suggestedAction: 'Implement token storage in session callback'
          });
        }
      } else {
        findings.push({
          type: 'oauth_misconfiguration',
          severity: 'critical',
          title: 'OAuth configuration file missing',
          description: `OAuth configuration file not found at ${authConfigPath}`,
          actionable: true,
          metadata: { expectedPath: authConfigPath },
          suggestedAction: 'Create NextAuth configuration file'
        });
      }

      await this.log('info', `Found ${findings.length} OAuth configuration issues`);
      return findings;
    } catch (error: any) {
      await this.log('error', 'Failed to audit OAuth configuration', { error: error.message });
      return findings;
    }
  }

  /**
   * Detect publicly accessible sensitive routes
   */
  private async auditPublicRoutes(): Promise<SecurityFinding[]> {
    await this.log('info', '🌐 Auditing public routes for sensitive data');
    const findings: SecurityFinding[] = [];

    try {
      const middlewarePath = path.join(this.projectRoot, 'middleware.ts');

      if (fs.existsSync(middlewarePath)) {
        const middlewareContent = fs.readFileSync(middlewarePath, 'utf-8');

        // Extract PUBLIC_PATHS array
        const publicPathsMatch = middlewareContent.match(/const PUBLIC_PATHS = \[([\s\S]*?)\]/);

        if (publicPathsMatch) {
          const publicPaths = publicPathsMatch[1];

          // Check for sensitive routes that should NOT be public
          const sensitiveRoutes = [
            { path: '/archie', reason: 'Exposes agent activity, tasks, and system metrics' },
            { path: '/admin', reason: 'Administrative interface should require authentication' },
            { path: '/dashboard', reason: 'User dashboard with personal data' },
            { path: '/settings', reason: 'User settings and configuration' },
            { path: '/api/users', reason: 'User data API should have strict access control' }
          ];

          for (const { path: route, reason } of sensitiveRoutes) {
            if (publicPaths.includes(route)) {
              findings.push({
                type: 'public_sensitive_route',
                severity: route === '/archie' ? 'critical' : 'high',
                title: `Sensitive route is publicly accessible: ${route}`,
                description: `${route} is in PUBLIC_PATHS and accessible without authentication. ${reason}`,
                actionable: true,
                metadata: { route, middlewarePath },
                suggestedAction: `Remove '${route}' from PUBLIC_PATHS in middleware.ts to require authentication`,
                cve: 'CWE-284: Improper Access Control'
              });
            }
          }
        }
      }

      await this.log('info', `Found ${findings.length} public route security issues`);
      return findings;
    } catch (error: any) {
      await this.log('error', 'Failed to audit public routes', { error: error.message });
      return findings;
    }
  }

  /**
   * Verify middleware authentication configuration
   */
  private async auditMiddlewareConfig(): Promise<SecurityFinding[]> {
    await this.log('info', '🛡️ Auditing middleware authentication');
    const findings: SecurityFinding[] = [];

    try {
      const middlewarePath = path.join(this.projectRoot, 'middleware.ts');

      if (fs.existsSync(middlewarePath)) {
        const middlewareContent = fs.readFileSync(middlewarePath, 'utf-8');

        // Check for email whitelist
        const authorizedEmailsMatch = middlewareContent.match(/const AUTHORIZED_EMAILS = \[([\s\S]*?)\]/);

        if (authorizedEmailsMatch) {
          const emails = authorizedEmailsMatch[1].match(/'([^']+)'/g) || [];

          if (emails.length === 0) {
            findings.push({
              type: 'auth_misconfiguration',
              severity: 'critical',
              title: 'No authorized emails configured',
              description: 'AUTHORIZED_EMAILS array is empty. No users can access the application.',
              actionable: true,
              metadata: { middlewarePath },
              suggestedAction: 'Add authorized email addresses to AUTHORIZED_EMAILS array'
            });
          } else if (emails.length > 10) {
            findings.push({
              type: 'auth_misconfiguration',
              severity: 'medium',
              title: 'Large number of authorized emails',
              description: `AUTHORIZED_EMAILS contains ${emails.length} emails. Consider implementing role-based access control.`,
              actionable: true,
              metadata: { emailCount: emails.length, middlewarePath },
              suggestedAction: 'Implement database-backed role-based access control'
            });
          }

          // Check for weak email patterns
          for (const email of emails) {
            const cleanEmail = email.replace(/'/g, '').trim();
            if (!cleanEmail.includes('@')) {
              findings.push({
                type: 'auth_misconfiguration',
                severity: 'high',
                title: `Invalid email in whitelist: ${cleanEmail}`,
                description: 'AUTHORIZED_EMAILS contains an invalid email address.',
                actionable: true,
                metadata: { invalidEmail: cleanEmail, middlewarePath },
                suggestedAction: 'Remove or correct the invalid email address'
              });
            }
          }
        } else {
          findings.push({
            type: 'auth_misconfiguration',
            severity: 'critical',
            title: 'Email whitelist not found',
            description: 'AUTHORIZED_EMAILS configuration missing from middleware.',
            actionable: true,
            metadata: { middlewarePath },
            suggestedAction: 'Add AUTHORIZED_EMAILS configuration to middleware.ts'
          });
        }

        // Check for proper token validation
        if (!middlewareContent.includes('getToken')) {
          findings.push({
            type: 'auth_misconfiguration',
            severity: 'critical',
            title: 'Missing token validation',
            description: 'Middleware does not validate JWT tokens from NextAuth.',
            actionable: true,
            metadata: { middlewarePath },
            suggestedAction: 'Implement getToken() for JWT validation',
            cve: 'CWE-287: Improper Authentication'
          });
        }
      } else {
        findings.push({
          type: 'auth_misconfiguration',
          severity: 'critical',
          title: 'Middleware file missing',
          description: 'middleware.ts not found. Application has no authentication protection.',
          actionable: true,
          metadata: { expectedPath: middlewarePath },
          suggestedAction: 'Create middleware.ts with proper authentication checks',
          cve: 'CWE-306: Missing Authentication for Critical Function'
        });
      }

      await this.log('info', `Found ${findings.length} middleware authentication issues`);
      return findings;
    } catch (error: any) {
      await this.log('error', 'Failed to audit middleware', { error: error.message });
      return findings;
    }
  }

  /**
   * Check security headers configuration
   */
  private async auditSecurityHeaders(): Promise<SecurityFinding[]> {
    await this.log('info', '📋 Auditing security headers');
    const findings: SecurityFinding[] = [];

    try {
      const middlewarePath = path.join(this.projectRoot, 'middleware.ts');

      if (fs.existsSync(middlewarePath)) {
        const middlewareContent = fs.readFileSync(middlewarePath, 'utf-8');

        const securityHeaders = [
          { name: 'X-Content-Type-Options', value: 'nosniff', severity: 'high' as const },
          { name: 'X-Frame-Options', value: 'DENY', severity: 'high' as const },
          { name: 'X-XSS-Protection', value: '1; mode=block', severity: 'medium' as const },
          { name: 'Referrer-Policy', value: 'strict-origin-when-cross-origin', severity: 'low' as const },
          { name: 'Content-Security-Policy', value: '', severity: 'high' as const }
        ];

        for (const { name, severity } of securityHeaders) {
          if (!middlewareContent.includes(name)) {
            findings.push({
              type: 'weak_security_headers',
              severity,
              title: `Missing security header: ${name}`,
              description: `Security header ${name} is not configured. This leaves the application vulnerable to attacks.`,
              actionable: true,
              metadata: { headerName: name, middlewarePath },
              suggestedAction: `Add ${name} header to middleware response`
            });
          }
        }
      }

      await this.log('info', `Found ${findings.length} security header issues`);
      return findings;
    } catch (error: any) {
      await this.log('error', 'Failed to audit security headers', { error: error.message });
      return findings;
    }
  }

  /**
   * Audit API route protection
   */
  private async auditAPIRouteProtection(): Promise<SecurityFinding[]> {
    await this.log('info', '🔌 Auditing API route protection');
    const findings: SecurityFinding[] = [];

    try {
      const apiDir = path.join(this.projectRoot, 'app', 'api');

      if (fs.existsSync(apiDir)) {
        const apiRoutes = this.getAllApiRoutes(apiDir);

        for (const route of apiRoutes) {
          const routeContent = fs.readFileSync(route, 'utf-8');
          const relativePath = path.relative(apiDir, route);

          // Check if route implements authentication
          const hasAuth = routeContent.includes('getServerSession') ||
                         routeContent.includes('getToken') ||
                         routeContent.includes('CRON_SECRET');

          if (!hasAuth && !relativePath.includes('auth') && !relativePath.includes('health')) {
            findings.push({
              type: 'unprotected_api',
              severity: 'high',
              title: `Unprotected API route: /api/${relativePath.replace(/\\/g, '/').replace('/route.ts', '')}`,
              description: 'API route does not implement authentication. Anyone can access this endpoint.',
              actionable: true,
              metadata: { routePath: route },
              suggestedAction: 'Add getServerSession() or CRON_SECRET validation to this route',
              cve: 'CWE-306: Missing Authentication for Critical Function'
            });
          }
        }
      }

      await this.log('info', `Found ${findings.length} unprotected API routes`);
      return findings;
    } catch (error: any) {
      await this.log('error', 'Failed to audit API routes', { error: error.message });
      return findings;
    }
  }

  /**
   * Check session security
   */
  private async auditSessionSecurity(): Promise<SecurityFinding[]> {
    await this.log('info', '🔐 Auditing session security');
    const findings: SecurityFinding[] = [];

    try {
      // Check for session timeout configuration
      const authConfigPath = path.join(this.projectRoot, 'app', 'api', 'auth', '[...nextauth]', 'route.ts');

      if (fs.existsSync(authConfigPath)) {
        const authConfig = fs.readFileSync(authConfigPath, 'utf-8');

        // Check for session configuration
        if (!authConfig.includes('session')) {
          findings.push({
            type: 'session_security',
            severity: 'medium',
            title: 'No session configuration',
            description: 'NextAuth session configuration is missing. Using default values may not be secure.',
            actionable: true,
            metadata: { configFile: authConfigPath },
            suggestedAction: 'Add explicit session configuration with maxAge and updateAge'
          });
        }

        // Check for JWT strategy
        if (!authConfig.includes('jwt') && !authConfig.includes('database')) {
          findings.push({
            type: 'session_security',
            severity: 'medium',
            title: 'Session strategy not explicit',
            description: 'Session strategy (JWT vs database) is not explicitly configured.',
            actionable: true,
            metadata: { configFile: authConfigPath },
            suggestedAction: 'Explicitly set session strategy to "jwt" or "database"'
          });
        }
      }

      // Check for token rotation in database
      const { data: tokens } = await supabase
        .from('user_tokens')
        .select('updated_at')
        .order('updated_at', { ascending: true })
        .limit(10);

      if (tokens && tokens.length > 0) {
        const oldestToken = new Date(tokens[0].updated_at);
        const daysSinceUpdate = Math.floor((Date.now() - oldestToken.getTime()) / (24 * 60 * 60 * 1000));

        if (daysSinceUpdate > 90) {
          findings.push({
            type: 'session_security',
            severity: 'high',
            title: 'Stale access tokens detected',
            description: `Some access tokens haven't been refreshed in ${daysSinceUpdate} days. They may be expired or invalid.`,
            actionable: true,
            metadata: { daysSinceUpdate, tokenCount: tokens.length },
            suggestedAction: 'Implement automatic token refresh or rotation'
          });
        }
      }

      await this.log('info', `Found ${findings.length} session security issues`);
      return findings;
    } catch (error: any) {
      await this.log('error', 'Failed to audit session security', { error: error.message });
      return findings;
    }
  }

  /**
   * Detect potential secrets exposure
   */
  private async auditSecretsExposure(): Promise<SecurityFinding[]> {
    await this.log('info', '🔍 Scanning for secrets exposure');
    const findings: SecurityFinding[] = [];

    try {
      // Check .env files are in .gitignore
      const gitignorePath = path.join(this.projectRoot, '.gitignore');

      if (fs.existsSync(gitignorePath)) {
        const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');

        if (!gitignoreContent.includes('.env')) {
          findings.push({
            type: 'secrets_exposure',
            severity: 'critical',
            title: '.env files not in .gitignore',
            description: 'Environment files are not excluded from version control. Secrets may be committed.',
            actionable: true,
            metadata: { gitignorePath },
            suggestedAction: 'Add .env* to .gitignore file',
            cve: 'CWE-312: Cleartext Storage of Sensitive Information'
          });
        }
      }

      // Check for hardcoded secrets in codebase (sample check)
      const suspiciousPatterns = [
        { pattern: /sk-[a-zA-Z0-9]{32,}/, name: 'OpenAI API Key' },
        { pattern: /AIza[a-zA-Z0-9_-]{35}/, name: 'Google API Key' },
        { pattern: /ghp_[a-zA-Z0-9]{36}/, name: 'GitHub Personal Access Token' }
      ];

      // Only check specific directories to avoid node_modules
      const dirsToCheck = ['app', 'lib', 'components'];

      for (const dir of dirsToCheck) {
        const dirPath = path.join(this.projectRoot, dir);
        if (fs.existsSync(dirPath)) {
          const files = this.getAllFiles(dirPath, ['.ts', '.tsx', '.js', '.jsx']);

          for (const file of files.slice(0, 50)) { // Limit to first 50 files for performance
            const content = fs.readFileSync(file, 'utf-8');

            for (const { pattern, name } of suspiciousPatterns) {
              if (pattern.test(content)) {
                findings.push({
                  type: 'secrets_exposure',
                  severity: 'critical',
                  title: `Potential hardcoded ${name} detected`,
                  description: `File ${path.relative(this.projectRoot, file)} may contain a hardcoded ${name}.`,
                  actionable: true,
                  metadata: { filePath: file, secretType: name },
                  suggestedAction: 'Move secret to environment variable',
                  cve: 'CWE-798: Use of Hard-coded Credentials'
                });
              }
            }
          }
        }
      }

      await this.log('info', `Found ${findings.length} potential secrets exposure issues`);
      return findings;
    } catch (error: any) {
      await this.log('error', 'Failed to audit secrets exposure', { error: error.message });
      return findings;
    }
  }

  /**
   * Verify database security settings
   */
  private async auditDatabaseSecurity(): Promise<SecurityFinding[]> {
    await this.log('info', '🗄️ Auditing database security');
    const findings: SecurityFinding[] = [];

    try {
      // Check if service role key is being used appropriately
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        findings.push({
          type: 'database_security',
          severity: 'critical',
          title: 'Missing Supabase service role key',
          description: 'SUPABASE_SERVICE_ROLE_KEY is not configured. Database operations will fail.',
          actionable: true,
          metadata: {},
          suggestedAction: 'Set SUPABASE_SERVICE_ROLE_KEY environment variable'
        });
      }

      // Note: RLS audit would require special database permissions
      // Skipping direct table schema queries to avoid permission errors

      // Check for sensitive data in logs
      const { data: recentLogs } = await supabase
        .from('agent_logs')
        .select('message, details')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (recentLogs) {
        for (const log of recentLogs) {
          const logContent = JSON.stringify(log);

          // Check for potential PII in logs
          if (logContent.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i)) {
            findings.push({
              type: 'database_security',
              severity: 'medium',
              title: 'Potential PII in logs',
              description: 'Agent logs may contain personally identifiable information (email addresses).',
              actionable: true,
              metadata: { logSample: log.message },
              suggestedAction: 'Implement log sanitization to remove PII before storage'
            });
            break; // Only report once
          }
        }
      }

      await this.log('info', `Found ${findings.length} database security issues`);
      return findings;
    } catch (error: any) {
      await this.log('error', 'Failed to audit database security', { error: error.message });
      return findings;
    }
  }

  /**
   * Monitor failed authentication attempts
   */
  private async monitorFailedAuthAttempts(): Promise<SecurityFinding[]> {
    await this.log('info', '🚨 Monitoring authentication failures');
    const findings: SecurityFinding[] = [];

    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      // Check for failed auth in logs
      const { data: failedAuthLogs } = await supabase
        .from('agent_logs')
        .select('*')
        .in('log_level', ['error', 'critical'])
        .or('message.ilike.%auth%,message.ilike.%unauthorized%,message.ilike.%forbidden%')
        .gte('timestamp', oneHourAgo);

      if (failedAuthLogs && failedAuthLogs.length > 10) {
        findings.push({
          type: 'failed_auth_spike',
          severity: 'high',
          title: `High number of authentication failures: ${failedAuthLogs.length}`,
          description: `Detected ${failedAuthLogs.length} authentication failures in the last hour. This may indicate a brute force attack.`,
          actionable: true,
          metadata: { failureCount: failedAuthLogs.length, timeWindow: '1 hour' },
          suggestedAction: 'Implement rate limiting and investigate source IPs',
          cve: 'CWE-307: Improper Restriction of Excessive Authentication Attempts'
        });
      }

      await this.log('info', `Found ${findings.length} authentication failure issues`);
      return findings;
    } catch (error: any) {
      await this.log('error', 'Failed to monitor auth failures', { error: error.message });
      return findings;
    }
  }

  // Helper methods

  private calculateSecurityScore(findings: SecurityFinding[]): number {
    let score = 100;

    for (const finding of findings) {
      switch (finding.severity) {
        case 'critical':
          score -= 20;
          break;
        case 'high':
          score -= 10;
          break;
        case 'medium':
          score -= 5;
          break;
        case 'low':
          score -= 2;
          break;
      }
    }

    return Math.max(0, score);
  }

  private getAllApiRoutes(dir: string, routes: string[] = []): string[] {
    try {
      const files = fs.readdirSync(dir);

      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
          this.getAllApiRoutes(filePath, routes);
        } else if (file === 'route.ts' || file === 'route.js') {
          routes.push(filePath);
        }
      }
    } catch (error: any) {
      // Silently skip directories we can't read
    }

    return routes;
  }

  private getAllFiles(dir: string, extensions: string[], files: string[] = []): string[] {
    try {
      const items = fs.readdirSync(dir);

      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory()) {
          this.getAllFiles(itemPath, extensions, files);
        } else if (extensions.some(ext => item.endsWith(ext))) {
          files.push(itemPath);
        }
      }
    } catch (error: any) {
      // Silently skip directories we can't read
    }

    return files;
  }

  private async log(level: string, message: string, details?: any): Promise<void> {
    await supabase.from('agent_logs').insert({
      log_level: level,
      category: 'security-audit',
      message,
      details,
      session_id: this.sessionId
    });

    console.log(`[SECURITY-AUDIT] [${level.toUpperCase()}] ${message}`, details || '');
  }
}
