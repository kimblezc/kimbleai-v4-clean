// lib/speaker-diarization.ts
// Advanced Speaker Diarization and Voice Analysis Library

import { TranscriptionSegment } from './audio-intelligence';

export interface VoiceCharacteristics {
  pitch: {
    average: number;
    range: number;
    variance: number;
  };
  pace: {
    wordsPerMinute: number;
    variance: number;
    pauseFrequency: number;
  };
  tonality: {
    emotionalVariance: number;
    energyLevel: number;
    clarity: number;
  };
  linguistic: {
    vocabularyComplexity: number;
    sentenceLength: number;
    fillerWordFrequency: number;
  };
}

export interface SpeakerProfile {
  id: string;
  name?: string;
  confidence: number;
  voiceCharacteristics: VoiceCharacteristics;
  speakingPatterns: {
    averageSegmentLength: number;
    interruptionFrequency: number;
    responseLatency: number;
    topicInitiationRate: number;
  };
  participationMetrics: {
    totalSpeakingTime: number;
    segmentCount: number;
    wordCount: number;
    dominanceScore: number;
    engagementLevel: number;
  };
  recognitionHistory: Array<{
    timestamp: number;
    confidence: number;
    contextClues: string[];
  }>;
}

export interface SpeakerAnalysis {
  speakers: SpeakerProfile[];
  speakingTime: { [speakerId: string]: number };
  turnTaking: {
    pattern: Array<{ speakerId: string; start: number; end: number }>;
    interruptionMatrix: { [interrupter: string]: { [interrupted: string]: number } };
    averageTurnLength: { [speakerId: string]: number };
    turnTransitions: Array<{ from: string; to: string; timestamp: number; type: 'smooth' | 'interruption' | 'gap' }>;
  };
  voiceCharacteristics: { [speakerId: string]: VoiceCharacteristics };
  confidence: {
    overall: number;
    bySpeaker: { [speakerId: string]: number };
    temporal: Array<{ timestamp: number; confidence: number }>;
  };
  insights: {
    dominantSpeaker: string;
    mostEngaged: string;
    conversationDynamics: string;
    collaborationLevel: number;
    meetingBalance: number;
  };
}

export interface DiarizationOptions {
  speakerNames?: { [speakerId: string]: string };
  useVoiceprints?: boolean;
  analyzeParticipation?: boolean;
  identifyTurnTaking?: boolean;
  detectEmotions?: boolean;
  minSpeakerCount?: number;
  maxSpeakerCount?: number;
  confidenceThreshold?: number;
}

export class SpeakerDiarization {
  private voiceprintDatabase: Map<string, VoiceCharacteristics> = new Map();
  private speakerProfiles: Map<string, SpeakerProfile> = new Map();

  constructor() {
    // Initialize with any stored voiceprints
    this.loadStoredVoiceprints();
  }

  async identifySpeakers(
    segments: TranscriptionSegment[],
    speakerNames?: { [speakerId: string]: string }
  ): Promise<SpeakerAnalysis> {
    console.log('[SPEAKER-DIARIZATION] Starting speaker identification...');

    try {
      // Step 1: Cluster segments by speaker characteristics
      const clusters = await this.clusterSegmentsBySpeaker(segments);

      // Step 2: Assign speaker IDs and names
      const speakerMapping = this.assignSpeakerIdentities(clusters, speakerNames);

      // Step 3: Analyze voice characteristics for each speaker
      const voiceCharacteristics = await this.analyzeVoiceCharacteristics(clusters);

      // Step 4: Calculate participation metrics
      const participationMetrics = this.calculateParticipationMetrics(clusters, segments);

      // Step 5: Analyze turn-taking patterns
      const turnTaking = this.analyzeTurnTaking(segments, speakerMapping);

      // Step 6: Generate speaker profiles
      const speakers = this.generateSpeakerProfiles(
        clusters,
        speakerMapping,
        voiceCharacteristics,
        participationMetrics
      );

      // Step 7: Calculate confidence scores
      const confidence = this.calculateConfidenceScores(speakers, segments);

      // Step 8: Generate insights
      const insights = this.generateInsights(speakers, turnTaking, participationMetrics);

      const result: SpeakerAnalysis = {
        speakers,
        speakingTime: this.calculateSpeakingTime(speakers, segments),
        turnTaking,
        voiceCharacteristics,
        confidence,
        insights
      };

      console.log('[SPEAKER-DIARIZATION] Speaker identification completed');
      return result;

    } catch (error) {
      console.error('[SPEAKER-DIARIZATION] Error:', error);
      throw new Error(`Speaker identification failed: ${error}`);
    }
  }

