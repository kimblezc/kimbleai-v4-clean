/**
 * ARCHIE - Autonomous Repository Coding & Housekeeping Intelligence Engine
 *
 * A practical coding janitor that:
 * - Finds obvious issues (linting, dead code, type errors)
 * - Fixes them automatically
 * - Commits the changes
 * - Reports what it did
 *
 * No approval workflows. No complexity. Just gets stuff done.
 */

import OpenAI from 'openai';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// Optional OpenAI client (only needed for AI-powered fixes, currently unused)
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

interface ImprovementTask {
  type: 'lint' | 'dead_code' | 'type_error' | 'optimization' | 'dependency';
  file: string;
  issue: string;
  fix?: string;
  priority: number;
}

interface ArchieRun {
  timestamp: Date;
  tasksFound: number;
  tasksCompleted: number;
  tasksSkipped: number;
  improvements: ImprovementTask[];
  errors: string[];
  commitHash?: string;
  summary: string;
}

export class ArchieAgent {
  private maxTasksPerRun = 5; // Don't go crazy
  private maxRetries = 3; // Retry failed fixes up to 3 times
  private projectRoot: string;
  private dryRun: boolean;

  // AI Configuration
  private useAI: boolean = true; // Enable/disable AI fixes
  private maxAICost: number = 0.50; // Max $0.50 per run
  private estimatedCost: number = 0; // Track costs during run
  private aiModel: string = 'gpt-4o-mini'; // Cheaper model for most fixes
  private aiModelAdvanced: string = 'gpt-4o'; // Use for complex fixes

  constructor(projectRoot: string = process.cwd(), dryRun: boolean = false) {
    this.projectRoot = projectRoot;
    this.dryRun = dryRun;
  }

  /**
   * Main execution method - run this on a schedule
   */
  async run(): Promise<ArchieRun> {
    console.log('🦉 Archie starting maintenance run...');

    // Reset cost tracking for this run
    this.estimatedCost = 0;

    const runResult: ArchieRun = {
      timestamp: new Date(),
      tasksFound: 0,
      tasksCompleted: 0,
      tasksSkipped: 0,
      improvements: [],
      errors: [],
      summary: ''
    };

    try {
      // 1. Scan for issues
      console.log('📊 Scanning codebase for issues...');
      const tasks = await this.scanForIssues();
      runResult.tasksFound = tasks.length;

      if (tasks.length === 0) {
        runResult.summary = 'No issues found - codebase is clean!';
        console.log('✅ ' + runResult.summary);
        return runResult;
      }

      // 2. Sort by priority
      tasks.sort((a, b) => b.priority - a.priority);

      // 3. Fix the top N issues
      const tasksToFix = tasks.slice(0, this.maxTasksPerRun);
      console.log(`🔧 Fixing top ${tasksToFix.length} issues...`);

      for (const task of tasksToFix) {
        try {
          const success = await this.fixIssue(task);
          if (success) {
            runResult.tasksCompleted++;
            runResult.improvements.push(task);
          } else {
            runResult.tasksSkipped++;
          }
        } catch (error: any) {
          console.error(`❌ Failed to fix ${task.type} in ${task.file}:`, error.message);
          runResult.errors.push(`${task.file}: ${error.message}`);
          runResult.tasksSkipped++;
        }
      }

      // 4. Commit changes if any were made
      if (runResult.tasksCompleted > 0 && !this.dryRun) {
        runResult.commitHash = await this.commitChanges(runResult.improvements);
      }

      // 5. Generate summary
      runResult.summary = this.generateSummary(runResult);
      console.log('✅ ' + runResult.summary);

    } catch (error: any) {
      console.error('❌ Archie run failed:', error);
      runResult.errors.push(error.message);
      runResult.summary = `Run failed: ${error.message}`;
    }

    return runResult;
  }

