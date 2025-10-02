// app/api/agents/audio-intelligence/route.ts
// Advanced Audio Intelligence Agent for transcription and meeting insights

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { AudioIntelligence } from '@/lib/audio-intelligence';
import { SpeakerDiarization } from '@/lib/speaker-diarization';
import { CostMonitoredOpenAI } from '@/lib/openai-cost-wrapper';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface AudioIntelligenceRequest {
  action: 'transcribe' | 'analyze_meeting' | 'extract_insights' | 'speaker_identification' | 'action_items' | 'summary' | 'sentiment_analysis' | 'topic_modeling' | 'search_transcripts' | 'real_time_process';
  userId?: string;
  audioFile?: File;
  transcriptionId?: string;
  meetingId?: string;
  options?: {
    speakerNames?: { [speakerId: string]: string };
    meetingType?: 'conference' | 'interview' | 'presentation' | 'brainstorm' | 'general';
    language?: string;
    enableRealTime?: boolean;
    includeEmotions?: boolean;
    extractKeyMoments?: boolean;
    generateActionItems?: boolean;
    performTopicModeling?: boolean;
    customPrompts?: string[];
    analysisDepth?: 'basic' | 'detailed' | 'comprehensive';
  };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const action = formData.get('action') as string;
    const userId = formData.get('userId') as string || 'zach';
    const audioFile = formData.get('audioFile') as File;
    const transcriptionId = formData.get('transcriptionId') as string;
    const meetingId = formData.get('meetingId') as string;
    const optionsStr = formData.get('options') as string;

    const options = optionsStr ? JSON.parse(optionsStr) : {};

    console.log(`[AUDIO-INTELLIGENCE] Processing ${action} for user ${userId}`);

    // Initialize services
    const costMonitoredOpenAI = new CostMonitoredOpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
      userId,
      enforceThrottling: true,
      autoTrack: true
    });

    const audioIntelligence = new AudioIntelligence(costMonitoredOpenAI, supabase, userId);
    const speakerDiarization = new SpeakerDiarization();

    switch (action) {
      case 'transcribe':
        return await handleAdvancedTranscription(audioIntelligence, speakerDiarization, audioFile, userId, options);

      case 'analyze_meeting':
        return await analyzeMeetingContent(audioIntelligence, transcriptionId || meetingId, options);

      case 'extract_insights':
        return await extractMeetingInsights(audioIntelligence, transcriptionId, options);

      case 'speaker_identification':
        return await identifySpeakers(speakerDiarization, audioIntelligence, transcriptionId, options);

      case 'action_items':
        return await extractActionItems(audioIntelligence, transcriptionId, options);

      case 'summary':
        return await generateMeetingSummary(audioIntelligence, transcriptionId, options);

      case 'sentiment_analysis':
        return await analyzeSentiment(audioIntelligence, transcriptionId, options);

      case 'topic_modeling':
        return await performTopicModeling(audioIntelligence, transcriptionId, options);

      case 'search_transcripts':
        return await searchTranscripts(audioIntelligence, options);

      case 'real_time_process':
        return await processRealTimeAudio(audioIntelligence, speakerDiarization, audioFile, userId, options);

      default:
        return NextResponse.json({
          error: 'Invalid action specified'
        }, { status: 400 });
    }

  } catch (error: any) {
    console.error('[AUDIO-INTELLIGENCE] Error:', error);
    return NextResponse.json({
      error: 'Failed to process audio intelligence request',
      details: error.message
    }, { status: 500 });
  }
}

