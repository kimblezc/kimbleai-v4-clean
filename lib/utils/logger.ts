/**
 * Comprehensive Logging Utility
 *
 * Features:
 * - Structured logging with context
 * - Different log levels (debug, info, warn, error)
 * - Performance tracking
 * - Error serialization
 * - Development vs production modes
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  userId?: string;
  conversationId?: string;
  projectId?: string;
  requestId?: string;
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  performance?: {
    durationMs: number;
    startTime: number;
    endTime: number;
  };
}

class Logger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  /**
   * Format log entry for output
   */
  private formatLog(entry: LogEntry): string {
    const parts = [
      `[${entry.timestamp}]`,
      `[${entry.level.toUpperCase()}]`,
      entry.message,
    ];

    if (entry.context && Object.keys(entry.context).length > 0) {
      parts.push(`Context: ${JSON.stringify(entry.context)}`);
    }

    if (entry.error) {
      parts.push(`Error: ${entry.error.name}: ${entry.error.message}`);
      if (this.isDevelopment && entry.error.stack) {
        parts.push(`Stack: ${entry.error.stack}`);
      }
    }

    if (entry.performance) {
      parts.push(`Duration: ${entry.performance.durationMs}ms`);
    }

    return parts.join(' | ');
  }

  /**
   * Create log entry
   */
  private createEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error,
    performance?: LogEntry['performance']
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    if (performance) {
      entry.performance = performance;
    }

    return entry;
  }

  /**
   * Output log entry
   */
  private output(entry: LogEntry): void {
    const formatted = this.formatLog(entry);

    switch (entry.level) {
      case 'debug':
        if (this.isDevelopment) {
          console.debug(formatted);
        }
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
        console.error(formatted);
        break;
    }

    // In production, you could send logs to a service like:
    // - Sentry (for errors)
    // - LogRocket (for session replay)
    // - DataDog (for APM)
    // - CloudWatch (if on AWS)
    if (!this.isDevelopment && entry.level === 'error') {
      // Example: Send to Sentry
      // Sentry.captureException(entry.error);
    }
  }

  /**
   * Debug log (development only)
   */
  debug(message: string, context?: LogContext): void {
    const entry = this.createEntry('debug', message, context);
    this.output(entry);
  }

  /**
   * Info log
   */
  info(message: string, context?: LogContext): void {
    const entry = this.createEntry('info', message, context);
    this.output(entry);
  }

  /**
   * Warning log
   */
  warn(message: string, context?: LogContext): void {
    const entry = this.createEntry('warn', message, context);
    this.output(entry);
  }

  /**
   * Error log
   */
  error(message: string, error?: Error, context?: LogContext): void {
    const entry = this.createEntry('error', message, context, error);
    this.output(entry);
  }

  /**
   * Performance tracking
   */
  startTimer(label: string): () => void {
    const startTime = Date.now();

    return () => {
      const endTime = Date.now();
      const durationMs = endTime - startTime;

      const entry = this.createEntry('info', `Performance: ${label}`, undefined, undefined, {
        durationMs,
        startTime,
        endTime,
      });

      this.output(entry);

      return durationMs;
    };
  }

  /**
   * Measure async function performance
   */
  async measure<T>(
    label: string,
    fn: () => Promise<T>,
    context?: LogContext
  ): Promise<T> {
    const stopTimer = this.startTimer(label);

    try {
      const result = await fn();
      const duration = stopTimer();

      this.info(`${label} completed successfully`, {
        ...context,
        durationMs: duration,
      });

      return result;
    } catch (error) {
      const duration = stopTimer();

      this.error(`${label} failed`, error as Error, {
        ...context,
        durationMs: duration,
      });

      throw error;
    }
  }

  /**
   * Log API request
   */
  apiRequest(params: {
    method: string;
    path: string;
    userId?: string;
    body?: any;
  }): void {
    this.info(`API Request: ${params.method} ${params.path}`, {
      userId: params.userId,
      method: params.method,
      path: params.path,
      hasBody: !!params.body,
    });
  }

  /**
   * Log API response
   */
  apiResponse(params: {
    method: string;
    path: string;
    status: number;
    durationMs: number;
    userId?: string;
  }): void {
    const level = params.status >= 400 ? 'error' : 'info';

    const entry = this.createEntry(
      level,
      `API Response: ${params.method} ${params.path}`,
      {
        userId: params.userId,
        method: params.method,
        path: params.path,
        status: params.status,
      },
      undefined,
      {
        durationMs: params.durationMs,
        startTime: Date.now() - params.durationMs,
        endTime: Date.now(),
      }
    );

    this.output(entry);
  }

  /**
   * Log database query
   */
  dbQuery(params: {
    table: string;
    operation: string;
    userId?: string;
    durationMs?: number;
  }): void {
    this.debug(`Database: ${params.operation} on ${params.table}`, {
      userId: params.userId,
      table: params.table,
      operation: params.operation,
      durationMs: params.durationMs,
    });
  }

  /**
   * Log model routing decision
   */
  modelRouting(params: {
    taskType: string;
    selectedModel: string;
    reason: string;
    estimatedCost: number;
    wasManual: boolean;
    userId?: string;
  }): void {
    this.info(`Model Routing: ${params.selectedModel} selected`, {
      userId: params.userId,
      taskType: params.taskType,
      model: params.selectedModel,
      reason: params.reason,
      estimatedCost: params.estimatedCost,
      wasManual: params.wasManual,
    });
  }

  /**
   * Log cost tracking
   */
  costTracking(params: {
    provider: string;
    model: string;
    costUsd: number;
    tokensUsed: number;
    userId?: string;
  }): void {
    this.info(`Cost: $${params.costUsd.toFixed(4)} for ${params.model}`, {
      userId: params.userId,
      provider: params.provider,
      model: params.model,
      costUsd: params.costUsd,
      tokensUsed: params.tokensUsed,
    });
  }

  /**
   * Log budget warning
   */
  budgetWarning(params: {
    userId: string;
    currentSpend: number;
    monthlyBudget: number;
    percentageUsed: number;
  }): void {
    this.warn(`Budget Alert: ${params.percentageUsed.toFixed(1)}% used`, {
      userId: params.userId,
      currentSpend: params.currentSpend,
      monthlyBudget: params.monthlyBudget,
      percentageUsed: params.percentageUsed,
    });
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions
export const {
  debug,
  info,
  warn,
  error,
  startTimer,
  measure,
  apiRequest,
  apiResponse,
  dbQuery,
  modelRouting,
  costTracking,
  budgetWarning,
} = logger;
