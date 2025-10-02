/**
 * Workflow Integration Adapters
 * Provides seamless integration between workflow automation and all KimbleAI services
 */

import { createClient } from '@supabase/supabase-js';
import { GoogleWorkspaceOrchestrator } from './google-orchestration';
import { AIContentAnalyzer } from './ai-content-analyzer';
import { CostMonitor } from './cost-monitor';
import { DeviceContinuity } from './device-continuity';
import { AutoReferenceButler } from './auto-reference-butler';
import { EmailAlertSystem } from './email-alert-system';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Base integration interface
export interface ServiceIntegration {
  serviceName: string;
  version: string;
  capabilities: string[];
  executeOperation(operation: string, parameters: any, context: WorkflowContext): Promise<any>;
  validateOperation(operation: string, parameters: any): Promise<ValidationResult>;
  getAvailableOperations(): ServiceOperation[];
  getHealthStatus(): Promise<ServiceHealth>;
}

export interface ServiceOperation {
  name: string;
  description: string;
  category: string;
  parameters: OperationParameter[];
  returns: OperationReturn;
  examples: OperationExample[];
  riskLevel: 'low' | 'medium' | 'high';
  requiresApproval: boolean;
}

export interface OperationParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description: string;
  defaultValue?: any;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    options?: string[];
  };
}

export interface OperationReturn {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  schema?: any;
}

export interface OperationExample {
  name: string;
  description: string;
  parameters: any;
  expectedResult: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'disconnected';
  lastCheck: string;
  latency: number;
  errorRate: number;
  details: Record<string, any>;
}

export interface WorkflowContext {
  userId: string;
  executionId: string;
  workflowId: string;
  environment: Record<string, any>;
  variables: Record<string, any>;
  metadata: Record<string, any>;
}

/**
 * Gmail Integration Adapter
 */
export class GmailIntegration implements ServiceIntegration {
  serviceName = 'gmail';
  version = '1.0.0';
  capabilities = ['send_email', 'read_emails', 'search_emails', 'add_label', 'create_filter', 'get_profile'];

  private orchestrator: GoogleWorkspaceOrchestrator;

  constructor(orchestrator: GoogleWorkspaceOrchestrator) {
    this.orchestrator = orchestrator;
  }

