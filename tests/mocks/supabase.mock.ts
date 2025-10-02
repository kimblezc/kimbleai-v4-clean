import { vi } from 'vitest';

/**
 * Mock Supabase client for testing
 */
export class MockSupabaseClient {
  private mockData: Map<string, any[]> = new Map();
  private mockError: any = null;

  constructor() {
    this.setupDefaultData();
  }

  private setupDefaultData() {
    this.mockData.set('users', [
      { id: 'user-1', name: 'Zach', email: 'zach@kimbleai.com' },
      { id: 'user-2', name: 'Rebecca', email: 'rebecca@kimbleai.com' },
    ]);

    this.mockData.set('conversations', [
      { id: 'conv-1', user_id: 'user-1', title: 'Test Conversation' },
    ]);

    this.mockData.set('messages', [
      {
        id: 'msg-1',
        conversation_id: 'conv-1',
        user_id: 'user-1',
        role: 'user',
        content: 'Hello',
        embedding: Array(1536).fill(0),
      },
    ]);

    this.mockData.set('knowledge_base', [
      {
        id: 'kb-1',
        user_id: 'user-1',
        source_type: 'manual',
        category: 'fact',
        title: 'Test Knowledge',
        content: 'Test content',
        embedding: Array(1536).fill(0),
      },
    ]);
  }

  setMockData(table: string, data: any[]) {
    this.mockData.set(table, data);
  }

  setMockError(error: any) {
    this.mockError = error;
  }

  from(table: string) {
    return {
      select: (columns?: string) => this.createSelectBuilder(table),
      insert: (data: any) => this.createInsertBuilder(table, data),
      update: (data: any) => this.createUpdateBuilder(table, data),
      delete: () => this.createDeleteBuilder(table),
      upsert: (data: any) => this.createUpsertBuilder(table, data),
    };
  }

  private createSelectBuilder(table: string) {
    const builder = {
      eq: (column: string, value: any) => {
        const data = this.mockData.get(table) || [];
        const filtered = data.filter((item) => item[column] === value);

        return {
          single: async () => ({
            data: filtered[0] || null,
            error: this.mockError,
          }),
          limit: (count: number) => ({
            data: filtered.slice(0, count),
            error: this.mockError,
          }),
          order: (column: string, options?: any) => ({
            limit: (count: number) => ({
              data: filtered.slice(0, count),
              error: this.mockError,
            }),
          }),
        };
      },
      limit: (count: number) => ({
        data: (this.mockData.get(table) || []).slice(0, count),
        error: this.mockError,
      }),
      order: (column: string, options?: any) => ({
        limit: (count: number) => ({
          data: (this.mockData.get(table) || []).slice(0, count),
          error: this.mockError,
        }),
        eq: (column: string, value: any) => ({
          limit: (count: number) => {
            const data = this.mockData.get(table) || [];
            const filtered = data.filter((item) => item[column] === value);
            return {
              data: filtered.slice(0, count),
              error: this.mockError,
            };
          },
        }),
      }),
    };

    return builder;
  }

  private createInsertBuilder(table: string, insertData: any) {
    return {
      select: (columns?: string) => ({
        single: async () => {
          if (this.mockError) {
            return { data: null, error: this.mockError };
          }

          const newItem = { id: `${table}-${Date.now()}`, ...insertData };
          const existingData = this.mockData.get(table) || [];
          this.mockData.set(table, [...existingData, newItem]);

          return { data: newItem, error: null };
        },
      }),
      then: async (resolve: any) => {
        if (this.mockError) {
          return resolve({ data: null, error: this.mockError });
        }

        const newItem = { id: `${table}-${Date.now()}`, ...insertData };
        const existingData = this.mockData.get(table) || [];
        this.mockData.set(table, [...existingData, newItem]);

        return resolve({ data: newItem, error: null });
      },
    };
  }

  private createUpdateBuilder(table: string, updateData: any) {
    return {
      eq: (column: string, value: any) => ({
        then: async (resolve: any) => {
          if (this.mockError) {
            return resolve({ data: null, error: this.mockError });
          }

          const data = this.mockData.get(table) || [];
          const updated = data.map((item) =>
            item[column] === value ? { ...item, ...updateData } : item
          );
          this.mockData.set(table, updated);

          return resolve({ data: updateData, error: null });
        },
      }),
    };
  }

  private createDeleteBuilder(table: string) {
    return {
      eq: (column: string, value: any) => ({
        then: async (resolve: any) => {
          if (this.mockError) {
            return resolve({ data: null, error: this.mockError });
          }

          const data = this.mockData.get(table) || [];
          const filtered = data.filter((item) => item[column] !== value);
          this.mockData.set(table, filtered);

          return resolve({ data: null, error: null });
        },
      }),
    };
  }

  private createUpsertBuilder(table: string, upsertData: any) {
    return {
      then: async (resolve: any) => {
        if (this.mockError) {
          return resolve({ data: null, error: this.mockError });
        }

        const data = this.mockData.get(table) || [];
        const existingIndex = data.findIndex((item) => item.id === upsertData.id);

        if (existingIndex >= 0) {
          data[existingIndex] = { ...data[existingIndex], ...upsertData };
        } else {
          data.push({ id: `${table}-${Date.now()}`, ...upsertData });
        }

        this.mockData.set(table, data);
        return resolve({ data: upsertData, error: null });
      },
    };
  }

  rpc(fnName: string, params: any) {
    if (fnName === 'search_knowledge_base') {
      return {
        data: this.mockData.get('knowledge_base')?.slice(0, params.limit_count || 10),
        error: this.mockError,
      };
    }

    return { data: [], error: this.mockError };
  }

  storage = {
    from: (bucket: string) => ({
      upload: async (path: string, file: any) => ({
        data: { path: `${bucket}/${path}` },
        error: this.mockError,
      }),
      download: async (path: string) => ({
        data: new Blob(['test content']),
        error: this.mockError,
      }),
      remove: async (paths: string[]) => ({
        data: null,
        error: this.mockError,
      }),
      getPublicUrl: (path: string) => ({
        data: { publicUrl: `https://test.supabase.co/storage/v1/object/public/${bucket}/${path}` },
      }),
    }),
  };
}

export const createMockSupabase = () => new MockSupabaseClient();

// Mock the @supabase/supabase-js module
export const mockSupabaseClient = vi.fn(() => createMockSupabase());