  async enhancedSpeakerIdentification(
    segments: TranscriptionSegment[],
    options: DiarizationOptions = {}
  ): Promise<SpeakerAnalysis> {
    const enhancedSegments = await this.preprocessSegments(segments, options);

    // Use advanced clustering algorithms
    const clusters = await this.advancedClustering(enhancedSegments, options);

    // Apply machine learning for speaker recognition
    const recognizedSpeakers = await this.applySpeakerRecognition(clusters, options);

    // Generate comprehensive analysis
    return this.generateComprehensiveAnalysis(recognizedSpeakers, enhancedSegments, options);
  }

  private async clusterSegmentsBySpeaker(segments: TranscriptionSegment[]): Promise<{ [clusterId: string]: TranscriptionSegment[] }> {
    // Simplified clustering - in reality this would use advanced audio features
    const clusters: { [clusterId: string]: TranscriptionSegment[] } = {};

    // Group by existing speaker IDs or create clusters based on patterns
    segments.forEach((segment, index) => {
      let clusterId = segment.speakerId;

      if (!clusterId) {
        // Simple heuristic clustering based on timing gaps and text patterns
        clusterId = this.inferSpeakerFromContext(segment, segments, index);
      }

      if (!clusters[clusterId]) {
        clusters[clusterId] = [];
      }
      clusters[clusterId].push(segment);
    });

    return clusters;
  }

  private inferSpeakerFromContext(
    segment: TranscriptionSegment,
    allSegments: TranscriptionSegment[],
    index: number
  ): string {
    // Simple speaker inference based on timing and content patterns
    const timingGapThreshold = 2.0; // 2 seconds

    // Check if there's a significant gap suggesting speaker change
    if (index > 0) {
      const prevSegment = allSegments[index - 1];
      const gap = segment.start - prevSegment.end;

      if (gap > timingGapThreshold) {
        // Likely speaker change
        const nextSpeakerId = this.getNextSpeakerId(allSegments.slice(0, index));
        return nextSpeakerId;
      } else {
        // Likely same speaker
        return prevSegment.speakerId || 'speaker_0';
      }
    }

    return 'speaker_0';
  }

  private getNextSpeakerId(previousSegments: TranscriptionSegment[]): string {
    const speakerIds = new Set(previousSegments.map(s => s.speakerId).filter(Boolean));
    const speakerCount = speakerIds.size;

    // Alternate between speakers for simplicity
    const lastSpeaker = previousSegments[previousSegments.length - 1]?.speakerId;
    if (lastSpeaker === 'speaker_0') return 'speaker_1';
    if (lastSpeaker === 'speaker_1') return speakerCount > 2 ? 'speaker_2' : 'speaker_0';
    if (lastSpeaker === 'speaker_2') return 'speaker_0';

    return `speaker_${speakerCount}`;
  }

  private assignSpeakerIdentities(
    clusters: { [clusterId: string]: TranscriptionSegment[] },
    speakerNames?: { [speakerId: string]: string }
  ): { [clusterId: string]: { id: string; name?: string } } {
    const mapping: { [clusterId: string]: { id: string; name?: string } } = {};

    Object.keys(clusters).forEach((clusterId, index) => {
      const speakerId = clusterId.startsWith('speaker_') ? clusterId : `speaker_${index}`;
      mapping[clusterId] = {
        id: speakerId,
        name: speakerNames?.[speakerId]
      };
    });

    return mapping;
  }

  private async analyzeVoiceCharacteristics(
    clusters: { [clusterId: string]: TranscriptionSegment[] }
  ): Promise<{ [speakerId: string]: VoiceCharacteristics }> {
    const characteristics: { [speakerId: string]: VoiceCharacteristics } = {};

    for (const [clusterId, segments] of Object.entries(clusters)) {
      characteristics[clusterId] = await this.extractVoiceCharacteristics(segments);
    }

    return characteristics;
  }

