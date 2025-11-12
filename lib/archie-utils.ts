/**
 * Archie Utility Functions
 * - Issue fingerprinting for deduplication
 * - Cost estimation
 * - Classification helpers
 */

import crypto from 'crypto';
import { ImprovementTask, IssueSeverity, IssueType } from '@/types/archie';

// ============================================================================
// Issue Fingerprinting
// ============================================================================

/**
 * Generate a unique fingerprint for an issue
 * Used for deduplication - same issue seen multiple times gets same fingerprint
 */
export function generateIssueFingerprint(issue: ImprovementTask): string {
  const normalizedFile = issue.file.replace(/\\/g, '/').toLowerCase();
  const normalizedIssue = issue.issue.trim().toLowerCase();

  // Remove line/column numbers from issue description as they may change
  const cleanIssue = normalizedIssue
    .replace(/line \d+/g, 'line X')
    .replace(/column \d+/g, 'column X')
    .replace(/\(\d+,\d+\)/g, '(X,X)');

  const fingerprintData = `${issue.type}:${normalizedFile}:${cleanIssue}`;
  return crypto.createHash('sha256').update(fingerprintData).digest('hex').substring(0, 16);
}

/**
 * Check if two issues are similar (same fingerprint or very similar)
 */
export function areIssuesSimilar(issue1: ImprovementTask, issue2: ImprovementTask): boolean {
  return generateIssueFingerprint(issue1) === generateIssueFingerprint(issue2);
}

// ============================================================================
// Issue Classification
// ============================================================================

/**
 * Determine severity of an issue based on type and description
 */
export function classifyIssueSeverity(issue: ImprovementTask): IssueSeverity {
  const description = issue.issue.toLowerCase();

  // Critical issues
  if (
    description.includes('security') ||
    description.includes('vulnerability') ||
    description.includes('sql injection') ||
    description.includes('xss') ||
    description.includes('authentication') ||
    issue.type === 'security'
  ) {
    return 'critical';
  }

  // High severity
  if (
    issue.type === 'type_error' ||
    description.includes('crash') ||
    description.includes('runtime error') ||
    description.includes('undefined') ||
    description.includes('null reference') ||
    description.includes('cannot read propert')
  ) {
    return 'high';
  }

  // Medium severity
  if (
    issue.type === 'optimization' ||
    issue.type === 'performance' ||
    description.includes('memory leak') ||
    description.includes('performance')
  ) {
    return 'medium';
  }

  // Low severity (lint, dead code, etc.)
  return 'low';
}

/**
 * Calculate dynamic priority based on severity, type, and context
 */
export function calculatePriority(issue: ImprovementTask): number {
  const severity = issue.severity || classifyIssueSeverity(issue);

  // Base priority by severity
  const severityPriority: Record<IssueSeverity, number> = {
    critical: 10,
    high: 7,
    medium: 5,
    low: 3
  };

  let priority = severityPriority[severity];

  // Boost priority for certain file types
  if (issue.file.includes('api/') || issue.file.includes('route')) {
    priority += 1; // API routes are important
  }

  if (issue.file.includes('auth') || issue.file.includes('security')) {
    priority += 2; // Security-related files are critical
  }

  if (issue.file.includes('.test.') || issue.file.includes('spec.')) {
    priority -= 1; // Test files are less critical
  }

  // Type-specific adjustments
  if (issue.type === 'security') {
    priority = 10; // Always max priority
  }

  return Math.min(10, Math.max(1, priority));
}

// ============================================================================
// Cost Estimation
// ============================================================================

interface ModelPricing {
  input: number;  // Per 1M tokens
  output: number; // Per 1M tokens
}

const PRICING: Record<string, ModelPricing> = {
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4': { input: 30.00, output: 60.00 },
  'claude-3-haiku': { input: 0.25, output: 1.25 },
  'claude-3-sonnet': { input: 3.00, output: 15.00 },
  'claude-3-opus': { input: 15.00, output: 75.00 }
};

/**
 * Estimate tokens for a string (rough approximation)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4); // 1 token ≈ 4 characters
}

/**
 * Estimate cost for an AI fix
 */
export function estimateCost(inputText: string, outputText: string, model: string): number {
  const pricing = PRICING[model] || PRICING['gpt-4o-mini'];

  const inputTokens = estimateTokens(inputText);
  const outputTokens = estimateTokens(outputText);

  const cost =
    (inputTokens / 1000000) * pricing.input +
    (outputTokens / 1000000) * pricing.output;

  return cost;
}

/**
 * Calculate actual cost from token usage
 */