  /**
   * Scan codebase for issues that can be auto-fixed
   */
  private async scanForIssues(): Promise<ImprovementTask[]> {
    const tasks: ImprovementTask[] = [];

    // 1. Check for linting errors
    tasks.push(...await this.findLintErrors());

    // 2. Check for unused imports/variables
    tasks.push(...await this.findDeadCode());

    // 3. Check for TypeScript errors
    tasks.push(...await this.findTypeErrors());

    // 4. Check for outdated patch dependencies
    tasks.push(...await this.findPatchUpdates());

    return tasks;
  }

  /**
   * Find linting errors that can be auto-fixed
   */
  private async findLintErrors(): Promise<ImprovementTask[]> {
    try {
      const output = execSync('npm run lint', {
        cwd: this.projectRoot,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      }).toString();

      // Parse ESLint output for auto-fixable issues
      const tasks: ImprovementTask[] = [];
      const lines = output.split('\n');

      for (const line of lines) {
        if (line.includes('error') || line.includes('warning')) {
          const match = line.match(/(.+?):(\d+):(\d+): (.+?) (.+)/);
          if (match) {
            const [, file, , , level, message] = match;
            tasks.push({
              type: 'lint',
              file: file.trim(),
              issue: message.trim(),
              priority: level === 'error' ? 8 : 5
            });
          }
        }
      }

      return tasks;
    } catch (error) {
      // Linting might fail - that's okay
      return [];
    }
  }

