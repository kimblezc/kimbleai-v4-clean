import { NextRequest, NextResponse } from 'next/server';

/**
 * GitHub Integration API
 *
 * Provides access to:
 * - Repository information
 * - Issues and pull requests
 * - Commits and branches
 * - User profile
 */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'status';

    const githubToken = process.env.GITHUB_TOKEN;

    if (!githubToken) {
      return NextResponse.json({
        connected: false,
        error: 'GitHub token not configured'
      }, { status: 503 });
    }

    switch (action) {
      case 'status':
        // Check GitHub API connectivity
        const statusRes = await fetch('https://api.github.com/user', {
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });

        if (!statusRes.ok) {
          return NextResponse.json({
            connected: false,
            error: 'GitHub API authentication failed'
          }, { status: 401 });
        }

        const user = await statusRes.json();
        return NextResponse.json({
          connected: true,
          username: user.login,
          name: user.name,
          avatar: user.avatar_url,
          repos: user.public_repos,
          profile: user.html_url
        });

      case 'repos':
        // List user repositories
        const reposRes = await fetch('https://api.github.com/user/repos?sort=updated&per_page=10', {
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });

        if (!reposRes.ok) {
          throw new Error('Failed to fetch repositories');
        }

        const repos = await reposRes.json();
        return NextResponse.json({
          success: true,
          repos: repos.map((repo: any) => ({
            name: repo.name,
            full_name: repo.full_name,
            description: repo.description,
            url: repo.html_url,
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            updated_at: repo.updated_at,
            language: repo.language,
            private: repo.private
          }))
        });

      case 'issues':
        const owner = searchParams.get('owner');
        const repo = searchParams.get('repo');

        if (!owner || !repo) {
          return NextResponse.json({
            error: 'Missing owner or repo parameter'
          }, { status: 400 });
        }

        const issuesRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=20`,
          {
            headers: {
              'Authorization': `Bearer ${githubToken}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        );

        if (!issuesRes.ok) {
          throw new Error('Failed to fetch issues');
        }

        const issues = await issuesRes.json();
        return NextResponse.json({
          success: true,
          issues: issues.map((issue: any) => ({
            number: issue.number,
            title: issue.title,
            state: issue.state,
            url: issue.html_url,
            created_at: issue.created_at,
            updated_at: issue.updated_at,
            user: issue.user.login,
            labels: issue.labels.map((label: any) => label.name)
          }))
        });

      default:
        return NextResponse.json({
          error: 'Invalid action'
        }, { status: 400 });
    }
  } catch (error: any) {
    console.error('[GitHub API] Error:', error);
    return NextResponse.json({
      error: 'Failed to process GitHub request',
      details: error.message
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    const githubToken = process.env.GITHUB_TOKEN;

    if (!githubToken) {
      return NextResponse.json({
        error: 'GitHub token not configured'
      }, { status: 503 });
    }

    switch (action) {
      case 'create_issue':
        const { owner, repo, title, body: issueBody, labels } = body;

        if (!owner || !repo || !title) {
          return NextResponse.json({
            error: 'Missing required fields'
          }, { status: 400 });
        }

        const createRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/issues`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${githubToken}`,
              'Accept': 'application/vnd.github.v3+json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              title,
              body: issueBody,
              labels
            })
          }
        );

        if (!createRes.ok) {
          throw new Error('Failed to create issue');
        }

        const newIssue = await createRes.json();
        return NextResponse.json({
          success: true,
          issue: {
            number: newIssue.number,
            url: newIssue.html_url
          }
        });

      default:
        return NextResponse.json({
          error: 'Invalid action'
        }, { status: 400 });
    }
  } catch (error: any) {
    console.error('[GitHub API] Error:', error);
    return NextResponse.json({
      error: 'Failed to process GitHub request',
      details: error.message
    }, { status: 500 });
  }
}
