import { NextRequest } from 'next/server';
import { createMocks } from 'node-mocks-http';

/**
 * Create a mock NextRequest for testing API routes
 */
export function createMockNextRequest(options: {
  method?: string;
  url?: string;
  body?: any;
  headers?: Record<string, string>;
}): NextRequest {
  const { method = 'GET', url = 'http://localhost:3000/api/test', body, headers = {} } = options;

  const requestInit: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body) {
    requestInit.body = JSON.stringify(body);
  }

  // Cast to any to work around Next.js RequestInit type incompatibility
  return new NextRequest(url, requestInit as any);
}

/**
 * Wait for a promise to resolve or reject
 */
export function waitFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock Supabase client
 */
export function createMockSupabaseClient() {
  const mockData: any[] = [];

  return {
    from: (table: string) => ({
      select: (columns?: string) => ({
        eq: (column: string, value: any) => ({
          single: async () => ({ data: mockData[0] || null, error: null }),
          limit: (count: number) => ({
            data: mockData.slice(0, count),
            error: null,
          }),
        }),
        limit: (count: number) => ({
          data: mockData.slice(0, count),
          error: null,
        }),
        order: (column: string, options?: any) => ({
          limit: (count: number) => ({
            data: mockData.slice(0, count),
            error: null,
          }),
        }),
      }),
      insert: async (data: any) => ({ data, error: null }),
      update: async (data: any) => ({ data, error: null }),
      delete: async () => ({ data: null, error: null }),
      upsert: async (data: any) => ({ data, error: null }),
    }),
    rpc: async (fn: string, params: any) => ({ data: [], error: null }),
    storage: {
      from: (bucket: string) => ({
        upload: async (path: string, file: any) => ({ data: { path }, error: null }),
        download: async (path: string) => ({ data: new Blob(), error: null }),
        remove: async (paths: string[]) => ({ data: null, error: null }),
      }),
    },
  };
}

/**
 * Mock OpenAI response
 */
export function mockOpenAIResponse(content: string) {
  return {
    choices: [
      {
        message: {
          content,
          role: 'assistant',
        },
        finish_reason: 'stop',
        index: 0,
      },
    ],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 20,
      total_tokens: 30,
    },
  };
}

/**
 * Mock OpenAI embeddings response
 */
export function mockOpenAIEmbeddings() {
  return {
    data: [
      {
        embedding: Array(1536).fill(0).map(() => Math.random()),
        index: 0,
      },
    ],
    usage: {
      prompt_tokens: 10,
      total_tokens: 10,
    },
  };
}

/**
 * Mock AssemblyAI transcription response
 */
export function mockAssemblyAIResponse(text: string) {
  return {
    id: 'test-transcript-id',
    status: 'completed',
    text,
    words: [],
    utterances: [],
    audio_url: 'https://test.com/audio.mp3',
  };
}

/**
 * Create mock file for upload testing
 */
export function createMockFile(
  content: string,
  filename: string,
  type: string = 'text/plain'
): File {
  const blob = new Blob([content], { type });
  return new File([blob], filename, { type });
}

/**
 * Create mock FormData for file uploads
 */
export function createMockFormData(file: File, additionalFields?: Record<string, string>): FormData {
  const formData = new FormData();
  formData.append('file', file);

  if (additionalFields) {
    Object.entries(additionalFields).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }

  return formData;
}

/**
 * Assert response status and extract JSON
 */
export async function assertResponse(
  response: Response,
  expectedStatus: number
): Promise<any> {
  if (response.status !== expectedStatus) {
    const text = await response.text();
    throw new Error(
      `Expected status ${expectedStatus}, got ${response.status}. Body: ${text}`
    );
  }

  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return await response.json();
  }

  return await response.text();
}
