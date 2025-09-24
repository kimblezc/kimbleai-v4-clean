/**
 * KimbleAI V4 Conversation Logger
 * Maximum efficacy auto-logging system with Opus-level implementation
 * Logs every exchange, tracks code generation, manages git automation
 */

interface LogContext {
  platform?: string;
  userAgent?: string;
  conversationId?: string;
  sessionDuration?: number;
  messageCount?: number;
  viewport?: string;
  deviceInfo?: any;
  [key: string]: any;
}

interface AutoActions {
  gitCommitNeeded: boolean;
  fileUpdatesDetected: string[];
  deploymentMentioned: boolean;
  codeBlocksGenerated: number;
  systemCommandsDetected: string[];
  apiCallsDetected: boolean;
}

export class ConversationLogger {
  private static readonly MASTER_DOC_WEBHOOK = 'https://hooks.zapier.com/hooks/catch/2674926/um3x9v1/';
  private static readonly GIT_AUTO_WEBHOOK = 'https://hooks.zapier.com/hooks/catch/2674926/git-auto/';
  private static readonly DEPLOY_WEBHOOK = 'https://hooks.zapier.com/hooks/catch/2674926/deploy-auto/';
  
  private static sessionId: string = Date.now().toString();
  private static exchangeCount: number = 0;
  private static sessionStartTime: number = Date.now();
  
  /**
   * Main logging method - Maximum efficacy exchange tracking
   */
  static async logExchange(
    userMessage: string, 
    assistantResponse: string, 
    context: LogContext = {}
  ): Promise<void> {
    this.exchangeCount++;
    const timestamp = new Date().toISOString();
    
    // Analyze content for auto-actions
    const autoActions = this.analyzeContentForActions(userMessage, assistantResponse);
    
    // Enhanced context with session tracking
    const enhancedContext = {
      ...context,
      sessionId: this.sessionId,
      exchangeNumber: this.exchangeCount,
      sessionDuration: Date.now() - this.sessionStartTime,
      platform: this.detectPlatform(),
      project: 'KimbleAI-V4',
      version: '4.0'
    };
    
    const logPayload = {
      event: 'CONVERSATION_EXCHANGE',
      timestamp,
      session: {
        id: this.sessionId,
        exchange_number: this.exchangeCount,
        duration_ms: Date.now() - this.sessionStartTime,
        duration_human: this.formatDuration(Date.now() - this.sessionStartTime)
      },
      messages: {
        user: {
          content: this.truncateMessage(userMessage, 750),
          full_length: userMessage.length,
          hash: this.generateMessageHash(userMessage)
        },
        assistant: {
          content: this.truncateMessage(assistantResponse, 750), 
          full_length: assistantResponse.length,
          hash: this.generateMessageHash(assistantResponse)
        }
      },
      context: enhancedContext,
      auto_actions: autoActions,
      analysis: {
        user_intent: this.analyzeUserIntent(userMessage),
        response_type: this.analyzeResponseType(assistantResponse),
        complexity_score: this.calculateComplexityScore(userMessage, assistantResponse),
        continuity_needed: this.assessContinuityNeeds(userMessage, assistantResponse)
      }
    };
    
    try {
      // Primary logging to Master Document
      await this.sendToWebhook(this.MASTER_DOC_WEBHOOK, logPayload);
      console.log(`✅ Exchange ${this.exchangeCount} logged to Master Document`);
      
      // Trigger automated actions based on analysis
      await this.executeAutoActions(autoActions, userMessage, assistantResponse);
      
      // Check for chat length warning
      this.checkLengthLimits(userMessage + assistantResponse);
      
    } catch (error) {
      console.error('❌ Critical logging failure:', error);
      // Fallback logging attempt
      await this.fallbackLogging(logPayload);
    }
  }
  