  async executeOperation(operation: string, parameters: any, context: WorkflowContext): Promise<any> {
    switch (operation) {
      case 'send_email':
        return await this.sendEmail(parameters, context);
      case 'read_emails':
        return await this.readEmails(parameters, context);
      case 'search_emails':
        return await this.searchEmails(parameters, context);
      case 'add_label':
        return await this.addLabel(parameters, context);
      case 'create_filter':
        return await this.createFilter(parameters, context);
      case 'get_profile':
        return await this.getProfile(parameters, context);
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
  }

  async validateOperation(operation: string, parameters: any): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    switch (operation) {
      case 'send_email':
        if (!parameters.to || !Array.isArray(parameters.to) || parameters.to.length === 0) {
          errors.push('Recipients (to) is required and must be a non-empty array');
        }
        if (!parameters.subject || typeof parameters.subject !== 'string') {
          errors.push('Subject is required and must be a string');
        }
        if (!parameters.body) {
          warnings.push('Email body is empty');
        }
        if (parameters.to && parameters.to.length > 100) {
          warnings.push('Sending to more than 100 recipients may hit rate limits');
        }
        break;

      case 'search_emails':
        if (!parameters.query || typeof parameters.query !== 'string') {
          errors.push('Search query is required and must be a string');
        }
        if (parameters.maxResults && (parameters.maxResults < 1 || parameters.maxResults > 500)) {
          warnings.push('maxResults should be between 1 and 500');
        }
        break;

      case 'add_label':
        if (!parameters.emailIds || !Array.isArray(parameters.emailIds)) {
          errors.push('Email IDs is required and must be an array');
        }
        if (!parameters.labelName || typeof parameters.labelName !== 'string') {
          errors.push('Label name is required and must be a string');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  getAvailableOperations(): ServiceOperation[] {
    return [
      {
        name: 'send_email',
        description: 'Send an email message',
        category: 'communication',
        parameters: [
          { name: 'to', type: 'array', required: true, description: 'Email recipients' },
          { name: 'subject', type: 'string', required: true, description: 'Email subject' },
          { name: 'body', type: 'string', required: false, description: 'Email body content' },
          { name: 'cc', type: 'array', required: false, description: 'CC recipients' },
          { name: 'bcc', type: 'array', required: false, description: 'BCC recipients' },
          { name: 'attachments', type: 'array', required: false, description: 'File attachments' }
        ],
        returns: { type: 'object', description: 'Sent message details including message ID' },
        examples: [
          {
            name: 'Send simple email',
            description: 'Send a basic email message',
            parameters: { to: ['user@example.com'], subject: 'Test Subject', body: 'Hello World' },
            expectedResult: { messageId: 'msg_123', status: 'sent' }
          }
        ],
        riskLevel: 'medium',
        requiresApproval: false
      },
      {
        name: 'search_emails',
        description: 'Search for emails using Gmail search syntax',
        category: 'retrieval',
        parameters: [
          { name: 'query', type: 'string', required: true, description: 'Gmail search query' },
          { name: 'maxResults', type: 'number', required: false, description: 'Maximum number of results', defaultValue: 10 },
          { name: 'includeSpam', type: 'boolean', required: false, description: 'Include spam folder', defaultValue: false }
        ],
        returns: { type: 'array', description: 'Array of email objects matching the search' },
        examples: [
          {
            name: 'Search for unread emails',
            description: 'Find all unread emails in inbox',
            parameters: { query: 'is:unread in:inbox', maxResults: 20 },
            expectedResult: { emails: [], count: 5 }
          }
        ],
        riskLevel: 'low',
        requiresApproval: false
      }
    ];
  }

  async getHealthStatus(): Promise<ServiceHealth> {
    try {
      const startTime = Date.now();
      await this.orchestrator.getSystemStatus();
      const latency = Date.now() - startTime;

      return {
        status: 'healthy',
        lastCheck: new Date().toISOString(),
        latency,
        errorRate: 0,
        details: { service: 'gmail', connected: true }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        latency: -1,
        errorRate: 1,
        details: { error: error.message }
      };
    }
  }

  // Private implementation methods
  private async sendEmail(parameters: any, context: WorkflowContext): Promise<any> {
    // Implementation would use the orchestrator to send emails
    return { messageId: `msg_${Date.now()}`, status: 'sent', timestamp: new Date().toISOString() };
  }

  private async readEmails(parameters: any, context: WorkflowContext): Promise<any> {
    // Implementation would use the orchestrator to read emails
    return { emails: [], count: 0 };
  }

  private async searchEmails(parameters: any, context: WorkflowContext): Promise<any> {
    // Implementation would use the orchestrator to search emails
    return { emails: [], count: 0, query: parameters.query };
  }

  private async addLabel(parameters: any, context: WorkflowContext): Promise<any> {
    // Implementation would use the orchestrator to add labels
    return { labeled: parameters.emailIds.length, labelName: parameters.labelName };
  }

  private async createFilter(parameters: any, context: WorkflowContext): Promise<any> {
    // Implementation would use the orchestrator to create filters
    return { filterId: `filter_${Date.now()}`, criteria: parameters.criteria };
  }

  private async getProfile(parameters: any, context: WorkflowContext): Promise<any> {
    // Implementation would use the orchestrator to get profile
    return { emailAddress: 'user@example.com', messagesTotal: 1000 };
  }
}

/**
 * Drive Integration Adapter
 */
export class DriveIntegration implements ServiceIntegration {
  serviceName = 'drive';
  version = '1.0.0';
  capabilities = ['create_file', 'upload_file', 'download_file', 'list_files', 'search_files', 'share_file', 'create_folder', 'move_file', 'delete_file'];

  private orchestrator: GoogleWorkspaceOrchestrator;

  constructor(orchestrator: GoogleWorkspaceOrchestrator) {
    this.orchestrator = orchestrator;
  }

  async executeOperation(operation: string, parameters: any, context: WorkflowContext): Promise<any> {
    switch (operation) {
      case 'create_file':
        return await this.createFile(parameters, context);
      case 'upload_file':
        return await this.uploadFile(parameters, context);
      case 'download_file':
        return await this.downloadFile(parameters, context);
      case 'list_files':
        return await this.listFiles(parameters, context);
      case 'search_files':
        return await this.searchFiles(parameters, context);
      case 'share_file':
        return await this.shareFile(parameters, context);
      case 'create_folder':
        return await this.createFolder(parameters, context);
      case 'move_file':
        return await this.moveFile(parameters, context);
      case 'delete_file':
        return await this.deleteFile(parameters, context);
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
  }

  async validateOperation(operation: string, parameters: any): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    switch (operation) {
      case 'create_file':
        if (!parameters.name || typeof parameters.name !== 'string') {
          errors.push('File name is required and must be a string');
        }
        if (!parameters.content && !parameters.templateId) {
          warnings.push('File content or template ID should be provided');
        }
        break;

      case 'delete_file':
        if (!parameters.fileId) {
          errors.push('File ID is required for deletion');
        }
        warnings.push('File deletion is irreversible - consider moving to trash instead');
        break;

      case 'share_file':
        if (!parameters.fileId) {
          errors.push('File ID is required for sharing');
        }
        if (!parameters.emails || !Array.isArray(parameters.emails)) {
          errors.push('Email addresses are required for sharing');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  getAvailableOperations(): ServiceOperation[] {
    return [
      {
        name: 'create_file',
        description: 'Create a new file in Google Drive',
        category: 'creation',
        parameters: [
          { name: 'name', type: 'string', required: true, description: 'File name' },
          { name: 'content', type: 'string', required: false, description: 'File content' },
          { name: 'parentFolderId', type: 'string', required: false, description: 'Parent folder ID' },
          { name: 'mimeType', type: 'string', required: false, description: 'MIME type of the file' }
        ],
        returns: { type: 'object', description: 'Created file metadata including file ID' },
        examples: [
          {
            name: 'Create text document',
            description: 'Create a new text document',
            parameters: { name: 'My Document', content: 'Hello World', mimeType: 'text/plain' },
            expectedResult: { fileId: 'file_123', name: 'My Document', webViewLink: 'https://...' }
          }
        ],
        riskLevel: 'low',
        requiresApproval: false
      },
      {
        name: 'delete_file',
        description: 'Delete a file from Google Drive',
        category: 'management',
        parameters: [
          { name: 'fileId', type: 'string', required: true, description: 'ID of file to delete' },
          { name: 'permanent', type: 'boolean', required: false, description: 'Permanently delete vs move to trash', defaultValue: false }
        ],
        returns: { type: 'object', description: 'Deletion confirmation' },
        examples: [
          {
            name: 'Move file to trash',
            description: 'Move a file to trash (recoverable)',
            parameters: { fileId: 'file_123', permanent: false },
            expectedResult: { deleted: true, permanent: false }
          }
        ],
        riskLevel: 'high',
        requiresApproval: true
      }
    ];
  }

  async getHealthStatus(): Promise<ServiceHealth> {
    try {
      const startTime = Date.now();
      await this.orchestrator.getSystemStatus();
      const latency = Date.now() - startTime;

      return {
        status: 'healthy',
        lastCheck: new Date().toISOString(),
        latency,
        errorRate: 0,
        details: { service: 'drive', connected: true }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        latency: -1,
        errorRate: 1,
        details: { error: error.message }
      };
    }
  }

  // Private implementation methods
  private async createFile(parameters: any, context: WorkflowContext): Promise<any> {
    return { fileId: `file_${Date.now()}`, name: parameters.name, created: true };
  }

  private async uploadFile(parameters: any, context: WorkflowContext): Promise<any> {
    return { fileId: `file_${Date.now()}`, uploaded: true, size: parameters.content?.length || 0 };
  }

  private async downloadFile(parameters: any, context: WorkflowContext): Promise<any> {
    return { content: 'file_content', mimeType: 'text/plain', size: 100 };
  }

  private async listFiles(parameters: any, context: WorkflowContext): Promise<any> {
    return { files: [], count: 0 };
  }

  private async searchFiles(parameters: any, context: WorkflowContext): Promise<any> {
    return { files: [], count: 0, query: parameters.query };
  }

  private async shareFile(parameters: any, context: WorkflowContext): Promise<any> {
    return { shared: true, permissions: parameters.emails.length };
  }

  private async createFolder(parameters: any, context: WorkflowContext): Promise<any> {
    return { folderId: `folder_${Date.now()}`, name: parameters.name };
  }

  private async moveFile(parameters: any, context: WorkflowContext): Promise<any> {
    return { moved: true, newParent: parameters.newParentId };
  }

  private async deleteFile(parameters: any, context: WorkflowContext): Promise<any> {
    return { deleted: true, permanent: parameters.permanent || false };
  }
}

/**
 * Calendar Integration Adapter
 */
export class CalendarIntegration implements ServiceIntegration {
  serviceName = 'calendar';
  version = '1.0.0';
  capabilities = ['create_event', 'update_event', 'delete_event', 'list_events', 'search_events', 'get_busy_times', 'create_calendar'];

  private orchestrator: GoogleWorkspaceOrchestrator;

  constructor(orchestrator: GoogleWorkspaceOrchestrator) {
    this.orchestrator = orchestrator;
  }

  async executeOperation(operation: string, parameters: any, context: WorkflowContext): Promise<any> {
    switch (operation) {
      case 'create_event':
        return await this.createEvent(parameters, context);
      case 'update_event':
        return await this.updateEvent(parameters, context);
      case 'delete_event':
        return await this.deleteEvent(parameters, context);
      case 'list_events':
        return await this.listEvents(parameters, context);
      case 'search_events':
        return await this.searchEvents(parameters, context);
      case 'get_busy_times':
        return await this.getBusyTimes(parameters, context);
      case 'create_calendar':
        return await this.createCalendar(parameters, context);
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
  }

  async validateOperation(operation: string, parameters: any): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    switch (operation) {
      case 'create_event':
        if (!parameters.summary || typeof parameters.summary !== 'string') {
          errors.push('Event summary (title) is required');
        }
        if (!parameters.start || !parameters.end) {
          errors.push('Event start and end times are required');
        }
        if (new Date(parameters.end) <= new Date(parameters.start)) {
          errors.push('Event end time must be after start time');
        }
        break;

      case 'delete_event':
        if (!parameters.eventId) {
          errors.push('Event ID is required for deletion');
        }
        warnings.push('Event deletion may affect attendees');
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  getAvailableOperations(): ServiceOperation[] {
    return [
      {
        name: 'create_event',
        description: 'Create a new calendar event',
        category: 'creation',
        parameters: [
          { name: 'summary', type: 'string', required: true, description: 'Event title' },
          { name: 'start', type: 'string', required: true, description: 'Start time (ISO format)' },
          { name: 'end', type: 'string', required: true, description: 'End time (ISO format)' },
          { name: 'description', type: 'string', required: false, description: 'Event description' },
          { name: 'attendees', type: 'array', required: false, description: 'List of attendee emails' },
          { name: 'location', type: 'string', required: false, description: 'Event location' }
        ],
        returns: { type: 'object', description: 'Created event details including event ID' },
        examples: [
          {
            name: 'Create meeting',
            description: 'Create a team meeting',
            parameters: {
              summary: 'Team Meeting',
              start: '2024-01-15T10:00:00Z',
              end: '2024-01-15T11:00:00Z',
              attendees: ['user@example.com']
            },
            expectedResult: { eventId: 'event_123', created: true }
          }
        ],
        riskLevel: 'low',
        requiresApproval: false
      }
    ];
  }

  async getHealthStatus(): Promise<ServiceHealth> {
    try {
      const startTime = Date.now();
      await this.orchestrator.getSystemStatus();
      const latency = Date.now() - startTime;

      return {
        status: 'healthy',
        lastCheck: new Date().toISOString(),
        latency,
        errorRate: 0,
        details: { service: 'calendar', connected: true }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        latency: -1,
        errorRate: 1,
        details: { error: error.message }
      };
    }
  }

  // Private implementation methods
  private async createEvent(parameters: any, context: WorkflowContext): Promise<any> {
    return { eventId: `event_${Date.now()}`, summary: parameters.summary, created: true };
  }

  private async updateEvent(parameters: any, context: WorkflowContext): Promise<any> {
    return { eventId: parameters.eventId, updated: true };
  }

  private async deleteEvent(parameters: any, context: WorkflowContext): Promise<any> {
    return { eventId: parameters.eventId, deleted: true };
  }

  private async listEvents(parameters: any, context: WorkflowContext): Promise<any> {
    return { events: [], count: 0 };
  }

  private async searchEvents(parameters: any, context: WorkflowContext): Promise<any> {
    return { events: [], count: 0, query: parameters.query };
  }

  private async getBusyTimes(parameters: any, context: WorkflowContext): Promise<any> {
    return { busyTimes: [], calendars: parameters.calendars };
  }

  private async createCalendar(parameters: any, context: WorkflowContext): Promise<any> {
    return { calendarId: `calendar_${Date.now()}`, name: parameters.name };
  }
}

/**
 * AI Analysis Integration Adapter
 */
export class AIAnalysisIntegration implements ServiceIntegration {
  serviceName = 'ai_analysis';
  version = '1.0.0';
  capabilities = ['analyze_content', 'classify_text', 'extract_information', 'generate_summary', 'sentiment_analysis'];

  private aiAnalyzer: AIContentAnalyzer;

  constructor(userId: string) {
    this.aiAnalyzer = new AIContentAnalyzer(userId);
  }

  async executeOperation(operation: string, parameters: any, context: WorkflowContext): Promise<any> {
    switch (operation) {
      case 'analyze_content':
        return await this.analyzeContent(parameters, context);
      case 'classify_text':
        return await this.classifyText(parameters, context);
      case 'extract_information':
        return await this.extractInformation(parameters, context);
      case 'generate_summary':
        return await this.generateSummary(parameters, context);
      case 'sentiment_analysis':
        return await this.sentimentAnalysis(parameters, context);
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
  }

  async validateOperation(operation: string, parameters: any): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (!parameters.content || typeof parameters.content !== 'string') {
      errors.push('Content is required and must be a string');
    }

    if (parameters.content && parameters.content.length > 10000) {
      warnings.push('Content is very long and may take time to process');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  getAvailableOperations(): ServiceOperation[] {
    return [
      {
        name: 'analyze_content',
        description: 'Perform comprehensive AI analysis on content',
        category: 'analysis',
        parameters: [
          { name: 'content', type: 'string', required: true, description: 'Text content to analyze' },
          { name: 'analysisTypes', type: 'array', required: false, description: 'Types of analysis to perform' },
          { name: 'language', type: 'string', required: false, description: 'Content language', defaultValue: 'auto' }
        ],
        returns: { type: 'object', description: 'Analysis results with confidence scores' },
        examples: [
          {
            name: 'Analyze email content',
            description: 'Analyze an email for sentiment and urgency',
            parameters: { content: 'This is urgent!', analysisTypes: ['sentiment', 'urgency'] },
            expectedResult: { sentiment: 'negative', urgency: 'high', confidence: 0.9 }
          }
        ],
        riskLevel: 'low',
        requiresApproval: false
      }
    ];
  }

  async getHealthStatus(): Promise<ServiceHealth> {
    try {
      const startTime = Date.now();
      // Test with simple content
      await this.aiAnalyzer.analyzeContent({
        content: 'test',
        contentType: 'text',
        analysisTypes: ['sentiment'],
        context: {}
      });
      const latency = Date.now() - startTime;

      return {
        status: 'healthy',
        lastCheck: new Date().toISOString(),
        latency,
        errorRate: 0,
        details: { service: 'ai_analysis', connected: true }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        latency: -1,
        errorRate: 1,
        details: { error: error.message }
      };
    }
  }

  // Private implementation methods
  private async analyzeContent(parameters: any, context: WorkflowContext): Promise<any> {
    return await this.aiAnalyzer.analyzeContent({
      content: parameters.content,
      contentType: 'text',
      analysisTypes: parameters.analysisTypes || ['sentiment', 'urgency'],
      context: context
    });
  }

  private async classifyText(parameters: any, context: WorkflowContext): Promise<any> {
    return await this.aiAnalyzer.analyzeContent({
      content: parameters.content,
      contentType: 'text',
      analysisTypes: ['categorization'],
      context: context
    });
  }

  private async extractInformation(parameters: any, context: WorkflowContext): Promise<any> {
    return await this.aiAnalyzer.analyzeContent({
      content: parameters.content,
      contentType: 'text',
      analysisTypes: ['extraction'],
      context: context
    });
  }

  private async generateSummary(parameters: any, context: WorkflowContext): Promise<any> {
    return await this.aiAnalyzer.analyzeContent({
      content: parameters.content,
      contentType: 'text',
      analysisTypes: ['summary'],
      context: context
    });
  }

  private async sentimentAnalysis(parameters: any, context: WorkflowContext): Promise<any> {
    return await this.aiAnalyzer.analyzeContent({
      content: parameters.content,
      contentType: 'text',
      analysisTypes: ['sentiment'],
      context: context
    });
  }
}

/**
 * Cost Monitoring Integration Adapter
 */
export class CostMonitorIntegration implements ServiceIntegration {
  serviceName = 'cost_monitor';
  version = '1.0.0';
  capabilities = ['get_costs', 'set_budget', 'get_alerts', 'predict_costs', 'track_usage'];

  private costMonitor: CostMonitor;

  constructor(userId: string) {
    this.costMonitor = new CostMonitor(userId);
  }

  async executeOperation(operation: string, parameters: any, context: WorkflowContext): Promise<any> {
    switch (operation) {
      case 'get_costs':
        return await this.getCosts(parameters, context);
      case 'set_budget':
        return await this.setBudget(parameters, context);
      case 'get_alerts':
        return await this.getAlerts(parameters, context);
      case 'predict_costs':
        return await this.predictCosts(parameters, context);
      case 'track_usage':
        return await this.trackUsage(parameters, context);
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
  }

  async validateOperation(operation: string, parameters: any): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    switch (operation) {
      case 'set_budget':
        if (!parameters.amount || typeof parameters.amount !== 'number' || parameters.amount <= 0) {
          errors.push('Budget amount must be a positive number');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  getAvailableOperations(): ServiceOperation[] {
    return [
      {
        name: 'get_costs',
        description: 'Get current cost information',
        category: 'monitoring',
        parameters: [
          { name: 'period', type: 'string', required: false, description: 'Time period (day, week, month)', defaultValue: 'month' },
          { name: 'service', type: 'string', required: false, description: 'Specific service to check' }
        ],
        returns: { type: 'object', description: 'Cost breakdown and totals' },
        examples: [
          {
            name: 'Get monthly costs',
            description: 'Get costs for current month',
            parameters: { period: 'month' },
            expectedResult: { total: 25.50, breakdown: { openai: 20.00, google: 5.50 } }
          }
        ],
        riskLevel: 'low',
        requiresApproval: false
      }
    ];
  }

  async getHealthStatus(): Promise<ServiceHealth> {
    try {
      const startTime = Date.now();
      await this.costMonitor.getCurrentCosts();
      const latency = Date.now() - startTime;

      return {
        status: 'healthy',
        lastCheck: new Date().toISOString(),
        latency,
        errorRate: 0,
        details: { service: 'cost_monitor', connected: true }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        latency: -1,
        errorRate: 1,
        details: { error: error.message }
      };
    }
  }

  // Private implementation methods
  private async getCosts(parameters: any, context: WorkflowContext): Promise<any> {
    return await this.costMonitor.getCurrentCosts();
  }

  private async setBudget(parameters: any, context: WorkflowContext): Promise<any> {
    return await this.costMonitor.setBudgetAlert(parameters.amount, parameters.period || 'month');
  }

  private async getAlerts(parameters: any, context: WorkflowContext): Promise<any> {
    return await this.costMonitor.getActiveAlerts();
  }

  private async predictCosts(parameters: any, context: WorkflowContext): Promise<any> {
    return await this.costMonitor.predictMonthlySpend();
  }

  private async trackUsage(parameters: any, context: WorkflowContext): Promise<any> {
    return await this.costMonitor.getUsageStats();
  }
}

/**
 * Device Continuity Integration Adapter
 */
export class DeviceContinuityIntegration implements ServiceIntegration {
  serviceName = 'device_continuity';
  version = '1.0.0';
  capabilities = ['sync_state', 'get_devices', 'transfer_session', 'backup_state', 'restore_state'];

  private deviceContinuity: DeviceContinuity;

  constructor(userId: string) {
    this.deviceContinuity = new DeviceContinuity(userId);
  }

  async executeOperation(operation: string, parameters: any, context: WorkflowContext): Promise<any> {
    switch (operation) {
      case 'sync_state':
        return await this.syncState(parameters, context);
      case 'get_devices':
        return await this.getDevices(parameters, context);
      case 'transfer_session':
        return await this.transferSession(parameters, context);
      case 'backup_state':
        return await this.backupState(parameters, context);
      case 'restore_state':
        return await this.restoreState(parameters, context);
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
  }

  async validateOperation(operation: string, parameters: any): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    switch (operation) {
      case 'transfer_session':
        if (!parameters.targetDevice) {
          errors.push('Target device is required for session transfer');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  getAvailableOperations(): ServiceOperation[] {
    return [
      {
        name: 'sync_state',
        description: 'Sync current state across devices',
        category: 'synchronization',
        parameters: [
          { name: 'includeData', type: 'boolean', required: false, description: 'Include application data', defaultValue: true }
        ],
        returns: { type: 'object', description: 'Sync status and results' },
        examples: [
          {
            name: 'Sync all data',
            description: 'Sync state and data across all devices',
            parameters: { includeData: true },
            expectedResult: { synced: true, devices: 3, dataSize: '2.5MB' }
          }
        ],
        riskLevel: 'low',
        requiresApproval: false
      }
    ];
  }

  async getHealthStatus(): Promise<ServiceHealth> {
    try {
      const startTime = Date.now();
      await this.deviceContinuity.getDevices();
      const latency = Date.now() - startTime;

      return {
        status: 'healthy',
        lastCheck: new Date().toISOString(),
        latency,
        errorRate: 0,
        details: { service: 'device_continuity', connected: true }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        latency: -1,
        errorRate: 1,
        details: { error: error.message }
      };
    }
  }

  // Private implementation methods
  private async syncState(parameters: any, context: WorkflowContext): Promise<any> {
    return await this.deviceContinuity.syncState(context.variables);
  }

  private async getDevices(parameters: any, context: WorkflowContext): Promise<any> {
    return await this.deviceContinuity.getDevices();
  }

  private async transferSession(parameters: any, context: WorkflowContext): Promise<any> {
    return await this.deviceContinuity.transferToDevice(parameters.targetDevice, context.variables);
  }

  private async backupState(parameters: any, context: WorkflowContext): Promise<any> {
    return await this.deviceContinuity.backupState();
  }

  private async restoreState(parameters: any, context: WorkflowContext): Promise<any> {
    return await this.deviceContinuity.restoreState(parameters.backupId);
  }
}

/**
 * Notification Integration Adapter
 */
export class NotificationIntegration implements ServiceIntegration {
  serviceName = 'notification';
  version = '1.0.0';
  capabilities = ['send_email', 'send_in_app', 'send_push', 'schedule_notification', 'cancel_notification'];

  private emailSystem: EmailAlertSystem;

  constructor(userId: string) {
    this.emailSystem = new EmailAlertSystem(userId);
  }

  async executeOperation(operation: string, parameters: any, context: WorkflowContext): Promise<any> {
    switch (operation) {
      case 'send_email':
        return await this.sendEmail(parameters, context);
      case 'send_in_app':
        return await this.sendInApp(parameters, context);
      case 'send_push':
        return await this.sendPush(parameters, context);
      case 'schedule_notification':
        return await this.scheduleNotification(parameters, context);
      case 'cancel_notification':
        return await this.cancelNotification(parameters, context);
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
  }

  async validateOperation(operation: string, parameters: any): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (!parameters.message || typeof parameters.message !== 'string') {
      errors.push('Message is required and must be a string');
    }

    switch (operation) {
      case 'send_email':
        if (!parameters.recipients || !Array.isArray(parameters.recipients)) {
          errors.push('Recipients array is required for email notifications');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  getAvailableOperations(): ServiceOperation[] {
    return [
      {
        name: 'send_email',
        description: 'Send email notification',
        category: 'notification',
        parameters: [
          { name: 'recipients', type: 'array', required: true, description: 'Email recipients' },
          { name: 'subject', type: 'string', required: true, description: 'Email subject' },
          { name: 'message', type: 'string', required: true, description: 'Notification message' },
          { name: 'priority', type: 'string', required: false, description: 'Message priority', defaultValue: 'normal' }
        ],
        returns: { type: 'object', description: 'Notification delivery status' },
        examples: [
          {
            name: 'Send alert email',
            description: 'Send an alert notification via email',
            parameters: {
              recipients: ['user@example.com'],
              subject: 'Workflow Alert',
              message: 'Your workflow has completed successfully'
            },
            expectedResult: { sent: true, messageId: 'msg_123', delivered: 1 }
          }
        ],
        riskLevel: 'low',
        requiresApproval: false
      }
    ];
  }

  async getHealthStatus(): Promise<ServiceHealth> {
    try {
      const startTime = Date.now();
      // Simple health check - could ping email service
      const latency = Date.now() - startTime;

      return {
        status: 'healthy',
        lastCheck: new Date().toISOString(),
        latency,
        errorRate: 0,
        details: { service: 'notification', connected: true }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        latency: -1,
        errorRate: 1,
        details: { error: error.message }
      };
    }
  }

  // Private implementation methods
  private async sendEmail(parameters: any, context: WorkflowContext): Promise<any> {
    return await this.emailSystem.sendAlert({
      type: 'workflow_notification',
      subject: parameters.subject,
      message: parameters.message,
      recipients: parameters.recipients,
      priority: parameters.priority || 'normal'
    });
  }

  private async sendInApp(parameters: any, context: WorkflowContext): Promise<any> {
    // Implementation for in-app notifications
    return { sent: true, type: 'in_app', message: parameters.message };
  }

  private async sendPush(parameters: any, context: WorkflowContext): Promise<any> {
    // Implementation for push notifications
    return { sent: true, type: 'push', message: parameters.message };
  }

  private async scheduleNotification(parameters: any, context: WorkflowContext): Promise<any> {
    // Implementation for scheduled notifications
    return { scheduled: true, scheduledFor: parameters.scheduledTime, id: `scheduled_${Date.now()}` };
  }

  private async cancelNotification(parameters: any, context: WorkflowContext): Promise<any> {
    // Implementation for canceling notifications
    return { cancelled: true, notificationId: parameters.notificationId };
  }
}

/**
 * Main Integration Manager
 */
export class WorkflowIntegrationManager {
  private integrations: Map<string, ServiceIntegration> = new Map();
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
    this.initializeIntegrations();
  }

  private async initializeIntegrations(): Promise<void> {
    // Initialize Google Workspace integrations
    const orchestrator = new GoogleWorkspaceOrchestrator(null, this.userId);

    this.integrations.set('gmail', new GmailIntegration(orchestrator));
    this.integrations.set('drive', new DriveIntegration(orchestrator));
    this.integrations.set('calendar', new CalendarIntegration(orchestrator));

    // Initialize other service integrations
    this.integrations.set('ai_analysis', new AIAnalysisIntegration(this.userId));
    this.integrations.set('cost_monitor', new CostMonitorIntegration(this.userId));
    this.integrations.set('device_continuity', new DeviceContinuityIntegration(this.userId));
    this.integrations.set('notification', new NotificationIntegration(this.userId));
  }

  /**
   * Execute an operation on a specific service
   */
  async executeOperation(
    serviceName: string,
    operation: string,
    parameters: any,
    context: WorkflowContext
  ): Promise<any> {
    const integration = this.integrations.get(serviceName);
    if (!integration) {
      throw new Error(`Service integration not found: ${serviceName}`);
    }

    // Validate operation before execution
    const validation = await integration.validateOperation(operation, parameters);
    if (!validation.isValid) {
      throw new Error(`Operation validation failed: ${validation.errors.join(', ')}`);
    }

    // Execute the operation
    return await integration.executeOperation(operation, parameters, context);
  }

  /**
   * Get all available integrations
   */
  getAvailableIntegrations(): string[] {
    return Array.from(this.integrations.keys());
  }

  /**
   * Get operations for a specific service
   */
  getServiceOperations(serviceName: string): ServiceOperation[] {
    const integration = this.integrations.get(serviceName);
    if (!integration) {
      throw new Error(`Service integration not found: ${serviceName}`);
    }

    return integration.getAvailableOperations();
  }

  /**
   * Get health status of all integrations
   */
  async getHealthStatus(): Promise<Record<string, ServiceHealth>> {
    const healthStatus: Record<string, ServiceHealth> = {};

    for (const [serviceName, integration] of this.integrations) {
      try {
        healthStatus[serviceName] = await integration.getHealthStatus();
      } catch (error) {
        healthStatus[serviceName] = {
          status: 'unhealthy',
          lastCheck: new Date().toISOString(),
          latency: -1,
          errorRate: 1,
          details: { error: error.message }
        };
      }
    }

    return healthStatus;
  }

  /**
   * Validate an operation across all services
   */
  async validateWorkflowOperations(workflowSteps: any[]): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    for (const step of workflowSteps) {
      if (step.type === 'action' && step.config?.action) {
        const { service, operation, parameters } = step.config.action;
        const integration = this.integrations.get(service);

        if (!integration) {
          errors.push(`Unknown service: ${service} in step ${step.name}`);
          continue;
        }

        try {
          const validation = await integration.validateOperation(operation, parameters);
          errors.push(...validation.errors.map(e => `${step.name}: ${e}`));
          warnings.push(...validation.warnings.map(w => `${step.name}: ${w}`));
          suggestions.push(...validation.suggestions.map(s => `${step.name}: ${s}`));
        } catch (error) {
          errors.push(`${step.name}: Failed to validate operation - ${error.message}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Get integration capabilities summary
   */
  getCapabilitiesSummary(): Record<string, string[]> {
    const capabilities: Record<string, string[]> = {};

    for (const [serviceName, integration] of this.integrations) {
      capabilities[serviceName] = integration.capabilities;
    }

    return capabilities;
  }
}

export default WorkflowIntegrationManager;