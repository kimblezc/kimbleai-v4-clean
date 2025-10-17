import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Octokit } from '@octokit/rest';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session || !session.user?.email) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    // Get user's GitHub token from database
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
        { success: false, error: 'GitHub token not found. Please reconnect GitHub.' },
        { status: 404 }
      );
    }

    // Initialize Octokit with user's token
    const octokit = new Octokit({
      auth: tokenData.access_token,
    });

    // Get user's repositories
    const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 100,
      affiliation: 'owner,collaborator',
    });

    return NextResponse.json({
      success: true,
      repos: repos.map((repo) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        private: repo.private,
        default_branch: repo.default_branch,
        description: repo.description,
        updated_at: repo.updated_at,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching repositories:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch repositories' },
      { status: 500 }
    );
  }
}
