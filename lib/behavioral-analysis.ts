import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface UserInteraction {
  id?: string;
  userId: string;
  type: string;
  data: any;
  context: any;
  timestamp: Date;
  outcome?: string;
  duration?: number;
  sessionId?: string;
}

export interface BehavioralPattern {
  id: string;
  type: string;
  description: string;
  frequency: number;
  confidence: number;
  conditions: any;
  outcomes: any[];
  lastSeen: Date;
  trends: any[];
}

export interface UserProfile {
  userId: string;
  preferences: any;
  patterns: BehavioralPattern[];
  workingHours: any;
  productivity: any;
  collaboration: any;
  tools: any;
  lastUpdated: Date;
}

export interface Analytics {
  patterns: BehavioralPattern[];
  insights: Insight[];
  recommendations: Recommendation[];
  metrics: any;
  trends: any[];
}

export interface Insight {
  id: string;
  type: string;
  description: string;
  impact: number;
  confidence: number;
  evidence: any[];
  actionable: boolean;
}

export interface Recommendation {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: number;
  impact: number;
  effort: number;
  actions: any[];
}

class BehavioralAnalysisService {
  private patternDetectors: Map<string, any> = new Map();
  private userProfiles: Map<string, UserProfile> = new Map();
  private sessionCache: Map<string, any> = new Map();

  constructor() {
    this.initializePatternDetectors();
  }

  private initializePatternDetectors() {
    // Temporal Pattern Detector
    this.patternDetectors.set('temporal', {
      name: 'Temporal Patterns',
      detect: this.detectTemporalPatterns.bind(this),
      threshold: 0.7,
      minOccurrences: 3
    });

    // Sequential Pattern Detector
    this.patternDetectors.set('sequential', {
      name: 'Sequential Patterns',
      detect: this.detectSequentialPatterns.bind(this),
      threshold: 0.6,
      minOccurrences: 2
    });

    // Context Pattern Detector
    this.patternDetectors.set('contextual', {
      name: 'Contextual Patterns',
      detect: this.detectContextualPatterns.bind(this),
      threshold: 0.8,
      minOccurrences: 5
    });

    // Workflow Pattern Detector
    this.patternDetectors.set('workflow', {
      name: 'Workflow Patterns',
      detect: this.detectWorkflowPatterns.bind(this),
      threshold: 0.75,
      minOccurrences: 3
    });

    // Collaboration Pattern Detector
    this.patternDetectors.set('collaboration', {
      name: 'Collaboration Patterns',
      detect: this.detectCollaborationPatterns.bind(this),
      threshold: 0.65,
      minOccurrences: 2
    });
  }

  async trackUserInteraction(interaction: UserInteraction): Promise<void> {
    try {
      // Enrich interaction with additional context
      const enrichedInteraction = await this.enrichInteraction(interaction);

      // Store interaction in database
      await this.storeInteraction(enrichedInteraction);

      // Update real-time patterns
      await this.updateRealtimePatterns(enrichedInteraction);

      // Update user profile
      await this.updateUserProfile(enrichedInteraction);

      // Trigger pattern analysis if threshold reached
      await this.checkPatternAnalysisTrigger(interaction.userId);

    } catch (error) {
      console.error('Error tracking user interaction:', error);
      throw error;
    }
  }

