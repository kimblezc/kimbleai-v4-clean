/**
 * React Specialized Fixer
 * Handles React-specific issues with domain expertise
 */

import OpenAI from 'openai';
import { readFileSync, writeFileSync } from 'fs';
import { ImprovementTask, FixResult, SpecializedFixer } from '@/types/archie';
import { isReactFile, estimateTokens, calculateActualCost } from '../archie-utils';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

export class ReactFixer implements SpecializedFixer {
  name = 'ReactFixer';
  priority = 8; // High priority for React issues

  canFix(issue: ImprovementTask): boolean {
    // Can fix if it's a React file
    if (!isReactFile(issue.file)) return false;

    // Can fix common React issues
    const reactIssues = [
      /hook/i,
      /component/i,
      /props/i,
      /state/i,
      /useEffect/i,
      /useState/i,
      /jsx/i,
      /render/i
    ];

    return reactIssues.some(pattern => pattern.test(issue.issue));
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

      const prompt = this.buildReactPrompt(issue, fileContent);
      const inputTokens = estimateTokens(prompt);

      const response = await openai.chat.completions.create({
        model: 'gpt-4o', // Use better model for React
        messages: [
          {
            role: 'system',
            content: `You are an expert React and TypeScript developer. Fix React-specific issues following best practices.

RULES:
1. Return ONLY the complete fixed file content
2. NO explanations, NO markdown code blocks, NO comments about changes
3. Follow React best practices (hooks rules, component patterns, etc.)
4. Preserve all existing functionality
5. Fix ONLY the specific issue mentioned
6. Use TypeScript types correctly
7. Follow React 18+ patterns
8. If you cannot safely fix it, return exactly: CANNOT_FIX

Common React patterns to follow:
- Hooks must be called at the top level
- useEffect dependencies must be complete
- Props should be properly typed
- Event handlers should use correct types
- Async operations in useEffect should be handled correctly`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2
      });

      let fixedCode = response.choices[0]?.message?.content?.trim();
      const usage = response.usage;

      if (!fixedCode || fixedCode === 'CANNOT_FIX') {
        return {
          success: false,
          error: 'AI determined fix is unsafe',
          model: 'gpt-4o'
        };
      }

      // Remove markdown code blocks if present
      fixedCode = fixedCode.replace(/^```(?:typescript|tsx|jsx|ts|javascript|js)?\n?/gm, '').replace(/^```\n?$/gm, '').trim();

      // Validate fix
      if (Math.abs(fixedCode.length - fileContent.length) > fileContent.length * 0.5) {
        return {
          success: false,
          error: 'Fix changes file size by >50%, rejecting as unsafe',
          model: 'gpt-4o'
        };
      }

      // Apply fix
      writeFileSync(issue.file, fixedCode, 'utf-8');

      const cost = usage ? calculateActualCost(usage.prompt_tokens, usage.completion_tokens, 'gpt-4o') : 0;

      return {
        success: true,
        fixedCode,
        reasoning: 'Fixed React-specific issue using domain expertise',
        cost,
        model: 'gpt-4o'
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        model: 'gpt-4o'
      };
    }
  }

  private buildReactPrompt(issue: ImprovementTask, fileContent: string): string {
    return `Fix this React issue:

Issue Type: ${issue.type}
Problem: ${issue.issue}
File: ${issue.file}
${issue.lineNumber ? `Line: ${issue.lineNumber}` : ''}

File content:
\`\`\`tsx
${fileContent}
\`\`\`

Fix the issue while following React best practices. Return ONLY the fixed code.`;
  }
}

export const reactFixer = new ReactFixer();