  /**
   * Find unused imports and dead code
   */
  private async findDeadCode(): Promise<ImprovementTask[]> {
    const tasks: ImprovementTask[] = [];

    // Scan TypeScript files
    const tsFiles = this.findFiles('.ts', ['node_modules', '.next', 'archive']);

    for (const file of tsFiles.slice(0, 20)) { // Limit to avoid slowness
      try {
        const content = readFileSync(file, 'utf-8');

        // Check for unused imports (simple heuristic)
        const importMatches = content.matchAll(/import .+ from ['"](.+)['"]/g);
        for (const match of importMatches) {
          const importPath = match[1];
          // Simple check: if import is never referenced
          if (!content.includes(importPath.split('/').pop() || '')) {
            tasks.push({
              type: 'dead_code',
              file,
              issue: `Potentially unused import: ${importPath}`,
              priority: 3
            });
          }
        }
      } catch (error) {
        // Skip files we can't read
      }
    }

    return tasks;
  }

  /**
   * Find TypeScript type errors
   */
  private async findTypeErrors(): Promise<ImprovementTask[]> {
    try {
      execSync('npx tsc --noEmit', {
        cwd: this.projectRoot,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      return []; // No errors
    } catch (error: any) {
      const output = error.stdout?.toString() || '';
      const tasks: ImprovementTask[] = [];

      const lines = output.split('\n');
      for (const line of lines) {
        if (line.includes('error TS')) {
          const match = line.match(/(.+?)\((\d+),(\d+)\): error TS\d+: (.+)/);
          if (match) {
            const [, file, , , message] = match;
            tasks.push({
              type: 'type_error',
              file: file.trim(),
              issue: message.trim(),
              priority: 7
            });
          }
        }
      }

      return tasks.slice(0, 5); // Limit type errors
    }
  }

  /**
   * Find patch-level dependency updates
   */
  private async findPatchUpdates(): Promise<ImprovementTask[]> {
    try {
      const output = execSync('npm outdated --json', {
        cwd: this.projectRoot,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      }).toString();

      const outdated = JSON.parse(output);
      const tasks: ImprovementTask[] = [];

      for (const [pkg, info] of Object.entries(outdated as any)) {
        const current = info.current;
        const wanted = info.wanted;

        // Only patch updates (1.2.3 -> 1.2.4)
        if (current && wanted && wanted.split('.')[0] === current.split('.')[0] &&
            wanted.split('.')[1] === current.split('.')[1]) {
          tasks.push({
            type: 'dependency',
            file: 'package.json',
            issue: `Update ${pkg} from ${current} to ${wanted}`,
            priority: 4
          });
        }
      }

      return tasks;
    } catch (error) {
      return [];
    }
  }

  /**
   * Fix an individual issue with retry logic
   */
  private async fixIssue(task: ImprovementTask): Promise<boolean> {
    console.log(`  🔧 Fixing ${task.type}: ${task.issue}`);

    // Try fix up to maxRetries times
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        let success = false;

        switch (task.type) {
          case 'lint':
            success = await this.fixLintError(task);
            break;

          case 'dead_code':
            success = await this.fixDeadCode(task);
            break;

          case 'type_error':
            success = await this.fixTypeError(task, attempt);
            break;

          case 'dependency':
            success = await this.fixDependency(task);
            break;

          case 'optimization':
            // Use AI for optimization issues
            success = await this.aiFixIssue(task);
            break;

          default:
            // Try general AI fix for unknown issue types
            console.log(`    🤖 Unknown issue type, trying AI fix...`);
            success = await this.aiFixIssue(task);
            break;
        }

        if (success) {
          // Test the fix
          const testPassed = await this.testFix(task);
          if (testPassed) {
            console.log(`    ✅ Fixed successfully (attempt ${attempt})`);
            return true;
          } else {
            console.log(`    ⚠️  Fix applied but tests failed (attempt ${attempt})`);
            // Rollback and try again
            await this.rollbackChanges(task);
          }
        } else {
          console.log(`    ❌ Fix failed (attempt ${attempt})`);
        }
      } catch (error: any) {
        console.log(`    ❌ Error during fix attempt ${attempt}: ${error.message}`);
      }

      if (attempt < this.maxRetries) {
        console.log(`    🔄 Retrying with different approach...`);
      }
    }

    console.log(`    ⛔ Gave up after ${this.maxRetries} attempts`);
    return false;
  }

  /**
   * Test if a fix actually works
   */
  private async testFix(task: ImprovementTask): Promise<boolean> {
    try {
      if (task.type === 'type_error' || task.type === 'dead_code') {
        // Test TypeScript compilation
        execSync('npx tsc --noEmit', {
          cwd: this.projectRoot,
          stdio: 'pipe'
        });
      } else if (task.type === 'lint') {
        // Test linting
        execSync(`npm run lint -- ${task.file}`, {
          cwd: this.projectRoot,
          stdio: 'pipe'
        });
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Rollback changes to a file
   */
  private async rollbackChanges(task: ImprovementTask): Promise<void> {
    try {
      execSync(`git checkout -- ${task.file}`, {
        cwd: this.projectRoot,
        stdio: 'ignore'
      });
    } catch (error) {
      // Ignore rollback errors
    }
  }

  /**
   * Auto-fix linting errors
   */
  private async fixLintError(task: ImprovementTask): Promise<boolean> {
    try {
      execSync(`npm run lint -- --fix ${task.file}`, {
        cwd: this.projectRoot,
        stdio: 'ignore'
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Remove dead code (unused imports) using AI
   */
  private async fixDeadCode(task: ImprovementTask): Promise<boolean> {
    if (!openai) {
      console.log(`      ⚠️  Skipping AI fix - OPENAI_API_KEY not set`);
      return false;
    }

    try {
      const content = readFileSync(task.file, 'utf-8');

      // Check cost before proceeding
      const inputText = `Fix this file by removing unused imports:\n\nIssue: ${task.issue}\n\nFile content:\n${content}`;
      const inputTokens = this.estimateTokens(inputText);

      if (!this.canAffordAIFix(inputTokens, this.aiModel)) {
        return false;
      }

      console.log(`      🤖 Using AI to remove dead code...`);

      const response = await openai.chat.completions.create({
        model: this.aiModel,
        messages: [
          {
            role: 'system',
            content: 'You are a code fixing assistant. Remove unused imports and dead code. Return ONLY the fixed code, no explanations, no markdown formatting.'
          },
          {
            role: 'user',
            content: inputText
          }
        ],
        temperature: 0.3
      });

      const fixedCode = response.choices[0]?.message?.content?.trim();
      const usage = response.usage;

      if (usage) {
        this.trackCost(usage.prompt_tokens, usage.completion_tokens, this.aiModel);
      }

      if (!fixedCode) return false;

      // Apply fix
      if (!this.dryRun) {
        writeFileSync(task.file, fixedCode, 'utf-8');
      }

      return true;
    } catch (error: any) {
      console.log(`      ❌ AI fix failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Fix TypeScript errors using AI with iterative approaches
   */
  private async fixTypeError(task: ImprovementTask, attempt: number): Promise<boolean> {
    if (!openai) {
      console.log(`      ⚠️  Skipping AI fix - OPENAI_API_KEY not set`);
      return false;
    }

    try {
      const filePath = join(this.projectRoot, task.file);
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      // Extract line number from error message if available
      const lineMatch = task.issue.match(/line (\d+)/i) || task.file.match(/:(\d+):/);
      const errorLine = lineMatch ? parseInt(lineMatch[1]) : null;

      // Get context around error (30 lines before and after for better understanding)
      const contextStart = errorLine ? Math.max(0, errorLine - 30) : 0;
      const contextEnd = errorLine ? Math.min(lines.length, errorLine + 30) : Math.min(lines.length, 100);
      const context = lines.slice(contextStart, contextEnd).join('\n');

      // Choose model based on attempt (start cheap, get smarter)
      const model = attempt === 1 ? this.aiModel : this.aiModelAdvanced;

      // Check cost
      const inputText = `Fix this TypeScript error:\n\nError: ${task.issue}\n\nFile: ${task.file}\n\n${errorLine ? `Error is around line ${errorLine}.\n\n` : ''}Relevant context:\n\`\`\`typescript\n${context}\n\`\`\`\n\nFull file content:\n\`\`\`typescript\n${content}\n\`\`\``;
      const inputTokens = this.estimateTokens(inputText);

      if (!this.canAffordAIFix(inputTokens, model)) {
        return false;
      }

      console.log(`      🤖 Using AI (${model}) to fix TypeScript error (attempt ${attempt})...`);

      const systemPrompt = attempt === 1
        ? `You are an expert TypeScript developer. Fix the syntax error with MINIMAL changes.

RULES:
1. Return ONLY the complete fixed file content
2. NO explanations, NO markdown code blocks, NO comments about what you changed
3. Preserve all existing code structure and formatting
4. Fix ONLY the specific syntax error mentioned
5. Do not add new features or refactor unrelated code
6. If you cannot safely fix it, return exactly: CANNOT_FIX`
        : attempt === 2
        ? `You are an expert TypeScript developer. The first fix failed. Try a different approach.

RULES:
1. Return ONLY the complete fixed file content
2. NO explanations, NO markdown code blocks
3. Be more aggressive - add type assertions, null checks, or type guards if needed
4. Fix the syntax error completely
5. If you cannot safely fix it, return exactly: CANNOT_FIX`
        : `You are an expert TypeScript developer. Previous fixes failed. Last resort approach.

RULES:
1. Return ONLY the complete fixed file content
2. NO explanations, NO markdown code blocks
3. Use any necessary type assertions ('as any', etc.) to make it compile
4. The code MUST be syntactically valid TypeScript
5. If you cannot safely fix it, return exactly: CANNOT_FIX`;

      const response = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: inputText
          }
        ],
        temperature: 0.1 + (attempt * 0.1) // Increase creativity with each attempt
      });

      let fixedCode = response.choices[0]?.message?.content?.trim();
      const usage = response.usage;

      if (usage) {
        this.trackCost(usage.prompt_tokens, usage.completion_tokens, model);
      }

      if (!fixedCode || fixedCode === 'CANNOT_FIX') {
        console.log(`      🤖 AI determined fix is unsafe`);
        return false;
      }

      // Remove markdown code blocks if present (despite instructions not to include them)
      fixedCode = fixedCode.replace(/^```(?:typescript|ts|javascript|js)?\n?/gm, '').replace(/^```\n?$/gm, '').trim();

      // Safety check: Ensure code hasn't changed drastically
      if (Math.abs(fixedCode.length - content.length) > content.length * 0.5) {
        console.log(`      ⚠️  Fix changes file size by >50%, rejecting as unsafe`);
        return false;
      }

      // Apply fix
      if (!this.dryRun) {
        writeFileSync(filePath, fixedCode, 'utf-8');
        console.log(`      📝 Applied AI fix to ${task.file}`);
      }

      return true;
    } catch (error: any) {
      console.log(`      ❌ AI fix failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Update patch-level dependencies
   */
  private async fixDependency(task: ImprovementTask): Promise<boolean> {
    try {
      const match = task.issue.match(/Update (.+) from (.+) to (.+)/);
      if (!match) return false;

      const [, pkg] = match;

      if (!this.dryRun) {
        execSync(`npm update ${pkg}`, {
          cwd: this.projectRoot,
          stdio: 'ignore'
        });
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * General AI-powered fix for optimization and complex issues
   */
  private async aiFixIssue(task: ImprovementTask): Promise<boolean> {
    if (!openai) {
      console.log(`      ⚠️  Skipping AI fix - OPENAI_API_KEY not set`);
      return false;
    }

    try {
      const filePath = join(this.projectRoot, task.file);
      const content = readFileSync(filePath, 'utf-8');

      // Prepare context
      const inputText = `Fix this code issue:\n\nFile: ${task.file}\nIssue Type: ${task.type}\nProblem: ${task.issue}\n\nFile content:\n\`\`\`typescript\n${content}\n\`\`\``;
      const inputTokens = this.estimateTokens(inputText);

      // Use advanced model for complex issues
      if (!this.canAffordAIFix(inputTokens, this.aiModelAdvanced)) {
        return false;
      }

      console.log(`      🤖 Using AI (${this.aiModelAdvanced}) for complex fix...`);

      const response = await openai.chat.completions.create({
        model: this.aiModelAdvanced,
        messages: [
          {
            role: 'system',
            content: `You are an expert code optimization and maintenance assistant.

RULES:
1. Return ONLY the complete fixed file content
2. NO explanations, NO markdown code blocks, NO comments about changes
3. Make MINIMAL changes - only fix the specific issue
4. Preserve all existing functionality
5. Follow the existing code style and patterns
6. If you cannot safely fix it, return exactly: CANNOT_FIX

Fix the issue described while maintaining code quality and functionality.`
          },
          {
            role: 'user',
            content: inputText
          }
        ],
        temperature: 0.2
      });

      let fixedCode = response.choices[0]?.message?.content?.trim();
      const usage = response.usage;

      if (usage) {
        this.trackCost(usage.prompt_tokens, usage.completion_tokens, this.aiModelAdvanced);
      }

      if (!fixedCode || fixedCode === 'CANNOT_FIX') {
        console.log(`      🤖 AI determined fix is unsafe`);
        return false;
      }

      // Remove markdown code blocks
      fixedCode = fixedCode.replace(/^```(?:typescript|ts|javascript|js)?\n?/gm, '').replace(/^```\n?$/gm, '').trim();

      // Safety check
      if (Math.abs(fixedCode.length - content.length) > content.length * 0.5) {
        console.log(`      ⚠️  Fix changes file size by >50%, rejecting as unsafe`);
        return false;
      }

      // Apply fix
      if (!this.dryRun) {
        writeFileSync(filePath, fixedCode, 'utf-8');
        console.log(`      📝 Applied AI fix to ${task.file}`);
      }

      return true;
    } catch (error: any) {
      console.log(`      ❌ AI fix failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Commit all changes made during this run
   */
  private async commitChanges(improvements: ImprovementTask[]): Promise<string> {
    try {
      // Stage all changes
      execSync('git add -A', { cwd: this.projectRoot });

      // Generate commit message
      const summary = improvements.map(imp => {
        const type = imp.type.replace('_', ' ');
        return `- ${type}: ${imp.issue.substring(0, 60)}`;
      }).join('\n');

      const message = `chore: Archie automated maintenance

${summary}

🦉 Automated by Archie
🤖 Generated with Claude Code

Co-Authored-By: Archie <archie@kimbleai.com>`;

      // Commit
      execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`, {
        cwd: this.projectRoot
      });

      // Get commit hash
      const hash = execSync('git rev-parse --short HEAD', {
        cwd: this.projectRoot,
        encoding: 'utf-8'
      }).trim();

      console.log(`✅ Committed changes: ${hash}`);
      return hash;

    } catch (error: any) {
      console.error('Failed to commit:', error.message);
      throw error;
    }
  }

  /**
   * Generate human-readable summary
   */
  private generateSummary(run: ArchieRun): string {
    const costInfo = this.estimatedCost > 0 ? ` (AI cost: $${this.estimatedCost.toFixed(4)})` : '';

    if (run.tasksCompleted === 0) {
      return `Found ${run.tasksFound} issues but couldn't auto-fix any${costInfo}`;
    }

    const types = run.improvements.reduce((acc, imp) => {
      acc[imp.type] = (acc[imp.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const typeSummary = Object.entries(types)
      .map(([type, count]) => `${count} ${type.replace('_', ' ')}`)
      .join(', ');

    return `Fixed ${run.tasksCompleted}/${run.tasksFound} issues: ${typeSummary}${costInfo}`;
  }

  /**
   * Helper: Find files recursively
   */
  private findFiles(extension: string, exclude: string[] = []): string[] {
    const results: string[] = [];

    const walk = (dir: string) => {
      const files = readdirSync(dir);

      for (const file of files) {
        const path = join(dir, file);

        // Skip excluded directories
        if (exclude.some(ex => path.includes(ex))) continue;

        if (statSync(path).isDirectory()) {
          walk(path);
        } else if (path.endsWith(extension)) {
          results.push(path);
        }
      }
    };

    walk(this.projectRoot);
    return results;
  }

  /**
   * Estimate tokens for cost calculation (rough approximation)
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4); // 1 token ≈ 4 characters
  }

  /**
   * Check if AI fix would exceed cost budget
   */
  private canAffordAIFix(inputTokens: number, model: string = this.aiModel): boolean {
    if (!this.useAI || !openai) {
      return false;
    }

    // Pricing per 1M tokens (as of 2024)
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4o-mini': { input: 0.15, output: 0.60 },
      'gpt-4o': { input: 2.50, output: 10.00 }
    };

    const modelPricing = pricing[model] || pricing['gpt-4o-mini'];

    // Estimate output tokens (usually less than input)
    const outputTokens = inputTokens * 0.8;

    const costEstimate =
      (inputTokens / 1000000) * modelPricing.input +
      (outputTokens / 1000000) * modelPricing.output;

    if (this.estimatedCost + costEstimate > this.maxAICost) {
      console.log(`      💰 Would exceed cost limit ($${this.maxAICost.toFixed(2)}), current: $${this.estimatedCost.toFixed(3)}`);
      return false;
    }

    return true;
  }

  /**
   * Track cost after AI call
   */
  private trackCost(inputTokens: number, outputTokens: number, model: string) {
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4o-mini': { input: 0.15, output: 0.60 },
      'gpt-4o': { input: 2.50, output: 10.00 }
    };

    const modelPricing = pricing[model] || pricing['gpt-4o-mini'];

    const cost =
      (inputTokens / 1000000) * modelPricing.input +
      (outputTokens / 1000000) * modelPricing.output;

    this.estimatedCost += cost;
    console.log(`      💰 Cost: $${cost.toFixed(4)} (Total: $${this.estimatedCost.toFixed(4)})`);
  }
}

// Export singleton instance
export const archieAgent = new ArchieAgent();
