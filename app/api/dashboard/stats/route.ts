import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // TODO: Add authentication check
    const userId = 'zach'; // Hardcoded for now

    // Get total projects
    const { count: projectCount } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .or(`owner_id.eq.${userId},collaborators.cs.{${userId}}`);

    // Get total conversations
    const { count: conversationCount } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get total files
    const { count: fileCount } = await supabase
      .from('uploaded_files')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Calculate storage used
    const { data: files } = await supabase
      .from('uploaded_files')
      .select('file_size')
      .eq('user_id', userId);

    const storageUsed = files?.reduce((total, file) => total + (file.file_size || 0), 0) || 0;

    // Get API costs (mock data for now - integrate with actual cost tracking later)
    const apiCostsToday = 2.45;
    const apiCostsMonth = 47.89;

    return NextResponse.json({
      totalProjects: projectCount || 0,
      totalConversations: conversationCount || 0,
      totalFiles: fileCount || 0,
      storageUsed,
      storageLimit: 10 * 1024 * 1024 * 1024, // 10 GB
      apiCostsToday,
      apiCostsMonth,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
