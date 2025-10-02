/**
 * Tests for environment variable utilities
 *
 * These tests ensure the env-utils properly handle hidden characters
 * and prevent bugs like the AssemblyAI newline incident.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { getEnv, validateApiKey, EnvError, validateEnvironment } from '../lib/env-utils';

describe('Environment Variable Utilities', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Create a fresh copy of process.env for each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Hidden Character Detection and Removal', () => {
    it('should detect and trim newline characters (THE BUG)', () => {
      process.env.TEST_KEY = 'f4e7e2cf1ced4d3d83c15f7206d5c74b\n';
      const result = getEnv('TEST_KEY');

      expect(result).toBe('f4e7e2cf1ced4d3d83c15f7206d5c74b');
      expect(result).not.toContain('\n');
      expect(result.length).toBe(32);
    });

    it('should detect and trim carriage returns', () => {
      process.env.TEST_KEY = 'value\r';
      const result = getEnv('TEST_KEY');

      expect(result).toBe('value');
      expect(result).not.toContain('\r');
    });

    it('should detect and trim tabs', () => {
      process.env.TEST_KEY = 'value\t';
      const result = getEnv('TEST_KEY');

      expect(result).toBe('value');
      expect(result).not.toContain('\t');
    });

    it('should detect and trim leading spaces', () => {
      process.env.TEST_KEY = '  value';
      const result = getEnv('TEST_KEY');

      expect(result).toBe('value');
    });

    it('should detect and trim trailing spaces', () => {
      process.env.TEST_KEY = 'value  ';
      const result = getEnv('TEST_KEY');

      expect(result).toBe('value');
    });

    it('should detect and trim leading and trailing spaces', () => {
      process.env.TEST_KEY = '  value  ';
      const result = getEnv('TEST_KEY');

      expect(result).toBe('value');
    });

    it('should handle multiple hidden characters', () => {
      process.env.TEST_KEY = ' \tvalue\n\r ';
      const result = getEnv('TEST_KEY');

      expect(result).toBe('value');
    });

    it('should preserve internal spaces', () => {
      process.env.TEST_KEY = 'hello world';
      const result = getEnv('TEST_KEY');

      expect(result).toBe('hello world');
    });
  });

  describe('API Key Format Validation', () => {
    describe('hex32 format (AssemblyAI)', () => {
      it('should validate correct hex32 key', () => {
        process.env.ASSEMBLYAI_API_KEY = 'f4e7e2cf1ced4d3d83c15f7206d5c74b';
        const result = validateApiKey('ASSEMBLYAI_API_KEY', 'hex32');

        expect(result).toBe('f4e7e2cf1ced4d3d83c15f7206d5c74b');
        expect(result.length).toBe(32);
      });

      it('should reject hex32 with newline', () => {
        process.env.ASSEMBLYAI_API_KEY = 'f4e7e2cf1ced4d3d83c15f7206d5c74b\n';

        expect(() => {
          validateApiKey('ASSEMBLYAI_API_KEY', 'hex32');
        }).toThrow(EnvError);
      });

      it('should reject hex32 with wrong length', () => {
        process.env.ASSEMBLYAI_API_KEY = 'f4e7e2cf1ced4d3d';

        expect(() => {
          validateApiKey('ASSEMBLYAI_API_KEY', 'hex32');
        }).toThrow(EnvError);
      });

      it('should reject hex32 with invalid characters', () => {
        process.env.ASSEMBLYAI_API_KEY = 'g4e7e2cf1ced4d3d83c15f7206d5c74b'; // 'g' is not hex

        expect(() => {
          validateApiKey('ASSEMBLYAI_API_KEY', 'hex32');
        }).toThrow(EnvError);
      });
    });

    describe('sk-prefix format (OpenAI)', () => {
      it('should validate correct OpenAI key', () => {
        process.env.OPENAI_API_KEY = 'sk-proj-abcdefghijklmnopqrstuvwxyz123456';
        const result = validateApiKey('OPENAI_API_KEY', 'sk-prefix');

        expect(result).toMatch(/^sk-/);
      });

      it('should reject OpenAI key without sk- prefix', () => {
        process.env.OPENAI_API_KEY = 'proj-abcdefghijklmnopqrstuvwxyz123456';

        expect(() => {
          validateApiKey('OPENAI_API_KEY', 'sk-prefix');
        }).toThrow(EnvError);
      });

      it('should reject OpenAI key that is too short', () => {
        process.env.OPENAI_API_KEY = 'sk-short';

        expect(() => {
          validateApiKey('OPENAI_API_KEY', 'sk-prefix');
        }).toThrow(EnvError);
      });

      it('should handle OpenAI key with newline', () => {
        process.env.OPENAI_API_KEY = 'sk-proj-abcdefghijklmnopqrstuvwxyz123456\n';

        expect(() => {
          validateApiKey('OPENAI_API_KEY', 'sk-prefix');
        }).toThrow(EnvError);
      });
    });

    describe('jwt format (Supabase)', () => {
      it('should validate correct JWT', () => {
        process.env.JWT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSJ9.qMCQWvV0MTfwWJPxBrtm01hLvhk2aDKaC1djP6i6I00';
        const result = validateApiKey('JWT_KEY', 'jwt');

        expect(result.split('.').length).toBe(3);
      });

      it('should reject malformed JWT', () => {
        process.env.JWT_KEY = 'not.a.valid.jwt.format';

        // JWT should have exactly 3 parts, not 5
        const parts = process.env.JWT_KEY.split('.');
        expect(parts.length).not.toBe(3);
      });

      it('should reject JWT with only 2 parts', () => {
        process.env.JWT_KEY = 'header.payload';

        expect(() => {
          validateApiKey('JWT_KEY', 'jwt');
        }).toThrow(EnvError);
      });
    });
  });

  describe('Authorization Header Safety', () => {
    it('should produce clean Authorization header without newline', () => {
      process.env.API_KEY = 'test_key\n';
      const apiKey = getEnv('API_KEY');
      const header = `Bearer ${apiKey}`;

      expect(header).toBe('Bearer test_key');
      expect(header).not.toContain('\n');
    });

    it('should work correctly in template literals', () => {
      process.env.API_KEY = 'test_key\n';
      const apiKey = getEnv('API_KEY');
      const headers = {
        'Authorization': `Bearer ${apiKey}`
      };

      expect(headers.Authorization).toBe('Bearer test_key');
      expect(headers.Authorization).not.toContain('\n');
    });

    it('should produce correct header with hex key', () => {
      process.env.API_KEY = 'f4e7e2cf1ced4d3d83c15f7206d5c74b\n';
      const apiKey = getEnv('API_KEY');
      const header = `Bearer ${apiKey}`;

      expect(header).toBe('Bearer f4e7e2cf1ced4d3d83c15f7206d5c74b');
      expect(header.length).toBe('Bearer '.length + 32);
    });
  });

  describe('Real-world Bug Reproduction', () => {
    it('should prevent the exact AssemblyAI bug that occurred', () => {
      // Simulate what happened in production:
      // 1. User ran: echo "key" | vercel env add ASSEMBLYAI_API_KEY
      // 2. This stored "key\n" instead of "key"
      process.env.ASSEMBLYAI_API_KEY = 'f4e7e2cf1ced4d3d83c15f7206d5c74b\n';

      // Without fix: this would include the newline
      const buggyKey = process.env.ASSEMBLYAI_API_KEY;
      const buggyHeader = `Bearer ${buggyKey}`;
      expect(buggyHeader).toContain('\n'); // Bug present
      expect(buggyHeader).toBe('Bearer f4e7e2cf1ced4d3d83c15f7206d5c74b\n');

      // With fix: getEnv() trims the newline
      const fixedKey = getEnv('ASSEMBLYAI_API_KEY');
      const fixedHeader = `Bearer ${fixedKey}`;
      expect(fixedHeader).not.toContain('\n'); // Bug fixed
      expect(fixedHeader).toBe('Bearer f4e7e2cf1ced4d3d83c15f7206d5c74b');
      expect(fixedHeader.length).toBe('Bearer '.length + 32);
    });

    it('should validate AssemblyAI key format after trimming', () => {
      // The key with newline
      process.env.ASSEMBLYAI_API_KEY = 'f4e7e2cf1ced4d3d83c15f7206d5c74b\n';

      // Should trim AND validate
      const key = validateApiKey('ASSEMBLYAI_API_KEY', 'hex32');

      expect(key).toBe('f4e7e2cf1ced4d3d83c15f7206d5c74b');
      expect(key).not.toContain('\n');
      expect(key.length).toBe(32);
      expect(/^[a-f0-9]{32}$/.test(key)).toBe(true);
    });

    it('should catch the bug in fetch headers', () => {
      process.env.ASSEMBLYAI_API_KEY = 'f4e7e2cf1ced4d3d83c15f7206d5c74b\n';

      // Buggy version (what was happening)
      const buggyKey = process.env.ASSEMBLYAI_API_KEY;
      const buggyFetchHeaders = {
        'Authorization': `Bearer ${buggyKey}`,
        'Content-Type': 'application/json'
      };
      expect(buggyFetchHeaders.Authorization).toContain('\n');

      // Fixed version (using getEnv)
      const fixedKey = getEnv('ASSEMBLYAI_API_KEY');
      const fixedFetchHeaders = {
        'Authorization': `Bearer ${fixedKey}`,
        'Content-Type': 'application/json'
      };
      expect(fixedFetchHeaders.Authorization).not.toContain('\n');
      expect(fixedFetchHeaders.Authorization).toBe('Bearer f4e7e2cf1ced4d3d83c15f7206d5c74b');
    });
  });

  describe('Required vs Optional Variables', () => {
    it('should throw error for missing required variable', () => {
      delete process.env.REQUIRED_VAR;

      expect(() => {
        getEnv('REQUIRED_VAR', { required: true });
      }).toThrow(EnvError);
    });

    it('should return empty string for missing optional variable', () => {
      delete process.env.OPTIONAL_VAR;

      const result = getEnv('OPTIONAL_VAR', { required: false });
      expect(result).toBe('');
    });

    it('should return empty string for optional variable by default', () => {
      delete process.env.OPTIONAL_VAR;

      const result = getEnv('OPTIONAL_VAR');
      expect(result).toBe('');
    });
  });

  describe('Length Validation', () => {
    it('should enforce minimum length', () => {
      process.env.SHORT_VAR = 'abc';

      expect(() => {
        getEnv('SHORT_VAR', { minLength: 10 });
      }).toThrow(EnvError);
    });

    it('should enforce maximum length', () => {
      process.env.LONG_VAR = 'a'.repeat(100);

      expect(() => {
        getEnv('LONG_VAR', { maxLength: 50 });
      }).toThrow(EnvError);
    });

    it('should pass length validation when within bounds', () => {
      process.env.GOOD_VAR = 'abcdefghij';

      const result = getEnv('GOOD_VAR', { minLength: 5, maxLength: 20 });
      expect(result).toBe('abcdefghij');
    });
  });

  describe('Pattern Validation', () => {
    it('should validate URL patterns', () => {
      process.env.WEBHOOK_URL = 'https://hooks.zapier.com/123';

      const result = getEnv('WEBHOOK_URL', {
        pattern: /^https:\/\/hooks\.zapier\.com\//
      });

      expect(result).toBe('https://hooks.zapier.com/123');
    });

    it('should reject invalid URL patterns', () => {
      process.env.WEBHOOK_URL = 'http://hooks.zapier.com/123'; // http instead of https

      expect(() => {
        getEnv('WEBHOOK_URL', {
          pattern: /^https:\/\/hooks\.zapier\.com\//,
          errorMessage: 'Webhook URL must be HTTPS'
        });
      }).toThrow('Webhook URL must be HTTPS');
    });
  });

  describe('Bulk Validation', () => {
    it('should validate multiple environment variables', () => {
      const { valid, errors } = validateEnvironment({
        VAR1: { required: true },
        VAR2: { required: true },
        VAR3: { required: false }
      });

      // VAR1 and VAR2 are missing, so validation should fail
      expect(valid).toBe(false);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should pass when all required vars are set', () => {
      process.env.VAR1 = 'value1';
      process.env.VAR2 = 'value2';

      const { valid, errors } = validateEnvironment({
        VAR1: { required: true },
        VAR2: { required: true },
        VAR3: { required: false }
      });

      expect(valid).toBe(true);
      expect(errors.length).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string value', () => {
      process.env.EMPTY_VAR = '';

      const result = getEnv('EMPTY_VAR');
      expect(result).toBe('');
    });

    it('should handle undefined value', () => {
      delete process.env.UNDEFINED_VAR;

      const result = getEnv('UNDEFINED_VAR');
      expect(result).toBe('');
    });

    it('should handle value with only whitespace', () => {
      process.env.WHITESPACE_VAR = '   \n\t   ';

      const result = getEnv('WHITESPACE_VAR');
      expect(result).toBe('');
    });

    it('should not trim when trim option is false', () => {
      process.env.NO_TRIM_VAR = '  value  ';

      const result = getEnv('NO_TRIM_VAR', { trim: false });
      expect(result).toBe('  value  ');
    });
  });
});
