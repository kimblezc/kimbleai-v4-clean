import { NextRequest, NextResponse } from 'next/server';

/**
 * Notion Integration API
 *
 * Provides access to:
 * - Workspace pages
 * - Databases and their entries
 * - Page creation and updates
 * - Search functionality
 */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'status';

    const notionToken = process.env.NOTION_API_KEY;

    if (!notionToken) {
      return NextResponse.json({
        connected: false,
        error: 'Notion API key not configured'
      }, { status: 503 });
    }

    const headers = {
      'Authorization': `Bearer ${notionToken}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json'
    };

    switch (action) {
      case 'status':
        // Check Notion API connectivity by searching
        const statusRes = await fetch('https://api.notion.com/v1/search', {
          method: 'POST',
          headers,
          body: JSON.stringify({ page_size: 1 })
        });

        if (!statusRes.ok) {
          return NextResponse.json({
            connected: false,
            error: 'Notion API authentication failed'
          }, { status: 401 });
        }

        return NextResponse.json({
          connected: true,
          workspace: 'Connected to Notion'
        });

      case 'databases':
        // List all databases
        const dbRes = await fetch('https://api.notion.com/v1/search', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            filter: { property: 'object', value: 'database' },
            page_size: 20
          })
        });

        if (!dbRes.ok) {
          throw new Error('Failed to fetch databases');
        }

        const dbData = await dbRes.json();
        return NextResponse.json({
          success: true,
          databases: dbData.results.map((db: any) => ({
            id: db.id,
            title: db.title?.[0]?.plain_text || 'Untitled',
            url: db.url,
            created_time: db.created_time,
            last_edited_time: db.last_edited_time
          }))
        });

      case 'pages':
        const databaseId = searchParams.get('database_id');

        if (!databaseId) {
          return NextResponse.json({
            error: 'Missing database_id parameter'
          }, { status: 400 });
        }

        const pagesRes = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ page_size: 50 })
        });

        if (!pagesRes.ok) {
          throw new Error('Failed to fetch pages');
        }

        const pagesData = await pagesRes.json();
        return NextResponse.json({
          success: true,
          pages: pagesData.results.map((page: any) => ({
            id: page.id,
            properties: page.properties,
            url: page.url,
            created_time: page.created_time,
            last_edited_time: page.last_edited_time
          }))
        });

      case 'search':
        const query = searchParams.get('query');

        if (!query) {
          return NextResponse.json({
            error: 'Missing query parameter'
          }, { status: 400 });
        }

        const searchRes = await fetch('https://api.notion.com/v1/search', {
          method: 'POST',
          headers,
          body: JSON.stringify({ query, page_size: 20 })
        });

        if (!searchRes.ok) {
          throw new Error('Failed to search Notion');
        }

        const searchData = await searchRes.json();
        return NextResponse.json({
          success: true,
          results: searchData.results.map((item: any) => ({
            id: item.id,
            object: item.object,
            title: item.object === 'page'
              ? item.properties?.title?.title?.[0]?.plain_text || 'Untitled'
              : item.title?.[0]?.plain_text || 'Untitled',
            url: item.url
          }))
        });

      default:
        return NextResponse.json({
          error: 'Invalid action'
        }, { status: 400 });
    }
  } catch (error: any) {
    console.error('[Notion API] Error:', error);
    return NextResponse.json({
      error: 'Failed to process Notion request',
      details: error.message
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    const notionToken = process.env.NOTION_API_KEY;

    if (!notionToken) {
      return NextResponse.json({
        error: 'Notion API key not configured'
      }, { status: 503 });
    }

    const headers = {
      'Authorization': `Bearer ${notionToken}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json'
    };

    switch (action) {
      case 'create_page':
        const { parent_id, title, content } = body;

        if (!parent_id || !title) {
          return NextResponse.json({
            error: 'Missing required fields'
          }, { status: 400 });
        }

        const createRes = await fetch('https://api.notion.com/v1/pages', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            parent: { page_id: parent_id },
            properties: {
              title: {
                title: [{ text: { content: title } }]
              }
            },
            children: content ? [{
              object: 'block',
              type: 'paragraph',
              paragraph: {
                rich_text: [{ text: { content } }]
              }
            }] : []
          })
        });

        if (!createRes.ok) {
          throw new Error('Failed to create page');
        }

        const newPage = await createRes.json();
        return NextResponse.json({
          success: true,
          page: {
            id: newPage.id,
            url: newPage.url
          }
        });

      case 'add_to_database':
        const { database_id, properties } = body;

        if (!database_id || !properties) {
          return NextResponse.json({
            error: 'Missing required fields'
          }, { status: 400 });
        }

        const addRes = await fetch('https://api.notion.com/v1/pages', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            parent: { database_id },
            properties
          })
        });

        if (!addRes.ok) {
          throw new Error('Failed to add to database');
        }

        const newEntry = await addRes.json();
        return NextResponse.json({
          success: true,
          entry: {
            id: newEntry.id,
            url: newEntry.url
          }
        });

      default:
        return NextResponse.json({
          error: 'Invalid action'
        }, { status: 400 });
    }
  } catch (error: any) {
    console.error('[Notion API] Error:', error);
    return NextResponse.json({
      error: 'Failed to process Notion request',
      details: error.message
    }, { status: 500 });
  }
}
