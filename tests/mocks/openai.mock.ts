import { vi } from 'vitest';

/**
 * Mock OpenAI API responses
 */
export function mockOpenAIChatCompletion(content: string = 'This is a test response') {
  return {
    id: 'chatcmpl-test',
    object: 'chat.completion',
    created: Date.now(),
    model: 'gpt-4o-mini',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content,
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: 50,
      completion_tokens: 20,
      total_tokens: 70,
    },
  };
}

export function mockOpenAIEmbedding(dimensions: number = 1536) {
  return {
    object: 'list',
    data: [
      {
        object: 'embedding',
        embedding: Array(dimensions)
          .fill(0)
          .map(() => Math.random()),
        index: 0,
      },
    ],
    model: 'text-embedding-3-small',
    usage: {
      prompt_tokens: 8,
      total_tokens: 8,
    },
  };
}

export function mockOpenAIVisionCompletion(description: string = 'This is an image of a test') {
  return {
    id: 'chatcmpl-vision-test',
    object: 'chat.completion',
    created: Date.now(),
    model: 'gpt-4o',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: description,
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: 100,
      completion_tokens: 30,
      total_tokens: 130,
    },
  };
}

export function mockOpenAIStreamResponse(content: string = 'Streaming response') {
  const chunks = content.split(' ').map((word, index) => ({
    id: `chatcmpl-stream-${index}`,
    object: 'chat.completion.chunk',
    created: Date.now(),
    model: 'gpt-4o-mini',
    choices: [
      {
        index: 0,
        delta: {
          content: word + ' ',
        },
        finish_reason: index === content.split(' ').length - 1 ? 'stop' : null,
      },
    ],
  }));

  return chunks;
}

export function mockOpenAIError(message: string = 'API Error', code: number = 500) {
  return {
    error: {
      message,
      type: 'api_error',
      param: null,
      code: code.toString(),
    },
  };
}

/**
 * Setup fetch mock for OpenAI API
 */
export function setupOpenAIMock() {
  const originalFetch = global.fetch;

  global.fetch = vi.fn((url: string | URL | Request, options?: RequestInit) => {
    const urlStr = typeof url === 'string' ? url : url instanceof Request ? url.url : url.toString();

    // Chat completions
    if (urlStr.includes('/chat/completions')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockOpenAIChatCompletion()),
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);
    }

    // Embeddings
    if (urlStr.includes('/embeddings')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockOpenAIEmbedding()),
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);
    }

    // Default
    return originalFetch(url, options);
  });

  return () => {
    global.fetch = originalFetch;
  };
}

/**
 * Setup OpenAI mock with custom responses
 */
export function setupOpenAIMockWithResponses(responses: {
  chat?: any;
  embeddings?: any;
  vision?: any;
}) {
  const originalFetch = global.fetch;

  global.fetch = vi.fn((url: string | URL | Request, options?: RequestInit) => {
    const urlStr = typeof url === 'string' ? url : url instanceof Request ? url.url : url.toString();

    if (urlStr.includes('/chat/completions')) {
      const response = responses.chat || mockOpenAIChatCompletion();
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(response),
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);
    }

    if (urlStr.includes('/embeddings')) {
      const response = responses.embeddings || mockOpenAIEmbedding();
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(response),
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);
    }

    return originalFetch(url, options);
  });

  return () => {
    global.fetch = originalFetch;
  };
}
