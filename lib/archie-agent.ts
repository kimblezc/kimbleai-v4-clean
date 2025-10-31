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

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
  private projectRoot: string;
  private dryRun: boolean;

  constructor(projectRoot: string = process.cwd(), dryRun: boolean = false) {
    this.projectRoot = projectRoot;
    this.dryRun = dryRun;
  }

  /**
   * Main execution method - run this on a schedule
   */
  async run(): Promise<ArchieRun> {
    console.log('🦉 Archie starting maintenance run...');

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
   * Fix an individual issue
   */
  private async fixIssue(task: ImprovementTask): Promise<boolean> {
    console.log(`  🔧 Fixing ${task.type}: ${task.issue}`);

    switch (task.type) {
      case 'lint':
        return this.fixLintError(task);

      case 'dead_code':
        return this.fixDeadCode(task);

      case 'type_error':
        return this.fixTypeError(task);

      case 'dependency':
        return this.fixDependency(task);

      default:
        return false;
    }
  }

  /**
   * Auto-fix linting errors
   */
  private fixLintError(task: ImprovementTask): boolean {
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
   * Remove dead code (unused imports)
   */
  private fixDeadCode(task: ImprovementTask): boolean {
    try {
      const content = readFileSync(task.file, 'utf-8');

      // Use AI to safely remove unused imports
      const prompt = `Remove unused imports from this TypeScript file. Return only the fixed code, no explanations:\n\n${content}`;

      // For now, skip AI fixes - too expensive for routine maintenance
      // In production, we'd use GPT-4 here
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Fix TypeScript errors (simple cases only)
   */
  private fixTypeError(task: ImprovementTask): boolean {
    // For now, skip complex type fixes
    // In production, we'd use AI for obvious fixes like adding null checks
    return false;
  }

  /**
   * Update patch-level dependencies
   */
  private fixDependency(task: ImprovementTask): boolean {
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
    if (run.tasksCompleted === 0) {
      return `Found ${run.tasksFound} issues but couldn't auto-fix any`;
    }

    const types = run.improvements.reduce((acc, imp) => {
      acc[imp.type] = (acc[imp.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const typeSummary = Object.entries(types)
      .map(([type, count]) => `${count} ${type.replace('_', ' ')}`)
      .join(', ');

    return `Fixed ${run.tasksCompleted}/${run.tasksFound} issues: ${typeSummary}`;
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
}

// Export singleton instance
export const archieAgent = new ArchieAgent();