  /**
   * Advanced content analysis for automated actions
   */
  private static analyzeContentForActions(user: string, assistant: string): AutoActions {
    const combined = user.toLowerCase() + ' ' + assistant.toLowerCase();
    
    return {
      gitCommitNeeded: this.detectCodeGeneration(assistant) || this.detectFileOperations(assistant),
      fileUpdatesDetected: this.extractFileReferences(assistant),
      deploymentMentioned: /\b(deploy|vercel|build|npm|yarn|git push)\b/.test(combined),
      codeBlocksGenerated: (assistant.match(/```/g) || []).length / 2,
      systemCommandsDetected: this.extractSystemCommands(assistant),
      apiCallsDetected: /\b(api|endpoint|route|fetch|axios)\b/.test(combined)
    };
  }
  
  /**
   * Automated action execution based on content analysis
   */
  private static async executeAutoActions(
    actions: AutoActions, 
    userMessage: string, 
    assistantResponse: string
  ): Promise<void> {
    // Auto-trigger Git commit for code generation
    if (actions.gitCommitNeeded) {
      await this.triggerAutoGit(userMessage, assistantResponse, actions);
    }
    
    // Auto-trigger deployment if deployment commands detected
    if (actions.deploymentMentioned && actions.codeBlocksGenerated > 0) {
      await this.triggerAutoDeploy(userMessage, actions);
    }
    
    // Log high-complexity exchanges separately
    if (this.calculateComplexityScore(userMessage, assistantResponse) > 0.8) {
      await this.logHighComplexityExchange(userMessage, assistantResponse, actions);
    }
  }
  
  /**
   * Enhanced auto-git with detailed metadata
   */
  private static async triggerAutoGit(
    userMessage: string, 
    assistantResponse: string, 
    actions: AutoActions
  ): Promise<void> {
    try {
      const gitPayload = {
        event: 'AUTO_GIT_COMMIT',
        session_id: this.sessionId,
        exchange_number: this.exchangeCount,
        timestamp: new Date().toISOString(),
        trigger: {
          user_request: this.truncateMessage(userMessage, 100),
          code_blocks_generated: actions.codeBlocksGenerated,
          files_mentioned: actions.fileUpdatesDetected,
          system_commands: actions.systemCommandsDetected
        },
        commit: {
          message: `auto: ${this.generateCommitMessage(userMessage)} [v4-${this.sessionId.slice(-6)}]`,
          description: `Generated ${actions.codeBlocksGenerated} code blocks, ${actions.fileUpdatesDetected.length} file updates`,
          auto_generated: true,
          session_context: this.sessionId
        },
        metadata: {
          complexity_score: this.calculateComplexityScore(userMessage, assistantResponse),
          estimated_files_changed: actions.fileUpdatesDetected.length,
          deployment_ready: actions.deploymentMentioned
        }
      };
      
      await this.sendToWebhook(this.GIT_AUTO_WEBHOOK, gitPayload);
      console.log(`🔄 Auto-git triggered for ${actions.codeBlocksGenerated} code blocks`);
      
    } catch (error) {
      console.warn('⚠️ Auto-git trigger failed:', error);
    }
  }
  
  /**
   * Utility methods for content analysis
   */
  private static detectCodeGeneration(text: string): boolean {
    return /```|\/\/|function |const |import |export |class /.test(text);
  }
  
  private static detectFileOperations(text: string): boolean {
    return /\b(create|update|delete|modify|save|write)\s+file/i.test(text);
  }
  
  private static extractFileReferences(text: string): string[] {
    const fileRegex = /\b[\w-]+\.(ts|tsx|js|jsx|json|md|bat|ps1|sql|css|html|py|yml|yaml)\b/gi;
    return Array.from(new Set(text.match(fileRegex) || [])).slice(0, 10);
  }
  
  private static extractSystemCommands(text: string): string[] {
    const cmdRegex = /\b(npm|yarn|git|vercel|docker|cd|mkdir|cp|mv|rm)\s+[^\n]*/gi;
    return Array.from(new Set(text.match(cmdRegex) || [])).slice(0, 5);
  }
  
  private static analyzeUserIntent(message: string): string {
    const lower = message.toLowerCase();
    if (/\b(create|build|make|generate)\b/.test(lower)) return 'creation';
    if (/\b(fix|debug|error|issue|problem)\b/.test(lower)) return 'troubleshooting';
    if (/\b(deploy|launch|publish|release)\b/.test(lower)) return 'deployment';
    if (/\b(test|check|verify|confirm)\b/.test(lower)) return 'validation';
    if (/\b(explain|how|what|why|help)\b/.test(lower)) return 'information';
    return 'general';
  }
  
  private static analyzeResponseType(response: string): string {
    if (response.includes('```')) return 'code_generation';
    if (response.includes('Program:') || response.includes('Location:')) return 'instructions';
    if (response.toLowerCase().includes('error') || response.toLowerCase().includes('problem')) return 'troubleshooting';
    if (response.length > 2000) return 'comprehensive';
    return 'informational';
  }
  
  private static calculateComplexityScore(user: string, assistant: string): number {
    let score = 0;
    
    // Code complexity
    score += (assistant.match(/```/g) || []).length * 0.1;
    
    // File operations
    score += this.extractFileReferences(assistant).length * 0.05;
    
    // System commands
    score += this.extractSystemCommands(assistant).length * 0.1;
    
    // Length complexity
    score += Math.min((user.length + assistant.length) / 10000, 0.3);
    
    // Technical terms
    const techTerms = /\b(api|database|deploy|config|environment|webhook|git|npm|vercel)\b/gi;
    score += Math.min((assistant.match(techTerms) || []).length * 0.05, 0.2);
    
    return Math.min(score, 1.0);
  }
  
  private static assessContinuityNeeds(user: string, assistant: string): boolean {
    const continuityIndicators = [
      'next session',
      'continue from',
      'remember',
      'previous',
      'master document',
      'chat limit',
      'length limit'
    ];
    
    const combined = (user + ' ' + assistant).toLowerCase();
    return continuityIndicators.some(indicator => combined.includes(indicator));
  }
  
  /**
   * Utility methods
   */
  private static truncateMessage(message: string, maxLength: number): string {
    return message.length > maxLength ? 
      message.substring(0, maxLength - 3) + '...' : 
      message;
  }
  
  private static generateMessageHash(message: string): string {
    // Simple hash for deduplication
    let hash = 0;
    for (let i = 0; i < message.length; i++) {
      const char = message.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
  
  private static generateCommitMessage(userMessage: string): string {
    const intent = this.analyzeUserIntent(userMessage);
    const preview = userMessage.substring(0, 50).replace(/[^a-zA-Z0-9\s]/g, '').trim();
    return `${intent}: ${preview}`.toLowerCase();
  }
  
  private static formatDuration(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }
  
  private static detectPlatform(): string {
    if (typeof window !== 'undefined') {
      return /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
    }
    return 'server';
  }
  
  private static async sendToWebhook(url: string, payload: any): Promise<void> {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
    }
  }
  
  private static async fallbackLogging(payload: any): Promise<void> {
    try {
      // Simplified payload for fallback
      const fallback = {
        event: 'LOGGING_FALLBACK',
        timestamp: new Date().toISOString(),
        session_id: this.sessionId,
        exchange_number: this.exchangeCount,
        original_event: payload.event
      };
      
      await this.sendToWebhook(this.MASTER_DOC_WEBHOOK, fallback);
    } catch (error) {
      console.error('💥 Complete logging system failure:', error);
    }
  }
  
  private static checkLengthLimits(currentText: string): void {
    const estimatedTotal = this.exchangeCount * 1000; // Rough estimate
    
    if (estimatedTotal > 80000) { // 80% of typical limit
      this.logLengthWarning(estimatedTotal);
    }
  }
  
  private static async logLengthWarning(estimatedLength: number): Promise<void> {
    const warningPayload = {
      event: 'LENGTH_WARNING',
      timestamp: new Date().toISOString(),
      session_id: this.sessionId,
      estimated_length: estimatedLength,
      exchange_count: this.exchangeCount,
      usage_percentage: Math.round((estimatedLength / 100000) * 100),
      action_needed: 'START_NEW_CHAT_SOON',
      continuity_instruction: 'Read KIMBLEAI MASTER DOCUMENT and continue from current state',
      session_summary: {
        duration: this.formatDuration(Date.now() - this.sessionStartTime),
        exchanges: this.exchangeCount,
        complexity_avg: 'calculated_dynamically'
      }
    };
    
    try {
      await this.sendToWebhook(this.MASTER_DOC_WEBHOOK, warningPayload);
      console.warn(`⚠️ Length warning: ${estimatedLength} chars, ${this.exchangeCount} exchanges`);
    } catch (error) {
      console.error('Failed to log length warning:', error);
    }
  }
  
  /**
   * Manual logging methods for specific events
   */
  static async logDeployment(status: 'started' | 'success' | 'failed', details: any = {}): Promise<void> {
    const payload = {
      event: 'DEPLOYMENT',
      timestamp: new Date().toISOString(),
      session_id: this.sessionId,
      status,
      details,
      context: {
        project: 'KimbleAI-V4',
        version: '4.0',
        exchange_number: this.exchangeCount
      }
    };
    
    await this.sendToWebhook(this.MASTER_DOC_WEBHOOK, payload);
  }
  
  static async logSystemEvent(event: string, details: any = {}): Promise<void> {
    const payload = {
      event: `SYSTEM_${event.toUpperCase()}`,
      timestamp: new Date().toISOString(),
      session_id: this.sessionId,
      details,
      context: {
        project: 'KimbleAI-V4',
        exchange_number: this.exchangeCount
      }
    };
    
    await this.sendToWebhook(this.MASTER_DOC_WEBHOOK, payload);
  }
  
  /**
   * Auto-deploy trigger for maximum automation
   */
  private static async triggerAutoDeploy(userMessage: string, actions: AutoActions): Promise<void> {
    try {
      const deployPayload = {
        event: 'AUTO_DEPLOY_TRIGGER',
        session_id: this.sessionId,
        timestamp: new Date().toISOString(),
        trigger: {
          user_request: this.truncateMessage(userMessage, 100),
          code_blocks: actions.codeBlocksGenerated,
          files_updated: actions.fileUpdatesDetected.length,
          confidence_score: actions.codeBlocksGenerated > 2 ? 'high' : 'medium'
        },
        deployment: {
          auto_triggered: true,
          estimated_changes: actions.fileUpdatesDetected.length,
          project: 'KimbleAI-V4'
        }
      };
      
      await this.sendToWebhook(this.DEPLOY_WEBHOOK, deployPayload);
      console.log(`🚀 Auto-deploy triggered: ${actions.codeBlocksGenerated} code blocks, ${actions.fileUpdatesDetected.length} files`);
      
    } catch (error) {
      console.warn('⚠️ Auto-deploy trigger failed:', error);
    }
  }
  
  private static async logHighComplexityExchange(
    userMessage: string, 
    assistantResponse: string, 
    actions: AutoActions
  ): Promise<void> {
    const complexityPayload = {
      event: 'HIGH_COMPLEXITY_EXCHANGE',
      session_id: this.sessionId,
      timestamp: new Date().toISOString(),
      exchange_number: this.exchangeCount,
      complexity: {
        score: this.calculateComplexityScore(userMessage, assistantResponse),
        factors: {
          code_blocks: actions.codeBlocksGenerated,
          files_referenced: actions.fileUpdatesDetected.length,
          system_commands: actions.systemCommandsDetected.length,
          message_length: userMessage.length + assistantResponse.length
        }
      },
      requires_attention: true,
      suggested_actions: [
        'Consider session break after deployment',
        'Verify all generated code',
        'Test thoroughly before production'
      ]
    };
    
    await this.sendToWebhook(this.MASTER_DOC_WEBHOOK, complexityPayload);
  }
}

