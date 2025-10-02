/**
 * Zapier Integration Test Suite
 *
 * Comprehensive tests for Zapier webhook integration
 * Tests all event types, error handling, and retry logic
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { zapierClient } from '@/lib/zapier-client';

// Mock fetch for testing
global.fetch = vi.fn() as any;

describe('Zapier Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true })
    });
  });

  describe('ZapierClient Basic Functionality', () => {
    test('should send conversation saved webhook', async () => {
      const result = await zapierClient.sendConversationSaved(
        'test-user',
        'conv-123',
        [
          { role: 'user', content: 'Hello', timestamp: new Date().toISOString() },
          { role: 'assistant', content: 'Hi there!', timestamp: new Date().toISOString() }
        ],
        { testMode: true }
      );

      expect(result.success).toBe(true);
      expect(result.webhookCalled).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    test('should send transcription complete webhook', async () => {
      const result = await zapierClient.sendTranscriptionComplete(
        'test-user',
        'trans-123',
        'This is a test transcription with urgent items',
        ['Action item 1', 'Action item 2'],
        ['urgent', 'meeting', 'notes'],
        { duration: 120, speakers: 2 }
      );

      expect(result.success).toBe(true);
      expect(result.webhookCalled).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    test('should send photo uploaded webhook', async () => {
      const result = await zapierClient.sendPhotoUploaded(
        'test-user',
        'photo-123',
        'Analysis of photo showing important document',
        ['document', 'important'],
        false,
        { fileName: 'test.jpg', fileSize: 1024 }
      );

      expect(result.success).toBe(true);
      expect(result.webhookCalled).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    test('should send urgent notification webhook', async () => {
      const result = await zapierClient.sendUrgentNotification(
        'test-user',
        'Urgent: Action Required',
        'This is an urgent notification',
        'test-source',
        { priority: 'high' }
      );

      expect(result.success).toBe(true);
      expect(result.webhookCalled).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    test('should send daily summary webhook', async () => {
      const result = await zapierClient.sendDailySummary('test-user', {
        conversationCount: 10,
        transcriptionCount: 3,
        photoCount: 5,
        actionItems: ['Review document', 'Schedule meeting'],
        topTopics: ['work', 'project', 'deadline']
      });

      expect(result.success).toBe(true);
      expect(result.webhookCalled).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Urgent Tag Detection', () => {
    test('should detect urgent keywords in text', () => {
      expect(zapierClient.detectUrgentTag('This is urgent!', [])).toBe(true);
      expect(zapierClient.detectUrgentTag('ASAP please', [])).toBe(true);
      expect(zapierClient.detectUrgentTag('Critical issue', [])).toBe(true);
      expect(zapierClient.detectUrgentTag('Emergency situation', [])).toBe(true);
      expect(zapierClient.detectUrgentTag('Immediate action needed', [])).toBe(true);
      expect(zapierClient.detectUrgentTag('Deadline approaching', [])).toBe(true);
    });

    test('should detect urgent tags', () => {
      expect(zapierClient.detectUrgentTag('Normal text', ['urgent'])).toBe(true);
      expect(zapierClient.detectUrgentTag('Normal text', ['asap', 'todo'])).toBe(true);
      expect(zapierClient.detectUrgentTag('Normal text', ['critical-bug'])).toBe(true);
    });

    test('should not detect urgent in normal text', () => {
      expect(zapierClient.detectUrgentTag('Just a normal message', [])).toBe(false);
      expect(zapierClient.detectUrgentTag('Hello world', ['greeting', 'casual'])).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle webhook failure gracefully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' })
      });

      const result = await zapierClient.sendConversationSaved(
        'test-user',
        'conv-123',
        [],
        {}
      );

      expect(result.success).toBe(false);
      expect(result.webhookCalled).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should retry on failure when configured', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: false,
          status: 500
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true })
        });

      const result = await zapierClient.sendEvent({
        eventType: 'transcription_complete',
        userId: 'test-user',
        data: { test: true },
        retryOnFailure: true
      });

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    test('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(
        new Error('Network error')
      );

      const result = await zapierClient.sendConversationSaved(
        'test-user',
        'conv-123',
        [],
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    test('should handle missing webhook configuration', async () => {
      // Temporarily remove webhook URL
      const originalUrl = process.env.ZAPIER_WEBHOOK_URL;
      delete process.env.ZAPIER_WEBHOOK_URL;
      delete process.env.ZAPIER_MEMORY_WEBHOOK_URL;

      const result = await zapierClient.sendConversationSaved(
        'test-user',
        'conv-123',
        [],
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not configured');

      // Restore
      process.env.ZAPIER_WEBHOOK_URL = originalUrl;
    });
  });

  describe('Usage Tracking', () => {
    test('should track daily usage', () => {
      const stats = zapierClient.getUsageStats();

      expect(stats).toHaveProperty('dailyCount');
      expect(stats).toHaveProperty('dailyLimit');
      expect(stats).toHaveProperty('date');
      expect(stats.dailyLimit).toBe(30);
    });

    test('should respect daily limits', async () => {
      // Send webhooks up to the limit
      const results = [];
      for (let i = 0; i < 35; i++) {
        const result = await zapierClient.sendEvent({
          eventType: 'conversation_saved',
          userId: 'test-user',
          data: { test: true },
          priority: 'low'
        });
        results.push(result);
      }

      // First 30 should succeed, rest should be rate limited
      const successful = results.filter(r => r.success).length;
      const rateLimited = results.filter(r => !r.success && r.error?.includes('limit')).length;

      expect(successful).toBeLessThanOrEqual(30);
      expect(rateLimited).toBeGreaterThan(0);
    });
  });

  describe('Webhook Payload Structure', () => {
    test('should include correct payload structure for conversation', async () => {
      await zapierClient.sendConversationSaved(
        'test-user',
        'conv-123',
        [{ role: 'user', content: 'Test', timestamp: new Date().toISOString() }],
        { testMode: true }
      );

      const callArgs = (global.fetch as any).mock.calls[0];
      const payload = JSON.parse(callArgs[1].body);

      expect(payload).toHaveProperty('eventType', 'conversation_saved');
      expect(payload).toHaveProperty('userId', 'test-user');
      expect(payload).toHaveProperty('priority');
      expect(payload).toHaveProperty('timestamp');
      expect(payload).toHaveProperty('data');
      expect(payload.data).toHaveProperty('conversationId', 'conv-123');
    });

    test('should include correct payload structure for transcription', async () => {
      await zapierClient.sendTranscriptionComplete(
        'test-user',
        'trans-123',
        'Test transcription text',
        ['Item 1', 'Item 2'],
        ['tag1', 'tag2'],
        { duration: 60 }
      );

      const callArgs = (global.fetch as any).mock.calls[0];
      const payload = JSON.parse(callArgs[1].body);

      expect(payload).toHaveProperty('eventType', 'transcription_complete');
      expect(payload.data).toHaveProperty('transcriptionId', 'trans-123');
      expect(payload.data).toHaveProperty('actionItems');
      expect(payload.data).toHaveProperty('tags');
      expect(payload.data.actionItems).toHaveLength(2);
    });

    test('should include authorization header', async () => {
      await zapierClient.sendConversationSaved('test-user', 'conv-123', [], {});

      const callArgs = (global.fetch as any).mock.calls[0];
      const headers = callArgs[1].headers;

      expect(headers).toHaveProperty('Authorization');
      expect(headers.Authorization).toContain('Bearer');
    });
  });

  describe('Priority Handling', () => {
    test('should set correct priority levels', async () => {
      const events = [
        { method: 'sendConversationSaved', expectedPriority: 'low' },
        { method: 'sendTranscriptionComplete', expectedPriority: 'medium' },
        { method: 'sendUrgentNotification', expectedPriority: 'urgent' },
        { method: 'sendDailySummary', expectedPriority: 'low' }
      ];

      for (const event of events) {
        vi.clearAllMocks();

        if (event.method === 'sendConversationSaved') {
          await zapierClient.sendConversationSaved('test-user', 'id', [], {});
        } else if (event.method === 'sendTranscriptionComplete') {
          await zapierClient.sendTranscriptionComplete('test-user', 'id', 'text', [], [], {});
        } else if (event.method === 'sendUrgentNotification') {
          await zapierClient.sendUrgentNotification('test-user', 'title', 'msg', 'src', {});
        } else if (event.method === 'sendDailySummary') {
          await zapierClient.sendDailySummary('test-user', {
            conversationCount: 0,
            transcriptionCount: 0,
            photoCount: 0,
            actionItems: [],
            topTopics: []
          });
        }

        const callArgs = (global.fetch as any).mock.calls[0];
        const payload = JSON.parse(callArgs[1].body);

        expect(payload.priority).toBe(event.expectedPriority);
      }
    });
  });

  describe('Integration with API Routes', () => {
    test('should be importable in chat route', () => {
      expect(zapierClient).toBeDefined();
      expect(typeof zapierClient.sendConversationSaved).toBe('function');
    });

    test('should be importable in transcription route', () => {
      expect(zapierClient).toBeDefined();
      expect(typeof zapierClient.sendTranscriptionComplete).toBe('function');
    });

    test('should be importable in photo route', () => {
      expect(zapierClient).toBeDefined();
      expect(typeof zapierClient.sendPhotoUploaded).toBe('function');
    });
  });
});

/**
 * Manual Test Instructions
 *
 * To manually test the integration:
 *
 * 1. Start the development server: npm run dev
 *
 * 2. Test conversation webhook:
 *    curl -X POST http://localhost:3000/api/chat \
 *      -H "Content-Type: application/json" \
 *      -d '{"messages":[{"role":"user","content":"Hello"}],"userId":"zach"}'
 *
 * 3. Test transcription webhook:
 *    curl -X POST http://localhost:3000/api/transcribe/assemblyai \
 *      -F "audio=@test.mp3" \
 *      -F "userId=zach" \
 *      -F "projectId=test"
 *
 * 4. Test photo webhook:
 *    curl -X POST http://localhost:3000/api/photo \
 *      -F "photo=@test.jpg" \
 *      -F "userId=zach" \
 *      -F "analysisType=general"
 *
 * 5. Check monitoring endpoint:
 *    curl http://localhost:3000/api/zapier/monitor
 *
 * 6. Send test webhook:
 *    curl -X POST http://localhost:3000/api/zapier/monitor \
 *      -H "Content-Type: application/json" \
 *      -d '{"eventType":"conversation_saved","userId":"zach","testData":{"test":true}}'
 */

