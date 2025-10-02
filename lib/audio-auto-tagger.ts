/**
 * Audio Transcription Auto-Tagging System
 * Analyzes transcript content to automatically extract tags, topics, action items, and insights
 * Inspired by photo auto-tagging but optimized for audio/text content
 */

export interface TranscriptAnalysis {
  tags: string[];
  projectCategory: string;
  actionItems: string[];
  keyTopics: string[];
  speakerInsights?: {
    speakerCount: number;
    dominantSpeaker?: string;
    conversationType: string;
  };
  sentiment: string;
  importanceScore: number;
  extractedEntities: {
    people: string[];
    organizations: string[];
    locations: string[];
    dates: string[];
    technologies: string[];
  };
}

export class AudioAutoTagger {

  /**
   * Main analysis function - analyzes transcript and returns comprehensive tagging
   */
  static analyzeTranscript(
    text: string,
    utterances?: any[],
    metadata?: any
  ): TranscriptAnalysis {
    const lowerText = text.toLowerCase();

    return {
      tags: this.extractTags(text, lowerText),
      projectCategory: this.detectProjectCategory(text, lowerText),
      actionItems: this.extractActionItems(text),
      keyTopics: this.extractKeyTopics(text, lowerText),
      speakerInsights: utterances ? this.analyzeSpeakers(utterances) : undefined,
      sentiment: this.detectSentiment(lowerText),
      importanceScore: this.calculateImportance(text, lowerText),
      extractedEntities: this.extractEntities(text)
    };
  }

  /**
   * Extract relevant tags from transcript content
   */
  private static extractTags(text: string, lowerText: string): string[] {
    const tags = new Set<string>();

    // Base tag
    tags.add('audio-transcription');

    // Content type tags
    if (this.isMeeting(lowerText)) tags.add('meeting');
    if (this.isInterview(lowerText)) tags.add('interview');
    if (this.isLecture(lowerText)) tags.add('lecture');
    if (this.isPodcast(lowerText)) tags.add('podcast');
    if (this.isNote(lowerText)) tags.add('voice-note');

    // Topic-based tags
    if (this.containsTechnical(lowerText)) {
      tags.add('technical');
      tags.add('development');
    }

    if (this.containsBusiness(lowerText)) {
      tags.add('business');
      tags.add('strategy');
    }

    if (this.containsGaming(lowerText)) {
      tags.add('gaming');
      tags.add('d&d');
    }

    if (this.containsAutomotive(lowerText)) {
      tags.add('automotive');
      tags.add('vehicle');
    }

    if (this.containsPersonal(lowerText)) {
      tags.add('personal');
    }

    // Action-based tags
    if (this.hasActionItems(lowerText)) {
      tags.add('action-items');
      tags.add('todo');
    }

    if (this.hasDecisions(lowerText)) {
      tags.add('decisions');
      tags.add('important');
    }

    // Urgency tags
    if (this.isUrgent(lowerText)) {
      tags.add('urgent');
      tags.add('priority');
    }

    // Technical detail level
    if (this.hasCodeMentions(text)) {
      tags.add('code');
      tags.add('programming');
    }

    if (this.hasAPIDiscussion(lowerText)) {
      tags.add('api');
      tags.add('integration');
    }

    // Limit to reasonable number
    return Array.from(tags).slice(0, 15);
  }

  /**
   * Detect project category from content
   */
  private static detectProjectCategory(text: string, lowerText: string): string {
    const categories = [
      { name: 'gaming', keywords: ['game', 'campaign', 'character', 'dice', 'dungeon', 'dragon', 'd&d', 'rpg', 'quest', 'adventure'] },
      { name: 'development', keywords: ['code', 'api', 'function', 'database', 'server', 'deploy', 'bug', 'feature', 'react', 'typescript', 'python', 'javascript'] },
      { name: 'automotive', keywords: ['car', 'vehicle', 'tesla', 'engine', 'maintenance', 'repair', 'driving', 'oil change', 'tire'] },
      { name: 'business', keywords: ['meeting', 'client', 'project', 'deadline', 'budget', 'revenue', 'strategy', 'proposal', 'contract'] },
      { name: 'personal', keywords: ['grocery', 'recipe', 'family', 'reminder', 'appointment', 'health', 'workout', 'vacation'] },
    ];

    let maxScore = 0;
    let detectedCategory = 'general';

    for (const category of categories) {
      let score = 0;
      for (const keyword of category.keywords) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = lowerText.match(regex);
        score += matches ? matches.length : 0;
      }

      if (score > maxScore) {
        maxScore = score;
        detectedCategory = category.name;
      }
    }