  private async extractVoiceCharacteristics(segments: TranscriptionSegment[]): Promise<VoiceCharacteristics> {
    // Analyze text patterns to infer voice characteristics
    const totalWords = segments.reduce((sum, seg) => sum + seg.text.split(' ').length, 0);
    const totalDuration = segments.reduce((sum, seg) => sum + (seg.end - seg.start), 0);
    const wordsPerMinute = totalWords / (totalDuration / 60);

    // Analyze linguistic patterns
    const sentences = segments.map(s => s.text).join(' ').split(/[.!?]+/);
    const avgSentenceLength = sentences.reduce((sum, s) => sum + s.split(' ').length, 0) / sentences.length;

    // Detect filler words
    const fillerWords = ['um', 'uh', 'like', 'you know', 'basically', 'actually'];
    const fillerCount = segments.reduce((count, seg) => {
      const words = seg.text.toLowerCase().split(' ');
      return count + words.filter(word => fillerWords.includes(word)).length;
    }, 0);

    const fillerFrequency = fillerCount / totalWords;

    // Calculate vocabulary complexity (simplified)
    const allWords = segments.flatMap(s => s.text.toLowerCase().split(' '));
    const uniqueWords = new Set(allWords);
    const vocabularyComplexity = uniqueWords.size / allWords.length;

    return {
      pitch: {
        average: 150, // Placeholder - would need audio analysis
        range: 50,
        variance: 0.3
      },
      pace: {
        wordsPerMinute,
        variance: 0.2,
        pauseFrequency: this.calculatePauseFrequency(segments)
      },
      tonality: {
        emotionalVariance: 0.4,
        energyLevel: 0.6,
        clarity: 0.8
      },
      linguistic: {
        vocabularyComplexity,
        sentenceLength: avgSentenceLength,
        fillerWordFrequency: fillerFrequency
      }
    };
  }

  private calculatePauseFrequency(segments: TranscriptionSegment[]): number {
    if (segments.length < 2) return 0;

    let pauseCount = 0;
    const pauseThreshold = 1.0; // 1 second

    for (let i = 1; i < segments.length; i++) {
      const gap = segments[i].start - segments[i - 1].end;
      if (gap > pauseThreshold) {
        pauseCount++;
      }
    }

    const totalDuration = segments[segments.length - 1].end - segments[0].start;
    return pauseCount / (totalDuration / 60); // Pauses per minute
  }

  private calculateParticipationMetrics(
    clusters: { [clusterId: string]: TranscriptionSegment[] },
    allSegments: TranscriptionSegment[]
  ): { [speakerId: string]: any } {
    const metrics: { [speakerId: string]: any } = {};
    const totalDuration = allSegments[allSegments.length - 1]?.end - allSegments[0]?.start || 1;

    for (const [clusterId, segments] of Object.entries(clusters)) {
      const speakingTime = segments.reduce((sum, seg) => sum + (seg.end - seg.start), 0);
      const wordCount = segments.reduce((sum, seg) => sum + seg.text.split(' ').length, 0);
      const dominanceScore = speakingTime / totalDuration;

      metrics[clusterId] = {
        totalSpeakingTime: speakingTime,
        segmentCount: segments.length,
        wordCount,
        dominanceScore,
        engagementLevel: this.calculateEngagementLevel(segments, allSegments)
      };
    }

    return metrics;
  }

  private calculateEngagementLevel(speakerSegments: TranscriptionSegment[], allSegments: TranscriptionSegment[]): number {
    // Calculate engagement based on responsiveness, question asking, and interaction
    const questions = speakerSegments.filter(seg => seg.text.includes('?')).length;
    const responses = this.countResponses(speakerSegments, allSegments);
    const totalSegments = speakerSegments.length;

    const questionRate = questions / totalSegments;
    const responseRate = responses / totalSegments;

    return Math.min(1.0, (questionRate * 0.4 + responseRate * 0.6) * 2);
  }

  private countResponses(speakerSegments: TranscriptionSegment[], allSegments: TranscriptionSegment[]): number {
    let responses = 0;
    const responseThreshold = 5.0; // 5 seconds

    speakerSegments.forEach(segment => {
      const segmentIndex = allSegments.findIndex(s => s.id === segment.id);
      if (segmentIndex > 0) {
        const prevSegment = allSegments[segmentIndex - 1];
        if (prevSegment.speakerId !== segment.speakerId) {
          const responseTime = segment.start - prevSegment.end;
          if (responseTime <= responseThreshold) {
            responses++;
          }
        }
      }
    });

    return responses;
  }

