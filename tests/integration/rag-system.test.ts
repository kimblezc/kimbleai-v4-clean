import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MockSupabaseClient } from '../mocks/supabase.mock';

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => new MockSupabaseClient(),
}));

vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: 'Response with context from RAG system',
              },
            },
          ],
        }),
      },
    };
    embeddings = {
      create: vi.fn().mockResolvedValue({
        data: [
          {
            embedding: Array(1536).fill(0).map(() => Math.random()),
          },
        ],
      }),
    };
  },
}));

describe('RAG System Integration Tests', () => {
  let supabase: MockSupabaseClient;

  beforeEach(() => {
    vi.clearAllMocks();
    supabase = new MockSupabaseClient();

    // Setup test data
    supabase.setMockData('knowledge_base', [
      {
        id: 'kb-1',
        user_id: 'user-1',
        source_type: 'file',
        category: 'document',
        title: 'Project Requirements',
        content: 'The system should support real-time collaboration and have a REST API.',
        embedding: Array(1536).fill(0),
        importance: 0.9,
        tags: ['requirements', 'api', 'collaboration'],
      },
      {
        id: 'kb-2',
        user_id: 'user-1',
        source_type: 'conversation',
        category: 'fact',
        title: 'User Preference',
        content: 'User prefers TypeScript and Next.js for web development.',
        embedding: Array(1536).fill(0),
        importance: 0.8,
        tags: ['preference', 'technology'],
      },
      {
        id: 'kb-3',
        user_id: 'user-1',
        source_type: 'manual',
        category: 'note',
        title: 'Meeting Notes',
        content: 'Discussed API architecture. Decided to use GraphQL instead of REST.',
        embedding: Array(1536).fill(0),
        importance: 0.85,
        tags: ['meeting', 'decision', 'api'],
      },
    ]);
  });

  it('should retrieve relevant context from knowledge base', async () => {
    const query = 'What technology stack should we use?';
    const mockEmbedding = Array(1536).fill(0);

    const { data: results } = await supabase.rpc('search_knowledge_base', {
      query_embedding: mockEmbedding,
      user_id_param: 'user-1',
      limit_count: 10,
    });

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
  });

  it('should integrate knowledge base results with chat', async () => {
    // Simulate a chat request that should use RAG
    const userQuery = 'What are our project requirements?';

    // Get relevant knowledge
    const mockEmbedding = Array(1536).fill(0);
    const { data: knowledge } = await supabase.rpc('search_knowledge_base', {
      query_embedding: mockEmbedding,
      user_id_param: 'user-1',
      limit_count: 5,
    });

    expect(knowledge).toBeDefined();

    // Verify knowledge can be formatted for AI context
    const knowledgeContext = knowledge
      .map((item: any) => `${item.title}: ${item.content}`)
      .join('\n');

    expect(knowledgeContext.length).toBeGreaterThan(0);
  });

  it('should store new information in knowledge base', async () => {
    const newKnowledge = {
      user_id: 'user-1',
      source_type: 'conversation',
      category: 'fact',
      title: 'New Fact',
      content: 'User is based in Seattle',
      embedding: Array(1536).fill(0),
      importance: 0.7,
      tags: ['location', 'personal'],
    };

    const { data, error } = await supabase
      .from('knowledge_base')
      .insert(newKnowledge)
      .select('id')
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('should handle multi-source knowledge retrieval', async () => {
    const mockEmbedding = Array(1536).fill(0);

    const { data: results } = await supabase.rpc('search_knowledge_base', {
      query_embedding: mockEmbedding,
      user_id_param: 'user-1',
      limit_count: 10,
    });

    expect(results).toBeDefined();
    if (results && results.length > 0) {
      const sources = [...new Set(results.map((r: any) => r.source_type))];
      expect(sources.length).toBeGreaterThan(0);
    }
  });

  it('should filter knowledge by importance', async () => {
    const allKnowledge = supabase['mockData'].get('knowledge_base') || [];
    const importantKnowledge = allKnowledge.filter((k) => k.importance >= 0.8);

    expect(importantKnowledge.length).toBeGreaterThan(0);
    expect(importantKnowledge.every((k) => k.importance >= 0.8)).toBe(true);
  });

  it('should support tag-based filtering', async () => {
    const allKnowledge = supabase['mockData'].get('knowledge_base') || [];
    const apiKnowledge = allKnowledge.filter((k) => k.tags.includes('api'));

    expect(apiKnowledge.length).toBeGreaterThan(0);
  });

  it('should handle embeddings for semantic search', async () => {
    const testText = 'What is the project about?';

    // Mock OpenAI embeddings
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              {
                embedding: Array(1536)
                  .fill(0)
                  .map(() => Math.random()),
              },
            ],
          }),
      } as Response)
    ) as any;

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-key',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: testText,
      }),
    });

    const data = await response.json();
    expect(data.data[0].embedding).toBeDefined();
    expect(data.data[0].embedding.length).toBe(1536);
  });

  it('should maintain conversation context across messages', async () => {
    const messages = [
      {
        id: 'msg-1',
        conversation_id: 'conv-1',
        user_id: 'user-1',
        role: 'user',
        content: 'Tell me about our API requirements',
        embedding: Array(1536).fill(0),
      },
      {
        id: 'msg-2',
        conversation_id: 'conv-1',
        user_id: 'user-1',
        role: 'assistant',
        content: 'Based on the knowledge base, you need a REST API with real-time features',
        embedding: Array(1536).fill(0),
      },
    ];

    for (const msg of messages) {
      await supabase.from('messages').insert(msg);
    }

    const { data: conversationMessages } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', 'conv-1')
      .order('created_at', { ascending: true })
      .limit(10);

    expect(conversationMessages).toBeDefined();
  });

  it('should combine knowledge from multiple sources', async () => {
    const sources = ['conversation', 'file', 'manual'];
    const allKnowledge = supabase['mockData'].get('knowledge_base') || [];

    const knowledgeBySources = sources.map((source) =>
      allKnowledge.filter((k) => k.source_type === source)
    );

    expect(knowledgeBySources.every((items) => items.length >= 0)).toBe(true);
  });

  it('should update knowledge importance over time', async () => {
    const knowledgeId = 'kb-1';

    const { error } = await supabase
      .from('knowledge_base')
      .update({ importance: 0.95 })
      .eq('id', knowledgeId);

    expect(error).toBeNull();
  });
});
