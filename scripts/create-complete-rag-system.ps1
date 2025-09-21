# COMPLETE RAG + VECTOR SYSTEM WITH FILE INDEXING
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "BUILDING PROPER RAG SYSTEM WITH FULL MEMORY" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor White
Write-Host ""

Write-Host "CURRENT PROBLEMS:" -ForegroundColor Red
Write-Host "1. Only remembers basic examples (dog, Seattle)" -ForegroundColor Yellow
Write-Host "2. Doesn't extract facts from conversations" -ForegroundColor Yellow
Write-Host "3. Can't index uploaded files" -ForegroundColor Yellow
Write-Host "4. No knowledge base growth" -ForegroundColor Yellow
Write-Host "5. Can't reference Drive/Gmail content" -ForegroundColor Yellow
Write-Host ""

Write-Host "CREATING COMPREHENSIVE SOLUTION..." -ForegroundColor Green

# Create enhanced database schema
$enhancedSchema = @'
-- ENHANCED SUPABASE SCHEMA FOR COMPLETE RAG SYSTEM
-- Run this in Supabase SQL Editor

-- Knowledge base table (stores ALL types of information)
CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  source_type TEXT CHECK (source_type IN ('conversation', 'file', 'email', 'drive', 'manual', 'extracted')),
  source_id TEXT, -- Reference to original source
  category TEXT, -- fact, preference, document, note, task, appointment, etc.
  title TEXT,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}', -- Flexible storage for any data type
  embedding vector(1536),
  importance FLOAT DEFAULT 0.5,
  tags TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP, -- For temporary information
  is_active BOOLEAN DEFAULT true
);

-- Create indexes for fast retrieval
CREATE INDEX idx_knowledge_user ON knowledge_base(user_id);
CREATE INDEX idx_knowledge_category ON knowledge_base(category);
CREATE INDEX idx_knowledge_source ON knowledge_base(source_type);
CREATE INDEX idx_knowledge_tags ON knowledge_base USING GIN(tags);
CREATE INDEX idx_knowledge_embedding ON knowledge_base USING hnsw (embedding vector_cosine_ops);

-- File storage table
CREATE TABLE IF NOT EXISTS indexed_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  filename TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  storage_location TEXT, -- local path, drive URL, etc.
  content_hash TEXT,
  full_text TEXT, -- Extracted text content
  chunks JSONB, -- File broken into chunks for RAG
  metadata JSONB DEFAULT '{}',
  indexed_at TIMESTAMP DEFAULT NOW(),
  last_accessed TIMESTAMP DEFAULT NOW()
);