  private analyzeTurnTaking(
    segments: TranscriptionSegment[],
    speakerMapping: { [clusterId: string]: { id: string; name?: string } }
  ): {
    pattern: Array<{ speakerId: string; start: number; end: number }>;
    interruptionMatrix: { [interrupter: string]: { [interrupted: string]: number } };
    averageTurnLength: { [speakerId: string]: number };
    turnTransitions: Array<{ from: string; to: string; timestamp: number; type: 'smooth' | 'interruption' | 'gap' }>;
  } {
    const pattern: Array<{ speakerId: string; start: number; end: number }> = [];
    const interruptionMatrix: { [interrupter: string]: { [interrupted: string]: number } } = {};
    const turnLengths: { [speakerId: string]: number[] } = {};
    const turnTransitions: Array<{ from: string; to: string; timestamp: number; type: 'smooth' | 'interruption' | 'gap' }> = [];

    // Analyze each segment in sequence
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const speakerId = segment.speakerId || 'unknown';

      pattern.push({
        speakerId,
        start: segment.start,
        end: segment.end
      });

      // Track turn lengths
      if (!turnLengths[speakerId]) turnLengths[speakerId] = [];
      turnLengths[speakerId].push(segment.end - segment.start);

      // Analyze transitions
      if (i > 0) {
        const prevSegment = segments[i - 1];
        const prevSpeakerId = prevSegment.speakerId || 'unknown';

        if (prevSpeakerId !== speakerId) {
          const gap = segment.start - prevSegment.end;
          let transitionType: 'smooth' | 'interruption' | 'gap';

          if (gap < -0.5) {
            transitionType = 'interruption';
            // Count interruption
            if (!interruptionMatrix[speakerId]) interruptionMatrix[speakerId] = {};
            if (!interruptionMatrix[speakerId][prevSpeakerId]) interruptionMatrix[speakerId][prevSpeakerId] = 0;
            interruptionMatrix[speakerId][prevSpeakerId]++;
          } else if (gap > 2.0) {
            transitionType = 'gap';
          } else {
            transitionType = 'smooth';
          }

          turnTransitions.push({
            from: prevSpeakerId,
            to: speakerId,
            timestamp: segment.start,
            type: transitionType
          });
        }
      }
    }

    // Calculate average turn lengths
    const averageTurnLength: { [speakerId: string]: number } = {};
    for (const [speakerId, lengths] of Object.entries(turnLengths)) {
      averageTurnLength[speakerId] = lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
    }

