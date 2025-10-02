// lib/file-queue.ts
// Simple in-memory queue for file processing (sufficient for 2 users)

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface QueueItem {
  id: string;
  userId: string;
  projectId: string;
  fileId: string;
  file: File;
  priority: number;
  addedAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retries: number;
  error?: string;
}

class FileProcessingQueue {
  private queue: QueueItem[] = [];
  private processing: Set<string> = new Set();
  private maxConcurrent: number = 3; // Process 3 files at a time
  private maxRetries: number = 2;

  // Add file to queue
  addToQueue(item: Omit<QueueItem, 'addedAt' | 'status' | 'retries'>): void {
    const queueItem: QueueItem = {
      ...item,
      addedAt: new Date(),
      status: 'pending',
      retries: 0
    };

    // Add to queue, sorted by priority (higher first)
    this.queue.push(queueItem);
    this.queue.sort((a, b) => b.priority - a.priority);

    console.log(`[QUEUE] Added ${item.fileId} to queue (${this.queue.length} items)`);

    // Start processing if capacity available
    this.processNext();
  }

  // Process next item in queue
  private async processNext(): Promise<void> {
    // Check if we can process more
    if (this.processing.size >= this.maxConcurrent) {
      console.log(`[QUEUE] Max concurrent reached (${this.processing.size}/${this.maxConcurrent})`);
      return;
    }

    // Get next pending item
    const nextItem = this.queue.find(
      item => item.status === 'pending' && !this.processing.has(item.id)
    );

    if (!nextItem) {
      console.log('[QUEUE] No pending items to process');
      return;
    }

    // Mark as processing
    nextItem.status = 'processing';
    this.processing.add(nextItem.id);

    console.log(`[QUEUE] Processing ${nextItem.fileId} (${this.processing.size}/${this.maxConcurrent})`);

    try {
      // Import processor dynamically to avoid circular dependencies
      const { processFile } = await import('./file-processors');

      // Process file
      const result = await processFile(
        nextItem.file,
        nextItem.userId,
        nextItem.projectId,
        nextItem.fileId
      );

      if (result.success) {
        nextItem.status = 'completed';
        console.log(`[QUEUE] Completed ${nextItem.fileId}`);

        // Update database
        await supabase
          .from('uploaded_files')
          .update({
            status: 'completed',
            processing_result: result.data,
            processed_at: new Date().toISOString()
          })
          .eq('id', nextItem.fileId);
      } else {
        throw new Error(result.error || 'Processing failed');
      }
    } catch (error: any) {
      console.error(`[QUEUE] Error processing ${nextItem.fileId}:`, error);

      // Handle retries
      if (nextItem.retries < this.maxRetries) {
        nextItem.retries++;
        nextItem.status = 'pending';
        console.log(`[QUEUE] Retrying ${nextItem.fileId} (attempt ${nextItem.retries}/${this.maxRetries})`);
      } else {
        nextItem.status = 'failed';
        nextItem.error = error.message;
        console.log(`[QUEUE] Failed ${nextItem.fileId} after ${this.maxRetries} retries`);

        // Update database
        await supabase
          .from('uploaded_files')
          .update({
            status: 'failed',
            error_message: error.message
          })
          .eq('id', nextItem.fileId);
      }
    } finally {
      // Remove from processing set
      this.processing.delete(nextItem.id);

      // Clean up completed/failed items after some time
      setTimeout(() => {
        this.queue = this.queue.filter(
          item => item.status === 'pending' || item.status === 'processing'
        );
      }, 60000); // Keep for 1 minute

      // Process next item
      this.processNext();
    }
  }

  // Get queue status
  getStatus(): {
    queueLength: number;
    processing: number;
    pending: number;
    items: Array<{
      id: string;
      fileId: string;
      status: string;
      retries: number;
    }>;
  } {
    return {
      queueLength: this.queue.length,
      processing: this.processing.size,
      pending: this.queue.filter(item => item.status === 'pending').length,
      items: this.queue.map(item => ({
        id: item.id,
        fileId: item.fileId,
        status: item.status,
        retries: item.retries
      }))
    };
  }

  // Clear queue (emergency)
  clearQueue(): void {
    this.queue = [];
    this.processing.clear();
    console.log('[QUEUE] Queue cleared');
  }

  // Pause processing
  pause(): void {
    this.maxConcurrent = 0;
    console.log('[QUEUE] Processing paused');
  }

  // Resume processing
  resume(): void {
    this.maxConcurrent = 3;
    console.log('[QUEUE] Processing resumed');
    this.processNext();
  }
}

// Singleton instance
export const fileQueue = new FileProcessingQueue();

// Export for monitoring
export function getQueueStatus() {
  return fileQueue.getStatus();
}

// Endpoint to check queue health
export async function checkQueueHealth(): Promise<{
  healthy: boolean;
  status: any;
  warnings: string[];
}> {
  const status = fileQueue.getStatus();
  const warnings: string[] = [];

  // Check if queue is too long
  if (status.queueLength > 50) {
    warnings.push('Queue length is high');
  }

  // Check if processing is stalled
  if (status.processing === 0 && status.pending > 0) {
    warnings.push('Processing may be stalled');
  }

  return {
    healthy: warnings.length === 0,
    status,
    warnings
  };
}