-- Enhanced search function that searches EVERYTHING
CREATE OR REPLACE FUNCTION search_knowledge_base(
  query_embedding vector(1536),
  user_id_param UUID,
  limit_count INT DEFAULT 20,
  category_filter TEXT DEFAULT NULL,
  source_filter TEXT DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  source_type TEXT,
  category TEXT,
  title TEXT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    kb.id,
    kb.source_type,
    kb.category,
    kb.title,
    kb.content,
    kb.metadata,
    1 - (kb.embedding <=> query_embedding) as similarity
  FROM knowledge_base kb
  WHERE kb.user_id = user_id_param
    AND kb.is_active = true
    AND (category_filter IS NULL OR kb.category = category_filter)
    AND (source_filter IS NULL OR kb.source_type = source_filter)
  ORDER BY kb.embedding <=> query_embedding
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Auto-extraction trigger for conversations
CREATE OR REPLACE FUNCTION extract_knowledge_from_message()
RETURNS TRIGGER AS $$
BEGIN
  -- This would be called by your application logic
  -- Placeholder for automatic extraction
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
'@

$enhancedSchema | Out-File -Path "sql\enhanced_rag_schema.sql" -Encoding UTF8
Write-Host "✅ Enhanced database schema created" -ForegroundColor Green

# Create knowledge extractor service
$knowledgeExtractor = @'
// lib/knowledge-extractor.ts
// Extracts and indexes ALL types of information

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

export class KnowledgeExtractor {
  
  // Extract facts from conversations
  static async extractFromConversation(
    userMessage: string,
    assistantResponse: string,
    userId: string
  ): Promise<void> {
    const prompt = `Extract all factual information, preferences, tasks, dates, and important details from this conversation:
    
    User: ${userMessage}
    Assistant: ${assistantResponse}
    
    Return as JSON array with format:
    [
      {
        "category": "fact|preference|task|appointment|decision|reference",
        "title": "Brief title",
        "content": "The actual information",
        "importance": 0.1-1.0,
        "tags": ["tag1", "tag2"],
        "metadata": { any relevant metadata }
      }
    ]
    
    Extract EVERYTHING that might be useful to remember.`;
    
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a knowledge extraction system. Extract all useful information.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3
      });
      
      const extracted = JSON.parse(completion.choices[0].message.content || '{"items":[]}');
      const items = extracted.items || extracted;
      
      // Store each extracted piece of knowledge
      for (const item of items) {
        const embedding = await this.generateEmbedding(item.content);
        
        await supabase.from('knowledge_base').insert({
          user_id: userId,
          source_type: 'conversation',
          category: item.category,
          title: item.title,
          content: item.content,
          metadata: item.metadata || {},
          embedding: embedding,
          importance: item.importance || 0.5,
          tags: item.tags || []
        });
      }
      
      console.log(`Extracted ${items.length} knowledge items`);
    } catch (error) {
      console.error('Knowledge extraction error:', error);
    }
  }
  
  // Index uploaded files
  static async indexFile(
    filePath: string,
    fileContent: string,
    userId: string,
    metadata: any = {}
  ): Promise<void> {
    // Split file into chunks for better RAG
    const chunks = this.splitIntoChunks(fileContent, 1000);
    
    // Store file record
    const { data: fileRecord } = await supabase
      .from('indexed_files')
      .insert({
        user_id: userId,
        filename: filePath,
        file_type: this.getFileType(filePath),
        full_text: fileContent,
        chunks: chunks,
        metadata: metadata
      })
      .select()
      .single();
    
    // Index each chunk in knowledge base
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await this.generateEmbedding(chunk);
      
      await supabase.from('knowledge_base').insert({
        user_id: userId,
        source_type: 'file',
        source_id: fileRecord.id,
        category: 'document',
        title: `${filePath} - Part ${i + 1}`,
        content: chunk,
        metadata: {
          filename: filePath,
          chunk_index: i,
          total_chunks: chunks.length,
          ...metadata
        },
        embedding: embedding,
        importance: 0.7,
        tags: ['file', this.getFileType(filePath)]
      });
    }
    
    console.log(`Indexed file ${filePath} with ${chunks.length} chunks`);
  }
  
  // Index Google Drive document
  static async indexDriveDocument(
    documentId: string,
    content: string,
    title: string,
    userId: string
  ): Promise<void> {
    const chunks = this.splitIntoChunks(content, 1000);
    
    for (let i = 0; i < chunks.length; i++) {
      const embedding = await this.generateEmbedding(chunks[i]);
      
      await supabase.from('knowledge_base').insert({
        user_id: userId,
        source_type: 'drive',
        source_id: documentId,
        category: 'document',
        title: `${title} - Part ${i + 1}`,
        content: chunks[i],
        metadata: {
          drive_id: documentId,
          document_title: title,
          chunk_index: i
        },
        embedding: embedding,
        importance: 0.8,
        tags: ['drive', 'document']
      });
    }
  }
  
  // Index email
  static async indexEmail(
    email: any,
    userId: string
  ): Promise<void> {
    const content = `From: ${email.from}\nTo: ${email.to}\nSubject: ${email.subject}\n\n${email.body}`;
    const embedding = await this.generateEmbedding(content);
    
    await supabase.from('knowledge_base').insert({
      user_id: userId,
      source_type: 'email',
      source_id: email.id,
      category: 'email',
      title: email.subject,
      content: content,
      metadata: {
        from: email.from,
        to: email.to,
        date: email.date,
        thread_id: email.threadId
      },
      embedding: embedding,
      importance: email.important ? 0.9 : 0.6,
      tags: ['email', email.from]
    });
  }
  
  // Manual knowledge entry
  static async addManualKnowledge(
    category: string,
    title: string,
    content: string,
    userId: string,
    metadata: any = {}
  ): Promise<void> {
    const embedding = await this.generateEmbedding(content);
    
    await supabase.from('knowledge_base').insert({
      user_id: userId,
      source_type: 'manual',
      category: category,
      title: title,
      content: content,
      metadata: metadata,
      embedding: embedding,
      importance: 0.9, // Manual entries are usually important
      tags: metadata.tags || []
    });
  }
  
  // Helper functions
  private static splitIntoChunks(text: string, chunkSize: number): string[] {
    const words = text.split(' ');
    const chunks: string[] = [];
    
    for (let i = 0; i < words.length; i += chunkSize) {
      chunks.push(words.slice(i, i + chunkSize).join(' '));
    }
    
    return chunks;
  }
  
  private static getFileType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ext || 'unknown';
  }
  
  private static async generateEmbedding(text: string): Promise<number[]> {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.substring(0, 8000),
      dimensions: 1536
    });
    
    return response.data[0].embedding;
  }
}
'@

$knowledgeExtractor | Out-File -Path "lib\knowledge-extractor.ts" -Encoding UTF8
Write-Host "✅ Knowledge extractor service created" -ForegroundColor Green

Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Yellow
Write-Host "1. Run the enhanced schema in Supabase" -ForegroundColor White
Write-Host "2. Update chat API to use knowledge base" -ForegroundColor White
Write-Host "3. Create file upload endpoint" -ForegroundColor White
Write-Host "4. Set up Drive/Gmail indexing" -ForegroundColor White