export function calculateActualCost(
  inputTokens: number,
  outputTokens: number,
  model: string
): number {
  const pricing = PRICING[model] || PRICING['gpt-4o-mini'];

  const cost =
    (inputTokens / 1000000) * pricing.input +
    (outputTokens / 1000000) * pricing.output;

  return cost;
}

/**
 * Get cheapest model that can handle the task complexity
 */
export function selectOptimalModel(
  issue: ImprovementTask,
  previousAttempts: number = 0
): string {
  const severity = issue.severity || classifyIssueSeverity(issue);

  // Start cheap, escalate if needed
  if (previousAttempts === 0) {
    // First attempt: use cheap model
    if (severity === 'low' || issue.type === 'lint' || issue.type === 'dead_code') {
      return 'gpt-4o-mini';
    }
    return 'gpt-4o';
  } else if (previousAttempts === 1) {
    // Second attempt: use better model
    return 'gpt-4o';
  } else {
    // Last resort: use best model
    return 'claude-3-sonnet'; // Claude often better at code
  }
}

// ============================================================================
// Code Analysis
// ============================================================================

/**
 * Extract code context around an issue
 */
export function extractCodeContext(
  fileContent: string,
  lineNumber?: number,
  contextLines: number = 10
): string {
  if (!lineNumber) return fileContent;

  const lines = fileContent.split('\n');
  const start = Math.max(0, lineNumber - contextLines - 1);
  const end = Math.min(lines.length, lineNumber + contextLines);

  return lines.slice(start, end).join('\n');
}

/**
 * Detect if file is a React component
 */
export function isReactFile(filePath: string, content?: string): boolean {
  if (filePath.match(/\.(jsx|tsx)$/)) return true;
  if (content && (content.includes('import React') || content.includes('from "react"'))) {
    return true;
  }
  return false;
}

/**
 * Detect if file is security-sensitive
 */
export function isSecuritySensitiveFile(filePath: string): boolean {
  const sensitivePatterns = [
    /auth/i,
    /security/i,
    /password/i,
    /token/i,
    /session/i,
    /api.*key/i,
    /credential/i
  ];

  return sensitivePatterns.some(pattern => pattern.test(filePath));
}

/**
 * Detect if issue is TypeScript-related
 */
export function isTypeScriptIssue(issue: ImprovementTask): boolean {
  return (
    issue.type === 'type_error' ||
    issue.issue.includes('TS') ||
    issue.issue.includes('Type ') ||
    issue.issue.includes('type ')
  );
}

// ============================================================================
// Time Estimation
// ============================================================================

/**
 * Estimate how long a manual fix would take (in minutes)
 */
export function estimateManualFixTime(issue: ImprovementTask): number {
  const severity = issue.severity || classifyIssueSeverity(issue);

  const baseTime: Record<IssueType, number> = {
    lint: 2,
    dead_code: 5,
    type_error: 15,
    dependency: 10,
    optimization: 30,
    security: 60,
    performance: 45
  };

  const severityMultiplier: Record<IssueSeverity, number> = {
    low: 1,
    medium: 1.5,
    high: 2,
    critical: 3
  };

  return (baseTime[issue.type] || 10) * severityMultiplier[severity];
}

/**
 * Calculate time saved by automation
 */
export function calculateTimeSaved(issuesFixed: ImprovementTask[]): number {
  return issuesFixed.reduce((total, issue) => {
    return total + estimateManualFixTime(issue);
  }, 0) / 60; // Convert to hours
}

// ============================================================================
// Success Rate Calculations
// ============================================================================

/**
 * Calculate success rate from attempts
 */
export function calculateSuccessRate(successful: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((successful / total) * 100 * 100) / 100; // 2 decimal places
}

/**
 * Determine if success rate is acceptable
 */
export function isSuccessRateAcceptable(successRate: number): boolean {
  return successRate >= 70; // 70% or higher is good
}

// ============================================================================
// Formatting Helpers
// ============================================================================

/**
 * Format cost as USD string
 */
export function formatCost(cost: number): string {
  return `$${cost.toFixed(4)}`;
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Format percentage
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate that a fix hasn't changed file size too drastically
 */
export function validateFixSize(
  original: string,
  fixed: string,
  maxChangePercent: number = 50
): boolean {
  const changePercent = Math.abs((fixed.length - original.length) / original.length) * 100;
  return changePercent <= maxChangePercent;
}

/**
 * Validate that fixed code is syntactically different from original
 */
export function validateFixChanged(original: string, fixed: string): boolean {
  // Remove whitespace differences
  const normalizedOriginal = original.replace(/\s+/g, ' ').trim();
  const normalizedFixed = fixed.replace(/\s+/g, ' ').trim();

  return normalizedOriginal !== normalizedFixed;
}
