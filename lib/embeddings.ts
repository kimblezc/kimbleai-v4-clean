/**
 * EMBEDDINGS MODULE - Core embedding generation and management
 *
 * Purpose: Generate and manage embeddings for semantic search across all content
 *
 * Features:
 * - OpenAI text-embedding-3-small integration
 * - Batch processing for efficiency
 * - Integration with embedding cache for cost reduction
 * - Chunking strategies for long content
 * - Error handling and retries
 *
 * Cost: $0.02 per 1M tokens (~$0.000002 per embedding)
 */

import OpenAI from 'openai';
import { embeddingCache } from './embedding-cache';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

// Configuration
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;
const MAX_INPUT_LENGTH = 8000; // tokens
const CHUNK_SIZE = 1000; // characters per chunk
const CHUNK_OVERLAP = 200; // overlap between chunks

export interface EmbeddingResult {
  embedding: number[];
  text: string;
  tokenCount?: number;
}

export interface ChunkWithEmbedding {
  content: string;
  embedding: number[];
  chunkIndex: number;
  startChar: number;
  endChar: number;
}

/**
 * Generate a single embedding for text
 * Uses cache to avoid redundant API calls
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error('Text cannot be empty');
  }

  try {
    // Try cache first
    const cached = await embeddingCache.getEmbedding(text);
    if (cached) {
      return cached;
    }

    // Generate new embedding
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text.substring(0, MAX_INPUT_LENGTH),
      dimensions: EMBEDDING_DIMENSIONS
    });

    const embedding = response.data[0].embedding;

    console.log(`[Embeddings] Generated embedding for text (${text.length} chars)`);

    return embedding;

  } catch (error: any) {
    console.error('[Embeddings] Failed to generate embedding:', error.message);
    throw new Error(`Embedding generation failed: ${error.message}`);
  }
}

/**
 * Generate embeddings for multiple texts in batch
 * More efficient than individual calls
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (!texts || texts.length === 0) {
    return [];
  }

  try {
    // Use cache for batch processing
    const results = await embeddingCache.getBatchEmbeddings(texts);

    // Filter out any null results and return valid embeddings
    return results.filter((r): r is number[] => r !== null);

  } catch (error: any) {
    console.error('[Embeddings] Batch generation failed:', error.message);
    throw new Error(`Batch embedding generation failed: ${error.message}`);
  }
}

/**
 * Chunk long text into smaller pieces for embedding
 * Uses sliding window with overlap for better context preservation
 */
export function chunkText(text: string, chunkSize: number = CHUNK_SIZE, overlap: number = CHUNK_OVERLAP): string[] {
  if (text.length <= chunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    const endIndex = Math.min(startIndex + chunkSize, text.length);
    const chunk = text.substring(startIndex, endIndex);

    chunks.push(chunk);

    // Move forward by (chunkSize - overlap)
    startIndex += chunkSize - overlap;

    // Avoid tiny last chunk
    if (text.length - startIndex < overlap) {
      break;
    }
  }

  return chunks;
}

/**
 * Chunk and embed long text
 * Returns array of chunks with their embeddings
 */
export async function chunkAndEmbedText(
  text: string,
  chunkSize: number = CHUNK_SIZE,
  overlap: number = CHUNK_OVERLAP
): Promise<ChunkWithEmbedding[]> {
  const chunks = chunkText(text, chunkSize, overlap);
  const embeddings = await generateEmbeddings(chunks);

  return chunks.map((content, index) => ({
    content,
    embedding: embeddings[index],
    chunkIndex: index,
    startChar: index * (chunkSize - overlap),
    endChar: Math.min((index + 1) * chunkSize - index * overlap, text.length)
  }));
}

/**
 * Embed a conversation message
 * Optimized for chat messages which are typically short
 */
export async function embedMessage(content: string, role: string = 'user'): Promise<number[]> {
  // Prefix with role for better semantic meaning
  const prefixedContent = `${role}: ${content}`;
  return generateEmbedding(prefixedContent);
}

