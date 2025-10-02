/**
 * Content Categorization Service
 * Automatically categorizes content (transcriptions, projects, conversations)
 * into predefined categories like D&D, Military Transition, Development, etc.
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface ContentCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  keywords: string[];
  parent_category_id?: string;
  metadata: {
    subcategories?: string[];
    auto_detect?: boolean;
    priority?: number;
    is_default?: boolean;
  };
}

export interface CategorizationResult {
  category_id: string;
  category_name: string;
  confidence: number;
  matched_keywords: string[];
  auto_categorized: boolean;
}

export class ContentCategorizer {
  private static categoryCache: ContentCategory[] | null = null;
  private static cacheExpiry: number = 0;
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get all available categories
   */
  static async getCategories(userId: string): Promise<ContentCategory[]> {
    // Check cache
    if (this.categoryCache && Date.now() < this.cacheExpiry) {
      return this.categoryCache;
    }

    const { data, error } = await supabase
      .from('content_categories')
      .select('*')
      .or(`created_by.eq.${userId},created_by.eq.system`)
      .order('metadata->priority', { ascending: true });

    if (error) {
      console.error('[ContentCategorizer] Failed to fetch categories:', error);
      return [];
    }

    this.categoryCache = data as ContentCategory[];
    this.cacheExpiry = Date.now() + this.CACHE_TTL;

    return this.categoryCache || [];
  }

  /**
   * Auto-categorize content based on text analysis
   */
  static async categorizeContent(
    text: string,
    userId: string,
    manualCategoryId?: string
  ): Promise<CategorizationResult> {
    // If manual category provided, validate and return
    if (manualCategoryId) {
      const categories = await this.getCategories(userId);
      const category = categories.find(c => c.id === manualCategoryId);

      if (category) {
        return {
          category_id: category.id,
          category_name: category.name,
          confidence: 1.0,
          matched_keywords: [],
          auto_categorized: false
        };
      }
    }

    // Auto-detect category using database function
    const { data, error } = await supabase
      .rpc('auto_categorize_content', {
        p_text: text,
        p_user_id: userId
      });

    if (error) {
      console.error('[ContentCategorizer] Auto-categorization failed:', error);
      // Fall back to general category
      return this.getDefaultCategory(userId);
    }

    // Return highest confidence match
    if (data && data.length > 0) {
      // Sort by confidence descending
      const sorted = data.sort((a: any, b: any) => b.confidence - a.confidence);
      const best = sorted[0];

      return {
        category_id: best.category_id,
        category_name: best.category_name,
        confidence: best.confidence,
        matched_keywords: best.matched_keywords || [],
        auto_categorized: true
      };
    }

    // No matches, return default category
    return this.getDefaultCategory(userId);
  }

  /**
   * Get the default "General" category
   */
  static async getDefaultCategory(userId: string): Promise<CategorizationResult> {
    const categories = await this.getCategories(userId);
    const defaultCategory = categories.find(c => c.metadata?.is_default);

    if (defaultCategory) {
      return {
        category_id: defaultCategory.id,
        category_name: defaultCategory.name,
        confidence: 0,
        matched_keywords: [],
        auto_categorized: true
      };
    }

    // Fallback if no default exists
    return {
      category_id: 'category-general',
      category_name: 'General',
      confidence: 0,
      matched_keywords: [],
      auto_categorized: true
    };
  }

  /**
   * Categorize a transcription
   */
  static async categorizeTranscription(
    transcriptionId: string,
    text: string,
    userId: string,
    manualCategoryId?: string
  ): Promise<CategorizationResult> {
    const result = await this.categorizeContent(text, userId, manualCategoryId);

    // Update transcription with category
    const { error } = await supabase
      .from('audio_transcriptions')
      .update({
        category_id: result.category_id,
        auto_categorized: result.auto_categorized,
        category_confidence: result.confidence
      })
      .eq('id', transcriptionId);

    if (error) {
      console.error('[ContentCategorizer] Failed to update transcription:', error);
    }

    return result;
  }

  /**
   * Categorize a project
   */
  static async categorizeProject(
    projectId: string,
    projectName: string,
    projectDescription: string,
    userId: string,
    manualCategoryId?: string
  ): Promise<CategorizationResult> {
    const text = `${projectName} ${projectDescription || ''}`;
    const result = await this.categorizeContent(text, userId, manualCategoryId);

    // Update project with category
    const { error } = await supabase
      .from('projects')
      .update({
        category_id: result.category_id
      })
      .eq('id', projectId);

    if (error) {
      console.error('[ContentCategorizer] Failed to update project:', error);
    }

    return result;
  }

  /**
   * Categorize a conversation
   */
  static async categorizeConversation(
    conversationId: string,
    conversationTitle: string,
    messageContent: string,
    userId: string,
    manualCategoryId?: string
  ): Promise<CategorizationResult> {
    const text = `${conversationTitle} ${messageContent}`;
    const result = await this.categorizeContent(text, userId, manualCategoryId);

    // Update conversation with category
    const { error } = await supabase
      .from('conversations')
      .update({
        category_id: result.category_id
      })
      .eq('id', conversationId);

    if (error) {
      console.error('[ContentCategorizer] Failed to update conversation:', error);
    }

    return result;
  }

  /**
   * Get category statistics
   */
  static async getCategoryStats(userId: string) {
    const { data, error } = await supabase
      .from('category_stats')
      .select('*');

    if (error) {
      console.error('[ContentCategorizer] Failed to fetch stats:', error);
      return [];
    }

    return data;
  }

  /**
   * Get content by category
   */
  static async getCategoryContent(
    categoryId: string,
    userId: string,
    contentType: 'all' | 'audio' | 'projects' | 'conversations' | 'knowledge' = 'all',
    limit: number = 50,
    offset: number = 0
  ) {
    const { data, error } = await supabase
      .rpc('get_category_content', {
        p_category_id: categoryId,
        p_user_id: userId,
        p_content_type: contentType,
        p_limit: limit,
        p_offset: offset
      });

    if (error) {
      console.error('[ContentCategorizer] Failed to fetch category content:', error);
      return [];
    }

    return data;
  }

  /**
   * Create a custom category
   */
  static async createCategory(
    name: string,
    description: string,
    userId: string,
    options: {
      icon?: string;
      color?: string;
      keywords?: string[];
      parentCategoryId?: string;
      metadata?: any;
    } = {}
  ): Promise<ContentCategory | null> {
    const categoryId = `category-${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;

    const { data, error } = await supabase
      .from('content_categories')
      .insert({
        id: categoryId,
        name,
        description,
        icon: options.icon || '📁',
        color: options.color || '#6b7280',
        keywords: options.keywords || [],
        parent_category_id: options.parentCategoryId,
        metadata: options.metadata || {},
        created_by: userId
      })
      .select()
      .single();

    if (error) {
      console.error('[ContentCategorizer] Failed to create category:', error);
      return null;
    }

    // Clear cache
    this.categoryCache = null;

    return data as ContentCategory;
  }

  /**
   * Update a category
   */
  static async updateCategory(
    categoryId: string,
    userId: string,
    updates: Partial<ContentCategory>
  ): Promise<boolean> {
    const { error } = await supabase
      .from('content_categories')
      .update(updates)
      .eq('id', categoryId)
      .eq('created_by', userId);

    if (error) {
      console.error('[ContentCategorizer] Failed to update category:', error);
      return false;
    }

    // Clear cache
    this.categoryCache = null;

    return true;
  }

  /**
   * Delete a category
   */
  static async deleteCategory(categoryId: string, userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('content_categories')
      .delete()
      .eq('id', categoryId)
      .eq('created_by', userId);

    if (error) {
      console.error('[ContentCategorizer] Failed to delete category:', error);
      return false;
    }

    // Clear cache
    this.categoryCache = null;

    return true;
  }

  /**
   * Bulk re-categorize existing content
   */
  static async bulkRecategorize(
    userId: string,
    contentType: 'audio' | 'projects' | 'conversations' = 'audio',
    limit: number = 100
  ): Promise<{ success: number; failed: number; skipped: number }> {
    const results = { success: 0, failed: 0, skipped: 0 };

    try {
      if (contentType === 'audio') {
        // Get uncategorized or low-confidence transcriptions
        const { data: transcriptions, error } = await supabase
          .from('audio_transcriptions')
          .select('id, text, user_id')
          .eq('user_id', userId)
          .or('category_id.is.null,category_confidence.lt.0.3')
          .limit(limit);

        if (error || !transcriptions) {
          console.error('[ContentCategorizer] Failed to fetch transcriptions:', error);
          return results;
        }

        for (const transcription of transcriptions) {
          try {
            await this.categorizeTranscription(
              transcription.id,
              transcription.text,
              transcription.user_id
            );
            results.success++;
          } catch (err) {
            console.error(`[ContentCategorizer] Failed to categorize ${transcription.id}:`, err);
            results.failed++;
          }
        }
      }

      // Similar logic for projects and conversations...

    } catch (error) {
      console.error('[ContentCategorizer] Bulk recategorization error:', error);
    }

    return results;
  }

  /**
   * Search within a specific category using vector similarity
   */
  static async searchCategoryContent(
    queryEmbedding: number[],
    categoryId: string,
    userId: string,
    options: {
      limit?: number;
      threshold?: number;
    } = {}
  ) {
    const { data, error } = await supabase
      .rpc('search_category_content', {
        query_embedding: queryEmbedding,
        p_category_id: categoryId,
        p_user_id: userId,
        match_count: options.limit || 10,
        similarity_threshold: options.threshold || 0.3
      });

    if (error) {
      console.error('[ContentCategorizer] Category search failed:', error);
      return [];
    }

    return data;
  }

  /**
   * Get category by name
   */
  static async getCategoryByName(name: string, userId: string): Promise<ContentCategory | null> {
    const categories = await this.getCategories(userId);
    return categories.find(c => c.name.toLowerCase() === name.toLowerCase()) || null;
  }

  /**
   * Detect category from tags (for backward compatibility with auto-tagging)
   */
  static detectCategoryFromTags(tags: string[]): string | null {
    const tagString = tags.join(' ').toLowerCase();

    // D&D detection
    if (/(d&d|dnd|dungeon|dragon|rpg|campaign|character|dice|quest)/i.test(tagString)) {
      return 'category-dnd';
    }

    // Military detection
    if (/(military|veteran|transition|deployment|rank|mos)/i.test(tagString)) {
      return 'category-military';
    }

    // Development detection
    if (/(code|api|development|programming|technical|software)/i.test(tagString)) {
      return 'category-development';
    }

    // Business detection
    if (/(business|client|meeting|strategy|proposal)/i.test(tagString)) {
      return 'category-business';
    }

    // Personal detection
    if (/(personal|family|health|grocery|recipe)/i.test(tagString)) {
      return 'category-personal';
    }

    return null;
  }

  /**
   * Clear category cache (useful after bulk updates)
   */
  static clearCache(): void {
    this.categoryCache = null;
    this.cacheExpiry = 0;
  }
}

export default ContentCategorizer;
