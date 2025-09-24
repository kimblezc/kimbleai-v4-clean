import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'zach';
    const projectId = searchParams.get('projectId');

    // Get user
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('name', userId === 'rebecca' ? 'Rebecca' : 'Zach')
      .single();

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get tags from knowledge base and conversations
    let query = supabase
      .from('knowledge_base')
      .select('tags')
      .eq('user_id', userData.id);

    if (projectId && projectId !== 'general') {
      query = query.contains('tags', [projectId]);
    }

    const { data: knowledgeItems } = await query;

    // Extract and count all tags
    const tagCounts: Record<string, number> = {};

    knowledgeItems?.forEach(item => {
      if (item.tags) {
        item.tags.forEach((tag: string) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });

    // Convert to sorted array
    const popularTags = Object.entries(tagCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([tag, count]) => ({ tag, count }));

    return NextResponse.json({
      success: true,
      tags: popularTags,
      totalUniqueTags: Object.keys(tagCounts).length
    });

  } catch (error: any) {
    console.error('Tags fetch error:', error);
    return NextResponse.json({
      error: 'Failed to fetch tags',
      details: error.message
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { content, userId = 'zach', projectId } = await request.json();

    // Auto-suggest tags based on content
    const suggestions = autoSuggestTags(content, projectId);

    return NextResponse.json({
      success: true,
      suggestedTags: suggestions
    });

  } catch (error: any) {
    console.error('Tag suggestion error:', error);
    return NextResponse.json({
      error: 'Failed to suggest tags',
      details: error.message
    }, { status: 500 });
  }
}

function autoSuggestTags(content: string, projectId?: string): string[] {
  const suggestions = new Set<string>();
  const lowerContent = content.toLowerCase();

  // Technical tags
  const techPatterns = {
    'react': /\b(react|jsx|component|hook|useState|useEffect)\b/i,
    'nextjs': /\b(next\.?js|app router|pages router|vercel)\b/i,
    'typescript': /\b(typescript|\.ts|\.tsx|interface|type)\b/i,
    'api': /\b(api|endpoint|server|backend|rest)\b/i,
    'database': /\b(database|supabase|postgres|sql|query)\b/i,
    'ai': /\b(ai|openai|gpt|claude|llm|embedding|vector|kimbleai)\b/i,
    'ui': /\b(ui|ux|design|interface|component|styling)\b/i,
    'mobile': /\b(mobile|ios|android|responsive)\b/i,
    'deployment': /\b(deploy|deployment|vercel|build|production)\b/i,
    'git': /\b(git|github|commit|merge|branch|repository)\b/i
  };

  // Priority and action tags
  const actionPatterns = {
    'urgent': /\b(urgent|asap|critical|emergency|deadline|rush)\b/i,
    'bug': /\b(bug|error|issue|fix|broken|failing)\b/i,
    'feature': /\b(feature|implement|create|build|add|new)\b/i,
    'refactor': /\b(refactor|optimize|improve|clean|restructure)\b/i,
    'documentation': /\b(document|readme|docs|comment|explain)\b/i,
    'meeting': /\b(meeting|call|discussion|sync|standup)\b/i,
    'review': /\b(review|feedback|check|approve|merge)\b/i,
    'testing': /\b(test|testing|spec|unit|integration|qa)\b/i,
    'deployment': /\b(deploy|deployment|production|staging|release)\b/i
  };

  // Context tags (enhanced)
  const contextPatterns = {
    'client': /\b(client|customer|user|stakeholder)\b/i,
    'team': /\b(team|collaboration|meeting|sync|standup)\b/i,
    'planning': /\b(plan|planning|roadmap|timeline|schedule)\b/i,
    'research': /\b(research|investigate|analyze|study)\b/i,
    'creative': /\b(creative|design|brand|visual|mockup)\b/i,
    'personal': /\b(rebecca|wife|family|pet|dog|home|personal)\b/i,
    'travel': /\b(travel|trip|rome|vacation|italy|flight)\b/i,
    'automotive': /\b(tesla|car|vehicle|license|model|drive)\b/i,
    'finance': /\b(budget|financial|money|cost|price|allocation)\b/i,
    'health': /\b(health|doctor|medical|fitness|exercise)\b/i,
    'food': /\b(food|restaurant|cooking|meal|dinner|italian)\b/i,
    'weather': /\b(weather|rain|sunny|temperature|forecast)\b/i,
    'work': /\b(project alpha|project beta|deadline|business|corporate)\b/i,
    'gaming': /\b(dnd|d&d|campaign|dungeon|dragon|character|gaming|rpg|dice|adventure|miniature)\b/i,
    'cooking': /\b(recipe|cooking|ingredient|meal|kitchen|baking|chef)\b/i,
    'legal': /\b(legal|law|contract|agreement|lawyer|attorney|court)\b/i
  };

  // Check all patterns
  [...Object.entries(techPatterns), ...Object.entries(actionPatterns), ...Object.entries(contextPatterns)]
    .forEach(([tag, pattern]) => {
      if (pattern.test(content)) {
        suggestions.add(tag);
      }
    });

  // Add project as tag if specified
  if (projectId && projectId !== 'general') {
    suggestions.add(projectId);
  }

  // Length-based tags
  if (content.length > 1000) suggestions.add('detailed');
  if (content.length < 100) suggestions.add('quick');

  // Question-based tags
  if (content.includes('?')) suggestions.add('question');
  if (content.includes('how to')) suggestions.add('how-to');

  return Array.from(suggestions).slice(0, 8);
}