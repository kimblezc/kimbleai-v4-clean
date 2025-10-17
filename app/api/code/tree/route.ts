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

    const { repo, branch = 'main' } = await request.json();

    if (!repo) {
      return NextResponse.json({ success: false, error: 'Repository name required' }, { status: 400 });
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

    // Get repository tree
    const { data: treeData } = await octokit.rest.git.getTree({
      owner,
      repo: repoName,
      tree_sha: branch,
      recursive: '1',
    });

    // Build file tree structure
    const buildTree = (items: any[]) => {
      const root: any[] = [];
      const map: Record<string, any> = {};

      // Sort by path
      items.sort((a, b) => a.path.localeCompare(b.path));

      items.forEach((item) => {
        const parts = item.path.split('/');
        const fileName = parts[parts.length - 1];

        const node = {
          name: fileName,
          path: item.path,
          type: item.type === 'tree' ? 'directory' : 'file',
          children: item.type === 'tree' ? [] : undefined,
        };

        map[item.path] = node;

        if (parts.length === 1) {
          root.push(node);
        } else {
          const parentPath = parts.slice(0, -1).join('/');
          const parent = map[parentPath];
          if (parent && parent.children) {
            parent.children.push(node);
          }
        }
      });

      return root;
    };

    const tree = buildTree(treeData.tree);

    return NextResponse.json({
      success: true,
      tree,
    });
  } catch (error: any) {
    console.error('Error fetching file tree:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch file tree' },
      { status: 500 }
    );
  }
}
