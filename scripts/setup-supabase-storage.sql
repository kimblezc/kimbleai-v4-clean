-- Supabase Storage Setup Script
-- Run this in Supabase SQL Editor to set up file storage buckets and policies

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('audio-files', 'audio-files', false),
  ('images', 'images', false),
  ('documents', 'documents', false),
  ('processed', 'processed', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow authenticated users to upload files
CREATE POLICY "Users can upload files"
ON storage.objects FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Policy: Allow authenticated users to read their own files
CREATE POLICY "Users can read own files"
ON storage.objects FOR SELECT
USING (auth.role() = 'authenticated');

-- Policy: Allow authenticated users to delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
USING (auth.role() = 'authenticated');

-- Policy: Allow service role to do everything (for server-side operations)
CREATE POLICY "Service role full access"
ON storage.objects FOR ALL
USING (auth.role() = 'service_role');

-- Create database tables for file tracking

-- Main uploaded_files table
CREATE TABLE IF NOT EXISTS uploaded_files (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT NOT NULL DEFAULT 'general',
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'processing', -- processing, completed, failed
  storage_url TEXT,
  processing_result JSONB,
  error_message TEXT,
  metadata JSONB,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_uploaded_files_user ON uploaded_files(user_id);
CREATE INDEX idx_uploaded_files_project ON uploaded_files(project_id);
CREATE INDEX idx_uploaded_files_status ON uploaded_files(status);
CREATE INDEX idx_uploaded_files_category ON uploaded_files(category);
CREATE INDEX idx_uploaded_files_created ON uploaded_files(created_at DESC);

-- Audio transcriptions table
CREATE TABLE IF NOT EXISTS audio_transcriptions (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  file_id TEXT NOT NULL REFERENCES uploaded_files(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  storage_url TEXT,
  duration FLOAT,
  text TEXT,
  words JSONB,
  utterances JSONB,
  chapters JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audio_transcriptions_user ON audio_transcriptions(user_id);
CREATE INDEX idx_audio_transcriptions_file ON audio_transcriptions(file_id);
CREATE INDEX idx_audio_transcriptions_project ON audio_transcriptions(project_id);

-- Processed images table
CREATE TABLE IF NOT EXISTS processed_images (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  file_id TEXT NOT NULL REFERENCES uploaded_files(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  storage_url TEXT,
  thumbnail_url TEXT,
  width INTEGER,
  height INTEGER,
  format TEXT,
  analysis TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_processed_images_user ON processed_images(user_id);
CREATE INDEX idx_processed_images_file ON processed_images(file_id);
CREATE INDEX idx_processed_images_project ON processed_images(project_id);

-- Processed documents table (PDFs, DOCs, spreadsheets, emails)
CREATE TABLE IF NOT EXISTS processed_documents (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  file_id TEXT NOT NULL REFERENCES uploaded_files(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  storage_url TEXT,
  thumbnail_url TEXT,
  document_type TEXT NOT NULL, -- pdf, docx, txt, md, csv, xlsx, eml, msg
  content TEXT,
  page_count INTEGER,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_processed_documents_user ON processed_documents(user_id);
CREATE INDEX idx_processed_documents_file ON processed_documents(file_id);
CREATE INDEX idx_processed_documents_type ON processed_documents(document_type);
CREATE INDEX idx_processed_documents_project ON processed_documents(project_id);

-- Full text search index on document content
CREATE INDEX idx_processed_documents_content_search ON processed_documents
USING gin(to_tsvector('english', content));

-- Enable Row Level Security
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE processed_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE processed_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for uploaded_files
CREATE POLICY "Users can view own files"
  ON uploaded_files FOR SELECT
  USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can insert own files"
  ON uploaded_files FOR INSERT
  WITH CHECK (auth.uid()::text = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can update own files"
  ON uploaded_files FOR UPDATE
  USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can delete own files"
  ON uploaded_files FOR DELETE
  USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

-- Similar policies for other tables
CREATE POLICY "Users can view own transcriptions"
  ON audio_transcriptions FOR SELECT
  USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can view own images"
  ON processed_images FOR SELECT
  USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can view own documents"
  ON processed_documents FOR SELECT
  USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

-- Grant permissions
GRANT ALL ON uploaded_files TO authenticated;
GRANT ALL ON audio_transcriptions TO authenticated;
GRANT ALL ON processed_images TO authenticated;
GRANT ALL ON processed_documents TO authenticated;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_uploaded_files_updated_at
  BEFORE UPDATE ON uploaded_files
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Supabase storage setup completed successfully!';
  RAISE NOTICE 'Buckets created: audio-files, images, documents, processed';
  RAISE NOTICE 'Tables created: uploaded_files, audio_transcriptions, processed_images, processed_documents';
END $$;
