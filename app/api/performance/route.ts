/**
 * PERFORMANCE MONITORING API
 *
 * Real-time performance metrics and monitoring for KimbleAI
 *
 * Features:
 * - API response time tracking
 * - Database query duration monitoring
 * - Embedding cache statistics
 * - Endpoint performance analytics
 * - Slow query detection
 * - Performance degradation alerts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { embeddingCache } from '@/lib/embedding-cache';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Performance metrics storage (in-memory)
interface EndpointMetric {
  endpoint: string;
  method: string;
  totalRequests: number;
  totalDuration: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  errorCount: number;
  lastRequest: string;
  slowQueries: number; // Requests over 1000ms
  p50: number;
  p95: number;
  p99: number;
  durations: number[]; // Store last 100 durations for percentiles
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, EndpointMetric>;
  private readonly MAX_DURATIONS = 100; // Keep last 100 for percentile calculation
  private readonly SLOW_THRESHOLD_MS = 1000; // Threshold for slow query alert

  private constructor() {
    this.metrics = new Map();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Track an API request
   */
  trackRequest(
    endpoint: string,
    method: string,
    duration: number,
    isError: boolean = false
  ): void {
    const key = `${method}:${endpoint}`;
    let metric = this.metrics.get(key);

    if (!metric) {
      metric = {
        endpoint,
        method,
        totalRequests: 0,
        totalDuration: 0,
        avgDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        errorCount: 0,
        lastRequest: new Date().toISOString(),
        slowQueries: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        durations: []
      };
      this.metrics.set(key, metric);
    }

    // Update metrics
    metric.totalRequests++;
    metric.totalDuration += duration;
    metric.avgDuration = metric.totalDuration / metric.totalRequests;
    metric.minDuration = Math.min(metric.minDuration, duration);
    metric.maxDuration = Math.max(metric.maxDuration, duration);
    metric.lastRequest = new Date().toISOString();

    if (isError) {
      metric.errorCount++;
    }

    if (duration > this.SLOW_THRESHOLD_MS) {
      metric.slowQueries++;
      console.warn(
        `[PERFORMANCE WARNING] Slow request detected: ${method} ${endpoint} - ${duration}ms`
      );
    }

    // Store duration for percentile calculation
    metric.durations.push(duration);
    if (metric.durations.length > this.MAX_DURATIONS) {
      metric.durations.shift(); // Remove oldest
    }

    // Calculate percentiles
    this.calculatePercentiles(metric);
  }

  /**
   * Calculate percentiles from duration array
   */
  private calculatePercentiles(metric: EndpointMetric): void {
    if (metric.durations.length === 0) return;

    const sorted = [...metric.durations].sort((a, b) => a - b);
    const p50Index = Math.floor(sorted.length * 0.5);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);

    metric.p50 = sorted[p50Index];
    metric.p95 = sorted[p95Index];
    metric.p99 = sorted[p99Index];
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): EndpointMetric[] {
    return Array.from(this.metrics.values()).map(metric => ({
      ...metric,
      durations: [] // Don't expose raw durations in API
    }));
  }

  /**
   * Get metrics for specific endpoint
   */
  getEndpointMetrics(endpoint: string, method?: string): EndpointMetric[] {
    const results: EndpointMetric[] = [];

    for (const [key, metric] of this.metrics.entries()) {
      if (metric.endpoint === endpoint) {
        if (!method || metric.method === method) {
          results.push({
            ...metric,
            durations: []
          });
        }
      }
    }

    return results;
  }

  /**
   * Get slowest endpoints
   */
  getSlowestEndpoints(limit: number = 10): EndpointMetric[] {
    return this.getAllMetrics()
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, limit);
  }

  /**
   * Get endpoints with most errors
   */
  getErrorProneEndpoints(limit: number = 10): EndpointMetric[] {
    return this.getAllMetrics()
      .filter(m => m.errorCount > 0)
      .sort((a, b) => b.errorCount - a.errorCount)
      .slice(0, limit);
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics.clear();
  }

  /**
   * Get performance summary
   */
  getSummary(): any {
    const metrics = this.getAllMetrics();
    const totalRequests = metrics.reduce((sum, m) => sum + m.totalRequests, 0);
    const totalErrors = metrics.reduce((sum, m) => sum + m.errorCount, 0);
    const totalSlowQueries = metrics.reduce((sum, m) => sum + m.slowQueries, 0);

    return {
      totalEndpoints: metrics.length,
      totalRequests,
      totalErrors,
      errorRate: totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0,
      totalSlowQueries,
      slowQueryRate: totalRequests > 0 ? (totalSlowQueries / totalRequests) * 100 : 0,
      avgResponseTime:
        metrics.reduce((sum, m) => sum + m.avgDuration, 0) / metrics.length || 0
    };
  }
}

// Get singleton instance (don't export - Next.js route files can't export non-handler functions)
const performanceMonitor = PerformanceMonitor.getInstance();

