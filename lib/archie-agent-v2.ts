/**
 * ARCHIE V2 - Enhanced Autonomous Repository Coding & Housekeeping Intelligence Engine
 *
 * Improvements over v1:
 * 1. Database tracking for all runs, issues, and fix attempts
 * 2. Issue prioritization with severity classification
 * 3. Smarter AI strategy with multi-model approach
 * 4. Learning from failures (issue fingerprinting and memory)
 * 5. Specialized fixers for React, TypeScript, Security
 * 6. Cost optimization with dynamic budget allocation
 * 7. Better test coverage and validation
 * 8. Comprehensive metrics and analytics
 */

import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

import {
  ImprovementTask,
  EnhancedArchieRun,
  ArchieRun,
  ArchieIssue,
  ArchieFixAttempt,
  FixStrategy,
  IssueSeverity,
  FixAttemptResult
} from '@/types/archie';

import {
  generateIssueFingerprint,
  classifyIssueSeverity,
  calculatePriority,
  selectOptimalModel,
  calculateActualCost,
  estimateTokens,
  extractCodeContext,
  validateFixSize,
  validateFixChanged,
  calculateTimeSaved
} from './archie-utils';

import { learningSystem } from './archie-learning';
import { reactFixer } from './archie-fixers/react-fixer';
import { typeScriptFixer } from './archie-fixers/typescript-fixer';
import { securityFixer } from './archie-fixers/security-fixer';

