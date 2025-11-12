/**
 * Archie Learning System
 * Tracks what works and what doesn't for different issue types
 * Builds up institutional knowledge over time
 */

import { createClient } from '@supabase/supabase-js';
import { ImprovementTask, FixStrategy, ArchieLearning, LearnedStrategy } from '@/types/archie';
import { generateIssueFingerprint } from './archie-utils';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export class ArchieLearningSystem {
  /**
   * Record a successful fix for learning
   */
  async recordSuccess(
    issue: ImprovementTask,
    strategy: FixStrategy,
    model: string,
    issueId: string,
    attemptId: string
  ): Promise<void> {
    try {
      const pattern = this.extractPattern(issue);

      // Upsert learning record
      const { error } = await supabase
        .from('archie_learning')
        .upsert({
          issue_pattern: pattern.pattern,
          file_pattern: pattern.filePattern,
          successful_strategy: strategy,
          recommended_model: model,
          example_issue_id: issueId,
          example_fix_attempt_id: attemptId,
          last_successful_fix_at: new Date().toISOString()
        }, {
          onConflict: 'issue_pattern,file_pattern',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('Failed to record learning:', error);
      } else {
        // Update success count
        await this.incrementSuccessCount(pattern.pattern, pattern.filePattern);
      }
    } catch (error) {
      console.error('Error in recordSuccess:', error);
    }
  }

  /**
   * Record a failed fix attempt
   */
  async recordFailure(
    issue: ImprovementTask,
    strategy: FixStrategy
  ): Promise<void> {
    try {
      const pattern = this.extractPattern(issue);

      // Get existing learning or create new
      const { data: existing } = await supabase
        .from('archie_learning')
        .select('*')
        .eq('issue_pattern', pattern.pattern)
        .eq('file_pattern', pattern.filePattern || '')
        .single();

      if (existing) {
        // Add to avoid_strategies if not already there
        const avoidStrategies = existing.avoid_strategies || [];
        if (!avoidStrategies.includes(strategy)) {
          avoidStrategies.push(strategy);
        }

        await supabase
          .from('archie_learning')
          .update({
            avoid_strategies: avoidStrategies,
            failure_count: (existing.failure_count || 0) + 1
          })
          .eq('id', existing.id);
      }

      await this.incrementFailureCount(pattern.pattern, pattern.filePattern);
    } catch (error) {
      console.error('Error in recordFailure:', error);
    }
  }

  /**
   * Get recommended strategy for an issue based on learning
   */
  async getRecommendation(issue: ImprovementTask): Promise<LearnedStrategy | null> {
    try {
      const pattern = this.extractPattern(issue);

      const { data } = await supabase
        .from('archie_learning')
        .select('*')
        .eq('issue_pattern', pattern.pattern)
        .order('success_rate', { ascending: false })
        .limit(1)
        .single();

      if (!data) return null;

      // Only use if confidence is high enough
      if ((data.success_rate || 0) < 60) return null;

      return {
        pattern: {
          pattern: data.issue_pattern,
          filePattern: data.file_pattern || undefined,
          exampleIssues: []
        },
        strategy: data.successful_strategy as FixStrategy,
        model: data.recommended_model || 'gpt-4o-mini',
        promptTemplate: data.recommended_prompt_template || '',
        successRate: data.success_rate || 0,
        examples: []
      };
    } catch (error) {
      console.error('Error in getRecommendation:', error);
      return null;
    }
  }

  /**
   * Check if we should skip an issue based on past failures
   */
  async shouldSkipIssue(issue: ImprovementTask): Promise<boolean> {
    try {
      const fingerprint = generateIssueFingerprint(issue);

      // Check if this exact issue has failed many times
      const { data: issueHistory } = await supabase
        .from('archie_issues')
        .select('status, times_seen')
        .eq('fingerprint', fingerprint)
        .order('last_seen_at', { ascending: false })
        .limit(1)
        .single();

      if (issueHistory) {
        // Skip if seen more than 5 times and always failed
        if (issueHistory.times_seen > 5 && issueHistory.status === 'failed') {
          return true;
        }
      }

      // Check if this pattern has very low success rate
      const pattern = this.extractPattern(issue);
      const { data: learning } = await supabase
        .from('archie_learning')
        .select('success_rate, failure_count')
        .eq('issue_pattern', pattern.pattern)
        .single();

      if (learning) {
        // Skip if success rate is very low and we've tried many times
        if ((learning.success_rate || 0) < 20 && learning.failure_count > 10) {
          return true;
        }
      }

      return false;
    } catch (error) {
      return false; // Don't skip on error
    }
  }

  /**
   * Extract a pattern from an issue for matching
   */
  private extractPattern(issue: ImprovementTask): { pattern: string; filePattern?: string } {
    // Normalize the issue description
    const normalized = issue.issue
      .toLowerCase()
      .replace(/\d+/g, 'N')  // Replace numbers with N
      .replace(/["'].*?["']/g, 'STR')  // Replace strings with STR
      .trim();

    // Extract file type pattern
    const fileExt = issue.file.match(/\.(ts|tsx|js|jsx|py|go|rs)$/)?.[1];
    const filePattern = fileExt || undefined;

    return {
      pattern: `${issue.type}:${normalized}`,
      filePattern
    };
  }

  /**
   * Increment success count and update success rate
   */
  private async incrementSuccessCount(pattern: string, filePattern?: string): Promise<void> {
    const { data } = await supabase
      .from('archie_learning')
      .select('success_count, failure_count')
      .eq('issue_pattern', pattern)
      .eq('file_pattern', filePattern || '')
      .single();

    if (data) {
      const successCount = (data.success_count || 0) + 1;
      const failureCount = data.failure_count || 0;
      const total = successCount + failureCount;
      const successRate = total > 0 ? (successCount / total) * 100 : 0;

      await supabase
        .from('archie_learning')
        .update({
          success_count: successCount,
          success_rate: successRate,
          confidence_score: Math.min(100, total * 5) // Confidence increases with attempts
        })
        .eq('issue_pattern', pattern)
        .eq('file_pattern', filePattern || '');
    }
  }

  /**
   * Increment failure count and update success rate
   */
  private async incrementFailureCount(pattern: string, filePattern?: string): Promise<void> {
    const { data } = await supabase
      .from('archie_learning')
      .select('success_count, failure_count')
      .eq('issue_pattern', pattern)
      .eq('file_pattern', filePattern || '')
      .single();

    if (data) {
      const successCount = data.success_count || 0;
      const failureCount = (data.failure_count || 0) + 1;
      const total = successCount + failureCount;
      const successRate = total > 0 ? (successCount / total) * 100 : 0;

      await supabase
        .from('archie_learning')
        .update({
          failure_count: failureCount,
          success_rate: successRate,
          confidence_score: Math.min(100, total * 5)
        })
        .eq('issue_pattern', pattern)
        .eq('file_pattern', filePattern || '');
    }
  }

  /**
   * Get top learnings for analytics
   */
  async getTopLearnings(limit: number = 10): Promise<ArchieLearning[]> {
    const { data, error } = await supabase
      .from('archie_learning')
      .select('*')
      .order('success_rate', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching learnings:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get statistics about learning system
   */
  async getStats(): Promise<{
    totalPatterns: number;
    avgSuccessRate: number;
    mostSuccessfulStrategy: string;
    totalLearnings: number;
  }> {
    const { data, error } = await supabase
      .from('archie_learning')
      .select('successful_strategy, success_rate');

    if (error || !data) {
      return {
        totalPatterns: 0,
        avgSuccessRate: 0,
        mostSuccessfulStrategy: 'none',
        totalLearnings: 0
      };
    }

    const totalPatterns = data.length;
    const avgSuccessRate = data.reduce((sum, l) => sum + (l.success_rate || 0), 0) / totalPatterns;

    // Count strategies
    const strategyCounts: Record<string, number> = {};
    data.forEach(l => {
      strategyCounts[l.successful_strategy] = (strategyCounts[l.successful_strategy] || 0) + 1;
    });

    const mostSuccessfulStrategy = Object.entries(strategyCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'none';

    return {
      totalPatterns,
      avgSuccessRate: Math.round(avgSuccessRate),
      mostSuccessfulStrategy,
      totalLearnings: data.filter(l => (l.success_rate || 0) > 70).length
    };
  }
}

export const learningSystem = new ArchieLearningSystem();