    return maxScore > 2 ? detectedCategory : 'general';
  }

  /**
   * Extract action items from transcript
   */
  private static extractActionItems(text: string): string[] {
    const actionItems: string[] = [];

    // Action patterns
    const patterns = [
      /(?:need to|have to|must|should|got to|gotta)\s+([^.!?\n]+)/gi,
      /(?:todo|to-do|to do):\s*([^.!?\n]+)/gi,
      /(?:action item|action point):\s*([^.!?\n]+)/gi,
      /(?:i'll|i will|we'll|we will|let's)\s+([^.!?\n]+)/gi,
      /(?:remember to|don't forget to)\s+([^.!?\n]+)/gi,
    ];

    for (const pattern of patterns) {
      const matches = Array.from(text.matchAll(pattern));
      for (const match of matches) {
        const item = match[1].trim();
        if (item.length > 10 && item.length < 200) {
          actionItems.push(item);
        }
      }
    }

    return actionItems.slice(0, 10); // Limit to 10 action items
  }

  /**
   * Extract key topics using keyword density analysis
   */
  private static extractKeyTopics(text: string, lowerText: string): string[] {
    const topics = new Set<string>();

    // Technology topics
    const techTopics = ['react', 'typescript', 'python', 'javascript', 'api', 'database', 'server', 'cloud', 'aws', 'docker', 'kubernetes'];
    for (const topic of techTopics) {
      if (lowerText.includes(topic)) topics.add(topic);
    }

    // Business topics
    const businessTopics = ['strategy', 'revenue', 'growth', 'marketing', 'sales', 'customer', 'product'];
    for (const topic of businessTopics) {
      if (lowerText.includes(topic)) topics.add(topic);
    }

    // Extract capitalized phrases (likely proper nouns/topics)
    const capitalizedPhrases = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
    const commonWords = new Set(['I', 'The', 'A', 'An', 'This', 'That', 'There', 'It', 'We', 'You', 'They']);

    for (const phrase of capitalizedPhrases) {
      if (!commonWords.has(phrase) && phrase.length > 3) {
        topics.add(phrase.toLowerCase());
      }
    }

    return Array.from(topics).slice(0, 10);
  }

  /**
   * Analyze speaker information from utterances
   */
  private static analyzeSpeakers(utterances: any[]): TranscriptAnalysis['speakerInsights'] {
    if (!utterances || utterances.length === 0) return undefined;

    const speakerStats = new Map<string, number>();

    for (const utterance of utterances) {
      const speaker = utterance.speaker || 'Unknown';
      speakerStats.set(speaker, (speakerStats.get(speaker) || 0) + (utterance.text?.length || 0));
    }

    const sortedSpeakers = Array.from(speakerStats.entries()).sort((a, b) => b[1] - a[1]);
    const dominantSpeaker = sortedSpeakers[0]?.[0];
    const speakerCount = speakerStats.size;

    let conversationType = 'monologue';
    if (speakerCount === 2) {
      conversationType = 'dialogue';
    } else if (speakerCount > 2 && speakerCount <= 4) {
      conversationType = 'small-group';
    } else if (speakerCount > 4) {
      conversationType = 'large-group';
    }

    return {
      speakerCount,
      dominantSpeaker,
      conversationType
    };
  }

  /**
   * Detect overall sentiment
   */
  private static detectSentiment(lowerText: string): string {
    const positiveWords = ['great', 'excellent', 'good', 'awesome', 'love', 'perfect', 'happy', 'success', 'excited'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'problem', 'issue', 'error', 'fail', 'difficult', 'frustrated'];

    let positiveCount = 0;
    let negativeCount = 0;

    for (const word of positiveWords) {
      const regex = new RegExp(`\\b${word}\\b`, 'g');
      positiveCount += (lowerText.match(regex) || []).length;
    }

    for (const word of negativeWords) {
      const regex = new RegExp(`\\b${word}\\b`, 'g');
      negativeCount += (lowerText.match(regex) || []).length;
    }

    if (positiveCount > negativeCount * 1.5) return 'positive';
    if (negativeCount > positiveCount * 1.5) return 'negative';
    return 'neutral';
  }

  /**
   * Calculate importance score (0-1)
   */
  private static calculateImportance(text: string, lowerText: string): number {
    let score = 0.5; // Base score

    // Increase for action items
    if (this.hasActionItems(lowerText)) score += 0.1;

    // Increase for decisions
    if (this.hasDecisions(lowerText)) score += 0.15;

    // Increase for urgency indicators
    if (this.isUrgent(lowerText)) score += 0.15;

    // Increase for technical content (valuable for reference)
    if (this.containsTechnical(lowerText)) score += 0.05;

    // Increase for code mentions
    if (this.hasCodeMentions(text)) score += 0.05;

    // Longer transcripts are generally more important
    if (text.length > 5000) score += 0.1;
    if (text.length > 10000) score += 0.05;

    return Math.min(score, 1.0);
  }

  /**
   * Extract named entities
   */
  private static extractEntities(text: string): TranscriptAnalysis['extractedEntities'] {
    const entities = {
      people: [] as string[],
      organizations: [] as string[],
      locations: [] as string[],
      dates: [] as string[],
      technologies: [] as string[]
    };

    // Extract potential names (capitalized words/phrases)
    const namePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b/g;
    const nameMatches = Array.from(text.matchAll(namePattern));
    for (const match of nameMatches) {
      const name = match[1];
      // Simple heuristic: if it's 2-3 capitalized words, likely a person's name
      const wordCount = name.split(' ').length;
      if (wordCount >= 2 && wordCount <= 3) {
        entities.people.push(name);
      }
    }

    // Extract organizations (often have Inc, LLC, Corp, etc.)
    const orgPattern = /\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)*(?:\s+(?:Inc|LLC|Corp|Ltd|Company))?)\b/g;
    const orgMatches = Array.from(text.matchAll(orgPattern));
    for (const match of orgMatches) {
      const org = match[1];
      if (org.includes('Inc') || org.includes('LLC') || org.includes('Corp') || org.includes('Ltd') || org.includes('Company')) {
        entities.organizations.push(org);
      }
    }

    // Extract dates (various formats)
    const datePatterns = [
      /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,
      /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}\b/gi,
      /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}\b/gi,
    ];

    for (const pattern of datePatterns) {
      const dateMatches = Array.from(text.matchAll(pattern));
      for (const match of dateMatches) {
        entities.dates.push(match[0]);
      }
    }

    // Extract technologies
    const techKeywords = [
      'React', 'TypeScript', 'JavaScript', 'Python', 'Java', 'Node.js', 'Express',
      'AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes', 'MongoDB', 'PostgreSQL',
      'Redis', 'GraphQL', 'REST API', 'Next.js', 'Vue', 'Angular'
    ];

    for (const tech of techKeywords) {
      const regex = new RegExp(`\\b${tech}\\b`, 'gi');
      if (regex.test(text)) {
        entities.technologies.push(tech);
      }
    }

    // Deduplicate
    entities.people = Array.from(new Set(entities.people)).slice(0, 10);
    entities.organizations = Array.from(new Set(entities.organizations)).slice(0, 10);
    entities.dates = Array.from(new Set(entities.dates)).slice(0, 10);
    entities.technologies = Array.from(new Set(entities.technologies)).slice(0, 10);

    return entities;
  }

  // Helper detection methods
  private static isMeeting(text: string): boolean {
    return /\b(meeting|conference|call|discussion|sync|standup|agenda)\b/i.test(text);
  }

  private static isInterview(text: string): boolean {
    return /\b(interview|candidate|hiring|question|applicant)\b/i.test(text);
  }

  private static isLecture(text: string): boolean {
    return /\b(lecture|class|lesson|course|teach|learn|student)\b/i.test(text);
  }

  private static isPodcast(text: string): boolean {
    return /\b(podcast|episode|host|guest|show|episode)\b/i.test(text);
  }

  private static isNote(text: string): boolean {
    return /\b(note|reminder|memo|remember|jot down)\b/i.test(text);
  }

  private static containsTechnical(text: string): boolean {
    return /\b(code|api|function|database|server|deploy|bug|feature|programming|software|development)\b/i.test(text);
  }

  private static containsBusiness(text: string): boolean {
    return /\b(business|client|revenue|budget|strategy|proposal|contract|sales|marketing)\b/i.test(text);
  }

  private static containsGaming(text: string): boolean {
    return /\b(game|campaign|character|dice|dungeon|dragon|quest|adventure|rpg|d&d)\b/i.test(text);
  }

  private static containsAutomotive(text: string): boolean {
    return /\b(car|vehicle|tesla|engine|maintenance|repair|driving|tire|oil)\b/i.test(text);
  }

  private static containsPersonal(text: string): boolean {
    return /\b(grocery|recipe|family|personal|health|workout|vacation|appointment)\b/i.test(text);
  }

  private static hasActionItems(text: string): boolean {
    return /\b(need to|have to|must|should|todo|action item|remember to)\b/i.test(text);
  }

  private static hasDecisions(text: string): boolean {
    return /\b(decided|decision|chose|going with|will use|selected)\b/i.test(text);
  }

  private static isUrgent(text: string): boolean {
    return /\b(urgent|asap|immediately|priority|critical|emergency|important)\b/i.test(text);
  }

  private static hasCodeMentions(text: string): boolean {
    return /```[\s\S]*?```|`[^`]+`|\b(function|class|const|let|var|import|export)\b/i.test(text);
  }

  private static hasAPIDiscussion(text: string): boolean {
    return /\b(api|endpoint|rest|graphql|request|response|http|get|post|put|delete)\b/i.test(text);
  }
}

export default AudioAutoTagger;
