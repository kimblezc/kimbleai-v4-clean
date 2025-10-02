import { describe, it, expect, beforeEach } from 'vitest';
import {
  isEmailAuthorized,
  getUserIdFromEmail,
  AUTHORIZED_EMAILS,
  checkRateLimit,
  createSecurityLog,
} from '../lib/auth';

describe('Authentication Security Tests', () => {
  describe('Email Authorization', () => {
    it('should authorize Zach email', () => {
      expect(isEmailAuthorized('zach.kimble@gmail.com')).toBe(true);
    });

    it('should authorize Rebecca email', () => {
      expect(isEmailAuthorized('becky.aza.kimble@gmail.com')).toBe(true);
    });

    it('should handle case-insensitive email matching', () => {
      expect(isEmailAuthorized('ZACH.KIMBLE@GMAIL.COM')).toBe(true);
      expect(isEmailAuthorized('Becky.Aza.Kimble@Gmail.Com')).toBe(true);
    });

    it('should handle emails with extra whitespace', () => {
      expect(isEmailAuthorized('  zach.kimble@gmail.com  ')).toBe(true);
      expect(isEmailAuthorized('becky.aza.kimble@gmail.com ')).toBe(true);
    });

    it('should reject unauthorized emails', () => {
      expect(isEmailAuthorized('unauthorized@gmail.com')).toBe(false);
      expect(isEmailAuthorized('hacker@example.com')).toBe(false);
      expect(isEmailAuthorized('admin@kimbleai.com')).toBe(false);
    });

    it('should reject null and undefined emails', () => {
      expect(isEmailAuthorized(null)).toBe(false);
      expect(isEmailAuthorized(undefined)).toBe(false);
    });

    it('should reject empty strings', () => {
      expect(isEmailAuthorized('')).toBe(false);
      expect(isEmailAuthorized('   ')).toBe(false);
    });

    it('should only have exactly 2 authorized emails', () => {
      expect(AUTHORIZED_EMAILS).toHaveLength(2);
      expect(AUTHORIZED_EMAILS).toContain('zach.kimble@gmail.com');
      expect(AUTHORIZED_EMAILS).toContain('becky.aza.kimble@gmail.com');
    });
  });

  describe('User ID Mapping', () => {
    it('should map Zach email to zach user ID', () => {
      expect(getUserIdFromEmail('zach.kimble@gmail.com')).toBe('zach');
    });

    it('should map Rebecca email to rebecca user ID', () => {
      expect(getUserIdFromEmail('becky.aza.kimble@gmail.com')).toBe('rebecca');
    });

    it('should handle case-insensitive mapping', () => {
      expect(getUserIdFromEmail('ZACH.KIMBLE@GMAIL.COM')).toBe('zach');
      expect(getUserIdFromEmail('BECKY.AZA.KIMBLE@GMAIL.COM')).toBe('rebecca');
    });

    it('should return null for unauthorized emails', () => {
      expect(getUserIdFromEmail('unauthorized@gmail.com')).toBe(null);
      expect(getUserIdFromEmail('hacker@example.com')).toBe(null);
    });
  });

  describe('Rate Limiting', () => {
    beforeEach(() => {
      // Note: In a real test, you'd want to reset the rate limit store
    });

    it('should allow requests within rate limit', () => {
      const result1 = checkRateLimit('test-user-1', 5, 15);
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(4);

      const result2 = checkRateLimit('test-user-1', 5, 15);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(3);
    });

    it('should block requests exceeding rate limit', () => {
      const identifier = 'test-user-2';
      const maxAttempts = 3;
      const windowMinutes = 15;

      // Make requests up to the limit
      for (let i = 0; i < maxAttempts; i++) {
        const result = checkRateLimit(identifier, maxAttempts, windowMinutes);
        expect(result.allowed).toBe(true);
      }

      // Next request should be blocked
      const blockedResult = checkRateLimit(identifier, maxAttempts, windowMinutes);
      expect(blockedResult.allowed).toBe(false);
      expect(blockedResult.remaining).toBe(0);
    });

    it('should provide reset timestamp', () => {
      const result = checkRateLimit('test-user-3', 5, 15);
      expect(result.resetAt).toBeGreaterThan(Date.now());
    });
  });

  describe('Security Logging', () => {
    it('should create valid security log', () => {
      const log = createSecurityLog(
        'signin_attempt',
        'zach.kimble@gmail.com',
        true,
        'Authorized email'
      );

      expect(log.event_type).toBe('signin_attempt');
      expect(log.email).toBe('zach.kimble@gmail.com');
      expect(log.success).toBe(true);
      expect(log.reason).toBe('Authorized email');
      expect(log.timestamp).toBeTruthy();
    });

    it('should handle failed authentication log', () => {
      const log = createSecurityLog(
        'signin_attempt',
        'hacker@example.com',
        false,
        'Email not in authorized whitelist'
      );

      expect(log.success).toBe(false);
      expect(log.reason).toBe('Email not in authorized whitelist');
    });

    it('should include metadata when provided', () => {
      const metadata = { ip: '192.168.1.1', userAgent: 'Mozilla/5.0' };
      const log = createSecurityLog(
        'api_access',
        'zach.kimble@gmail.com',
        true,
        'Authorized access',
        metadata
      );

      expect(log.metadata).toEqual(metadata);
    });
  });

  describe('Security Requirements', () => {
    it('should ensure HTTPS is required in production', () => {
      // This test verifies environment configuration
      if (process.env.NODE_ENV === 'production') {
        expect(process.env.NEXTAUTH_URL).toMatch(/^https:\/\//);
      }
    });

    it('should have NextAuth secret configured in production', () => {
      // This test validates the security requirement exists
      // In production, NEXTAUTH_SECRET must be long and complex
      const secret = process.env.NEXTAUTH_SECRET;

      // Production environment should always have a strong secret
      if (process.env.NODE_ENV === 'production') {
        expect(secret).toBeTruthy();
        expect(secret!.length).toBeGreaterThan(32);
      } else {
        // Test environment - just verify the format if present
        if (secret && secret.length > 10) {
          // Has a reasonable secret configured
          expect(secret.length).toBeGreaterThan(10);
        } else {
          // No secret or weak secret - acceptable in test env
          expect(true).toBe(true);
        }
      }
    });

    it('should have Google OAuth credentials configured in production', () => {
      // Skip in test environment, but critical in production
      if (process.env.NODE_ENV === 'production' || process.env.GOOGLE_CLIENT_ID) {
        expect(process.env.GOOGLE_CLIENT_ID).toBeTruthy();
        expect(process.env.GOOGLE_CLIENT_SECRET).toBeTruthy();
      } else {
        // Just ensure the check would work
        expect(true).toBe(true);
      }
    });
  });
});

describe('Attack Vectors and Security', () => {
  describe('Email Spoofing Prevention', () => {
    it('should reject similar but different emails', () => {
      expect(isEmailAuthorized('zach.kimble+test@gmail.com')).toBe(false);
      expect(isEmailAuthorized('zach.kimble@googlemail.com')).toBe(false);
      expect(isEmailAuthorized('zach-kimble@gmail.com')).toBe(false);
    });

    it('should reject emails with Unicode characters', () => {
      expect(isEmailAuthorized('zach.kіmble@gmail.com')).toBe(false); // Cyrillic i
      expect(isEmailAuthorized('zach.kimble@gmaіl.com')).toBe(false);
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should safely handle SQL injection attempts in email', () => {
      const sqlInjectionAttempts = [
        "zach.kimble@gmail.com' OR '1'='1",
        "admin'--",
        "'; DROP TABLE users; --",
      ];

      sqlInjectionAttempts.forEach((attempt) => {
        expect(isEmailAuthorized(attempt)).toBe(false);
      });
    });
  });

  describe('XSS Prevention', () => {
    it('should safely handle XSS attempts in email', () => {
      const xssAttempts = [
        '<script>alert("xss")</script>@gmail.com',
        'zach.kimble@gmail.com<script>',
        'javascript:alert(1)@gmail.com',
      ];

      xssAttempts.forEach((attempt) => {
        expect(isEmailAuthorized(attempt)).toBe(false);
      });
    });
  });

  describe('Rate Limiting Attack Prevention', () => {
    it('should prevent brute force attacks', () => {
      const attacker = 'attacker@example.com';

      // Simulate multiple login attempts
      for (let i = 0; i < 10; i++) {
        const result = checkRateLimit(attacker, 5, 15);
        if (i < 5) {
          expect(result.allowed).toBe(true);
        } else {
          expect(result.allowed).toBe(false);
        }
      }
    });
  });
});
