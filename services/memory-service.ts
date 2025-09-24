// services/memory-service.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface MemoryChunk {
  content: string;
  type: 'fact' | 'preference' | 'decision' | 'event' | 'relationship' | 'summary';
  importance: number;
  metadata?: any;
}

export class MemoryExtractor {
  
  // Advanced pattern matching for memory extraction
  static extractPatterns = [
    // Personal facts
    { pattern: /my (?:full )?name is ([^.!?]+)/gi, type: 'fact', importance: 0.95 },
    { pattern: /i(?:'m| am) (\d+) years old/gi, type: 'fact', importance: 0.9 },
    { pattern: /i (?:live|reside) (?:in|at) ([^.!?]+)/gi, type: 'fact', importance: 0.85 },
    { pattern: /i work (?:at|for|as a?) ([^.!?]+)/gi, type: 'fact', importance: 0.85 },
    { pattern: /my (?:phone number|email) is ([^.!?]+)/gi, type: 'fact', importance: 0.9 },
    
    // Relationships
    { pattern: /my (\w+)'s name is ([^.!?]+)/gi, type: 'relationship', importance: 0.9 },
    { pattern: /i have (?:a|an) (\w+) (?:named|called) ([^.!?]+)/gi, type: 'relationship', importance: 0.85 },
    { pattern: /([^.!?]+) is my (\w+)/gi, type: 'relationship', importance: 0.85 },
    
    // Preferences
    { pattern: /my (?:favorite|favourite) (\w+) is ([^.!?]+)/gi, type: 'preference', importance: 0.8 },
    { pattern: /i (?:really )?(?:like|love|enjoy) ([^.!?]+)/gi, type: 'preference', importance: 0.7 },
    { pattern: /i (?:hate|dislike|can't stand) ([^.!?]+)/gi, type: 'preference', importance: 0.7 },
    { pattern: /i prefer ([^.!?]+) (?:over|to) ([^.!?]+)/gi, type: 'preference', importance: 0.75 },
    
    // Events
    { pattern: /(?:yesterday|today|tomorrow) i ([^.!?]+)/gi, type: 'event', importance: 0.8 },
    { pattern: /(?:last|next) (\w+) i ([^.!?]+)/gi, type: 'event', importance: 0.75 },
    { pattern: /i (?:will|am going to) ([^.!?]+) (?:on|at) ([^.!?]+)/gi, type: 'event', importance: 0.8 },
    
    // Decisions
    { pattern: /i(?:'ve| have) (?:decided|chosen) (?:to )?([^.!?]+)/gi, type: 'decision', importance: 0.85 },
    { pattern: /let's (?:go with|choose|do) ([^.!?]+)/gi, type: 'decision', importance: 0.8 },
    { pattern: /(?:we|i) (?:should|will) ([^.!?]+)/gi, type: 'decision', importance: 0.75 },
    
    // Important instructions
    { pattern: /(?:remember|don't forget) (?:that |to )?([^.!?]+)/gi, type: 'fact', importance: 0.95 },
    { pattern: /(?:always|never) ([^.!?]+)/gi, type: 'preference', importance: 0.9 },
    { pattern: /(?:important|critical|essential): ([^.!?]+)/gi, type: 'fact', importance: 0.95 }
  ];
  
  static async extractFromMessage(content: string, role: string): Promise<MemoryChunk[]> {
    const chunks: MemoryChunk[] = [];
    const foundMatches = new Set<string>();
    
    // Normalize role and only extract from user messages primarily
    const roleNorm = (role || '').toString().toLowerCase();
    if (roleNorm === 'user') {
      for (const { pattern, type, importance } of this.extractPatterns) {
        // pattern may already be a RegExp; use it directly when so
        const regex: RegExp = pattern instanceof RegExp ? pattern : new RegExp(pattern as any);
        // reset lastIndex in case regex is reused
        regex.lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = regex.exec(content)) !== null) {
          const extracted = (match[0] || '').trim();
          
          // Avoid duplicates
          if (!foundMatches.has(extracted)) {
            foundMatches.add(extracted);
            chunks.push({
              content: extracted,
              type: type as any,
              importance,
              metadata: {
                original_length: content.length,
                extraction_confidence: importance
              }
            });
          }
        }
      }
      
      // If message is important but no patterns matched, save whole message
      if (chunks.length === 0 && content.length > 50) {
        const importantKeywords = ['important', 'remember', 'critical', 'emergency', 'urgent'];
        const hasImportantKeyword = importantKeywords.some(kw => 
          content.toLowerCase().includes(kw)
        );
        
        if (hasImportantKeyword) {
          chunks.push({
            content: content.substring(0, 500),
            type: 'fact',
            importance: 0.7,
            metadata: { reason: 'important_keyword_detected' }
          });
        }
      }
    }
    
      // For assistant messages, extract summaries of important responses
    if (roleNorm === 'assistant') {
      // Check if assistant is confirming understanding of important info
      if (content.includes('I understand') || content.includes('I\'ll remember')) {
        chunks.push({
          content: content.substring(0, 300),
          type: 'summary',
          importance: 0.6,
          metadata: { reason: 'confirmation' }
        });
      }
    }
    
    return chunks;
  }
  
  static async processConversation(
    messages: Array<{role: string, content: string}>,
    userId: string,
    conversationId: string
  ): Promise<number> {
    let totalExtracted = 0;
    
    for (const message of messages) {
      const chunks = await this.extractFromMessage(message.content, message.role);
      
      for (const chunk of chunks) {
        try {
          // Generate embedding for the chunk
          const embedding = await this.generateEmbedding(chunk.content);
          
          if (embedding) {
            try {
              const res = await supabase.from('memory_chunks').insert({
                user_id: userId,
                conversation_id: conversationId,
                content: chunk.content,
                chunk_type: chunk.type,
                embedding: embedding,
                importance: chunk.importance,
                metadata: chunk.metadata
              });
              // supabase-js v2 returns { data, error }
              // check for error to catch failed inserts
              // @ts-ignore
              if (res && res.error) {
                console.error('Supabase insert error:', res.error);
              } else {
                totalExtracted++;
              }
            } catch (e) {
              console.error('Failed to save memory chunk (exception):', e);
            }
          }
        } catch (error) {
          console.error('Failed to save memory chunk:', error);
        }
      }
    }
    
    return totalExtracted;
  }
  
  private static async generateEmbedding(text: string): Promise<number[] | null> {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          dimensions: 1536,
          input: text.substring(0, 8000)
        })
      });
      
      if (!response.ok) return null;
      
      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      console.error('Embedding generation failed:', error);
      return null;
    }
  }
}

export default MemoryExtractor;