  private async enrichInteraction(interaction: UserInteraction): Promise<UserInteraction> {
    const enriched = { ...interaction };

    // Add session information
    enriched.sessionId = this.getOrCreateSession(interaction.userId);

    // Add contextual enrichment
    enriched.context = {
      ...interaction.context,
      timestamp: interaction.timestamp,
      dayOfWeek: interaction.timestamp.getDay(),
      hourOfDay: interaction.timestamp.getHours(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };

    // Add behavioral context
    const recentInteractions = await this.getRecentInteractions(interaction.userId, 1); // Last hour
    enriched.context.recentActivity = this.summarizeRecentActivity(recentInteractions);

    return enriched;
  }

  async getUserPatterns(userId: string): Promise<Analytics> {
    try {
      const userInteractions = await this.getUserInteractions(userId);
      const patterns = await this.analyzePatterns(userInteractions);
      const insights = await this.generateInsights(patterns, userInteractions);
      const recommendations = await this.generateRecommendations(insights, patterns);
      const metrics = this.calculateMetrics(userInteractions, patterns);
      const trends = this.calculateTrends(userInteractions);

      return {
        patterns,
        insights,
        recommendations,
        metrics,
        trends
      };
    } catch (error) {
      console.error('Error getting user patterns:', error);
      throw error;
    }
  }

  private async analyzePatterns(interactions: UserInteraction[]): Promise<BehavioralPattern[]> {
    const allPatterns: BehavioralPattern[] = [];

    for (const [type, detector] of this.patternDetectors) {
      try {
        const patterns = await detector.detect(interactions);
        allPatterns.push(...patterns.filter(p => p.confidence >= detector.threshold));
      } catch (error) {
        console.error(`Error in ${type} pattern detection:`, error);
      }
    }

    // Deduplicate and rank patterns
    return this.rankPatterns(this.deduplicatePatterns(allPatterns));
  }

  private async detectTemporalPatterns(interactions: UserInteraction[]): Promise<BehavioralPattern[]> {
    const patterns: BehavioralPattern[] = [];

    // Daily patterns
    const dailyPatterns = this.analyzeDailyPatterns(interactions);
    patterns.push(...dailyPatterns);

    // Weekly patterns
    const weeklyPatterns = this.analyzeWeeklyPatterns(interactions);
    patterns.push(...weeklyPatterns);

    // Seasonal patterns
    const seasonalPatterns = this.analyzeSeasonalPatterns(interactions);
    patterns.push(...seasonalPatterns);

    return patterns;
  }

  private analyzeDailyPatterns(interactions: UserInteraction[]): BehavioralPattern[] {
    const hourlyActivity = new Array(24).fill(0);
    const hourlyActions = new Array(24).fill(0).map(() => ({}));

    interactions.forEach(interaction => {
      const hour = interaction.timestamp.getHours();
      hourlyActivity[hour]++;

      const actionType = interaction.type;
      hourlyActions[hour][actionType] = (hourlyActions[hour][actionType] || 0) + 1;
    });

    const patterns: BehavioralPattern[] = [];

    // Find peak activity hours
    const avgActivity = hourlyActivity.reduce((a, b) => a + b, 0) / 24;
    const peakHours = hourlyActivity
      .map((activity, hour) => ({ hour, activity }))
      .filter(({ activity }) => activity > avgActivity * 1.5)
      .map(({ hour }) => hour);

    if (peakHours.length > 0) {
      patterns.push({
        id: `daily_peak_${peakHours.join('_')}`,
        type: 'temporal_daily',
        description: `Peak activity during hours: ${peakHours.join(', ')}`,
        frequency: peakHours.length / 24,
        confidence: this.calculateConfidence(peakHours.length, interactions.length),
        conditions: { hours: peakHours },
        outcomes: hourlyActions.filter((_, i) => peakHours.includes(i)),
        lastSeen: new Date(),
        trends: []
      });
    }

    return patterns;
  }

  private analyzeWeeklyPatterns(interactions: UserInteraction[]): BehavioralPattern[] {
    const weeklyActivity = new Array(7).fill(0);
    const weeklyActions = new Array(7).fill(0).map(() => ({}));

    interactions.forEach(interaction => {
      const day = interaction.timestamp.getDay();
      weeklyActivity[day]++;

      const actionType = interaction.type;
      weeklyActions[day][actionType] = (weeklyActions[day][actionType] || 0) + 1;
    });

    const patterns: BehavioralPattern[] = [];

    // Detect workday vs weekend patterns
    const workdayActivity = [1, 2, 3, 4, 5].reduce((sum, day) => sum + weeklyActivity[day], 0);
    const weekendActivity = [0, 6].reduce((sum, day) => sum + weeklyActivity[day], 0);

    if (workdayActivity > weekendActivity * 2) {
      patterns.push({
        id: 'weekly_workday_focus',
        type: 'temporal_weekly',
        description: 'Higher activity during workdays',
        frequency: workdayActivity / (workdayActivity + weekendActivity),
        confidence: 0.8,
        conditions: { workdays: true },
        outcomes: [weeklyActions[1], weeklyActions[2], weeklyActions[3], weeklyActions[4], weeklyActions[5]],
        lastSeen: new Date(),
        trends: []
      });
    }

    return patterns;
  }

  private analyzeSeasonalPatterns(interactions: UserInteraction[]): BehavioralPattern[] {
    // Implementation for seasonal pattern analysis
    return [];
  }

  private async detectSequentialPatterns(interactions: UserInteraction[]): Promise<BehavioralPattern[]> {
    const patterns: BehavioralPattern[] = [];
    const sequences = this.extractSequences(interactions);

    // Find common action sequences
    const sequenceFrequency = new Map<string, number>();
    sequences.forEach(sequence => {
      const key = sequence.map(s => s.type).join(' -> ');
      sequenceFrequency.set(key, (sequenceFrequency.get(key) || 0) + 1);
    });

    for (const [sequence, frequency] of sequenceFrequency) {
      if (frequency >= 3) { // Minimum frequency threshold
        patterns.push({
          id: `sequence_${sequence.replace(/\s+/g, '_')}`,
          type: 'sequential',
          description: `Common sequence: ${sequence}`,
          frequency: frequency / sequences.length,
          confidence: Math.min(frequency / 10, 1), // Confidence based on frequency
          conditions: { sequence: sequence.split(' -> ') },
          outcomes: [],
          lastSeen: new Date(),
          trends: []
        });
      }
    }

    return patterns;
  }

  private async detectContextualPatterns(interactions: UserInteraction[]): Promise<BehavioralPattern[]> {
    const patterns: BehavioralPattern[] = [];

    // Group interactions by context similarity
    const contextGroups = this.groupByContextSimilarity(interactions);

    for (const group of contextGroups) {
      if (group.length >= 5) { // Minimum group size
        const commonActions = this.findCommonActions(group);

        patterns.push({
          id: `contextual_${group[0].context?.page || 'unknown'}`,
          type: 'contextual',
          description: `Common actions in ${group[0].context?.page || 'similar'} context`,
          frequency: group.length / interactions.length,
          confidence: this.calculateContextualConfidence(group),
          conditions: { context: group[0].context },
          outcomes: commonActions,
          lastSeen: new Date(),
          trends: []
        });
      }
    }

    return patterns;
  }

  private async detectWorkflowPatterns(interactions: UserInteraction[]): Promise<BehavioralPattern[]> {
    const patterns: BehavioralPattern[] = [];

    // Detect project-based workflows
    const projectWorkflows = this.analyzeProjectWorkflows(interactions);
    patterns.push(...projectWorkflows);

    // Detect task-based workflows
    const taskWorkflows = this.analyzeTaskWorkflows(interactions);
    patterns.push(...taskWorkflows);

    return patterns;
  }

  private async detectCollaborationPatterns(interactions: UserInteraction[]): Promise<BehavioralPattern[]> {
    const patterns: BehavioralPattern[] = [];

    // Analyze collaboration interactions
    const collaborationInteractions = interactions.filter(i =>
      i.type.includes('share') ||
      i.type.includes('comment') ||
      i.type.includes('collaborate')
    );

    if (collaborationInteractions.length > 0) {
      patterns.push({
        id: 'collaboration_active',
        type: 'collaboration',
        description: 'Active collaboration patterns detected',
        frequency: collaborationInteractions.length / interactions.length,
        confidence: 0.7,
        conditions: { collaborationActive: true },
        outcomes: this.analyzeCollaborationOutcomes(collaborationInteractions),
        lastSeen: new Date(),
        trends: []
      });
    }

    return patterns;
  }

  async generateInsights(patterns: BehavioralPattern[], interactions: UserInteraction[]): Promise<Insight[]> {
    const insights: Insight[] = [];

    // Productivity insights
    const productivityInsight = this.analyzeProductivityPatterns(patterns, interactions);
    if (productivityInsight) insights.push(productivityInsight);

    // Efficiency insights
    const efficiencyInsight = this.analyzeEfficiencyPatterns(patterns, interactions);
    if (efficiencyInsight) insights.push(efficiencyInsight);

    // Collaboration insights
    const collaborationInsight = this.analyzeCollaborationInsights(patterns, interactions);
    if (collaborationInsight) insights.push(collaborationInsight);

    // Learning insights
    const learningInsight = this.analyzeLearningPatterns(patterns, interactions);
    if (learningInsight) insights.push(learningInsight);

    return insights;
  }

  async generateRecommendations(insights: Insight[], patterns: BehavioralPattern[]): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    for (const insight of insights) {
      const recommendation = await this.createRecommendationFromInsight(insight, patterns);
      if (recommendation) recommendations.push(recommendation);
    }

    return recommendations.sort((a, b) => (b.priority * b.impact) - (a.priority * a.impact));
  }

