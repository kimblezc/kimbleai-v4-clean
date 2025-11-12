/**
 * TypeScript Specialized Fixer
 * Handles TypeScript type errors with advanced strategies
 */

import OpenAI from 'openai';
import { readFileSync, writeFileSync } from 'fs';
import { ImprovementTask, FixResult, SpecializedFixer, FixStrategy } from '@/types/archie';
import { isTypeScriptIssue, estimateTokens, calculateActualCost, extractCodeContext } from '../archie-utils';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

export class TypeScriptFixer implements SpecializedFixer {
  name = 'TypeScriptFixer';
  priority = 9; // Very high priority for type errors

  canFix(issue: ImprovementTask): boolean {
    return isTypeScriptIssue(issue);
  }

  async fix(issue: ImprovementTask, attemptNumber: number = 1): Promise<FixResult> {
    if (!openai) {
      return {
        success: false,
        error: 'OpenAI API key not configured'
      };
    }

    try {
      const fileContent = readFileSync(issue.file, 'utf-8');
      const context = extractCodeContext(fileContent, issue.lineNumber, 30);

      const strategy = this.selectStrategy(attemptNumber);
      const model = attemptNumber === 1 ? 'gpt-4o' : 'claude-3-sonnet';

      const prompt = this.buildTypeScriptPrompt(issue, fileContent, context, strategy);
      const systemPrompt = this.buildSystemPrompt(strategy);

      const response = await openai.chat.completions.create({
        model: model as any,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1 + (attemptNumber * 0.1)
      });

      let fixedCode = response.choices[0]?.message?.content?.trim();
      const usage = response.usage;

      if (!fixedCode || fixedCode === 'CANNOT_FIX') {
        return {
          success: false,
          error: 'AI determined fix is unsafe',
          model
        };
      }

      // Remove markdown code blocks
      fixedCode = fixedCode.replace(/^```(?:typescript|tsx|ts|javascript|js)?\n?/gm, '').replace(/^```\n?$/gm, '').trim();

      // Validate fix
      if (Math.abs(fixedCode.length - fileContent.length) > fileContent.length * 0.5) {
        return {
          success: false,
          error: 'Fix changes file size by >50%, rejecting as unsafe',
          model
        };
      }

      // Apply fix
      writeFileSync(issue.file, fixedCode, 'utf-8');

      const cost = usage ? calculateActualCost(usage.prompt_tokens, usage.completion_tokens, model) : 0;

      return {
        success: true,
        fixedCode,
        reasoning: `Fixed TypeScript issue using ${strategy} strategy`,
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

  private selectStrategy(attemptNumber: number): FixStrategy {
    switch (attemptNumber) {
      case 1:
        return 'minimal';
      case 2:
        return 'aggressive';
      default:
        return 'last_resort';
    }
  }

  private buildSystemPrompt(strategy: FixStrategy): string {
    switch (strategy) {
      case 'minimal':
        return `You are an expert TypeScript developer. Fix the type error with MINIMAL changes.

RULES:
1. Return ONLY the complete fixed file content
2. NO explanations, NO markdown code blocks, NO comments
3. Preserve all existing code structure and formatting
4. Fix ONLY the specific type error mentioned
5. Use proper TypeScript types (avoid 'any' unless necessary)
6. Add type assertions only when truly needed
7. If you cannot safely fix it, return exactly: CANNOT_FIX

Strategy: Minimal changes, preserve code structure`;

      case 'aggressive':
        return `You are an expert TypeScript developer. The first fix failed. Try a different approach.

RULES:
1. Return ONLY the complete fixed file content
2. NO explanations, NO markdown code blocks
3. Be more aggressive - add type assertions, null checks, or type guards if needed
4. Fix the type error completely
5. Use 'as' assertions when safe
6. Add non-null assertions (!) when appropriate
7. If you cannot safely fix it, return exactly: CANNOT_FIX

Strategy: Aggressive with type assertions and guards`;

      case 'last_resort':
        return `You are an expert TypeScript developer. Previous fixes failed. Last resort approach.

RULES:
1. Return ONLY the complete fixed file content
2. NO explanations, NO markdown code blocks
3. Use any necessary type assertions ('as any', etc.) to make it compile
4. The code MUST be syntactically valid TypeScript
5. Preserve functionality even if types are loosened
6. If you cannot safely fix it, return exactly: CANNOT_FIX

Strategy: Last resort - use 'any' types if needed`;

      default:
        return this.buildSystemPrompt('minimal');
    }
  }

  private buildTypeScriptPrompt(
    issue: ImprovementTask,
    fileContent: string,
    context: string,
    strategy: FixStrategy
  ): string {
    return `Fix this TypeScript error:

Error: ${issue.issue}
File: ${issue.file}
${issue.lineNumber ? `Line: ${issue.lineNumber}` : ''}
Strategy: ${strategy}

${issue.lineNumber ? `Context around error:\n\`\`\`typescript\n${context}\n\`\`\`\n\n` : ''}Full file content:
\`\`\`typescript
${fileContent}
\`\`\`

Fix the TypeScript error. Return ONLY the fixed code.`;
  }
}

export const typeScriptFixer = new TypeScriptFixer();
