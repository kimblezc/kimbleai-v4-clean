/**
 * Supabase Database Client
 *
 * Provides two clients:
 * - supabase: For client-side and server-side operations (uses anon key)
 * - supabaseAdmin: For server-side admin operations (uses service role key)
 */

import { createClient } from '@supabase/supabase-js';

// Check for required environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

// Warn if service role key is missing (required for server-side operations)
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[Supabase] Missing SUPABASE_SERVICE_ROLE_KEY - server-side operations may fail');
}

// Client for regular operations (Row Level Security enabled)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

// Admin client for server-side operations (bypasses RLS)
// Falls back to anon key if service role key is not available
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

// Type-safe database operations
// Updated for v5 schema - matches actual Supabase tables
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string; // UUID
          name: string; // UNIQUE
          email: string | null;
          created_at: string;
          role: string;
          permissions: Record<string, any>;
        };
        Insert: Partial<Database['public']['Tables']['users']['Row']>;
        Update: Partial<Database['public']['Tables']['users']['Row']>;
      };
      conversations: {
        Row: {
          id: string;
          user_id: string;
          title: string | null;
          project_id: string | null;
          is_pinned: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['conversations']['Row']>;
        Update: Partial<Database['public']['Tables']['conversations']['Row']>;
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          role: 'user' | 'assistant' | 'system';
          content: string;
          embedding: number[] | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['messages']['Row']>;
        Update: Partial<Database['public']['Tables']['messages']['Row']>;
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          color: string;
          status: 'active' | 'completed' | 'paused' | 'archived';
          priority: 'low' | 'medium' | 'high' | 'critical';
          tags: string[];
          metadata: Record<string, any>;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['projects']['Row']>;
        Update: Partial<Database['public']['Tables']['projects']['Row']>;
      };
      file_registry: {
        Row: {
          id: string;
          user_id: string;
          file_source: 'upload' | 'drive' | 'email_attachment' | 'calendar_attachment' | 'link';
          source_id: string;
          source_metadata: Record<string, any>;
          filename: string;
          mime_type: string;
          file_size: number;
          storage_path: string;
          preview_url: string | null;
          processed: boolean;
          processing_result: Record<string, any> | null;
          projects: string[];
          tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['file_registry']['Row']>;
        Update: Partial<Database['public']['Tables']['file_registry']['Row']>;
      };
      audio_transcriptions: {
        Row: {
          id: string;
          user_id: string;
          project_id: string;
          filename: string;
          file_size: number | null;
          duration: number | null;
          text: string;
          segments: Record<string, any> | null;
          language: string;
          status: string;
          service: string;
          metadata: Record<string, any>;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['audio_transcriptions']['Row']>;
        Update: Partial<Database['public']['Tables']['audio_transcriptions']['Row']>;
      };
      api_cost_tracking: {
        Row: {
          id: string;
          user_id: string;
          model: string;
          endpoint: string;
          input_tokens: number;
          output_tokens: number;
          cost_usd: number;
          cached: boolean;
          timestamp: string;
          metadata: Record<string, any>;
        };
        Insert: Partial<Database['public']['Tables']['api_cost_tracking']['Row']>;
        Update: Partial<Database['public']['Tables']['api_cost_tracking']['Row']>;
      };
    };
  };
};