  async getAnalytics(userId: string): Promise<Analytics> {
    return this.getUserPatterns(userId);
  }

  // Helper methods
  private getOrCreateSession(userId: string): string {
    const sessionKey = `${userId}_${Date.now()}`;
    if (!this.sessionCache.has(userId)) {
      this.sessionCache.set(userId, sessionKey);
    }
    return this.sessionCache.get(userId);
  }

  private async getRecentInteractions(userId: string, hours: number): Promise<UserInteraction[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    // Implementation to fetch from database
    return [];
  }

  private summarizeRecentActivity(interactions: UserInteraction[]): any {
    return {
      actionCount: interactions.length,
      actionTypes: [...new Set(interactions.map(i => i.type))],
      timeSpan: interactions.length > 0 ?
        interactions[interactions.length - 1].timestamp.getTime() - interactions[0].timestamp.getTime() : 0
    };
  }

  private async storeInteraction(interaction: UserInteraction): Promise<void> {
    // Implementation to store in database
  }

  private async updateRealtimePatterns(interaction: UserInteraction): Promise<void> {
    // Implementation for real-time pattern updates
  }

  private async updateUserProfile(interaction: UserInteraction): Promise<void> {
    // Implementation for user profile updates
  }

  private async checkPatternAnalysisTrigger(userId: string): Promise<void> {
    // Implementation for pattern analysis triggers
  }

