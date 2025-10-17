import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Octokit } from '@octokit/rest';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session || !session.user?.email) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { repo, path } = await request.json();

    if (!repo || !path) {
      return NextResponse.json(
        { success: false, error: 'Repository and path required' },
        { status: 400 }
      );
    }

    // Get user's GitHub token
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (!userData) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const { data: tokenData } = await supabase
      .from('user_tokens')
      .select('access_token')
      .eq('user_id', userData.id)
      .eq('provider', 'github')
      .single();

    if (!tokenData?.access_token) {
      return NextResponse.json(
        { success: false, error: 'GitHub token not found' },
        { status: 404 }
      );
    }

    const octokit = new Octokit({
      auth: tokenData.access_token,
    });

    const [owner, repoName] = repo.split('/');

    // Get file content
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo: repoName,
      path,
    });

    if (Array.isArray(data) || data.type !== 'file') {
      return NextResponse.json(
        { success: false, error: 'Path is not a file' },
        { status: 400 }
      );
    }

    // Decode base64 content
    const content = Buffer.from(data.content, 'base64').toString('utf-8');

    return NextResponse.json({
      success: true,
      content,
      sha: data.sha,
    });
  } catch (error: any) {
    console.error('Error fetching file:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch file' },
      { status: 500 }
    );
  }
}
