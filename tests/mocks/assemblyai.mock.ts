import { vi } from 'vitest';

/**
 * Mock AssemblyAI API responses
 */
export function mockAssemblyAITranscript(
  text: string = 'This is a test transcription',
  status: 'queued' | 'processing' | 'completed' | 'error' = 'completed'
) {
  return {
    id: 'test-transcript-id-' + Date.now(),
    language_model: 'assemblyai_default',
    acoustic_model: 'assemblyai_default',
    language_code: 'en_us',
    status,
    audio_url: 'https://test.com/audio.mp3',
    text: status === 'completed' ? text : null,
    words: status === 'completed' ? [
      {
        text: 'This',
        start: 0,
        end: 100,
        confidence: 0.99,
        speaker: null,
      },
      {
        text: 'is',
        start: 100,
        end: 200,
        confidence: 0.98,
        speaker: null,
      },
    ] : null,
    utterances: null,
    confidence: 0.98,
    audio_duration: 5.5,
    punctuate: true,
    format_text: true,
  };
}

export function mockAssemblyAIUploadResponse() {
  return {
    upload_url: 'https://test.assemblyai.com/upload/test-file-id',
  };
}

export function mockAssemblyAIError(message: string = 'Transcription failed', code: number = 500) {
  return {
    error: message,
    status: 'error',
  };
}

/**
 * Setup AssemblyAI mock
 */
export function setupAssemblyAIMock(transcriptText?: string) {
  const originalFetch = global.fetch;

  global.fetch = vi.fn((url: string | URL | Request, options?: RequestInit) => {
    const urlStr = typeof url === 'string' ? url : url instanceof Request ? url.url : url.toString();

    // Upload endpoint
    if (urlStr.includes('assemblyai.com/v2/upload')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockAssemblyAIUploadResponse()),
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);
    }

    // Transcript submission
    if (urlStr.includes('assemblyai.com/v2/transcript') && options?.method === 'POST') {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockAssemblyAITranscript(transcriptText, 'queued')),
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);
    }

    // Transcript status/result
    if (urlStr.includes('assemblyai.com/v2/transcript/')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockAssemblyAITranscript(transcriptText, 'completed')),
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);
    }

    return originalFetch(url, options);
  });

  return () => {
    global.fetch = originalFetch;
  };
}

/**
 * Mock progressive transcription states
 */
export function mockAssemblyAIProgressiveStates(finalText: string) {
  let callCount = 0;
  const states: Array<'queued' | 'processing' | 'completed'> = ['queued', 'processing', 'completed'];

  return vi.fn((url: string | URL) => {
    const urlStr = typeof url === 'string' ? url : url.toString();

    if (urlStr.includes('assemblyai.com/v2/transcript/')) {
      const status = states[Math.min(callCount, states.length - 1)];
      callCount++;

      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockAssemblyAITranscript(finalText, status)),
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);
    }

    return Promise.reject(new Error('Not mocked'));
  });
}