  private async getUserInteractions(userId: string): Promise<UserInteraction[]> {
    // Implementation to fetch user interactions from database
    return [];
  }

  private extractSequences(interactions: UserInteraction[]): UserInteraction[][] {
    const sequences: UserInteraction[][] = [];
    // Implementation for sequence extraction
    return sequences;
  }

  private groupByContextSimilarity(interactions: UserInteraction[]): UserInteraction[][] {
    // Implementation for context similarity grouping
    return [];
  }

  private findCommonActions(group: UserInteraction[]): any[] {
    // Implementation for finding common actions
    return [];
  }

  private analyzeProjectWorkflows(interactions: UserInteraction[]): BehavioralPattern[] {
    // Implementation for project workflow analysis
    return [];
  }

  private analyzeTaskWorkflows(interactions: UserInteraction[]): BehavioralPattern[] {
    // Implementation for task workflow analysis
    return [];
  }

  private analyzeCollaborationOutcomes(interactions: UserInteraction[]): any[] {
    // Implementation for collaboration outcome analysis
    return [];
  }

  private analyzeProductivityPatterns(patterns: BehavioralPattern[], interactions: UserInteraction[]): Insight | null {
    // Implementation for productivity analysis
    return null;
  }

  private analyzeEfficiencyPatterns(patterns: BehavioralPattern[], interactions: UserInteraction[]): Insight | null {
    // Implementation for efficiency analysis
    return null;
  }

  private analyzeCollaborationInsights(patterns: BehavioralPattern[], interactions: UserInteraction[]): Insight | null {
    // Implementation for collaboration insights
    return null;
  }

  private analyzeLearningPatterns(patterns: BehavioralPattern[], interactions: UserInteraction[]): Insight | null {
    // Implementation for learning pattern analysis
    return null;
  }

  private async createRecommendationFromInsight(insight: Insight, patterns: BehavioralPattern[]): Promise<Recommendation | null> {
    // Implementation for recommendation creation
    return null;
  }

  private calculateConfidence(occurrences: number, total: number): number {
    return Math.min(occurrences / Math.max(total * 0.1, 1), 1);
  }

  private calculateContextualConfidence(group: UserInteraction[]): number {
    return Math.min(group.length / 10, 1);
  }

  private rankPatterns(patterns: BehavioralPattern[]): BehavioralPattern[] {
    return patterns.sort((a, b) => (b.confidence * b.frequency) - (a.confidence * a.frequency));
  }

  private deduplicatePatterns(patterns: BehavioralPattern[]): BehavioralPattern[] {
    const seen = new Set();
    return patterns.filter(pattern => {
      const key = `${pattern.type}_${pattern.description}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private calculateMetrics(interactions: UserInteraction[], patterns: BehavioralPattern[]): any {
    return {
      totalInteractions: interactions.length,
      patternsDetected: patterns.length,
      averageConfidence: patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length || 0,
      timespan: interactions.length > 0 ?
        interactions[interactions.length - 1].timestamp.getTime() - interactions[0].timestamp.getTime() : 0
    };
  }

  private calculateTrends(interactions: UserInteraction[]): any[] {
    // Implementation for trend calculation
    return [];
  }
}

export const behavioralAnalysis = new BehavioralAnalysisService();