async function handleAdvancedTranscription(
  audioIntelligence: AudioIntelligence,
  speakerDiarization: SpeakerDiarization,
  audioFile: File,
  userId: string,
  options: any = {}
) {
  if (!audioFile) {
    return NextResponse.json({
      error: 'No audio file provided'
    }, { status: 400 });
  }

  // Perform advanced transcription with speaker identification
  const result = await audioIntelligence.advancedTranscription(audioFile, {
    enableSpeakerDiarization: true,
    speakerNames: options.speakerNames,
    language: options.language || 'en',
    includeEmotions: options.includeEmotions || false,
    meetingType: options.meetingType || 'general'
  });

  // Speaker diarization is included in the result from advancedTranscription
  const speakerAnalysis = result.speakers;

  // Store enhanced transcription
  const { data: transcription, error: dbError } = await supabase
    .from('audio_intelligence_sessions')
    .insert({
      user_id: userId,
      filename: audioFile.name,
      file_size: audioFile.size,
      transcription_data: result,
      session_type: 'transcription',
      meeting_type: options.meetingType || 'general',
      processing_options: options,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (dbError) {
    console.error('[AUDIO-INTELLIGENCE] Database error:', dbError);
  }

  return NextResponse.json({
    success: true,
    action: 'transcribe',
    result: {
      transcriptionId: transcription?.id,
      text: result.text,
      speakers: result.speakers,
      segments: result.segments,
      duration: result.duration,
      language: result.language,
      speakerAnalysis: speakerAnalysis,
      confidence: result.confidence,
      processingTime: result.processingTime
    }
  });
}

async function analyzeMeetingContent(audioIntelligence: AudioIntelligence, sessionId: string, options: any = {}) {
  const analysis = await audioIntelligence.analyzeMeetingContent(sessionId, {
    analysisDepth: options.analysisDepth || 'detailed',
    extractActionItems: options.generateActionItems !== false,
    performSentimentAnalysis: options.includeEmotions !== false,
    identifyKeyMoments: options.extractKeyMoments !== false,
    customAnalysisPrompts: options.customPrompts || []
  });

  // Store analysis results
  await supabase
    .from('audio_intelligence_sessions')
    .update({
      analysis_data: analysis,
      updated_at: new Date().toISOString()
    })
    .eq('id', sessionId);

  return NextResponse.json({
    success: true,
    action: 'analyze_meeting',
    analysis: {
      summary: analysis.summary,
      keyTopics: analysis.keyTopics,
      actionItems: analysis.actionItems,
      participants: analysis.participants,
      sentiment: analysis.sentiment,
      keyMoments: analysis.keyMoments,
      meetingEffectiveness: analysis.meetingEffectiveness,
      followUpSuggestions: analysis.followUpSuggestions
    }
  });
}

async function extractMeetingInsights(audioIntelligence: AudioIntelligence, sessionId: string, options: any = {}) {
  const insights = await audioIntelligence.extractMeetingInsights(sessionId, {
    includeParticipationMetrics: true,
    analyzeSpeakingPatterns: true,
    identifyDecisionPoints: true,
    extractCommitments: true,
    analyzeFollowUps: true
  });

  return NextResponse.json({
    success: true,
    action: 'extract_insights',
    insights: {
      participationMetrics: insights.participationMetrics,
      speakingPatterns: insights.speakingPatterns,
      decisionPoints: insights.decisionPoints,
      commitments: insights.commitments,
      followUps: insights.followUps,
      meetingDynamics: insights.meetingDynamics,
      improvementSuggestions: insights.improvementSuggestions
    }
  });
}

async function identifySpeakers(
  speakerDiarization: SpeakerDiarization,
  audioIntelligence: AudioIntelligence,
  sessionId: string,
  options: any = {}
) {
  // Get transcription data
  const { data: session } = await supabase
    .from('audio_intelligence_sessions')
    .select('transcription_data')
    .eq('id', sessionId)
    .single();

  if (!session?.transcription_data) {
    return NextResponse.json({
      error: 'Transcription data not found'
    }, { status: 404 });
  }

  const speakerAnalysis = await speakerDiarization.enhancedSpeakerIdentification(
    session.transcription_data.segments,
    {
      speakerNames: options.speakerNames,
      useVoiceprints: true,
      analyzeParticipation: true,
      identifyTurnTaking: true
    }
  );

  // Update session with speaker analysis
  await supabase
    .from('audio_intelligence_sessions')
    .update({
      speaker_analysis: speakerAnalysis,
      updated_at: new Date().toISOString()
    })
    .eq('id', sessionId);

  return NextResponse.json({
    success: true,
    action: 'speaker_identification',
    speakerAnalysis: {
      speakers: speakerAnalysis.speakers,
      speakingTime: speakerAnalysis.speakingTime,
      turnTaking: speakerAnalysis.turnTaking,
      voiceCharacteristics: speakerAnalysis.voiceCharacteristics,
      confidence: speakerAnalysis.confidence
    }
  });
}

async function extractActionItems(audioIntelligence: AudioIntelligence, sessionId: string, options: any = {}) {
  const actionItems = await audioIntelligence.extractActionItems(sessionId, {
    includeDeadlines: true,
    identifyOwners: true,
    categorizePriority: true,
    linkToContext: true
  });

  return NextResponse.json({
    success: true,
    action: 'action_items',
    actionItems: {
      items: actionItems.items,
      categorized: actionItems.categorized,
      timeline: actionItems.timeline,
      assignments: actionItems.assignments,
      priorities: actionItems.priorities
    }
  });
}

async function generateMeetingSummary(audioIntelligence: AudioIntelligence, sessionId: string, options: any = {}) {
  const summary = await audioIntelligence.generateMeetingSummary(sessionId, {
    summaryType: options.summaryType || 'comprehensive',
    includeQuotes: options.includeQuotes !== false,
    highlightDecisions: options.highlightDecisions !== false,
    addTimestamps: options.addTimestamps !== false
  });

  return NextResponse.json({
    success: true,
    action: 'summary',
    summary: {
      executiveSummary: summary.executiveSummary,
      detailedSummary: summary.detailedSummary,
      keyDecisions: summary.keyDecisions,
      quotableHighlights: summary.quotableHighlights,
      timelineOfEvents: summary.timelineOfEvents,
      nextSteps: summary.nextSteps
    }
  });
}

async function analyzeSentiment(audioIntelligence: AudioIntelligence, sessionId: string, options: any = {}) {
  const sentimentAnalysis = await audioIntelligence.analyzeSentiment(sessionId, {
    analyzeByTime: true,
    analyzeBySpeaker: true,
    identifyEmotionalPeaks: true,
    trackSentimentShifts: true
  });

  return NextResponse.json({
    success: true,
    action: 'sentiment_analysis',
    sentiment: {
      overallSentiment: sentimentAnalysis.overall,
      sentimentOverTime: sentimentAnalysis.timeline,
      speakerSentiments: sentimentAnalysis.speakers,
      topicSentiments: sentimentAnalysis.topics
    }
  });
}

async function performTopicModeling(audioIntelligence: AudioIntelligence, sessionId: string, options: any = {}) {
  const topicAnalysis = await audioIntelligence.performTopicModeling(sessionId, {
    numberOfTopics: options.numberOfTopics || 5,
    includeSubtopics: true,
    analyzeTopicFlow: true,
    identifyTopicOwners: true
  });

  return NextResponse.json({
    success: true,
    action: 'topic_modeling',
    topics: {
      mainTopics: topicAnalysis.mainTopics,
      subtopics: topicAnalysis.subtopics,
      topicFlow: topicAnalysis.topicFlow,
      topicOwnership: topicAnalysis.topicOwnership,
      topicSentiment: topicAnalysis.topicSentiment
    }
  });
}

async function searchTranscripts(audioIntelligence: AudioIntelligence, options: any = {}) {
  const searchResults = await audioIntelligence.searchTranscripts({
    query: options.query,
    userId: options.userId,
    dateRange: options.dateRange,
    meetingTypes: options.meetingTypes,
    speakers: options.speakers,
    semanticSearch: options.semanticSearch !== false
  });

  return NextResponse.json({
    success: true,
    action: 'search_transcripts',
    results: {
      matches: searchResults.matches,
      totalResults: searchResults.totalResults,
      relevanceScores: searchResults.relevanceScores,
      contextualSnippets: searchResults.contextualSnippets
    }
  });
}

async function processRealTimeAudio(
  audioIntelligence: AudioIntelligence,
  speakerDiarization: SpeakerDiarization,
  audioChunk: File,
  userId: string,
  options: any = {}
) {
  const realTimeResult = await audioIntelligence.processRealTimeAudio(audioChunk, {
    sessionId: options.sessionId,
    enableLiveDiarization: true,
    provideLiveInsights: true,
    detectActionItems: true,
    trackSentiment: true
  });

  return NextResponse.json({
    success: true,
    action: 'real_time_process',
    result: {
      transcription: realTimeResult.transcription,
      speakers: realTimeResult.speakers,
      liveInsights: realTimeResult.liveInsights,
      actionItems: realTimeResult.actionItems,
      sentiment: realTimeResult.sentiment,
      confidence: realTimeResult.confidence
    }
  });
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId') || 'zach';
  const action = url.searchParams.get('action');

  try {
    switch (action) {
      case 'sessions':
        return await getUserSessions(userId);

      case 'analytics':
        return await getAudioAnalytics(userId);

      case 'capabilities':
        return await getCapabilities();

      default:
        return await getCapabilities();
    }
  } catch (error) {
    console.error('[AUDIO-INTELLIGENCE] GET error:', error);
    return NextResponse.json({
      error: 'Failed to process request'
    }, { status: 500 });
  }
}

async function getUserSessions(userId: string) {
  const { data: sessions, error } = await supabase
    .from('audio_intelligence_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;

  return NextResponse.json({
    success: true,
    sessions: sessions
  });
}

async function getAudioAnalytics(userId: string) {
  // Get comprehensive analytics for user's audio intelligence usage
  const { data: analytics } = await supabase.rpc('get_audio_intelligence_analytics', {
    p_user_id: userId
  });

  return NextResponse.json({
    success: true,
    analytics: analytics || {
      totalSessions: 0,
      totalDuration: 0,
      averageMeetingLength: 0,
      mostActiveHours: [],
      topicTrends: [],
      speakerParticipation: [],
      sentimentTrends: [],
      actionItemsGenerated: 0
    }
  });
}

async function getCapabilities() {
  return NextResponse.json({
    success: true,
    capabilities: {
      transcription: {
        features: [
          'Advanced multi-speaker transcription',
          'Real-time processing',
          'Multiple language support',
          'Emotion detection',
          'Confidence scoring'
        ],
        supportedFormats: ['mp3', 'wav', 'm4a', 'flac', 'webm'],
        maxFileSize: '100MB',
        maxDuration: '4 hours'
      },
      speakerIdentification: {
        features: [
          'Automatic speaker diarization',
          'Voice fingerprinting',
          'Speaker naming',
          'Participation analysis',
          'Turn-taking analysis'
        ],
        maxSpeakers: 20
      },
      meetingIntelligence: {
        features: [
          'Action item extraction',
          'Meeting summaries',
          'Topic modeling',
          'Sentiment analysis',
          'Key moment identification',
          'Decision tracking',
          'Follow-up suggestions'
        ],
        analysisTypes: ['basic', 'detailed', 'comprehensive']
      },
      realTime: {
        features: [
          'Live transcription',
          'Real-time speaker identification',
          'Live insights generation',
          'Streaming sentiment analysis'
        ],
        chunkSize: '30 seconds',
        latency: '< 2 seconds'
      },
      search: {
        features: [
          'Semantic search',
          'Contextual snippets',
          'Cross-meeting search',
          'Speaker-specific search',
          'Timeline search'
        ]
      }
    },
    status: 'ready'
  });
}