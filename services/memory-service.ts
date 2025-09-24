/**
 * Memory Service - Temporary replacement for deleted services directory
 * Provides memory extraction capabilities for background indexing
 */

export interface MemoryChunk {
  content: string;
  type: 'fact' | 'decision' | 'preference' | 'question' | 'context';
  importance: number;
  metadata: Record<string, any>;
}

export class MemoryExtractor {
  /**
   * Extract memory chunks from message content
   */
  static async extractFromMessage(
    content: string,
    role: 'user' | 'assistant'
  ): Promise<MemoryChunk[]> {
    const chunks: MemoryChunk[] = [];

    // Extract facts and statements
    const factPatterns = [
      /i am ([^.!?]+)/gi,
      /i have ([^.!?]+)/gi,
      /i work ([^.!?]+)/gi,
      /i live ([^.!?]+)/gi,
      /my ([^.!?]+)/gi
    ];

    for (const pattern of factPatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        chunks.push({
          content: match[0],
          type: 'fact',
          importance: 0.8,
          metadata: { source_role: role, extraction_pattern: 'personal_fact' }
        });
      }
    }

    // Extract decisions
    const decisionPattern = /(?:decided|chose|going with|will use)\s+([^.!?]+)/gi;
    const decisionMatches = content.matchAll(decisionPattern);
    for (const match of decisionMatches) {
      chunks.push({
        content: match[0],
        type: 'decision',
        importance: 0.9,
        metadata: { source_role: role, extraction_pattern: 'decision' }
      });
    }

    // Extract preferences
    const preferencePattern = /i (?:like|love|prefer|hate|dislike)\s+([^.!?]+)/gi;
    const preferenceMatches = content.matchAll(preferencePattern);
    for (const match of preferenceMatches) {
      chunks.push({
        content: match[0],
        type: 'preference',
        importance: 0.7,
        metadata: { source_role: role, extraction_pattern: 'preference' }
      });
    }

    // Extract questions
    const questions = content.match(/[^.!?]*\?/g);
    if (questions) {
      for (const question of questions) {
        chunks.push({
          content: question.trim(),
          type: 'question',
          importance: 0.6,
          metadata: { source_role: role, extraction_pattern: 'question' }
        });
      }
    }

    // Extract important context (if message is long enough)
    if (content.length > 100) {
      chunks.push({
        content: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
        type: 'context',
        importance: 0.5,
        metadata: { source_role: role, extraction_pattern: 'general_context' }
      });
    }

    return chunks;
  }
}

export default MemoryExtractor;