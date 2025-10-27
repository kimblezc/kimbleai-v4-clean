import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/auth';
import { embeddingCache } from '@/lib/embedding-cache';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: Fetch family knowledge
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const { searchParams } = new URL(request.url);

    const category = searchParams.get('category');
    const searchQuery = searchParams.get('search');
    const createdBy = searchParams.get('created_by');
    const isPinned = searchParams.get('is_pinned') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Semantic search if query provided
    if (searchQuery) {
      const embedding = await embeddingCache.getEmbedding(searchQuery);
      if (embedding) {
        const { data: results, error } = await supabase.rpc(
          'search_family_knowledge',
          {
            query_embedding: embedding,
            match_threshold: 0.7,
            match_count: limit,
            filter_user: createdBy || null,
            filter_category: category || null,
          }
        );

        if (error) {
          console.error('Semantic search error:', error);
        } else {
          return NextResponse.json({
            success: true,
            knowledge: results || [],
            count: results?.length || 0,
            searchQuery,
          });
        }
      }
    }

    // Regular query
    let query = supabase
      .from('family_knowledge')
      .select('*')
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (category) {
      query = query.eq('category', category);
    }

    if (createdBy) {
      query = query.eq('created_by', createdBy);
    }

    if (isPinned) {
      query = query.eq('is_pinned', true);
    }

    const { data: knowledge, error } = await query;

    if (error) {
      console.error('Error fetching knowledge:', error);
      return NextResponse.json(
        { error: 'Failed to fetch knowledge' },
        { status: 500 }
      );
    }

    // Get category counts
    const { data: categoryCounts } = await supabase
      .from('family_knowledge')
      .select('category')
      .eq('is_archived', false);

    const counts = categoryCounts?.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      knowledge: knowledge || [],
      count: knowledge?.length || 0,
      categoryCounts: counts || {},
    });
  } catch (error: any) {
    console.error('Knowledge API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Create new knowledge entry
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const body = await request.json();

    const {
      title,
      content,
      category,
      tags = [],
      sharedWith = ['zach', 'rebecca'],
      isPinned = false,
      priority = 'normal',
    } = body;

    if (!title || !content || !category) {
      return NextResponse.json(
        { error: 'title, content, and category are required' },
        { status: 400 }
      );
    }

    // Generate embedding for semantic search
    const embedding = await embeddingCache.getEmbedding(`${title}\n\n${content}`);

    // Create knowledge entry
    const { data: newKnowledge, error: insertError } = await supabase
      .from('family_knowledge')
      .insert({
        title,
        content,
        created_by: auth.userId,
        category,
        tags,
        shared_with: sharedWith,
        is_pinned: isPinned,
        priority,
        embedding,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating knowledge:', insertError);
      return NextResponse.json(
        { error: 'Failed to create knowledge' },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from('family_activity_feed').insert({
      user_id: auth.userId,
      activity_type: 'knowledge_created',
      title: `Created: ${title}`,
      description: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
      resource_type: 'knowledge',
      resource_id: newKnowledge.id,
      is_visible_to: sharedWith,
    });

    return NextResponse.json({
      success: true,
      knowledge: newKnowledge,
    });
  } catch (error: any) {
    console.error('Knowledge POST API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT: Update knowledge entry
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const body = await request.json();

    const {
      id,
      title,
      content,
      category,
      tags,
      sharedWith,
      isPinned,
      priority,
      isArchived,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    // Check if user has permission to edit
    const { data: existing } = await supabase
      .from('family_knowledge')
      .select('*')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: 'Knowledge not found' },
        { status: 404 }
      );
    }

    // Update fields
    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (category !== undefined) updates.category = category;
    if (tags !== undefined) updates.tags = tags;
    if (sharedWith !== undefined) updates.shared_with = sharedWith;
    if (isPinned !== undefined) updates.is_pinned = isPinned;
    if (priority !== undefined) updates.priority = priority;
    if (isArchived !== undefined) updates.is_archived = isArchived;

    // Regenerate embedding if content changed
    if (title !== undefined || content !== undefined) {
      const newTitle = title || existing.title;
      const newContent = content || existing.content;
      updates.embedding = await embeddingCache.getEmbedding(`${newTitle}\n\n${newContent}`);
    }

    const { data: updated, error: updateError } = await supabase
      .from('family_knowledge')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating knowledge:', updateError);
      return NextResponse.json(
        { error: 'Failed to update knowledge' },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from('family_activity_feed').insert({
      user_id: auth.userId,
      activity_type: 'knowledge_updated',
      title: `Updated: ${updated.title}`,
      description: 'Knowledge entry updated',
      resource_type: 'knowledge',
      resource_id: id,
      is_visible_to: updated.shared_with,
    });

    return NextResponse.json({
      success: true,
      knowledge: updated,
    });
  } catch (error: any) {
    console.error('Knowledge PUT API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: Delete knowledge entry
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    // Check if user created this entry
    const { data: existing } = await supabase
      .from('family_knowledge')
      .select('*')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: 'Knowledge not found' },
        { status: 404 }
      );
    }

    if (existing.created_by !== auth.userId) {
      return NextResponse.json(
        { error: 'You can only delete your own knowledge entries' },
        { status: 403 }
      );
    }

    // Soft delete (archive) instead of hard delete
    const { error } = await supabase
      .from('family_knowledge')
      .update({ is_archived: true })
      .eq('id', id);

    if (error) {
      console.error('Error deleting knowledge:', error);
      return NextResponse.json(
        { error: 'Failed to delete knowledge' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Knowledge DELETE API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