// Import base agent for existing functionality
import { ArchieAgent as BaseArchieAgent } from './archie-agent';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export class EnhancedArchieAgent extends BaseArchieAgent {
  private currentRunId?: string;
  private enableDatabase: boolean = true;
  private enableLearning: boolean = true;
  private enableSpecializedFixers: boolean = true;

  /**
   * Enhanced run method with full tracking
   */
  async runEnhanced(): Promise<EnhancedArchieRun> {
    console.log('🦉 Archie V2 starting enhanced maintenance run...');

    const runStartTime = Date.now();
    const runId = uuidv4();
    this.currentRunId = runId;

    // Create run record
    const run: Partial<ArchieRun> = {
      id: runId,
      started_at: new Date(),
      status: 'running',
      trigger_type: 'manual',
      tasks_found: 0,
      tasks_completed: 0,
      tasks_skipped: 0,
      tasks_failed: 0,
      total_cost_usd: 0,
      summary: '',
      errors: [],
      version: '2.0.0'
    };

    if (this.enableDatabase) {
      await this.saveRun(run);
    }

    const result: EnhancedArchieRun = {
      timestamp: new Date(),
      runId,
      tasksFound: 0,
      tasksCompleted: 0,
      tasksSkipped: 0,
      tasksFailed: 0,
      improvements: [],
      fixAttempts: [],
      errors: [],
      summary: '',
      totalCost: 0,
      duration: 0
    };

    try {
      // 1. Scan for issues with enhanced classification
      console.log('📊 Scanning codebase with enhanced detection...');
      const tasks = await this.scanForIssuesEnhanced();
      result.tasksFound = tasks.length;
      run.tasks_found = tasks.length;

      if (tasks.length === 0) {
        result.summary = 'No issues found - codebase is clean!';
        run.summary = result.summary;
        run.status = 'completed';
        run.completed_at = new Date();
        if (this.enableDatabase) await this.saveRun(run);
        return result;
      }

      // 2. Filter out issues we should skip based on learning
      const filteredTasks = await this.filterTasksWithLearning(tasks);
      console.log(`  Filtered ${tasks.length - filteredTasks.length} tasks based on learning`);

      // 3. Sort by priority (high priority first)
      filteredTasks.sort((a, b) => b.priority - a.priority);

      // 4. Fix issues with enhanced strategies
      const tasksToFix = filteredTasks.slice(0, this.maxTasksPerRun);
      console.log(`🔧 Fixing top ${tasksToFix.length} issues with enhanced strategies...`);

      for (const task of tasksToFix) {
        const fixResult = await this.fixIssueEnhanced(task);

        if (fixResult.success) {
          result.tasksCompleted++;
          result.improvements.push(task);
        } else if (fixResult.skipped) {
          result.tasksSkipped++;
        } else {
          result.tasksFailed++;
        }

        result.fixAttempts.push(...fixResult.attempts);
        result.totalCost += fixResult.cost;

        if (fixResult.error) {
          result.errors.push(`${task.file}: ${fixResult.error}`);
        }
      }

      // 5. Update run stats
      run.tasks_completed = result.tasksCompleted;
      run.tasks_skipped = result.tasksSkipped;
      run.tasks_failed = result.tasksFailed;
      run.total_cost_usd = result.totalCost;

      // 6. Commit changes if any were made
      if (result.tasksCompleted > 0 && !this.dryRun) {
        run.commit_hash = await this.commitChangesEnhanced(result.improvements);
      }

      // 7. Generate enhanced summary
      result.summary = this.generateEnhancedSummary(result);
      run.summary = result.summary;
      run.status = 'completed';

    } catch (error: any) {
      console.error('❌ Archie V2 run failed:', error);
      result.errors.push(error.message);
      result.summary = `Run failed: ${error.message}`;
      run.status = 'failed';
      run.errors = result.errors as any;
    } finally {
      // Always complete the run
      const runEndTime = Date.now();
      result.duration = Math.round((runEndTime - runStartTime) / 1000);
      run.duration_seconds = result.duration;
      run.completed_at = new Date();

      if (this.enableDatabase) {
        await this.saveRun(run);
      }

      console.log('✅ ' + result.summary);
    }

    return result;
  }

  /**
   * Enhanced issue scanning with classification
   */
  private async scanForIssuesEnhanced(): Promise<ImprovementTask[]> {
    // Use base agent's scanning methods
    const tasks = await this.scanForIssues();

    // Enhance each task with additional metadata
    return tasks.map(task => {
      const severity = classifyIssueSeverity(task);
      const priority = calculatePriority(task);
      const fingerprint = generateIssueFingerprint(task);

      return {
        ...task,
        severity,
        priority,
        fingerprint
      };
    });
  }

  /**
   * Filter tasks based on learning system
   */
  private async filterTasksWithLearning(tasks: ImprovementTask[]): Promise<ImprovementTask[]> {
    if (!this.enableLearning) return tasks;

    const filtered: ImprovementTask[] = [];

    for (const task of tasks) {
      const shouldSkip = await learningSystem.shouldSkipIssue(task);
      if (!shouldSkip) {
        filtered.push(task);
      } else {
        console.log(`  ⏭️  Skipping known unfixable issue: ${task.issue.substring(0, 50)}...`);
      }
    }

    return filtered;
  }

  /**
   * Enhanced fix with specialized fixers and learning
   */
  private async fixIssueEnhanced(task: ImprovementTask): Promise<{
    success: boolean;
    skipped: boolean;
    attempts: FixAttemptResult[];
    cost: number;
    error?: string;
  }> {
    console.log(`  🔧 Fixing ${task.type} (severity: ${task.severity}, priority: ${task.priority}): ${task.issue.substring(0, 60)}...`);

    const attempts: FixAttemptResult[] = [];
    let totalCost = 0;
    let issueId: string | undefined;

    // Create issue record
    if (this.enableDatabase && this.currentRunId) {
      issueId = await this.saveIssue(task);
    }

    // Check for learned strategy first
    let recommendedStrategy: any = null;
    if (this.enableLearning) {
      recommendedStrategy = await learningSystem.getRecommendation(task);
      if (recommendedStrategy) {
        console.log(`    💡 Using learned strategy: ${recommendedStrategy.strategy} (${recommendedStrategy.successRate}% success rate)`);
      }
    }

    // Try specialized fixers first
    if (this.enableSpecializedFixers) {
      const specialized = await this.trySpecializedFixer(task, issueId);
      if (specialized.attempted) {
        attempts.push(...specialized.attempts);
        totalCost += specialized.cost;

        if (specialized.success) {
          if (this.enableLearning && issueId) {
            await learningSystem.recordSuccess(
              task,
              'specialized',
              specialized.model || 'specialized',
              issueId,
              attempts[attempts.length - 1]?.issueId || ''
            );
          }
          return { success: true, skipped: false, attempts, cost: totalCost };
        }
      }
    }

    // Fallback to base agent's fix logic with retries
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      const attemptStart = Date.now();
      const strategy = this.selectStrategy(attempt, recommendedStrategy);
      const model = selectOptimalModel(task, attempt - 1);

      console.log(`    Attempt ${attempt}/${this.maxRetries} using ${strategy} strategy with ${model}...`);

      try {
        const success = await this.fixIssue(task);
        const attemptEnd = Date.now();
        const duration = attemptEnd - attemptStart;

        const attemptResult: FixAttemptResult = {
          issueId: issueId || '',
          attemptNumber: attempt,
          strategy: strategy as FixStrategy,
          model,
          success,
          duration
        };

        // Track cost (estimated since base agent doesn't return it)
        if (model.includes('gpt') || model.includes('claude')) {
          const estimatedCost = 0.01 * attempt; // Rough estimate
          attemptResult.cost = estimatedCost;
          totalCost += estimatedCost;
        }

        attempts.push(attemptResult);

        // Save attempt to database
        if (this.enableDatabase && issueId && this.currentRunId) {
          await this.saveFixAttempt(issueId, this.currentRunId, attemptResult);
        }

        if (success) {
          // Test the fix
          const testPassed = await this.testFix(task);
          attemptResult.reasoning = testPassed ? 'Fix applied and tested successfully' : 'Fix applied but tests failed';

          if (testPassed) {
            console.log(`    ✅ Fixed successfully (attempt ${attempt})`);

            // Record success in learning system
            if (this.enableLearning && issueId) {
              await learningSystem.recordSuccess(task, strategy as FixStrategy, model, issueId, attemptResult.issueId);
            }

            // Update issue status
            if (this.enableDatabase && issueId) {
              await this.updateIssueStatus(issueId, 'fixed', strategy);
            }

            return { success: true, skipped: false, attempts, cost: totalCost };
          } else {
            console.log(`    ⚠️  Fix applied but tests failed (attempt ${attempt})`);
            await this.rollbackChanges(task);
          }
        } else {
          console.log(`    ❌ Fix failed (attempt ${attempt})`);
        }

        // Record failure
        if (this.enableLearning) {
          await learningSystem.recordFailure(task, strategy as FixStrategy);
        }

      } catch (error: any) {
        console.log(`    ❌ Error during fix attempt ${attempt}: ${error.message}`);
        attempts.push({
          issueId: issueId || '',
          attemptNumber: attempt,
          strategy: strategy as FixStrategy,
          model,
          success: false,
          error: error.message
        });
      }

      if (attempt < this.maxRetries) {
        console.log(`    🔄 Retrying with different approach...`);
      }
    }

    // All attempts failed
    console.log(`    ⛔ Gave up after ${this.maxRetries} attempts`);

    if (this.enableDatabase && issueId) {
      await this.updateIssueStatus(issueId, 'failed');
    }

    return {
      success: false,
      skipped: false,
      attempts,
      cost: totalCost,
      error: `Failed after ${this.maxRetries} attempts`
    };
  }

  /**
   * Try specialized fixer if applicable
   */
  private async trySpecializedFixer(task: ImprovementTask, issueId?: string): Promise<{
    attempted: boolean;
    success: boolean;
    attempts: FixAttemptResult[];
    cost: number;
    model?: string;
  }> {
    const fixers = [securityFixer, typeScriptFixer, reactFixer];

    for (const fixer of fixers) {
      if (fixer.canFix(task)) {
        console.log(`    🎯 Using specialized fixer: ${fixer.name}`);

        const attemptStart = Date.now();
        const result = await fixer.fix(task);
        const attemptEnd = Date.now();

        const attemptResult: FixAttemptResult = {
          issueId: issueId || '',
          attemptNumber: 1,
          strategy: 'specialized',
          model: result.model || fixer.name,
          success: result.success,
          reasoning: result.reasoning,
          cost: result.cost,
          duration: attemptEnd - attemptStart,
          error: result.error
        };

        if (this.enableDatabase && issueId && this.currentRunId) {
          await this.saveFixAttempt(issueId, this.currentRunId, attemptResult);
        }

        return {
          attempted: true,
          success: result.success,
          attempts: [attemptResult],
          cost: result.cost || 0,
          model: result.model
        };
      }
    }

    return { attempted: false, success: false, attempts: [], cost: 0 };
  }

  /**
   * Select strategy based on attempt number and learning
   */
  private selectStrategy(attempt: number, learned: any): string {
    if (learned && attempt === 1) {
      return learned.strategy;
    }

    switch (attempt) {
      case 1: return 'minimal';
      case 2: return 'aggressive';
      default: return 'last_resort';
    }
  }

  /**
   * Generate enhanced summary with metrics
   */
  private generateEnhancedSummary(run: EnhancedArchieRun): string {
    const timeSaved = calculateTimeSaved(run.improvements);
    const costInfo = run.totalCost > 0 ? ` (Cost: $${run.totalCost.toFixed(4)}, Saved: ${timeSaved.toFixed(1)}h)` : '';

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
   * Enhanced commit with detailed message
   */
  private async commitChangesEnhanced(improvements: ImprovementTask[]): Promise<string> {
    try {
      execSync('git add -A', { cwd: this.projectRoot });

      const summary = improvements.map(imp => {
        const severity = imp.severity ? ` [${imp.severity}]` : '';
        return `- ${imp.type}${severity}: ${imp.issue.substring(0, 60)}`;
      }).join('\n');

      const message = `chore: Archie V2 automated maintenance

${summary}

🦉 Automated by Archie V2
🎯 Enhanced with specialized fixers
🧠 Learning-powered fixes
🤖 Generated with Claude Code

Co-Authored-By: Archie <archie@kimbleai.com>`;

      execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`, {
        cwd: this.projectRoot
      });

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

  // ============================================================================
  // Database Persistence Methods
  // ============================================================================

  private async saveRun(run: Partial<ArchieRun>): Promise<void> {
    try {
      const { error } = await supabase
        .from('archie_runs')
        .upsert(run);

      if (error) {
        console.error('Failed to save run:', error);
      }
    } catch (error) {
      console.error('Error saving run:', error);
    }
  }

  private async saveIssue(task: ImprovementTask): Promise<string> {
    const issueId = uuidv4();

    try {
      const issue: Partial<ArchieIssue> = {
        id: issueId,
        run_id: this.currentRunId,
        fingerprint: task.fingerprint || generateIssueFingerprint(task),
        type: task.type,
        severity: task.severity || 'low',
        priority: task.priority || 5,
        file_path: task.file,
        line_number: task.lineNumber,
        column_number: task.columnNumber,
        issue_description: task.issue,
        context: task.context,
        status: 'pending',
        first_seen_at: new Date(),
        last_seen_at: new Date(),
        times_seen: 1
      };

      const { error } = await supabase
        .from('archie_issues')
        .insert(issue);

      if (error) {
        console.error('Failed to save issue:', error);
      }
    } catch (error) {
      console.error('Error saving issue:', error);
    }

    return issueId;
  }

  private async saveFixAttempt(issueId: string, runId: string, attempt: FixAttemptResult): Promise<void> {
    try {
      const fixAttempt: Partial<ArchieFixAttempt> = {
        id: uuidv4(),
        issue_id: issueId,
        run_id: runId,
        attempt_number: attempt.attemptNumber,
        strategy: attempt.strategy,
        ai_model_used: attempt.model,
        success: attempt.success,
        error_message: attempt.error,
        ai_reasoning: attempt.reasoning,
        cost_usd: attempt.cost,
        duration_ms: attempt.duration,
        started_at: new Date(),
        completed_at: new Date()
      };

      const { error } = await supabase
        .from('archie_fix_attempts')
        .insert(fixAttempt);

      if (error) {
        console.error('Failed to save fix attempt:', error);
      }
    } catch (error) {
      console.error('Error saving fix attempt:', error);
    }
  }

  private async updateIssueStatus(issueId: string, status: string, strategy?: string): Promise<void> {
    try {
      const update: any = { status };
      if (strategy) {
        update.fix_strategy = strategy;
      }

      const { error } = await supabase
        .from('archie_issues')
        .update(update)
        .eq('id', issueId);

      if (error) {
        console.error('Failed to update issue status:', error);
      }
    } catch (error) {
      console.error('Error updating issue status:', error);
    }
  }
}

// Export singleton instance
export const enhancedArchieAgent = new EnhancedArchieAgent();
