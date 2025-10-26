/**
 * Activity Stream Broadcasting System
 *
 * Centralized event broadcasting for real-time Archie activity updates.
 * Uses an in-memory EventEmitter for live streaming to connected clients.
 *
 * Features:
 * - Real-time activity broadcasting
 * - Event filtering and categorization
 * - Client connection management
 * - Activity persistence to database
 */

import { EventEmitter } from 'events';
import { createClient } from '@supabase/supabase-js';

// Event types
export type ActivityLevel = 'debug' | 'info' | 'success' | 'warn' | 'error' | 'critical';
export type ActivityCategory =
  | 'drive_sync'
  | 'device_monitoring'
  | 'transcription'
  | 'task_processing'
  | 'insight_generation'
  | 'file_analysis'
  | 'system'
  | 'workflow'
  | 'custom';

export interface ActivityEvent {
  id: string;
  timestamp: Date;
  category: ActivityCategory;
  level: ActivityLevel;
  agent: string;
  message: string;
  details?: string;
  metadata?: Record<string, any>;
  userId?: string;
  duration?: number; // in milliseconds
  status?: 'started' | 'in_progress' | 'completed' | 'failed';
}

export interface TaskActivity extends ActivityEvent {
  taskId: string;
  taskType: string;
  progress?: number; // 0-100
}

class ActivityStreamManager extends EventEmitter {
  private static instance: ActivityStreamManager;
  private clients: Map<string, (event: ActivityEvent) => void> = new Map();
  private recentActivity: ActivityEvent[] = [];
  private readonly MAX_RECENT = 100;
  private supabase;

  private constructor() {
    super();
    this.setMaxListeners(100); // Support up to 100 concurrent SSE connections

    // Initialize Supabase client
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      this.supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
    }

    // Set up event listener for broadcasting
    this.on('activity', (event: ActivityEvent) => {
      this.handleActivity(event);
    });
  }

  public static getInstance(): ActivityStreamManager {
    if (!ActivityStreamManager.instance) {
      ActivityStreamManager.instance = new ActivityStreamManager();
    }
    return ActivityStreamManager.instance;
  }

  /**
   * Broadcast an activity event to all connected clients
   */
  public broadcast(event: Omit<ActivityEvent, 'id' | 'timestamp'>): void {
    const fullEvent: ActivityEvent = {
      id: this.generateId(),
      timestamp: new Date(),
      ...event
    };

    this.emit('activity', fullEvent);
  }

  /**
   * Broadcast a task-related activity
   */
  public broadcastTask(event: Omit<TaskActivity, 'id' | 'timestamp'>): void {
    const fullEvent: TaskActivity = {
      id: this.generateId(),
      timestamp: new Date(),
      ...event
    };

    this.emit('activity', fullEvent);
  }

  /**
   * Register a client for receiving activity events
   */
  public registerClient(clientId: string, callback: (event: ActivityEvent) => void): void {
    this.clients.set(clientId, callback);
    console.log(`[ActivityStream] Client ${clientId} connected. Total clients: ${this.clients.size}`);

    // Send recent activity to new client
    this.recentActivity.slice(-20).forEach(event => {
      callback(event);
    });
  }

  /**
   * Unregister a client
   */
  public unregisterClient(clientId: string): void {
    this.clients.delete(clientId);
    console.log(`[ActivityStream] Client ${clientId} disconnected. Total clients: ${this.clients.size}`);
  }

  /**
   * Get recent activity (for initial page load)
   */
  public getRecentActivity(limit: number = 20): ActivityEvent[] {
    return this.recentActivity.slice(-limit);
  }

  /**
   * Handle incoming activity event
   */
  private handleActivity(event: ActivityEvent): void {
    // Add to recent activity buffer
    this.recentActivity.push(event);
    if (this.recentActivity.length > this.MAX_RECENT) {
      this.recentActivity.shift();
    }

    // Broadcast to all connected clients
    this.clients.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error('[ActivityStream] Error broadcasting to client:', error);
      }
    });

    // Persist to database (async, non-blocking)
    this.persistToDatabase(event).catch(error => {
      console.error('[ActivityStream] Failed to persist activity:', error);
    });
  }

  /**
   * Persist activity to database
   */
  private async persistToDatabase(event: ActivityEvent): Promise<void> {
    if (!this.supabase) return;

    try {
      await this.supabase
        .from('agent_logs')
        .insert({
          timestamp: event.timestamp.toISOString(),
          log_level: event.level,
          category: event.category,
          agent: event.agent,
          message: event.message,
          details: event.details,
          metadata: event.metadata,
          user_id: event.userId || 'zach'
        });
    } catch (error) {
      // Silently fail - don't crash the stream if database is unavailable
      console.error('[ActivityStream] Database persistence error:', error);
    }
  }

  /**
   * Generate unique ID for activity event
   */
  private generateId(): string {
    return `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get statistics about activity stream
   */
  public getStats(): {
    connectedClients: number;
    recentActivityCount: number;
    totalEvents: number;
  } {
    return {
      connectedClients: this.clients.size,
      recentActivityCount: this.recentActivity.length,
      totalEvents: this.recentActivity.length // Could be enhanced to track all-time
    };
  }
}

// Export singleton instance
export const activityStream = ActivityStreamManager.getInstance();

/**
 * Helper functions for common activity broadcasts
 */

export function logAgentActivity(
  agent: string,
  message: string,
  level: ActivityLevel = 'info',
  category: ActivityCategory = 'system',
  details?: string,
  metadata?: Record<string, any>
): void {
  activityStream.broadcast({
    agent,
    message,
    level,
    category,
    details,
    metadata,
    userId: 'zach'
  });
}

export function logTaskStart(
  taskId: string,
  taskType: string,
  agent: string,
  message: string,
  category: ActivityCategory
): void {
  activityStream.broadcastTask({
    taskId,
    taskType,
    agent,
    message,
    level: 'info',
    category,
    status: 'started',
    progress: 0,
    userId: 'zach'
  });
}

export function logTaskProgress(
  taskId: string,
  taskType: string,
  agent: string,
  message: string,
  category: ActivityCategory,
  progress: number
): void {
  activityStream.broadcastTask({
    taskId,
    taskType,
    agent,
    message,
    level: 'info',
    category,
    status: 'in_progress',
    progress,
    userId: 'zach'
  });
}

export function logTaskComplete(
  taskId: string,
  taskType: string,
  agent: string,
  message: string,
  category: ActivityCategory,
  duration?: number
): void {
  activityStream.broadcastTask({
    taskId,
    taskType,
    agent,
    message,
    level: 'success',
    category,
    status: 'completed',
    progress: 100,
    duration,
    userId: 'zach'
  });
}

export function logTaskError(
  taskId: string,
  taskType: string,
  agent: string,
  message: string,
  category: ActivityCategory,
  error: string
): void {
  activityStream.broadcastTask({
    taskId,
    taskType,
    agent,
    message,
    level: 'error',
    category,
    status: 'failed',
    details: error,
    userId: 'zach'
  });
}
