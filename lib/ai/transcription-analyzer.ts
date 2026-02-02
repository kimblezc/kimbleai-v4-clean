/**
 * Transcription Analyzer
 *
 * AI-powered analysis of transcription content for automatic categorization,
 * project suggestions, and metadata extraction.
 */

import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

export interface TranscriptionAnalysis {
  category: 'professional' | 'dnd' | 'divorce' | 'other';
  confidence: number;
  suggestedProjectName: string;
  suggestedProjectId?: string;
  topics: string[];
  entities: string[];
  summary: string;
  keyPoints: string[];
  isPrivate: boolean;
  suggestedTags: string[];
}

export class TranscriptionAnalyzer {
  private openai;

  constructor() {
    this.openai = createOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Analyze transcription content and provide categorization + suggestions
   */
  async analyzeTranscription(params: {
    transcript: string;
    fileName?: string;
    durationSeconds: number;
    existingProjects: Array<{ id: string; name: string; category?: string }>;
  }): Promise<TranscriptionAnalysis> {
    const { transcript, fileName, durationSeconds, existingProjects } = params;

    // Prepare context about existing projects
    const projectContext = existingProjects.length > 0
      ? `\n\nEXISTING PROJECTS:\n${existingProjects.map(p => `- ${p.name} (ID: ${p.id})${p.category ? ` [${p.category}]` : ''}`).join('\n')}`
      : '';

    const prompt = `Analyze this audio transcription and provide categorization suggestions.

TRANSCRIPTION (${durationSeconds}s):
"${transcript.substring(0, 3000)}"${transcript.length > 3000 ? '... (truncated)' : ''}

FILE NAME: ${fileName || 'Unknown'}
${projectContext}

TASK:
1. Categorize this transcription into ONE of these categories:
   - "professional" (work, business, meetings, client calls, professional development)
   - "dnd" (Dungeons & Dragons, D&D, tabletop RPG, game sessions, campaigns, characters)
   - "divorce" (divorce proceedings, legal matters, custody, family court, separation)
   - "other" (personal notes, ideas, creative projects, general)

2. Suggest a project name for organizing this transcription:
   - If it clearly matches an existing project, use that exact project name
   - If it's a new topic, suggest a descriptive project name
   - Format: "ProjectName" (no special characters except spaces, hyphens, underscores)

3. Extract key information:
   - Main topics discussed (3-5 topics)
   - Important entities mentioned (people, places, organizations)
   - Brief summary (1-2 sentences)
   - Key actionable points or decisions
   - Suggested tags for searchability

4. Privacy assessment:
   - Mark as private if contains: legal matters, personal info, sensitive data, divorce content

RESPOND IN THIS EXACT JSON FORMAT:
{
  "category": "professional|dnd|divorce|other",
  "confidence": 0.85,
  "suggestedProjectName": "Project Name Here",
  "suggestedProjectId": "existing-project-id-if-matches",
  "topics": ["topic1", "topic2", "topic3"],
  "entities": ["entity1", "entity2"],
  "summary": "Brief 1-2 sentence summary",
  "keyPoints": ["point1", "point2"],
  "isPrivate": true|false,
  "suggestedTags": ["tag1", "tag2", "tag3"]
}`;

    try {
      const { text } = await generateText({
        model: this.openai('gpt-4o-mini'),
        prompt,
        temperature: 0.3,
      });

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse AI response');
      }

      const analysis: TranscriptionAnalysis = JSON.parse(jsonMatch[0]);

      // Match against existing projects
      if (existingProjects.length > 0) {
        const matchedProject = existingProjects.find(
          p => p.name.toLowerCase() === analysis.suggestedProjectName.toLowerCase()
        );
        if (matchedProject) {
          analysis.suggestedProjectId = matchedProject.id;
        }
      }

      return analysis;
    } catch (error) {
      console.error('Transcription analysis failed:', error);

      // Fallback analysis based on keywords
      return this.fallbackAnalysis(transcript, fileName, existingProjects);
    }
  }

  /**
   * Fallback analysis using keyword matching
   */
  private fallbackAnalysis(
    transcript: string,
    fileName: string | undefined,
    existingProjects: Array<{ id: string; name: string; category?: string }>
  ): TranscriptionAnalysis {
    const lowerTranscript = transcript.toLowerCase();
    const lowerFileName = (fileName || '').toLowerCase();

    // Category detection
    let category: TranscriptionAnalysis['category'] = 'other';
    let confidence = 0.5;

    // D&D keywords
    const dndKeywords = ['d&d', 'dnd', 'dungeon', 'dragon', 'campaign', 'character', 'dm', 'roll', 'dice', 'rpg', 'tabletop'];
    if (dndKeywords.some(k => lowerTranscript.includes(k) || lowerFileName.includes(k))) {
      category = 'dnd';
      confidence = 0.7;
    }

    // Divorce keywords
    const divorceKeywords = ['divorce', 'custody', 'court', 'lawyer', 'attorney', 'separation', 'alimony', 'settlement'];
    if (divorceKeywords.some(k => lowerTranscript.includes(k) || lowerFileName.includes(k))) {
      category = 'divorce';
      confidence = 0.8;

    }

    // Professional keywords
    const professionalKeywords = ['meeting', 'client', 'project', 'deadline', 'business', 'revenue', 'strategy', 'agenda'];
    if (professionalKeywords.some(k => lowerTranscript.includes(k) || lowerFileName.includes(k))) {
      category = 'professional';
      confidence = 0.6;
    }

    // Find matching project
    const matchedProject = existingProjects.find(p =>
      p.category?.toLowerCase() === category.toLowerCase()
    );

    return {
      category,
      confidence,
      suggestedProjectName: matchedProject?.name || `${category.charAt(0).toUpperCase() + category.slice(1)} Notes`,
      suggestedProjectId: matchedProject?.id,
      topics: [],
      entities: [],
      summary: `Transcription of ${fileName || 'audio recording'} (${Math.round(transcript.length / 200)} minutes estimated)`,
      keyPoints: [],
      isPrivate: category === 'divorce',
      suggestedTags: [category],
    };
  }

  /**
   * Search transcriptions by content, category, or tags
   */
  async searchTranscriptions(params: {
    query: string;
    category?: string;
    projectId?: string;
    limit?: number;
  }): Promise<any[]> {
    // This will integrate with database search
    // Implementation depends on search requirements
    return [];
  }
}

export default TranscriptionAnalyzer;
