/**
 * ChatGPT Transition Agent
 *
 * Expert agent for comprehensive ChatGPT to KimbleAI data transition
 * Specializes in:
 * - Intelligent project matching and mapping
 * - Conversation migration and linking
 * - Data deduplication and consolidation
 * - Semantic analysis for project assignment
 * - Comprehensive reporting and analytics
 *
 * @version 1.0.0
 * @author Claude Code
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface ChatGPTMessage {
  id: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  createTime: number;
  parent?: string;
  children: string[];
}

interface ChatGPTConversation {
  id: string;
  title: string;
  createTime: number;
  updateTime: number;
  messages: ChatGPTMessage[];
  messageCount: number;
  fullText: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  tags: string[];
  metadata: any;
}

interface ProjectMatch {
  projectId: string;
  projectName: string;
  confidence: number;
  matchReasons: string[];
  conversationId: string;
  conversationTitle: string;
}

interface TransitionStats {
  totalConversations: number;
  conversationsMatched: number;
  conversationsMigrated: number;
  projectsCreated: number;
  projectsUpdated: number;
  messagesProcessed: number;
  duplicatesSkipped: number;
  errors: number;
  processingTimeMs: number;
}

interface TransitionOptions {
  autoCreateProjects?: boolean;        // Create projects for unmatched conversations
  minMatchConfidence?: number;         // Minimum confidence for auto-matching (0-1)
  migrateToMainSystem?: boolean;       // Migrate to main conversations table
  preserveChatGPTData?: boolean;       // Keep original chatgpt_* tables
  generateEmbeddings?: boolean;        // Generate embeddings for migrated data
  analyzeSentiment?: boolean;          // Analyze conversation sentiment
  extractKeywords?: boolean;           // Extract keywords for better matching
  groupByTopic?: boolean;              // Group conversations by topic
  dryRun?: boolean;                    // Test run without actual changes
}

interface TransitionResult {
  success: boolean;
  transitionId: string;
  stats: TransitionStats;
  matches: ProjectMatch[];
  newProjects: string[];
  errors: Array<{ conversationId: string; error: string }>;
  report: string;
}

// ============================================================================
// CHATGPT TRANSITION AGENT CLASS
// ============================================================================

export class ChatGPTTransitionAgent {
  private static instance: ChatGPTTransitionAgent;
  private supabase: any;
  private openai: OpenAI;
  private userId: string;
  private sessionId: string;

  private constructor(userId: string) {
    this.userId = userId;
    this.sessionId = `transition_${Date.now()}`;

    // Initialize Supabase
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Initialize OpenAI
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });
  }

  static getInstance(userId: string): ChatGPTTransitionAgent {
    if (!ChatGPTTransitionAgent.instance) {
      ChatGPTTransitionAgent.instance = new ChatGPTTransitionAgent(userId);
    }
    return ChatGPTTransitionAgent.instance;
  }

  // ==========================================================================
  // MAIN TRANSITION WORKFLOW
  // ==========================================================================

  async executeTransition(options: TransitionOptions = {}): Promise<TransitionResult> {
    const startTime = Date.now();

    const stats: TransitionStats = {
      totalConversations: 0,
      conversationsMatched: 0,
      conversationsMigrated: 0,
      projectsCreated: 0,
      projectsUpdated: 0,
      messagesProcessed: 0,
      duplicatesSkipped: 0,
      errors: 0,
      processingTimeMs: 0,
    };

    const matches: ProjectMatch[] = [];
    const newProjects: string[] = [];
    const errors: Array<{ conversationId: string; error: string }> = [];

    try {
      await this.log('info', 'Starting ChatGPT transition workflow');

      // Step 1: Fetch all ChatGPT conversations
      const conversations = await this.fetchChatGPTConversations();
      stats.totalConversations = conversations.length;
      await this.log('info', `Found ${conversations.length} ChatGPT conversations`);

      // Step 2: Fetch all existing projects
      const projects = await this.fetchExistingProjects();
      await this.log('info', `Found ${projects.length} existing projects`);

      // Step 3: Analyze and match conversations to projects
      await this.log('info', 'Analyzing conversations for project matching...');
      const matchResults = await this.matchConversationsToProjects(
        conversations,
        projects,
        options
      );
      matches.push(...matchResults.matches);
      stats.conversationsMatched = matchResults.matched;

      // Step 4: Create new projects for unmatched conversations (if enabled)
      if (options.autoCreateProjects && matchResults.unmatched.length > 0) {
        await this.log('info', `Creating projects for ${matchResults.unmatched.length} unmatched conversations`);

        const createdProjects = await this.createProjectsForConversations(
          matchResults.unmatched,
          options
        );

        newProjects.push(...createdProjects.map(p => p.projectId));
        stats.projectsCreated = createdProjects.length;
        matches.push(...createdProjects);
      }

      // Step 5: Migrate conversations to main system (if enabled)
      if (options.migrateToMainSystem && !options.dryRun) {
        await this.log('info', 'Migrating conversations to main system...');

        const migrationResult = await this.migrateConversations(matches, options);
        stats.conversationsMigrated = migrationResult.migrated;
        stats.messagesProcessed = migrationResult.messagesProcessed;
        stats.duplicatesSkipped = migrationResult.duplicatesSkipped;
        stats.projectsUpdated = migrationResult.projectsUpdated;
        errors.push(...migrationResult.errors);
      }

      // Step 6: Generate comprehensive report
      const report = await this.generateTransitionReport(stats, matches, newProjects);

      stats.processingTimeMs = Date.now() - startTime;
      stats.errors = errors.length;

      await this.log('success', `Transition completed in ${stats.processingTimeMs}ms`);

      return {
        success: true,
        transitionId: this.sessionId,
        stats,
        matches,
        newProjects,
        errors,
        report,
      };

    } catch (error: any) {
      await this.log('error', `Transition failed: ${error.message}`);

      return {
        success: false,
        transitionId: this.sessionId,
        stats,
        matches,
        newProjects,
        errors: [...errors, { conversationId: 'system', error: error.message }],
        report: `Transition failed: ${error.message}`,
      };
    }
  }

  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================

  private async fetchChatGPTConversations(): Promise<ChatGPTConversation[]> {
    const { data, error } = await this.supabase
      .from('chatgpt_conversations')
      .select('*')
      .eq('user_id', this.userId)
      .order('create_time', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch ChatGPT conversations: ${error.message}`);
    }

    return data.map((conv: any) => ({
      id: conv.id,
      title: conv.title,
      createTime: conv.create_time,
      updateTime: conv.update_time,
      messages: [], // Will be fetched separately if needed
      messageCount: conv.message_count || 0,
      fullText: conv.full_text || '',
    }));
  }

  private async fetchExistingProjects(): Promise<Project[]> {
    const { data, error } = await this.supabase
      .from('projects')
      .select('*')
      .eq('owner_id', this.userId)
      .neq('status', 'archived');

    if (error) {
      throw new Error(`Failed to fetch projects: ${error.message}`);
    }

    return data.map((proj: any) => ({
      id: proj.id,
      name: proj.name,
      description: proj.description || '',
      status: proj.status,
      tags: proj.tags || [],
      metadata: proj.metadata || {},
    }));
  }

  // ==========================================================================
  // INTELLIGENT PROJECT MATCHING
  // ==========================================================================

  private async matchConversationsToProjects(
    conversations: ChatGPTConversation[],
    projects: Project[],
    options: TransitionOptions
  ): Promise<{ matches: ProjectMatch[]; matched: number; unmatched: ChatGPTConversation[] }> {
    const matches: ProjectMatch[] = [];
    const unmatched: ChatGPTConversation[] = [];
    const minConfidence = options.minMatchConfidence || 0.7;

    for (const conv of conversations) {
      try {
        // Extract keywords from conversation
        const keywords = await this.extractKeywords(conv.title, conv.fullText);

        // Calculate match scores for each project
        const projectScores = await Promise.all(
          projects.map(async (project) => {
            const score = await this.calculateMatchScore(conv, project, keywords);
            return { project, score, reasons: score.reasons };
          })
        );

        // Find best match
        const bestMatch = projectScores.reduce((best, current) =>
          current.score.confidence > best.score.confidence ? current : best
        );

        if (bestMatch.score.confidence >= minConfidence) {
          matches.push({
            projectId: bestMatch.project.id,
            projectName: bestMatch.project.name,
            confidence: bestMatch.score.confidence,
            matchReasons: bestMatch.reasons,
            conversationId: conv.id,
            conversationTitle: conv.title,
          });
        } else {
          unmatched.push(conv);
        }

      } catch (error: any) {
        await this.log('warn', `Failed to match conversation ${conv.id}: ${error.message}`);
        unmatched.push(conv);
      }
    }

    return {
      matches,
      matched: matches.length,
      unmatched,
    };
  }

  private async calculateMatchScore(
    conversation: ChatGPTConversation,
    project: Project,
    conversationKeywords: string[]
  ): Promise<{ confidence: number; reasons: string[] }> {
    const reasons: string[] = [];
    let score = 0;
    let maxScore = 0;

    // 1. Title similarity (weight: 30%)
    maxScore += 30;
    const titleSimilarity = this.calculateStringSimilarity(
      conversation.title.toLowerCase(),
      project.name.toLowerCase()
    );
    if (titleSimilarity > 0.5) {
      score += titleSimilarity * 30;
      reasons.push(`Title similarity: ${(titleSimilarity * 100).toFixed(0)}%`);
    }

    // 2. Keyword overlap (weight: 25%)
    maxScore += 25;
    const projectKeywords = [
      ...project.tags,
      ...(project.description?.split(/\s+/) || []),
    ].map(k => k.toLowerCase());

    const keywordOverlap = conversationKeywords.filter(kw =>
      projectKeywords.some(pk => pk.includes(kw) || kw.includes(pk))
    ).length;

    if (keywordOverlap > 0) {
      const keywordScore = Math.min((keywordOverlap / conversationKeywords.length) * 25, 25);
      score += keywordScore;
      reasons.push(`Keyword matches: ${keywordOverlap}`);
    }

    // 3. Description semantic similarity (weight: 25%)
    maxScore += 25;
    if (project.description && conversation.fullText) {
      const semanticSim = await this.calculateSemanticSimilarity(
        conversation.fullText.substring(0, 1000),
        project.description
      );
      if (semanticSim > 0.6) {
        score += semanticSim * 25;
        reasons.push(`Semantic similarity: ${(semanticSim * 100).toFixed(0)}%`);
      }
    }

    // 4. Tag matching (weight: 20%)
    maxScore += 20;
    const tagMatches = project.tags.filter(tag =>
      conversation.title.toLowerCase().includes(tag.toLowerCase()) ||
      conversation.fullText.toLowerCase().includes(tag.toLowerCase())
    ).length;

    if (tagMatches > 0) {
      score += Math.min((tagMatches / project.tags.length) * 20, 20);
      reasons.push(`Tag matches: ${tagMatches}`);
    }

    return {
      confidence: score / maxScore,
      reasons,
    };
  }

  // ==========================================================================
  // PROJECT CREATION FOR UNMATCHED CONVERSATIONS
  // ==========================================================================

  private async createProjectsForConversations(
    conversations: ChatGPTConversation[],
    options: TransitionOptions
  ): Promise<ProjectMatch[]> {
    const newMatches: ProjectMatch[] = [];

    // Group conversations by topic if enabled
    const groupedConversations = options.groupByTopic
      ? await this.groupConversationsByTopic(conversations)
      : conversations.map(c => ({ topic: c.title, conversations: [c] }));

    for (const group of groupedConversations) {
      try {
        const projectName = this.generateProjectName(group.topic, group.conversations);
        const projectDescription = await this.generateProjectDescription(group.conversations);
        const keywords = await this.extractKeywordsFromMultiple(group.conversations);

        if (options.dryRun) {
          // Dry run - just record what would be created
          for (const conv of group.conversations) {
            newMatches.push({
              projectId: `dry-run-${Date.now()}`,
              projectName,
              confidence: 1.0,
              matchReasons: ['Would create new project (dry run)'],
              conversationId: conv.id,
              conversationTitle: conv.title,
            });
          }
        } else {
          // Create actual project
          const { data: project, error } = await this.supabase
            .from('projects')
            .insert({
              name: projectName,
              description: projectDescription,
              owner_id: this.userId,
              status: 'active',
              priority: 'medium',
              tags: keywords.slice(0, 10),
              metadata: {
                created_from: 'chatgpt_import',
                import_session: this.sessionId,
                conversation_count: group.conversations.length,
                created_at: new Date().toISOString(),
              },
            })
            .select()
            .single();

          if (error) {
            throw new Error(`Failed to create project: ${error.message}`);
          }

          await this.log('info', `Created project: ${projectName} (${project.id})`);

          // Create matches for all conversations in this group
          for (const conv of group.conversations) {
            newMatches.push({
              projectId: project.id,
              projectName,
              confidence: 1.0,
              matchReasons: ['Auto-created project from ChatGPT conversations'],
              conversationId: conv.id,
              conversationTitle: conv.title,
            });
          }
        }

      } catch (error: any) {
        await this.log('error', `Failed to create project for group: ${error.message}`);
      }
    }

    return newMatches;
  }

  private async groupConversationsByTopic(
    conversations: ChatGPTConversation[]
  ): Promise<Array<{ topic: string; conversations: ChatGPTConversation[] }>> {
    // Use GPT-4 to intelligently group conversations by topic
    const summaries = conversations.map(c => ({
      id: c.id,
      title: c.title,
      preview: c.fullText.substring(0, 200),
    }));

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at analyzing conversation topics and grouping them intelligently. Group the conversations by semantic topic and return JSON.',
          },
          {
            role: 'user',
            content: `Group these conversations by topic. Return JSON array of groups with format: [{"topic": "Topic Name", "conversationIds": ["id1", "id2"]}]\n\nConversations:\n${JSON.stringify(summaries, null, 2)}`,
          },
        ],
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(response.choices[0].message.content || '{"groups": []}');
      const groups = result.groups || [];

      return groups.map((g: any) => ({
        topic: g.topic,
        conversations: conversations.filter(c => g.conversationIds.includes(c.id)),
      }));

    } catch (error) {
      // Fallback: each conversation is its own group
      return conversations.map(c => ({ topic: c.title, conversations: [c] }));
    }
  }

  // ==========================================================================
  // CONVERSATION MIGRATION
  // ==========================================================================

  private async migrateConversations(
    matches: ProjectMatch[],
    options: TransitionOptions
  ): Promise<{
    migrated: number;
    messagesProcessed: number;
    duplicatesSkipped: number;
    projectsUpdated: number;
    errors: Array<{ conversationId: string; error: string }>;
  }> {
    let migrated = 0;
    let messagesProcessed = 0;
    let duplicatesSkipped = 0;
    const projectsUpdated = new Set<string>();
    const errors: Array<{ conversationId: string; error: string }> = [];

    for (const match of matches) {
      try {
        // Fetch full conversation data
        const { data: chatgptConv, error: fetchError } = await this.supabase
          .from('chatgpt_conversations')
          .select('*')
          .eq('id', match.conversationId)
          .eq('user_id', this.userId)
          .single();

        if (fetchError) {
          errors.push({ conversationId: match.conversationId, error: fetchError.message });
          continue;
        }

        // Check for duplicates
        const { data: existing } = await this.supabase
          .from('conversations')
          .select('id')
          .eq('user_id', this.userId)
          .eq('title', chatgptConv.title)
          .eq('project_id', match.projectId)
          .maybeSingle();

        if (existing) {
          duplicatesSkipped++;
          await this.log('info', `Skipping duplicate: ${chatgptConv.title}`);
          continue;
        }

        // Create conversation in main system
        const { data: newConv, error: createError } = await this.supabase
          .from('conversations')
          .insert({
            user_id: this.userId,
            project_id: match.projectId,
            title: chatgptConv.title,
            message_count: chatgptConv.message_count || 0,
            metadata: {
              imported_from: 'chatgpt',
              original_id: chatgptConv.id,
              import_session: this.sessionId,
              match_confidence: match.confidence,
              match_reasons: match.matchReasons,
              chatgpt_create_time: chatgptConv.create_time,
              chatgpt_update_time: chatgptConv.update_time,
            },
          })
          .select()
          .single();

        if (createError) {
          errors.push({ conversationId: match.conversationId, error: createError.message });
          continue;
        }

        // Fetch and migrate messages
        const { data: messages } = await this.supabase
          .from('chatgpt_messages')
          .select('*')
          .eq('conversation_id', match.conversationId)
          .order('position', { ascending: true });

        if (messages && messages.length > 0) {
          const migratedMessages = messages.map((msg: any) => ({
            conversation_id: newConv.id,
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.create_time * 1000).toISOString(),
            metadata: {
              chatgpt_message_id: msg.id,
              parent_message_id: msg.parent_message_id,
              position: msg.position,
            },
          }));

          const { error: msgError } = await this.supabase
            .from('messages')
            .insert(migratedMessages);

          if (!msgError) {
            messagesProcessed += messages.length;
          }
        }

        migrated++;
        projectsUpdated.add(match.projectId);

        await this.log('info', `Migrated: ${chatgptConv.title} → ${match.projectName}`);

      } catch (error: any) {
        errors.push({ conversationId: match.conversationId, error: error.message });
      }
    }

    // Update project stats
    for (const projectId of Array.from(projectsUpdated)) {
      await this.updateProjectStats(projectId);
    }

    return {
      migrated,
      messagesProcessed,
      duplicatesSkipped,
      projectsUpdated: projectsUpdated.size,
      errors,
    };
  }

  // ==========================================================================
  // UTILITY FUNCTIONS
  // ==========================================================================

  private async extractKeywords(title: string, content: string): Promise<string[]> {
    const text = `${title} ${content.substring(0, 2000)}`.toLowerCase();

    // Common words to exclude
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'is', 'was', 'are', 'were', 'this', 'that', 'these', 'those', 'i', 'you', 'we', 'they', 'it', 'he', 'she']);

    // Extract words
    const words = text.match(/\b[a-z]{3,}\b/g) || [];

    // Count frequency
    const freq = new Map<string, number>();
    words.forEach(word => {
      if (!stopWords.has(word)) {
        freq.set(word, (freq.get(word) || 0) + 1);
      }
    });

    // Return top keywords
    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([word]) => word);
  }

  private async extractKeywordsFromMultiple(conversations: ChatGPTConversation[]): Promise<string[]> {
    const allKeywords: string[] = [];

    for (const conv of conversations) {
      const keywords = await this.extractKeywords(conv.title, conv.fullText);
      allKeywords.push(...keywords);
    }

    // Count frequency across all conversations
    const freq = new Map<string, number>();
    allKeywords.forEach(kw => {
      freq.set(kw, (freq.get(kw) || 0) + 1);
    });

    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  private async calculateSemanticSimilarity(text1: string, text2: string): Promise<number> {
    try {
      const [embedding1, embedding2] = await Promise.all([
        this.getEmbedding(text1),
        this.getEmbedding(text2),
      ]);

      return this.cosineSimilarity(embedding1, embedding2);
    } catch (error) {
      return 0;
    }
  }

  private async getEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    return response.data[0].embedding;
  }

  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  private generateProjectName(topic: string, conversations: ChatGPTConversation[]): string {
    if (conversations.length === 1) {
      return `ChatGPT: ${conversations[0].title}`;
    }

    // Clean up and capitalize topic
    const cleanTopic = topic
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return `ChatGPT: ${cleanTopic}`;
  }

  private async generateProjectDescription(conversations: ChatGPTConversation[]): Promise<string> {
    const summaries = conversations.map(c => c.title).join('\n- ');

    return `Project created from ChatGPT import containing ${conversations.length} conversation(s):\n\n- ${summaries}\n\nImported: ${new Date().toLocaleDateString()}`;
  }

  private async updateProjectStats(projectId: string): Promise<void> {
    const { data: stats } = await this.supabase.rpc('get_project_stats', {
      p_project_id: projectId,
    });

    if (stats) {
      await this.supabase
        .from('projects')
        .update({ stats })
        .eq('id', projectId);
    }
  }

  private async generateTransitionReport(
    stats: TransitionStats,
    matches: ProjectMatch[],
    newProjects: string[]
  ): Promise<string> {
    const report = `
# ChatGPT Transition Report
Generated: ${new Date().toISOString()}
Session ID: ${this.sessionId}

## Summary Statistics
- Total Conversations: ${stats.totalConversations}
- Conversations Matched: ${stats.conversationsMatched}
- Conversations Migrated: ${stats.conversationsMigrated}
- Projects Created: ${stats.projectsCreated}
- Projects Updated: ${stats.projectsUpdated}
- Messages Processed: ${stats.messagesProcessed}
- Duplicates Skipped: ${stats.duplicatesSkipped}
- Errors: ${stats.errors}
- Processing Time: ${(stats.processingTimeMs / 1000).toFixed(2)}s

## Match Details
${matches.map(m => `
### ${m.conversationTitle}
- Project: ${m.projectName}
- Confidence: ${(m.confidence * 100).toFixed(1)}%
- Reasons: ${m.matchReasons.join(', ')}
`).join('\n')}

## New Projects Created
${newProjects.length > 0 ? newProjects.map((id, i) => `${i + 1}. Project ID: ${id}`).join('\n') : 'None'}

---
Transition Agent v1.0.0
    `.trim();

    return report;
  }

  private async log(level: 'info' | 'warn' | 'error' | 'success', message: string): Promise<void> {
    const logEntry = {
      user_id: this.userId,
      agent_name: 'chatgpt-transition-agent',
      agent_version: '1.0.0',
      session_id: this.sessionId,
      level,
      message,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };

    await this.supabase.from('agent_logs').insert(logEntry);
    console.log(`[ChatGPT Transition Agent] [${level.toUpperCase()}] ${message}`);
  }
}

// ============================================================================
// EXPORT DEFAULT INSTANCE CREATOR
// ============================================================================

export function createTransitionAgent(userId: string): ChatGPTTransitionAgent {
  return ChatGPTTransitionAgent.getInstance(userId);
}
