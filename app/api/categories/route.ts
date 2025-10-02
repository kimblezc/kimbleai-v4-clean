// app/api/categories/route.ts
// Category management API for content organization

import { NextRequest, NextResponse } from 'next/server';
import { ContentCategorizer } from '@/lib/content-categorizer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');
    const categoryId = searchParams.get('categoryId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    // Get all categories
    if (!action || action === 'list') {
      const categories = await ContentCategorizer.getCategories(userId);
      return NextResponse.json({
        success: true,
        categories
      });
    }

    // Get category statistics
    if (action === 'stats') {
      const stats = await ContentCategorizer.getCategoryStats(userId);
      return NextResponse.json({
        success: true,
        stats
      });
    }

    // Get content by category
    if (action === 'content' && categoryId) {
      const contentType = searchParams.get('contentType') as any || 'all';
      const limit = parseInt(searchParams.get('limit') || '50');
      const offset = parseInt(searchParams.get('offset') || '0');

      const content = await ContentCategorizer.getCategoryContent(
        categoryId,
        userId,
        contentType,
        limit,
        offset
      );

      return NextResponse.json({
        success: true,
        content,
        count: content.length
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('[Categories API] GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    // Create new category
    if (action === 'create') {
      const { name, description, icon, color, keywords, parentCategoryId, metadata } = body;

      if (!name) {
        return NextResponse.json(
          { error: 'Category name required' },
          { status: 400 }
        );
      }

      const category = await ContentCategorizer.createCategory(
        name,
        description,
        userId,
        { icon, color, keywords, parentCategoryId, metadata }
      );

      if (!category) {
        return NextResponse.json(
          { error: 'Failed to create category' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        category
      });
    }

    // Update category
    if (action === 'update') {
      const { categoryId, updates } = body;

      if (!categoryId) {
        return NextResponse.json(
          { error: 'Category ID required' },
          { status: 400 }
        );
      }

      const success = await ContentCategorizer.updateCategory(
        categoryId,
        userId,
        updates
      );

      if (!success) {
        return NextResponse.json(
          { error: 'Failed to update category' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Category updated successfully'
      });
    }

    // Delete category
    if (action === 'delete') {
      const { categoryId } = body;

      if (!categoryId) {
        return NextResponse.json(
          { error: 'Category ID required' },
          { status: 400 }
        );
      }

      const success = await ContentCategorizer.deleteCategory(categoryId, userId);

      if (!success) {
        return NextResponse.json(
          { error: 'Failed to delete category' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Category deleted successfully'
      });
    }

    // Auto-categorize content
    if (action === 'categorize') {
      const { text, manualCategoryId } = body;

      if (!text) {
        return NextResponse.json(
          { error: 'Text required for categorization' },
          { status: 400 }
        );
      }

      const result = await ContentCategorizer.categorizeContent(
        text,
        userId,
        manualCategoryId
      );

      return NextResponse.json({
        success: true,
        result
      });
    }

    // Categorize transcription
    if (action === 'categorize_transcription') {
      const { transcriptionId, text, manualCategoryId } = body;

      if (!transcriptionId || !text) {
        return NextResponse.json(
          { error: 'Transcription ID and text required' },
          { status: 400 }
        );
      }

      const result = await ContentCategorizer.categorizeTranscription(
        transcriptionId,
        text,
        userId,
        manualCategoryId
      );

      return NextResponse.json({
        success: true,
        result
      });
    }

    // Categorize project
    if (action === 'categorize_project') {
      const { projectId, projectName, projectDescription, manualCategoryId } = body;

      if (!projectId || !projectName) {
        return NextResponse.json(
          { error: 'Project ID and name required' },
          { status: 400 }
        );
      }

      const result = await ContentCategorizer.categorizeProject(
        projectId,
        projectName,
        projectDescription || '',
        userId,
        manualCategoryId
      );

      return NextResponse.json({
        success: true,
        result
      });
    }

    // Bulk re-categorize
    if (action === 'bulk_recategorize') {
      const { contentType, limit } = body;

      const results = await ContentCategorizer.bulkRecategorize(
        userId,
        contentType || 'audio',
        limit || 100
      );

      return NextResponse.json({
        success: true,
        results
      });
    }

    // Search within category
    if (action === 'search') {
      const { categoryId, query, limit, threshold } = body;

      if (!categoryId || !query) {
        return NextResponse.json(
          { error: 'Category ID and query required' },
          { status: 400 }
        );
      }

      // Generate embedding for query (you'll need to implement this)
      // For now, return error suggesting to use the knowledge base search instead
      return NextResponse.json({
        success: false,
        error: 'Search functionality requires embedding generation. Use /api/knowledge/search with category filter instead.'
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('[Categories API] POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