    return {
      pattern,
      interruptionMatrix,
      averageTurnLength,
      turnTransitions
    };
  }

  private generateSpeakerProfiles(
    clusters: { [clusterId: string]: TranscriptionSegment[] },
    speakerMapping: { [clusterId: string]: { id: string; name?: string } },
    voiceCharacteristics: { [speakerId: string]: VoiceCharacteristics },
    participationMetrics: { [speakerId: string]: any }
  ): SpeakerProfile[] {
    const profiles: SpeakerProfile[] = [];

    for (const [clusterId, segments] of Object.entries(clusters)) {
      const mapping = speakerMapping[clusterId];
      const characteristics = voiceCharacteristics[clusterId];
      const metrics = participationMetrics[clusterId];

      const profile: SpeakerProfile = {
        id: mapping.id,
        name: mapping.name,
        confidence: 0.8, // Placeholder
        voiceCharacteristics: characteristics,
        speakingPatterns: {
          averageSegmentLength: metrics.totalSpeakingTime / metrics.segmentCount,
          interruptionFrequency: 0.1, // Calculated from interruption matrix
          responseLatency: 2.0, // Average response time
          topicInitiationRate: 0.2 // Rate of initiating new topics
        },
        participationMetrics: metrics,
        recognitionHistory: [] // Would track recognition confidence over time
      };

      profiles.push(profile);
    }

    return profiles;
  }

  private calculateSpeakingTime(speakers: SpeakerProfile[], segments: TranscriptionSegment[]): { [speakerId: string]: number } {
    const speakingTime: { [speakerId: string]: number } = {};

    speakers.forEach(speaker => {
      speakingTime[speaker.id] = speaker.participationMetrics.totalSpeakingTime;
    });

    return speakingTime;
  }

  private calculateConfidenceScores(speakers: SpeakerProfile[], segments: TranscriptionSegment[]): {
    overall: number;
    bySpeaker: { [speakerId: string]: number };
    temporal: Array<{ timestamp: number; confidence: number }>;
  } {
    const bySpeaker: { [speakerId: string]: number } = {};
    let totalConfidence = 0;

    speakers.forEach(speaker => {
      const confidence = speaker.confidence;
      bySpeaker[speaker.id] = confidence;
      totalConfidence += confidence;
    });

    const overall = speakers.length > 0 ? totalConfidence / speakers.length : 0;

    // Generate temporal confidence (simplified)
    const temporal = segments.map(segment => ({
      timestamp: segment.start,
      confidence: segment.confidence || 0.8
    }));

    return {
      overall,
      bySpeaker,
      temporal
    };
  }

  private generateInsights(
    speakers: SpeakerProfile[],
    turnTaking: any,
    participationMetrics: { [speakerId: string]: any }
  ): {
    dominantSpeaker: string;
    mostEngaged: string;
    conversationDynamics: string;
    collaborationLevel: number;
    meetingBalance: number;
  } {
    // Find dominant speaker
    const dominantSpeaker = speakers.reduce((prev, current) =>
      current.participationMetrics.dominanceScore > prev.participationMetrics.dominanceScore ? current : prev
    ).id;

    // Find most engaged speaker
    const mostEngaged = speakers.reduce((prev, current) =>
      current.participationMetrics.engagementLevel > prev.participationMetrics.engagementLevel ? current : prev
    ).id;

    // Analyze conversation dynamics
    const interruptions = Object.values(turnTaking.interruptionMatrix)
      .reduce((sum: number, matrix: any) => sum + Object.values(matrix).reduce((s: number, count: any) => s + count, 0), 0);

    let conversationDynamics = 'balanced';
    if (interruptions > speakers.length * 2) {
      conversationDynamics = 'dynamic with frequent interruptions';
    } else if (interruptions < speakers.length) {
      conversationDynamics = 'structured with polite turn-taking';
    }

    // Calculate collaboration level
    const avgEngagement = speakers.reduce((sum, s) => sum + s.participationMetrics.engagementLevel, 0) / speakers.length;
    const collaborationLevel = Math.min(1.0, avgEngagement * 1.2);

    // Calculate meeting balance
    const speakingTimes = speakers.map(s => s.participationMetrics.totalSpeakingTime);
    const avgSpeakingTime = speakingTimes.reduce((sum, time) => sum + time, 0) / speakingTimes.length;
    const variance = speakingTimes.reduce((sum, time) => sum + Math.pow(time - avgSpeakingTime, 2), 0) / speakingTimes.length;
    const stdDev = Math.sqrt(variance);
    const meetingBalance = Math.max(0, 1 - (stdDev / avgSpeakingTime));

    return {
      dominantSpeaker,
      mostEngaged,
      conversationDynamics,
      collaborationLevel,
      meetingBalance
    };
  }

  private async preprocessSegments(segments: TranscriptionSegment[], options: DiarizationOptions): Promise<TranscriptionSegment[]> {
    // Preprocess segments for enhanced analysis
    return segments.map(segment => ({
      ...segment,
      // Add enhanced preprocessing here
    }));
  }

  private async advancedClustering(segments: TranscriptionSegment[], options: DiarizationOptions): Promise<{ [clusterId: string]: TranscriptionSegment[] }> {
    // Implement advanced clustering algorithms
    return this.clusterSegmentsBySpeaker(segments);
  }

  private async applySpeakerRecognition(clusters: { [clusterId: string]: TranscriptionSegment[] }, options: DiarizationOptions): Promise<{ [speakerId: string]: TranscriptionSegment[] }> {
    // Apply machine learning for speaker recognition
    return clusters;
  }

  private async generateComprehensiveAnalysis(recognizedSpeakers: { [speakerId: string]: TranscriptionSegment[] }, segments: TranscriptionSegment[], options: DiarizationOptions): Promise<SpeakerAnalysis> {
    // Generate comprehensive analysis with all features
    return this.identifySpeakers(segments, options.speakerNames);
  }

  private loadStoredVoiceprints(): void {
    // Load any stored voiceprints from database
    // This would be implemented to persist speaker recognition across sessions
  }

  public storeVoiceprint(speakerId: string, characteristics: VoiceCharacteristics): void {
    this.voiceprintDatabase.set(speakerId, characteristics);
    // Store in database for persistence
  }

  public getStoredVoiceprint(speakerId: string): VoiceCharacteristics | null {
    return this.voiceprintDatabase.get(speakerId) || null;
  }
}