export const ManualTestScenarios = {
  conversationTest: async () => {
    console.log('Testing conversation webhook...');
    const result = await zapierClient.sendConversationSaved(
      'zach',
      'test-conv-' + Date.now(),
      [
        { role: 'user', content: 'Test message', timestamp: new Date().toISOString() }
      ],
      { testMode: true }
    );
    console.log('Conversation webhook result:', result);
    return result;
  },

  transcriptionTest: async () => {
    console.log('Testing transcription webhook...');
    const result = await zapierClient.sendTranscriptionComplete(
      'zach',
      'test-trans-' + Date.now(),
      'This is a test transcription with urgent action items.',
      ['Review document ASAP', 'Schedule meeting'],
      ['urgent', 'meeting', 'action-required'],
      { duration: 120, speakers: 2 }
    );
    console.log('Transcription webhook result:', result);
    return result;
  },

  photoTest: async () => {
    console.log('Testing photo webhook...');
    const result = await zapierClient.sendPhotoUploaded(
      'zach',
      'test-photo-' + Date.now(),
      'Photo analysis showing important document with deadline information',
      ['document', 'deadline', 'important'],
      true,
      { fileName: 'test.jpg', fileSize: 2048 }
    );
    console.log('Photo webhook result:', result);
    return result;
  },

  urgentTest: async () => {
    console.log('Testing urgent notification...');
    const result = await zapierClient.sendUrgentNotification(
      'zach',
      'Test Urgent Notification',
      'This is a test urgent notification to verify Zapier integration',
      'manual-test',
      { testMode: true }
    );
    console.log('Urgent notification result:', result);
    return result;
  },

  summaryTest: async () => {
    console.log('Testing daily summary...');
    const result = await zapierClient.sendDailySummary('zach', {
      conversationCount: 15,
      transcriptionCount: 3,
      photoCount: 7,
      actionItems: [
        'Review project proposal',
        'Schedule team meeting',
        'Update documentation'
      ],
      topTopics: ['work', 'meetings', 'deadlines', 'development']
    });
    console.log('Daily summary result:', result);
    return result;
  }
};