/**
 * Embed a file's content
 * Handles long files by chunking
 */
export async function embedFile(
  filename: string,
  content: string,
  fileType: string
): Promise<ChunkWithEmbedding[]> {
  // Include filename and type for better context
  const contextualContent = `File: ${filename} (${fileType})\n\n${content}`;

  // For short files, just one embedding
  if (contextualContent.length <= CHUNK_SIZE) {
    const embedding = await generateEmbedding(contextualContent);
    return [{
      content: contextualContent,
      embedding,
      chunkIndex: 0,
      startChar: 0,
      endChar: contextualContent.length
    }];
  }

  // For long files, chunk and embed
  return chunkAndEmbedText(contextualContent);
}

/**
 * Embed an audio transcription
 * Handles speaker diarization and timestamps
 */
export async function embedTranscription(
  filename: string,
  text: string,
  segments?: Array<{ speaker?: string; text: string; timestamp?: number }>
): Promise<ChunkWithEmbedding[]> {
  // If we have segments, chunk by speaker turns
  if (segments && segments.length > 0) {
    const chunks: string[] = [];
    let currentChunk = '';
    let currentSpeaker = segments[0].speaker;

    for (const segment of segments) {
      // Start new chunk on speaker change or size limit
      if (segment.speaker !== currentSpeaker || currentChunk.length > CHUNK_SIZE) {
        if (currentChunk.length > 0) {
          chunks.push(currentChunk);
        }
        currentChunk = `[${segment.speaker || 'Speaker'}]: ${segment.text}`;
        currentSpeaker = segment.speaker;
      } else {
        currentChunk += ` ${segment.text}`;
      }
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }

    const embeddings = await generateEmbeddings(chunks);

    return chunks.map((content, index) => ({
      content,
      embedding: embeddings[index],
      chunkIndex: index,
      startChar: 0, // Would need segment timestamps for accurate positions
      endChar: content.length
    }));
  }

  // No segments, just chunk the full text
  const contextualContent = `Transcription: ${filename}\n\n${text}`;
  return chunkAndEmbedText(contextualContent);
}

/**
 * Embed knowledge base entry
 * Includes title and category for better context
 */
export async function embedKnowledgeEntry(
  title: string,
  content: string,
  category: string,
  tags?: string[]
): Promise<number[]> {
  const contextualContent = [
    `Title: ${title}`,
    `Category: ${category}`,
    tags && tags.length > 0 ? `Tags: ${tags.join(', ')}` : '',
    '',
    content
  ].filter(Boolean).join('\n');

  return generateEmbedding(contextualContent);
}

/**
 * Calculate cosine similarity between two embeddings
 * Returns value between -1 and 1 (higher = more similar)
 */
export function cosineSimilarity(embedding1: number[], embedding2: number[]): number {
  if (embedding1.length !== embedding2.length) {
    throw new Error('Embeddings must have the same dimension');
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    norm1 += embedding1[i] * embedding1[i];
    norm2 += embedding2[i] * embedding2[i];
  }

  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

/**
 * Batch retry logic for failed embeddings
 */
export async function generateEmbeddingsWithRetry(
  texts: string[],
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<Array<number[] | null>> {
  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt < maxRetries) {
    try {
      return await generateEmbeddings(texts);
    } catch (error: any) {
      lastError = error;
      attempt++;

      if (attempt < maxRetries) {
        console.log(`[Embeddings] Retry attempt ${attempt}/${maxRetries} after ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }

  console.error(`[Embeddings] Failed after ${maxRetries} attempts:`, lastError?.message);
  return texts.map(() => null);
}

/**
 * Get embedding statistics from cache
 */
export function getEmbeddingStats() {
  return embeddingCache.getStats();
}

/**
 * Clear embedding cache
 */
export function clearEmbeddingCache() {
  embeddingCache.clear();
}

/**
 * Warm up cache with common queries
 */
export async function warmupEmbeddingCache(commonQueries: string[]) {
  await embeddingCache.warmup(commonQueries);
}
