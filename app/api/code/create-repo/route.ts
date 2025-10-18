import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { createClient } from '@supabase/supabase-js';

// Lazy initialization to avoid build-time errors
let supabase: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!supabase && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
  }
  return supabase;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { name, private: isPrivate = false, description = '' } = await req.json();

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Repository name is required' },
        { status: 400 }
      );
    }

    // Get Supabase client
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) {
      return NextResponse.json(
        { success: false, error: 'Database configuration error' },
        { status: 500 }
      );
    }

    // Get GitHub access token from database
    const { data: account, error: accountError } = await supabaseClient
      .from('accounts')
      .select('access_token')
      .eq('user_email', session.user.email)
      .eq('provider', 'github')
      .single();

    if (accountError || !account?.access_token) {
      return NextResponse.json(
        { success: false, error: 'GitHub account not connected' },
        { status: 400 }
      );
    }

    // Create repository on GitHub
    const githubResponse = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${account.access_token}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        name,
        private: isPrivate,
        description,
        auto_init: true, // Initialize with README
      }),
    });

    if (!githubResponse.ok) {
      const error = await githubResponse.json();
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to create repository' },
        { status: githubResponse.status }
      );
    }

    const repo = await githubResponse.json();

    return NextResponse.json({
      success: true,
      repo: {
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        private: repo.private,
        default_branch: repo.default_branch,
        html_url: repo.html_url,
      },
    });
  } catch (error) {
    console.error('Create repository error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
