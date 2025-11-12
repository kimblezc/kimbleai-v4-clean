/**
 * Security Specialized Fixer
 * Handles security vulnerabilities with extra caution
 */

import OpenAI from 'openai';
import { readFileSync, writeFileSync } from 'fs';
import { ImprovementTask, FixResult, SpecializedFixer } from '@/types/archie';
import { isSecuritySensitiveFile, estimateTokens, calculateActualCost } from '../archie-utils';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

export class SecurityFixer implements SpecializedFixer {
  name = 'SecurityFixer';
  priority = 10; // Highest priority - security is critical

  canFix(issue: ImprovementTask): boolean {
    // Only fix security issues in clearly security-related contexts
    if (issue.type === 'security') return true;

    const securityKeywords = [
      /sql injection/i,
      /xss/i,
      /cross-site scripting/i,
      /csrf/i,
      /authentication/i,
      /authorization/i,
      /security/i,
      /vulnerability/i,
      /unsafe/i,
      /dangerous/i
    ];

    const isSecurityIssue = securityKeywords.some(pattern => pattern.test(issue.issue));
    const isSensitiveFile = isSecuritySensitiveFile(issue.file);

    return isSecurityIssue || isSensitiveFile;
  }

  async fix(issue: ImprovementTask): Promise<FixResult> {
    if (!openai) {
      return {
        success: false,
        error: 'OpenAI API key not configured'
      };
    }

    try {
      const fileContent = readFileSync(issue.file, 'utf-8');

      const prompt = this.buildSecurityPrompt(issue, fileContent);

      // Use best model for security - can't compromise here
      const model = 'gpt-4o';

      const response = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: `You are a cybersecurity expert and senior developer. Fix security vulnerabilities with extreme caution.

CRITICAL RULES:
1. Return ONLY the complete fixed file content
2. NO explanations, NO markdown code blocks, NO comments
3. Security is PARAMOUNT - never compromise security for convenience
4. Follow OWASP Top 10 security best practices
5. If the fix requires breaking changes or manual review, return exactly: NEEDS_MANUAL_REVIEW
6. If you cannot safely fix it, return exactly: CANNOT_FIX

Security best practices to follow:
- Input validation and sanitization
- Output encoding
- Parameterized queries (never string concatenation for SQL)
- Proper authentication and authorization checks
- Secure session management
- Protection against XSS, CSRF, SQL Injection
- Principle of least privilege
- Defense in depth

DO NOT:
- Remove security checks
- Weaken authentication
- Bypass authorization
- Disable validation
- Use eval() or similar dangerous functions`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1 // Very low temperature for security
      });

      let fixedCode = response.choices[0]?.message?.content?.trim();
      const usage = response.usage;

      if (!fixedCode) {
        return {
          success: false,
          error: 'No response from AI',
          model
        };
      }

      if (fixedCode === 'NEEDS_MANUAL_REVIEW') {
        return {
          success: false,
          error: 'Security issue requires manual review by a human',
          reasoning: 'AI determined this security issue is too complex or risky for automated fixing',
          model
        };
      }

      if (fixedCode === 'CANNOT_FIX') {
        return {
          success: false,
          error: 'AI determined fix is unsafe',
          model
        };
      }

      // Remove markdown code blocks
      fixedCode = fixedCode.replace(/^```(?:typescript|tsx|ts|javascript|js)?\n?/gm, '').replace(/^```\n?$/gm, '').trim();

      // Extra validation for security fixes
      if (!this.validateSecurityFix(fileContent, fixedCode)) {
        return {
          success: false,
          error: 'Security validation failed',
          reasoning: 'Fix failed security checks',
          model
        };
      }

      // Apply fix
      writeFileSync(issue.file, fixedCode, 'utf-8');

      const cost = usage ? calculateActualCost(usage.prompt_tokens, usage.completion_tokens, model) : 0;

      return {
        success: true,
        fixedCode,
        reasoning: 'Fixed security issue with extra validation and caution',
        cost,
        model
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private buildSecurityPrompt(issue: ImprovementTask, fileContent: string): string {
    return `Fix this security vulnerability:

Security Issue: ${issue.issue}
File: ${issue.file}
Type: ${issue.type}
${issue.lineNumber ? `Line: ${issue.lineNumber}` : ''}

File content:
\`\`\`typescript
${fileContent}
\`\`\`

Fix the security vulnerability following OWASP best practices. If this requires manual review, return NEEDS_MANUAL_REVIEW.
Otherwise, return ONLY the fixed code.`;
  }

  private validateSecurityFix(original: string, fixed: string): boolean {
    // Check that security-critical code wasn't removed
    const securityPatterns = [
      /authenticate/i,
      /authorize/i,
      /validate/i,
      /sanitize/i,
      /escape/i,
      /permission/i
    ];

    // Count security-related code in original
    const originalSecurityCount = securityPatterns.reduce((count, pattern) => {
      const matches = original.match(pattern);
      return count + (matches ? matches.length : 0);
    }, 0);

    // Count security-related code in fixed
    const fixedSecurityCount = securityPatterns.reduce((count, pattern) => {
      const matches = fixed.match(pattern);
      return count + (matches ? matches.length : 0);
    }, 0);

    // Fixed code should have at least as much security code as original
    // (or original had none)
    if (originalSecurityCount > 0 && fixedSecurityCount < originalSecurityCount) {
      console.log('  ⚠️  Security fix removed security-related code, rejecting');
      return false;
    }

    // Check for dangerous patterns in fixed code
    const dangerousPatterns = [
      /eval\(/,
      /dangerouslySetInnerHTML/,
      /innerHTML\s*=/,
      /document\.write/,
      /\$\{.*\}/  // Template literal in SQL context
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(fixed) && !pattern.test(original)) {
        console.log(`  ⚠️  Security fix introduced dangerous pattern: ${pattern}, rejecting`);
        return false;
      }
    }

    return true;
  }
}

export const securityFixer = new SecurityFixer();
