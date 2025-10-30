import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  normalizeTag,
  validateTag,
  categorizeTag,
  getTagColor,
  TAG_CATEGORIES
} from '@/lib/tag-utils';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/tags
 * List all tags for a user with optional filtering
 *
 * Query params:
 * - userId: User name (default: 'zach')
 * - category: Filter by category (optional)
 * - search: Search tag names (optional)
 * - sortBy: Sort field (usage_count, name, created_at)
 * - order: Sort order (asc, desc)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'zach';
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'usage_count';
    const order = searchParams.get('order') || 'desc';

    // Get user data
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('name', userId === 'rebecca' ? 'Rebecca' : 'Zach')
      .single();

    if (!userData) {
      return NextResponse.json({
        error: 'User not found'
      }, { status: 404 });
    }

    // Build query
    let query = supabase
      .from('tags')
      .select('*')
      .eq('user_id', userData.id);

    // Apply filters
    if (category) {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    // Apply sorting
    const ascending = order === 'asc';
    query = query.order(sortBy, { ascending });

    const { data: tags, error } = await query;

    if (error) {
      console.error('[TAGS] Error fetching tags:', error);
      return NextResponse.json({
        error: 'Failed to fetch tags',
        details: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      tags: tags || [],
      count: tags?.length || 0
    });

  } catch (error: any) {
    console.error('[TAGS] Error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * POST /api/tags
 * Create a new tag or update existing tag
 *
 * Body:
 * - name: Tag name (required, will be normalized)
 * - displayName: Display name (optional)
 * - category: Tag category (optional, auto-detected if not provided)
 * - color: Hex color code (optional, auto-assigned if not provided)
 * - description: Tag description (optional)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, displayName, category, color, description, userId = 'zach' } = body;

    if (!name) {
      return NextResponse.json({
        error: 'Tag name is required'
      }, { status: 400 });
    }

    // Get user data
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('name', userId === 'rebecca' ? 'Rebecca' : 'Zach')
      .single();

    if (!userData) {
      return NextResponse.json({
        error: 'User not found'
      }, { status: 404 });
    }

    // Validate and normalize tag name
    const validation = validateTag(name);
    if (!validation.isValid) {
      return NextResponse.json({
        error: 'Invalid tag name',
        details: validation.error
      }, { status: 400 });
    }

    const normalizedName = validation.normalized;

    // Auto-detect category and color if not provided
    const tagCategory = category || categorizeTag(normalizedName);
    const tagColor = color || getTagColor(normalizedName);

    // Insert or update tag
    const { data: tag, error } = await supabase
      .from('tags')
      .upsert({
        user_id: userData.id,
        name: normalizedName,
        display_name: displayName || name,
        category: tagCategory,
        color: tagColor,
        description: description || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,name',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      console.error('[TAGS] Error creating tag:', error);
      return NextResponse.json({
        error: 'Failed to create tag',
        details: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      tag,
      message: 'Tag created successfully'
    }, { status: 201 });

  } catch (error: any) {
    console.error('[TAGS] Error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * PUT /api/tags
 * Update an existing tag
 *
 * Body:
 * - id: Tag ID (required)
 * - name: New tag name (optional)
 * - displayName: Display name (optional)
 * - category: Tag category (optional)
 * - color: Hex color code (optional)
 * - description: Tag description (optional)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, displayName, category, color, description, userId = 'zach' } = body;

    if (!id) {
      return NextResponse.json({
        error: 'Tag ID is required'
      }, { status: 400 });
    }

    // Get user data
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('name', userId === 'rebecca' ? 'Rebecca' : 'Zach')
      .single();

    if (!userData) {
      return NextResponse.json({
        error: 'User not found'
      }, { status: 404 });
    }

    // Verify tag exists and user owns it
    const { data: existingTag, error: fetchError } = await supabase
      .from('tags')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingTag) {
      return NextResponse.json({
        error: 'Tag not found'
      }, { status: 404 });
    }

    if (existingTag.user_id !== userData.id) {
      return NextResponse.json({
        error: 'Unauthorized'
      }, { status: 403 });
    }

    // Prepare update object
    const updates: any = {
      updated_at: new Date().toISOString()
    };

    if (name !== undefined) {
      const validation = validateTag(name);
      if (!validation.isValid) {
        return NextResponse.json({
          error: 'Invalid tag name',
          details: validation.error
        }, { status: 400 });
      }
      updates.name = validation.normalized;
    }

    if (displayName !== undefined) updates.display_name = displayName;
    if (category !== undefined) updates.category = category;
    if (color !== undefined) updates.color = color;
    if (description !== undefined) updates.description = description;

    // Update tag
    const { data: tag, error } = await supabase
      .from('tags')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[TAGS] Error updating tag:', error);
      return NextResponse.json({
        error: 'Failed to update tag',
        details: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      tag,
      message: 'Tag updated successfully'
    });

  } catch (error: any) {
    console.error('[TAGS] Error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * DELETE /api/tags?id=<tag_id>
 * Delete a tag
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId') || 'zach';

    if (!id) {
      return NextResponse.json({
        error: 'Tag ID is required'
      }, { status: 400 });
    }

    // Get user data
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('name', userId === 'rebecca' ? 'Rebecca' : 'Zach')
      .single();

    if (!userData) {
      return NextResponse.json({
        error: 'User not found'
      }, { status: 404 });
    }

    // Verify tag exists and user owns it
    const { data: existingTag, error: fetchError } = await supabase
      .from('tags')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingTag) {
      return NextResponse.json({
        error: 'Tag not found'
      }, { status: 404 });
    }

    if (existingTag.user_id !== userData.id) {
      return NextResponse.json({
        error: 'Unauthorized'
      }, { status: 403 });
    }

    // Delete tag
    const { error, count } = await supabase
      .from('tags')
      .delete({ count: 'exact' })
      .eq('id', id);

    if (error) {
      console.error('[TAGS] Error deleting tag:', error);
      return NextResponse.json({
        error: 'Failed to delete tag',
        details: error.message
      }, { status: 500 });
    }

    if (count === 0) {
      return NextResponse.json({
        error: 'Tag deletion failed',
        details: 'No rows were deleted'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Tag "${existingTag.name}" deleted successfully`
    });

  } catch (error: any) {
    console.error('[TAGS] Error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}
