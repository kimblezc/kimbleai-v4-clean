# 🎙️ Audio M4A Upload + Whisper Transcription Implementation Guide

## 📋 **FEATURE OVERVIEW**

**Goal**: Allow users to upload M4A audio files, automatically transcribe them using OpenAI Whisper, and integrate transcriptions into the appropriate project/conversation context.

## 🔧 **IMPLEMENTATION STEPS**

### **Step 1: Update FileUpload Component**
```typescript
// components/FileUpload.tsx - Add M4A support

const ACCEPTED_AUDIO_TYPES = {
  'audio/m4a': ['.m4a'],
  'audio/mp4': ['.m4a', '.mp4'],
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav']
};

interface AudioUploadProps {
  file: File;
  projectId: string;
  userId: string;
  onTranscriptionComplete: (transcription: string) => void;
}

// Add audio file validation
const isAudioFile = (file: File) => {
  return file.type.startsWith('audio/') ||
         file.name.toLowerCase().endsWith('.m4a');
};
```

### **Step 2: Create Audio Processing API**
```typescript
// app/api/audio/transcribe/route.ts

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import formidable from 'formidable';
import fs from 'fs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

export async function POST(request: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const projectId = formData.get('projectId') as string;
    const userId = formData.get('userId') as string;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Convert File to buffer for Whisper API
    const bytes = await audioFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save temporarily for Whisper API
    const tempPath = `/tmp/${Date.now()}-${audioFile.name}`;
    fs.writeFileSync(tempPath, buffer);

    // Transcribe using Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempPath),
      model: 'whisper-1',
      language: 'en', // Auto-detect or specify
      response_format: 'verbose_json',
      timestamp_granularities: ['word']
    });

    // Clean up temp file
    fs.unlinkSync(tempPath);

    // Save transcription to database
    const { data: transcriptionRecord } = await supabase
      .from('audio_transcriptions')
      .insert({
        user_id: userId,
        project_id: projectId,
        file_name: audioFile.name,
        file_size: audioFile.size,
        transcription_text: transcription.text,
        transcription_data: transcription,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    // Index transcription for RAG
    const embedding = await generateEmbedding(transcription.text);
    await supabase.from('knowledge_base').insert({
      user_id: userId,
      source_type: 'audio_transcription',
      category: 'transcription',
      title: `Audio: ${audioFile.name}`,
      content: transcription.text,
      embedding: embedding,
      importance: 0.8,
      tags: ['audio', 'transcription'],
      metadata: {
        transcription_id: transcriptionRecord.id,
        project_id: projectId,
        file_name: audioFile.name
      }
    });

    return NextResponse.json({
      success: true,
      transcriptionId: transcriptionRecord.id,
      text: transcription.text,
      duration: transcription.duration,
      indexed: true
    });

  } catch (error: any) {
    console.error('Audio transcription error:', error);
    return NextResponse.json({
      error: 'Transcription failed',
      details: error.message
    }, { status: 500 });
  }
}
```

### **Step 3: Add Database Schema**
```sql
-- Add to Supabase database

CREATE TABLE audio_transcriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  project_id TEXT,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  transcription_text TEXT NOT NULL,
  transcription_data JSONB, -- Full Whisper response
  processing_status TEXT DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE audio_transcriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own audio transcriptions" ON audio_transcriptions
FOR ALL USING (auth.uid() = user_id);
```

### **Step 4: Update Frontend Components**
```typescript
// components/AudioUpload.tsx

import React, { useState } from 'react';

interface AudioUploadProps {
  projectId: string;
  userId: string;
  onTranscriptionComplete: (result: TranscriptionResult) => void;
}

interface TranscriptionResult {
  id: string;
  text: string;
  fileName: string;
  duration: number;
}

export default function AudioUpload({ projectId, userId, onTranscriptionComplete }: AudioUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleAudioUpload = async (file: File) => {
    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('audio', file);
      formData.append('projectId', projectId);
      formData.append('userId', userId);

      const response = await fetch('/api/audio/transcribe', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        onTranscriptionComplete({
          id: result.transcriptionId,
          text: result.text,
          fileName: file.name,
          duration: result.duration
        });
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      console.error('Upload failed:', error);
      alert('Audio transcription failed');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="audio-upload">
      <input
        type="file"
        accept=".m4a,.mp4,.mp3,.wav,audio/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleAudioUpload(file);
        }}
        disabled={uploading}
      />

      {uploading && (
        <div className="upload-progress">
          <div>Transcribing audio...</div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
```

### **Step 5: Integration with Chat System**
```typescript
// Update chat interface to show transcriptions
// app/page.tsx - Add transcription display

const TranscriptionDisplay = ({ transcription }: { transcription: TranscriptionResult }) => (
  <div className="transcription-message">
    <div className="transcription-header">
      🎙️ Audio Transcription: {transcription.fileName}
    </div>
    <div className="transcription-text">
      {transcription.text}
    </div>
    <div className="transcription-meta">
      Duration: {Math.round(transcription.duration)}s
    </div>
  </div>
);
```

## 💰 **COST CONSIDERATIONS**

### **OpenAI Whisper Pricing (as of 2024):**
- **$0.006 per minute** of audio
- M4A files typically 1-30 minutes
- Cost per file: $0.006 - $0.18

### **Storage Costs:**
- Audio files stored temporarily (deleted after transcription)
- Transcription text stored in Supabase (minimal cost)
- Vector embeddings for RAG search

## 🔄 **WORKFLOW EXAMPLE**

1. **User uploads M4A file** → AudioUpload component
2. **File sent to /api/audio/transcribe** → Whisper API call
3. **Transcription returned** → Saved to database
4. **Auto-indexed for RAG** → Available in future conversations
5. **Associated with project** → Organized by project/tag system
6. **Displayed in chat** → User sees transcription immediately

## 🧪 **TESTING STRATEGY**

### **Test Cases:**
1. **Small M4A file** (< 1 minute) - Quick transcription
2. **Large M4A file** (10+ minutes) - Progress tracking
3. **Multiple file uploads** - Concurrent processing
4. **Project association** - Correct project tagging
5. **RAG integration** - Transcription appears in future chats

### **Error Handling:**
- File too large (> 25MB Whisper limit)
- Unsupported audio format
- Network failures
- API rate limits

---

*Implementation Guide Created: 2025-09-23*
*Priority: Medium (implement after production issues resolved)*
*Estimated Development Time: 4-6 hours*