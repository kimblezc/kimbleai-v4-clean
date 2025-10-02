// lib/audio-intelligence.ts
// Advanced Audio Intelligence Library for transcription and meeting insights

import { SupabaseClient } from '@supabase/supabase-js';
import { CostMonitoredOpenAI } from './openai-cost-wrapper';

export interface TranscriptionSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  speakerId?: string;
  confidence: number;
  words?: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
  }>;
  emotion?: {
    sentiment: 'positive' | 'negative' | 'neutral';
    intensity: number;
    emotions: string[];
  };
}

export interface SpeakerInfo {
  id: string;
  name?: string;
  speakingTime: number;
  segments: number[];
  characteristics: {
    averagePace: number;
    toneVariation: number;
    confidenceLevel: number;
  };
}

export interface MeetingAnalysis {
  summary: {
    brief: string;
    detailed: string;
    keyPoints: string[];
  };
  actionItems: ActionItem[];
  keyTopics: TopicInfo[];
  participants: ParticipantAnalysis[];
  sentiment: SentimentAnalysis;
  keyMoments: KeyMoment[];
  meetingEffectiveness: {
    score: number;
    factors: string[];
    improvements: string[];
  };
  followUpSuggestions: string[];
}

export interface ActionItem {
  id: string;
  text: string;
  assignee?: string;
  deadline?: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  context: string;
  timestamp: number;
  status: 'pending' | 'in_progress' | 'completed';
  category: string;
}

export interface TopicInfo {
  topic: string;
  relevance: number;
  timeSpent: number;
  speakers: string[];
  keyPhases: string[];
  sentiment: number;
  subtopics: string[];
}

export interface ParticipantAnalysis {
  speakerId: string;
  name?: string;
  speakingTime: number;
  wordsSpoken: number;
  averageSegmentLength: number;
  topicsContributed: string[];
  engagementLevel: number;
  sentimentProfile: {
    overall: number;
    variance: number;
    peaks: { timestamp: number; sentiment: number }[];
  };
}

export interface SentimentAnalysis {
  overall: {
    sentiment: number;
    confidence: number;
    label: 'positive' | 'negative' | 'neutral';
  };
  timeline: Array<{
    timestamp: number;
    sentiment: number;
    context: string;
  }>;
  speakers: { [speakerId: string]: number };
  topics: { [topic: string]: number };
}

export interface KeyMoment {
  timestamp: number;
  duration: number;
  type: 'decision' | 'insight' | 'conflict' | 'agreement' | 'action_item' | 'key_quote';
  description: string;
  participants: string[];
  importance: number;
  context: string;
}

export class AudioIntelligence {
  constructor(
    private openai: CostMonitoredOpenAI,
    private supabase: SupabaseClient,
    private userId: string
  ) {}

  async advancedTranscription(
    audioFile: File,
    options: {
      enableSpeakerDiarization?: boolean;
      speakerNames?: { [speakerId: string]: string };
      language?: string;
      includeEmotions?: boolean;
      meetingType?: string;
    } = {}
  ): Promise<{
    text: string;
    segments: TranscriptionSegment[];
    speakers: SpeakerInfo[];
    duration: number;
    language: string;
    confidence: number;
    processingTime: number;
  }> {
    const startTime = Date.now();

    try {
      // Convert File to Buffer for OpenAI
      const bytes = await audioFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const file = new File([buffer], audioFile.name, { type: audioFile.type });

      // Enhanced Whisper transcription with timestamps
      console.log('[AUDIO-INTELLIGENCE] Starting enhanced transcription...');
      const transcription = await this.openai.audioTranscription({
        file: file,
        model: 'whisper-1',
        language: options.language || 'en',
        response_format: 'verbose_json',
        timestamp_granularities: ['word', 'segment']
      });

      // Process segments with enhanced features
      const enhancedSegments = await this.enhanceSegments(
        transcription.segments || [],
        options
      );

      // Extract speaker information if diarization is enabled
      const speakers = options.enableSpeakerDiarization
        ? await this.extractSpeakerInfo(enhancedSegments, options.speakerNames)
        : [];

      // Calculate overall confidence
      const confidence = this.calculateOverallConfidence(enhancedSegments);

      const processingTime = Date.now() - startTime;

      console.log(`[AUDIO-INTELLIGENCE] Transcription completed in ${processingTime}ms`);

      return {
        text: transcription.text,
        segments: enhancedSegments,
        speakers,
        duration: transcription.duration || 0,
        language: transcription.language || options.language || 'en',
        confidence,
        processingTime
      };

    } catch (error) {
      console.error('[AUDIO-INTELLIGENCE] Transcription error:', error);
      throw new Error(`Transcription failed: ${error}`);
    }
  }

