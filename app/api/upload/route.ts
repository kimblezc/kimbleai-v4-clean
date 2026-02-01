import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Configuration for large file uploads
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max execution time
export const maxRequestBodySize = '5gb'; // Allow up to 5GB files

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text.substring(0, 8000),
        dimensions: 1536
      })
    });
    
    if (!response.ok) return null;
    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Embedding error:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string || 'zach';
    const category = formData.get('category') as string || 'document';
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    let content = '';
    
    // Handle PDF files - RE-ENABLED with pdf-parse
    if (file.type === 'application/pdf') {
      try {
        const pdfParse = require('pdf-parse');
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const pdfData = await pdfParse(buffer);
        content = pdfData.text;

        if (!content || content.trim().length === 0) {
          return NextResponse.json({
            error: 'PDF appears to be empty or image-based',
            details: 'No text content could be extracted. PDF may contain only images.'
          }, { status: 400 });
        }

        console.log(`[PDF Upload] Extracted ${content.length} characters from ${pdfData.numpages} pages`);
      } catch (pdfError: any) {
        console.error('PDF parsing error:', pdfError);
        return NextResponse.json({
          error: 'Failed to parse PDF',
          details: pdfError.message
        }, { status: 400 });
      }
    } else {
      // Handle text-based files (TXT, MD, CSV, etc.)
      try {
        content = await file.text();
      } catch (textError) {
        console.error('Error reading file:', textError);
        return NextResponse.json({
          error: 'Failed to read file',
          details: 'File might be corrupted or in an unsupported format'
        }, { status: 400 });
      }
    }
    
    // Validate content was extracted
    if (!content || content.length === 0) {
      return NextResponse.json({ 
        error: 'No content extracted from file',
        details: 'File appears to be empty or unreadable'
      }, { status: 400 });
    }
    
    // Get user
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('name', userId === 'rebecca' ? 'Rebecca' : 'Zach')
      .single();
    
    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Store file info
    const { data: fileRecord } = await supabase
      .from('indexed_files')
      .insert({
        user_id: userData.id,
        filename: file.name,
        file_type: file.type,
        file_size: file.size,
        full_text: content,
        chunks: { chunks: [content] },
        metadata: {
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
          category: category,
          contentLength: content.length
        }
      })
      .select()
      .single();
    
    // Index file content in knowledge base
    const embedding = await generateEmbedding(content);
    await supabase.from('knowledge_base').insert({
      user_id: userData.id,
      source_type: 'file',
      source_id: fileRecord?.id,
      category: 'document',
      title: file.name,
      content: content.substring(0, 2000), // Store first 2000 chars
      embedding: embedding,
      importance: 0.7,
      tags: ['file', category, 'text'],
      metadata: {
        filename: file.name,
        fileSize: file.size,
        fileType: file.type,
        contentLength: content.length,
        uploadDate: new Date().toISOString()
      }
    });
    
    // Log to Zapier
    if (process.env.ZAPIER_WEBHOOK_URL) {
      fetch(process.env.ZAPIER_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'FILE_INDEXED',
          filename: file.name,
          fileSize: file.size,
          fileType: file.type,
          contentLength: content.length,
          userId: userId,
          timestamp: new Date().toISOString()
        })
      }).catch(console.error);
    }
    
    return NextResponse.json({
      success: true,
      message: `File ${file.name} indexed successfully`,
      filename: file.name,
      size: file.size,
      type: file.type,
      contentExtracted: content.length,
      preview: content.substring(0, 200) + '...'
    });
    
  } catch (error: any) {
    console.error('File upload error:', error);
    return NextResponse.json({
      error: 'Failed to index file',
      details: error.message
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'zach';
    
    // Get user
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('name', userId === 'rebecca' ? 'Rebecca' : 'Zach')
      .single();
    
    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Get indexed files
    const { data: files } = await supabase
      .from('indexed_files')
      .select('id, filename, file_type, file_size, indexed_at')
      .eq('user_id', userData.id)
      .order('indexed_at', { ascending: false });
    
    return NextResponse.json({
      files: files || [],
      count: files?.length || 0,
      userId: userId
    });
    
  } catch (error: any) {
    console.error('List files error:', error);
    return NextResponse.json({
      error: 'Failed to list files',
      details: error.message
    }, { status: 500 });
  }
}