/**
 * GET /api/performance - Get performance metrics
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'summary';
    const endpoint = searchParams.get('endpoint');
    const method = searchParams.get('method');

    switch (action) {
      case 'summary':
        // Overall performance summary
        const summary = performanceMonitor.getSummary();
        const cacheStats = embeddingCache.getStats();

        return NextResponse.json({
          success: true,
          timestamp: new Date().toISOString(),
          summary: {
            ...summary,
            embeddingCache: {
              hitRate: cacheStats.hitRate,
              hits: cacheStats.hits,
              misses: cacheStats.misses,
              size: cacheStats.size,
              costSaved: cacheStats.costSaved
            }
          }
        });

      case 'endpoints':
        // All endpoint metrics
        return NextResponse.json({
          success: true,
          endpoints: performanceMonitor.getAllMetrics()
        });

      case 'slowest':
        // Slowest endpoints
        const limit = parseInt(searchParams.get('limit') || '10');
        return NextResponse.json({
          success: true,
          slowest: performanceMonitor.getSlowestEndpoints(limit)
        });

      case 'errors':
        // Error-prone endpoints
        const errorLimit = parseInt(searchParams.get('limit') || '10');
        return NextResponse.json({
          success: true,
          errorProne: performanceMonitor.getErrorProneEndpoints(errorLimit)
        });

      case 'endpoint':
        // Specific endpoint metrics
        if (!endpoint) {
          return NextResponse.json(
            { error: 'endpoint parameter required' },
            { status: 400 }
          );
        }
        return NextResponse.json({
          success: true,
          metrics: performanceMonitor.getEndpointMetrics(endpoint, method || undefined)
        });

      case 'cache':
        // Embedding cache detailed stats
        const detailedCacheStats = embeddingCache.getStats();
        return NextResponse.json({
          success: true,
          cache: {
            ...detailedCacheStats,
            summary: embeddingCache.getSummary()
          }
        });

      case 'database':
        // Database performance metrics
        const dbMetrics = await getDatabaseMetrics();
        return NextResponse.json({
          success: true,
          database: dbMetrics
        });

      case 'health':
        // Overall system health check
        const health = await getSystemHealth();
        return NextResponse.json({
          success: true,
          health
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('[Performance API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch performance metrics',
        details: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/performance - Track performance or reset metrics
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, endpoint, method, duration, isError } = body;

    switch (action) {
      case 'track':
        // Track a request
        if (!endpoint || !method || duration === undefined) {
          return NextResponse.json(
            { error: 'endpoint, method, and duration required' },
            { status: 400 }
          );
        }

        performanceMonitor.trackRequest(endpoint, method, duration, isError || false);

        return NextResponse.json({
          success: true,
          message: 'Request tracked'
        });

      case 'reset':
        // Reset all metrics
        performanceMonitor.reset();
        embeddingCache.clear();

        return NextResponse.json({
          success: true,
          message: 'Metrics reset'
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('[Performance API] POST Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process request',
        details: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * Get database performance metrics
 */
async function getDatabaseMetrics(): Promise<any> {
  try {
    // Get table sizes
    const { data: tables, error: tablesError } = await supabase.rpc('get_table_sizes');
    if (tablesError) {
      console.error('[Performance] Failed to get table sizes:', tablesError);
    }

    // Get active connections (if available)
    const { data: connections, error: connectionsError } = await supabase
      .rpc('get_active_connections');
    if (connectionsError) {
      console.error('[Performance] Failed to get connections:', connectionsError);
    }

    // Get slow queries (if query stats are available)
    const { data: slowQueries, error: slowQueriesError } = await supabase
      .rpc('get_slow_queries');
    if (slowQueriesError) {
      console.error('[Performance] Failed to get slow queries:', slowQueriesError);
    }

    return {
      tables: tables || [],
      activeConnections: connections || 0,
      slowQueries: slowQueries || [],
      note: 'Some metrics may require additional database functions'
    };
  } catch (error) {
    console.error('[Performance] Database metrics error:', error);
    return {
      error: 'Unable to fetch database metrics',
      note: 'Ensure proper database permissions and functions exist'
    };
  }
}

/**
 * Get overall system health status
 */
async function getSystemHealth(): Promise<any> {
  const summary = performanceMonitor.getSummary();
  const cacheStats = embeddingCache.getStats();

  // Define health thresholds
  const HEALTHY_ERROR_RATE = 5; // 5%
  const HEALTHY_SLOW_QUERY_RATE = 10; // 10%
  const HEALTHY_AVG_RESPONSE = 500; // 500ms

  // Calculate health status
  const isHealthy =
    summary.errorRate < HEALTHY_ERROR_RATE &&
    summary.slowQueryRate < HEALTHY_SLOW_QUERY_RATE &&
    summary.avgResponseTime < HEALTHY_AVG_RESPONSE;

  const warnings = [];
  if (summary.errorRate >= HEALTHY_ERROR_RATE) {
    warnings.push(`High error rate: ${summary.errorRate.toFixed(2)}%`);
  }
  if (summary.slowQueryRate >= HEALTHY_SLOW_QUERY_RATE) {
    warnings.push(`High slow query rate: ${summary.slowQueryRate.toFixed(2)}%`);
  }
  if (summary.avgResponseTime >= HEALTHY_AVG_RESPONSE) {
    warnings.push(`Slow avg response time: ${summary.avgResponseTime.toFixed(0)}ms`);
  }

  return {
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    metrics: {
      errorRate: summary.errorRate.toFixed(2) + '%',
      slowQueryRate: summary.slowQueryRate.toFixed(2) + '%',
      avgResponseTime: summary.avgResponseTime.toFixed(0) + 'ms',
      cacheHitRate: cacheStats.hitRate.toFixed(2) + '%',
      totalRequests: summary.totalRequests
    },
    warnings: warnings.length > 0 ? warnings : ['All systems operating normally'],
    recommendations: isHealthy
      ? []
      : [
          'Consider scaling database resources',
          'Review slow query logs',
          'Check for API rate limiting',
          'Verify cache configuration'
        ]
  };
}
