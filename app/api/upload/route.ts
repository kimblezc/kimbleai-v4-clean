import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { KnowledgeExtractor } from '@/lib/knowledge-extractor';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string || 'zach';
    const category = formData.get('category') as string || 'document';
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    // Read file content
    const content = await file.text();
    
    // Get user
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('name', userId === 'rebecca' ? 'Rebecca' : 'Zach')
      .single();
    
    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Index the file
    await KnowledgeExtractor.indexFile(
      file.name,
      content,
      userData.id,
      {
        originalName: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
        category: category
      }
    );
    
    // Log to Zapier
    if (process.env.ZAPIER_WEBHOOK_URL) {
      fetch(process.env.ZAPIER_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'FILE_INDEXED',
          filename: file.name,
          fileSize: file.size,
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
      chunks: Math.ceil(content.length / 1000)
    });
    
  } catch (error: any) {
    console.error('File upload error:', error);
    return NextResponse.json({
      error: 'Failed to index file',
      details: error.message
    }, { status: 500 });
  }
}

// GET endpoint to list indexed files
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