  private async enhanceSegments(
    segments: any[],
    options: {
      includeEmotions?: boolean;
      meetingType?: string;
    } = {}
  ): Promise<TranscriptionSegment[]> {
    const enhancedSegments: TranscriptionSegment[] = [];

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const enhanced: TranscriptionSegment = {
        id: i,
        start: segment.start,
        end: segment.end,
        text: segment.text,
        confidence: segment.confidence || 0.8,
        words: segment.words?.map((w: any) => ({
          word: w.word,
          start: w.start,
          end: w.end,
          confidence: w.confidence || 0.8
        }))
      };

      // Add emotion analysis if requested
      if (options.includeEmotions) {
        enhanced.emotion = await this.analyzeSegmentEmotion(segment.text);
      }

      enhancedSegments.push(enhanced);
    }

    return enhancedSegments;
  }

  private async analyzeSegmentEmotion(text: string): Promise<{
    sentiment: 'positive' | 'negative' | 'neutral';
    intensity: number;
    emotions: string[];
  }> {
    try {
      const response = await this.openai.completion({
        model: 'gpt-4',
        messages: [{
          role: 'system',
          content: `Analyze the emotional content of the following text segment. Return a JSON object with:
          - sentiment: 'positive', 'negative', or 'neutral'
          - intensity: number from 0-1 indicating emotional intensity
          - emotions: array of specific emotions detected (e.g., ["enthusiasm", "concern", "excitement"])

          Be concise and accurate.`
        }, {
          role: 'user',
          content: text
        }],
        temperature: 0.3,
        max_tokens: 200
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error('No emotion analysis content');

      return JSON.parse(content);
    } catch (error) {
      console.error('[AUDIO-INTELLIGENCE] Emotion analysis error:', error);
      return {
        sentiment: 'neutral',
        intensity: 0,
        emotions: []
      };
    }
  }

  private async extractSpeakerInfo(
    segments: TranscriptionSegment[],
    speakerNames?: { [speakerId: string]: string }
  ): Promise<SpeakerInfo[]> {
    // This is a simplified speaker extraction - the SpeakerDiarization class handles the complex logic
    const speakers: { [id: string]: SpeakerInfo } = {};

    segments.forEach((segment, index) => {
      const speakerId = segment.speakerId || `speaker_${index % 3}`; // Simple fallback

      if (!speakers[speakerId]) {
        speakers[speakerId] = {
          id: speakerId,
          name: speakerNames?.[speakerId],
          speakingTime: 0,
          segments: [],
          characteristics: {
            averagePace: 0,
            toneVariation: 0,
            confidenceLevel: 0
          }
        };
      }

      speakers[speakerId].speakingTime += (segment.end - segment.start);
      speakers[speakerId].segments.push(segment.id);
    });

    return Object.values(speakers);
  }

  private calculateOverallConfidence(segments: TranscriptionSegment[]): number {
    if (segments.length === 0) return 0;

    const totalConfidence = segments.reduce((sum, segment) => sum + segment.confidence, 0);
    return totalConfidence / segments.length;
  }

  async analyzeMeetingContent(
    sessionId: string,
    options: {
      analysisDepth?: 'basic' | 'detailed' | 'comprehensive';
      extractActionItems?: boolean;
      performSentimentAnalysis?: boolean;
      identifyKeyMoments?: boolean;
      customAnalysisPrompts?: string[];
    } = {}
  ): Promise<MeetingAnalysis> {
    try {
      // Get session data
      const { data: session, error } = await this.supabase
        .from('audio_intelligence_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error || !session) {
        throw new Error('Session not found');
      }

      const transcriptionData = session.transcription_data;
      const fullText = transcriptionData.text;
      const segments = transcriptionData.segments;

      console.log('[AUDIO-INTELLIGENCE] Analyzing meeting content...');

      // Generate comprehensive analysis
      const analysisPrompt = this.buildAnalysisPrompt(fullText, options);

      const response = await this.openai.completion({
        model: 'gpt-4',
        messages: [{
          role: 'system',
          content: `You are an expert meeting analyst. Analyze the provided meeting transcript and provide comprehensive insights in JSON format.`
        }, {
          role: 'user',
          content: analysisPrompt
        }],
        temperature: 0.3,
        max_tokens: 4000
      });

      const analysisContent = response.choices[0].message.content;
      if (!analysisContent) throw new Error('No analysis content generated');

      const baseAnalysis = JSON.parse(analysisContent);

      // Enhance with additional analyses
      const analysis: MeetingAnalysis = {
        ...baseAnalysis,
        actionItems: options.extractActionItems ? await this.extractActionItems(sessionId) : [],
        sentiment: options.performSentimentAnalysis ? await this.analyzeSentiment(sessionId) : {} as SentimentAnalysis,
        keyMoments: options.identifyKeyMoments ? await this.identifyKeyMoments(segments) : []
      };

      return analysis;

    } catch (error) {
      console.error('[AUDIO-INTELLIGENCE] Meeting analysis error:', error);
      throw new Error(`Meeting analysis failed: ${error}`);
    }
  }

  private buildAnalysisPrompt(fullText: string, options: any): string {
    const depth = options.analysisDepth || 'detailed';

    let prompt = `Analyze this meeting transcript and provide insights in the following JSON format:

{
  "summary": {
    "brief": "2-3 sentence overview",
    "detailed": "Comprehensive summary covering all major points",
    "keyPoints": ["point 1", "point 2", "point 3"]
  },
  "keyTopics": [
    {
      "topic": "topic name",
      "relevance": 0.95,
      "timeSpent": 300,
      "speakers": ["speaker1", "speaker2"],
      "keyPhases": ["key phrase 1", "key phrase 2"],
      "sentiment": 0.7,
      "subtopics": ["subtopic1", "subtopic2"]
    }
  ],
  "participants": [
    {
      "speakerId": "speaker1",
      "speakingTime": 450,
      "wordsSpoken": 850,
      "topicsContributed": ["topic1", "topic2"],
      "engagementLevel": 0.8
    }
  ],
  "meetingEffectiveness": {
    "score": 0.75,
    "factors": ["clear agenda", "active participation"],
    "improvements": ["suggestion 1", "suggestion 2"]
  },
  "followUpSuggestions": ["suggestion 1", "suggestion 2"]
}`;

    if (depth === 'comprehensive') {
      prompt += `\n\nProvide extra detail in all sections and include additional insights about meeting dynamics, decision-making patterns, and communication effectiveness.`;
    }

    if (options.customAnalysisPrompts?.length > 0) {
      prompt += `\n\nAdditional analysis requirements:\n${options.customAnalysisPrompts.join('\n')}`;
    }

    prompt += `\n\nMeeting Transcript:\n${fullText}`;

    return prompt;
  }

  async extractActionItems(sessionId: string, options: {
    includeDeadlines?: boolean;
    identifyOwners?: boolean;
    categorizePriority?: boolean;
    linkToContext?: boolean;
  } = {}): Promise<{
    items: ActionItem[];
    categorized: { [category: string]: ActionItem[] };
    timeline: { [date: string]: ActionItem[] };
    assignments: { [assignee: string]: ActionItem[] };
    priorities: { [priority: string]: ActionItem[] };
  }> {
    try {
      // Get session data
      const { data: session } = await this.supabase
        .from('audio_intelligence_sessions')
        .select('transcription_data')
        .eq('id', sessionId)
        .single();

      if (!session) throw new Error('Session not found');

      const fullText = session.transcription_data.text;

      const response = await this.openai.completion({
        model: 'gpt-4',
        messages: [{
          role: 'system',
          content: `Extract action items from the meeting transcript. Return a JSON array of action items with this structure:
          {
            "id": "unique_id",
            "text": "action description",
            "assignee": "person assigned (if mentioned)",
            "deadline": "ISO date if mentioned",
            "priority": "low|medium|high|urgent",
            "context": "surrounding context from transcript",
            "timestamp": "approximate time in seconds",
            "category": "category like 'follow-up', 'research', 'meeting', 'deliverable'",
            "status": "pending"
          }`
        }, {
          role: 'user',
          content: `Meeting transcript:\n${fullText}`
        }],
        temperature: 0.3,
        max_tokens: 2000
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error('No action items generated');

      const items: ActionItem[] = JSON.parse(content);

      // Categorize and organize
      const categorized: { [category: string]: ActionItem[] } = {};
      const timeline: { [date: string]: ActionItem[] } = {};
      const assignments: { [assignee: string]: ActionItem[] } = {};
      const priorities: { [priority: string]: ActionItem[] } = {};

      items.forEach(item => {
        // Categorize
        if (!categorized[item.category]) categorized[item.category] = [];
        categorized[item.category].push(item);

        // Timeline
        if (item.deadline) {
          const dateKey = new Date(item.deadline).toISOString().split('T')[0];
          if (!timeline[dateKey]) timeline[dateKey] = [];
          timeline[dateKey].push(item);
        }

        // Assignments
        if (item.assignee) {
          if (!assignments[item.assignee]) assignments[item.assignee] = [];
          assignments[item.assignee].push(item);
        }

        // Priorities
        if (!priorities[item.priority]) priorities[item.priority] = [];
        priorities[item.priority].push(item);
      });

      return {
        items,
        categorized,
        timeline,
        assignments,
        priorities
      };

    } catch (error) {
      console.error('[AUDIO-INTELLIGENCE] Action items extraction error:', error);
      throw error;
    }
  }

  async generateMeetingSummary(
    sessionId: string,
    options: {
      summaryType?: 'brief' | 'detailed' | 'comprehensive';
      includeQuotes?: boolean;
      highlightDecisions?: boolean;
      addTimestamps?: boolean;
    } = {}
  ): Promise<{
    executiveSummary: string;
    detailedSummary: string;
    keyDecisions: string[];
    quotableHighlights: string[];
    timelineOfEvents: Array<{ time: string; event: string }>;
    nextSteps: string[];
  }> {
    try {
      const { data: session } = await this.supabase
        .from('audio_intelligence_sessions')
        .select('transcription_data')
        .eq('id', sessionId)
        .single();

      if (!session) throw new Error('Session not found');

      const fullText = session.transcription_data.text;
      const segments = session.transcription_data.segments;

      const response = await this.openai.completion({
        model: 'gpt-4',
        messages: [{
          role: 'system',
          content: `Generate a comprehensive meeting summary in JSON format with these sections:
          {
            "executiveSummary": "Brief executive summary (2-3 sentences)",
            "detailedSummary": "Detailed summary covering all major points",
            "keyDecisions": ["decision 1", "decision 2"],
            "quotableHighlights": ["notable quote 1", "notable quote 2"],
            "timelineOfEvents": [{"time": "10:30", "event": "discussion started on..."}],
            "nextSteps": ["next step 1", "next step 2"]
          }`
        }, {
          role: 'user',
          content: `Meeting transcript:\n${fullText}`
        }],
        temperature: 0.3,
        max_tokens: 2000
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error('No summary generated');

      return JSON.parse(content);

    } catch (error) {
      console.error('[AUDIO-INTELLIGENCE] Summary generation error:', error);
      throw error;
    }
  }

  async analyzeSentiment(sessionId: string, options: {
    analyzeByTime?: boolean;
    analyzeBySpeaker?: boolean;
    identifyEmotionalPeaks?: boolean;
    trackSentimentShifts?: boolean;
  } = {}): Promise<SentimentAnalysis> {
    try {
      const { data: session } = await this.supabase
        .from('audio_intelligence_sessions')
        .select('transcription_data')
        .eq('id', sessionId)
        .single();

      if (!session) throw new Error('Session not found');

      const segments = session.transcription_data.segments;
      const speakers = session.transcription_data.speakers || [];

      // Analyze overall sentiment
      const overallSentiment = await this.calculateOverallSentiment(segments);

      // Analyze sentiment over time
      const timeline = options.analyzeByTime
        ? await this.analyzeSentimentTimeline(segments)
        : [];

      // Analyze by speaker
      const speakerSentiments: { [speakerId: string]: number } = {};
      if (options.analyzeBySpeaker) {
        for (const speaker of speakers) {
          const speakerSegments = segments.filter(s => s.speakerId === speaker.id);
          speakerSentiments[speaker.id] = await this.calculateSegmentsSentiment(speakerSegments);
        }
      }

      return {
        overall: overallSentiment,
        timeline,
        speakers: speakerSentiments,
        topics: {} // Could be enhanced with topic-specific sentiment
      };

    } catch (error) {
      console.error('[AUDIO-INTELLIGENCE] Sentiment analysis error:', error);
      throw error;
    }
  }

  private async calculateOverallSentiment(segments: TranscriptionSegment[]): Promise<{
    sentiment: number;
    confidence: number;
    label: 'positive' | 'negative' | 'neutral';
  }> {
    const fullText = segments.map(s => s.text).join(' ');

    const response = await this.openai.completion({
      model: 'gpt-4',
      messages: [{
        role: 'system',
        content: `Analyze the sentiment of this text. Return JSON: {"sentiment": number_between_-1_and_1, "confidence": confidence_0_to_1, "label": "positive|negative|neutral"}`
      }, {
        role: 'user',
        content: fullText
      }],
      temperature: 0.1,
      max_tokens: 100
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('No sentiment analysis');

    return JSON.parse(content);
  }

  private async analyzeSentimentTimeline(segments: TranscriptionSegment[]): Promise<Array<{
    timestamp: number;
    sentiment: number;
    context: string;
  }>> {
    const timeline = [];
    const windowSize = 30; // 30-second windows

    for (let i = 0; i < segments.length; i += windowSize) {
      const windowSegments = segments.slice(i, i + windowSize);
      const text = windowSegments.map(s => s.text).join(' ');
      const timestamp = windowSegments[0]?.start || 0;

      if (text.trim()) {
        const sentiment = await this.calculateSegmentsSentiment(windowSegments);
        timeline.push({
          timestamp,
          sentiment,
          context: text.substring(0, 100) + '...'
        });
      }
    }

    return timeline;
  }

  private async calculateSegmentsSentiment(segments: TranscriptionSegment[]): Promise<number> {
    if (segments.length === 0) return 0;

    const text = segments.map(s => s.text).join(' ');

    try {
      const response = await this.openai.completion({
        model: 'gpt-4',
        messages: [{
          role: 'system',
          content: 'Return only a number between -1 and 1 representing sentiment: -1 = very negative, 0 = neutral, 1 = very positive'
        }, {
          role: 'user',
          content: text
        }],
        temperature: 0.1,
        max_tokens: 10
      });

      const content = response.choices[0].message.content;
      return parseFloat(content?.trim() || '0') || 0;
    } catch (error) {
      return 0;
    }
  }

  async performTopicModeling(sessionId: string, options: {
    numberOfTopics?: number;
    includeSubtopics?: boolean;
    analyzeTopicFlow?: boolean;
    identifyTopicOwners?: boolean;
  } = {}): Promise<{
    mainTopics: TopicInfo[];
    subtopics: { [mainTopic: string]: string[] };
    topicFlow: Array<{ time: number; topic: string; transition: string }>;
    topicOwnership: { [topic: string]: string[] };
    topicSentiment: { [topic: string]: number };
  }> {
    try {
      const { data: session } = await this.supabase
        .from('audio_intelligence_sessions')
        .select('transcription_data')
        .eq('id', sessionId)
        .single();

      if (!session) throw new Error('Session not found');

      const fullText = session.transcription_data.text;
      const segments = session.transcription_data.segments;

      const response = await this.openai.completion({
        model: 'gpt-4',
        messages: [{
          role: 'system',
          content: `Analyze the topics discussed in this meeting. Return JSON with:
          {
            "mainTopics": [
              {
                "topic": "topic name",
                "relevance": 0.95,
                "timeSpent": 300,
                "speakers": ["speaker1"],
                "keyPhases": ["phrase1"],
                "sentiment": 0.7,
                "subtopics": ["sub1", "sub2"]
              }
            ],
            "topicFlow": [
              {"time": 120, "topic": "topic1", "transition": "smooth transition to..."}
            ]
          }`
        }, {
          role: 'user',
          content: fullText
        }],
        temperature: 0.3,
        max_tokens: 2000
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error('No topic analysis generated');

      const analysis = JSON.parse(content);

      // Enhance with additional processing
      const subtopics: { [mainTopic: string]: string[] } = {};
      const topicOwnership: { [topic: string]: string[] } = {};
      const topicSentiment: { [topic: string]: number } = {};

      analysis.mainTopics.forEach((topic: TopicInfo) => {
        subtopics[topic.topic] = topic.subtopics || [];
        topicOwnership[topic.topic] = topic.speakers || [];
        topicSentiment[topic.topic] = topic.sentiment || 0;
      });

      return {
        mainTopics: analysis.mainTopics,
        subtopics,
        topicFlow: analysis.topicFlow || [],
        topicOwnership,
        topicSentiment
      };

    } catch (error) {
      console.error('[AUDIO-INTELLIGENCE] Topic modeling error:', error);
      throw error;
    }
  }

  async extractMeetingInsights(sessionId: string, options: {
    includeParticipationMetrics?: boolean;
    analyzeSpeakingPatterns?: boolean;
    identifyDecisionPoints?: boolean;
    extractCommitments?: boolean;
    analyzeFollowUps?: boolean;
  } = {}): Promise<{
    participationMetrics: { [speakerId: string]: any };
    speakingPatterns: { [speakerId: string]: any };
    decisionPoints: Array<{ timestamp: number; decision: string; participants: string[] }>;
    commitments: Array<{ person: string; commitment: string; timestamp: number }>;
    followUps: Array<{ action: string; owner: string; deadline?: string }>;
    meetingDynamics: {
      interactionLevel: number;
      dominancePattern: string[];
      collaborationScore: number;
    };
    improvementSuggestions: string[];
  }> {
    // This would be a comprehensive analysis combining multiple methods
    // For now, return a structured placeholder that matches the interface
    return {
      participationMetrics: {},
      speakingPatterns: {},
      decisionPoints: [],
      commitments: [],
      followUps: [],
      meetingDynamics: {
        interactionLevel: 0.7,
        dominancePattern: [],
        collaborationScore: 0.8
      },
      improvementSuggestions: []
    };
  }

  async searchTranscripts(options: {
    query?: string;
    userId?: string;
    dateRange?: { start: Date; end: Date };
    meetingTypes?: string[];
    speakers?: string[];
    semanticSearch?: boolean;
  } = {}): Promise<{
    matches: Array<{
      sessionId: string;
      snippet: string;
      relevance: number;
      timestamp: number;
      context: string;
    }>;
    totalResults: number;
    relevanceScores: number[];
    contextualSnippets: string[];
  }> {
    // Implement semantic search across transcripts
    // This would use vector embeddings stored during transcription
    return {
      matches: [],
      totalResults: 0,
      relevanceScores: [],
      contextualSnippets: []
    };
  }

  async processRealTimeAudio(audioChunk: File, options: {
    sessionId?: string;
    enableLiveDiarization?: boolean;
    provideLiveInsights?: boolean;
    detectActionItems?: boolean;
    trackSentiment?: boolean;
  } = {}): Promise<{
    transcription: string;
    speakers: string[];
    liveInsights: string[];
    actionItems: string[];
    sentiment: number;
    confidence: number;
  }> {
    // Implement real-time processing
    // This would handle streaming audio chunks
    return {
      transcription: '',
      speakers: [],
      liveInsights: [],
      actionItems: [],
      sentiment: 0,
      confidence: 0
    };
  }

  private async identifyKeyMoments(segments: TranscriptionSegment[]): Promise<KeyMoment[]> {
    // Identify significant moments in the conversation
    const keyMoments: KeyMoment[] = [];

    // This would analyze the segments for important moments
    // For now, return empty array as placeholder

    return keyMoments;
  }
}