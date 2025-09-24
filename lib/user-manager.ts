/**
 * User Manager - Role-based access control with Zach (Admin) and Rebecca (User)
 * Handles permissions, preferences, and user-specific features
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
  avatar_url?: string;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    timezone: string;
    notifications: {
      email: boolean;
      push: boolean;
      mentions: boolean;
      projects: boolean;
      deadlines: boolean;
    };
    dashboard: {
      default_view: 'projects' | 'conversations' | 'calendar' | 'analytics';
      widgets_enabled: string[];
      layout: 'compact' | 'comfortable' | 'spacious';
    };
    ai: {
      response_style: 'concise' | 'detailed' | 'technical' | 'friendly';
      auto_summarize: boolean;
      proactive_suggestions: boolean;
      context_length: 'short' | 'medium' | 'long';
    };
  };
  permissions: {
    can_create_projects: boolean;
    can_delete_projects: boolean;
    can_manage_users: boolean;
    can_access_analytics: boolean;
    can_export_data: boolean;
    can_configure_integrations: boolean;
    can_view_all_conversations: boolean;
    max_projects: number;
    max_collaborators_per_project: number;
  };
  metadata: {
    created_at: string;
    last_login: string;
    total_conversations: number;
    total_messages: number;
    favorite_projects: string[];
    google_connected: boolean;
    calendar_sync_enabled: boolean;
    drive_sync_enabled: boolean;
    gmail_sync_enabled: boolean;
  };
}

export class UserManager {
  private static instance: UserManager;

  private constructor() {}

  public static getInstance(): UserManager {
    if (!UserManager.instance) {
      UserManager.instance = new UserManager();
    }
    return UserManager.instance;
  }

  /**
   * Initialize default users (Zach as Admin, Rebecca as User)
   */
  async initializeDefaultUsers(): Promise<void> {
    const defaultUsers = [
      {
        id: 'zach-admin-001',
        name: 'Zach',
        email: 'zach@kimbleai.com',
        role: 'admin' as const,
        avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Zach',
        preferences: {
          theme: 'dark' as const,
          language: 'en',
          timezone: 'America/New_York',
          notifications: {
            email: true,
            push: true,
            mentions: true,
            projects: true,
            deadlines: true,
          },
          dashboard: {
            default_view: 'analytics' as const,
            widgets_enabled: ['projects', 'conversations', 'calendar', 'analytics', 'team'],
            layout: 'comfortable' as const,
          },
          ai: {
            response_style: 'technical' as const,
            auto_summarize: true,
            proactive_suggestions: true,
            context_length: 'long' as const,
          },
        },
        permissions: {
          can_create_projects: true,
          can_delete_projects: true,
          can_manage_users: true,
          can_access_analytics: true,
          can_export_data: true,
          can_configure_integrations: true,
          can_view_all_conversations: true,
          max_projects: -1, // Unlimited
          max_collaborators_per_project: -1, // Unlimited
        },
        metadata: {
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString(),
          total_conversations: 0,
          total_messages: 0,
          favorite_projects: [],
          google_connected: false,
          calendar_sync_enabled: false,
          drive_sync_enabled: false,
          gmail_sync_enabled: false,
        },
      },
      {
        id: 'rebecca-user-001',
        name: 'Rebecca',
        email: 'rebecca@kimbleai.com',
        role: 'user' as const,
        avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rebecca',
        preferences: {
          theme: 'light' as const,
          language: 'en',
          timezone: 'America/Los_Angeles',
          notifications: {
            email: true,
            push: false,
            mentions: true,
            projects: true,
            deadlines: true,
          },
          dashboard: {
            default_view: 'projects' as const,
            widgets_enabled: ['projects', 'conversations', 'calendar'],
            layout: 'comfortable' as const,
          },
          ai: {
            response_style: 'friendly' as const,
            auto_summarize: true,
            proactive_suggestions: false,
            context_length: 'medium' as const,
          },
        },
        permissions: {
          can_create_projects: true,
          can_delete_projects: false,
          can_manage_users: false,
          can_access_analytics: false,
          can_export_data: false,
          can_configure_integrations: false,
          can_view_all_conversations: false,
          max_projects: 10,
          max_collaborators_per_project: 5,
        },
        metadata: {
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString(),
          total_conversations: 0,
          total_messages: 0,
          favorite_projects: [],
          google_connected: false,
          calendar_sync_enabled: false,
          drive_sync_enabled: false,
          gmail_sync_enabled: false,
        },
      },
    ];

    for (const user of defaultUsers) {
      const { error } = await supabase
        .from('users')
        .upsert(user, { onConflict: 'id' });

      if (error) {
        console.error(`Failed to initialize user ${user.name}:`, error);
      } else {
        console.log(`✅ Initialized user: ${user.name} (${user.role})`);
      }
    }
  }

  /**
   * Get user by ID or name with full profile
   */
  async getUser(identifier: string): Promise<User | null> {
    let query = supabase.from('users').select('*');

    // Check if identifier is an ID or name
    if (identifier.includes('-')) {
      query = query.eq('id', identifier);
    } else {
      query = query.ilike('name', identifier);
    }

    const { data, error } = await query.single();

    if (error) {
      console.error('Failed to get user:', error);
      return null;
    }

    return data;
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(
    userId: string,
    preferences: Partial<User['preferences']>
  ): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .update({ preferences })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update preferences:', error);
      return null;
    }

    return data;
  }

  /**
   * Check if user has specific permission
   */
  async hasPermission(userId: string, permission: keyof User['permissions']): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false;

    return user.permissions[permission] === true;
  }

  /**
   * Update user's Google integration status
   */
  async updateGoogleIntegration(
    userId: string,
    integrations: {
      google_connected?: boolean;
      calendar_sync_enabled?: boolean;
      drive_sync_enabled?: boolean;
      gmail_sync_enabled?: boolean;
    }
  ): Promise<void> {
    const currentUser = await this.getUser(userId);
    if (!currentUser) return;

    const updatedMetadata = {
      ...currentUser.metadata,
      ...integrations,
    };

    await supabase
      .from('users')
      .update({ metadata: updatedMetadata })
      .eq('id', userId);
  }

  /**
   * Get user activity summary
   */
  async getUserActivity(userId: string, days = 30): Promise<{
    conversations_created: number;
    messages_sent: number;
    projects_created: number;
    tasks_completed: number;
    most_active_day: string;
    productivity_score: number;
  }> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Get conversations
    const { count: conversationsCount } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', since);

    // Get messages
    const { count: messagesCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', since);

    // Get projects
    const { count: projectsCount } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', userId)
      .gte('metadata->>created_at', since);

    // Get completed tasks
    const { count: tasksCount } = await supabase
      .from('project_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_to', userId)
      .eq('status', 'completed')
      .gte('completed_at', since);

    // Calculate productivity score (simple algorithm)
    const productivity = Math.min(100,
      (conversationsCount || 0) * 2 +
      (messagesCount || 0) * 0.5 +
      (projectsCount || 0) * 10 +
      (tasksCount || 0) * 5
    );

    return {
      conversations_created: conversationsCount || 0,
      messages_sent: messagesCount || 0,
      projects_created: projectsCount || 0,
      tasks_completed: tasksCount || 0,
      most_active_day: 'Monday', // Placeholder - would need daily breakdown
      productivity_score: Math.round(productivity)
    };
  }

  /**
   * Get role-based navigation items
   */
  getRoleBasedNavigation(user: User): Array<{
    name: string;
    path: string;
    icon: string;
    permission?: boolean;
  }> {
    const baseNavigation = [
      { name: 'Dashboard', path: '/', icon: 'home' },
      { name: 'Chat', path: '/chat', icon: 'message-circle' },
      { name: 'Projects', path: '/projects', icon: 'folder' },
      { name: 'Calendar', path: '/calendar', icon: 'calendar' },
    ];

    const adminNavigation = [
      { name: 'Analytics', path: '/analytics', icon: 'bar-chart', permission: user.permissions.can_access_analytics },
      { name: 'Users', path: '/users', icon: 'users', permission: user.permissions.can_manage_users },
      { name: 'Integrations', path: '/integrations', icon: 'settings', permission: user.permissions.can_configure_integrations },
      { name: 'Export', path: '/export', icon: 'download', permission: user.permissions.can_export_data },
    ];

    const navigation = [...baseNavigation];

    if (user.role === 'admin') {
      navigation.push(...adminNavigation.filter(item => item.permission !== false));
    }

    return navigation;
  }

  /**
   * Generate user-specific system prompt for AI
   */
  generateSystemPrompt(user: User): string {
    const { preferences } = user;

    let prompt = `You are KimbleAI, an intelligent assistant for ${user.name}.

User Profile:
- Name: ${user.name}
- Role: ${user.role}
- Preferred Response Style: ${preferences.ai.response_style}
- Context Length Preference: ${preferences.ai.context_length}`;

    if (preferences.ai.response_style === 'technical') {
      prompt += `\n\nResponse Guidelines:
- Use technical terminology when appropriate
- Provide code examples and detailed explanations
- Include implementation details and best practices`;
    } else if (preferences.ai.response_style === 'friendly') {
      prompt += `\n\nResponse Guidelines:
- Use a warm, conversational tone
- Explain technical concepts in simple terms
- Be encouraging and supportive`;
    } else if (preferences.ai.response_style === 'concise') {
      prompt += `\n\nResponse Guidelines:
- Keep responses brief and to the point
- Focus on actionable information
- Minimize explanations unless specifically requested`;
    }

    if (user.role === 'admin') {
      prompt += `\n\nAdmin Context:
- You have access to system analytics and user management
- You can help with technical configuration and troubleshooting
- You can provide insights across all projects and users`;
    }

    if (preferences.ai.proactive_suggestions) {
      prompt += `\n\nBe proactive in suggesting:
- Relevant actions based on conversation context
- Potential improvements to workflows
- Connections to previous conversations or projects`;
    }

    return prompt;
  }

  /**
   * Log user activity
   */
  async logActivity(
    userId: string,
    activity: {
      type: 'login' | 'conversation' | 'project_created' | 'message_sent' | 'integration_connected';
      details?: any;
    }
  ): Promise<void> {
    await supabase.from('user_activity_log').insert({
      user_id: userId,
      activity_type: activity.type,
      details: activity.details || {},
      timestamp: new Date().toISOString()
    });

    // Update user metadata
    if (activity.type === 'login') {
      await supabase
        .from('users')
        .update({ 'metadata.last_login': new Date().toISOString() })
        .eq('id', userId);
    }
  }

  /**
   * Check user limits (for non-admin users)
   */
  async checkUserLimits(userId: string, action: 'create_project' | 'add_collaborator'): Promise<{
    allowed: boolean;
    current: number;
    limit: number;
    message?: string;
  }> {
    const user = await this.getUser(userId);
    if (!user) {
      return { allowed: false, current: 0, limit: 0, message: 'User not found' };
    }

    if (user.role === 'admin') {
      return { allowed: true, current: 0, limit: -1 }; // Admin has no limits
    }

    if (action === 'create_project') {
      const { count: projectCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', userId);

      const current = projectCount || 0;
      const limit = user.permissions.max_projects;

      return {
        allowed: limit === -1 || current < limit,
        current,
        limit,
        message: limit !== -1 && current >= limit ? `You've reached your project limit of ${limit}` : undefined
      };
    }

    return { allowed: true, current: 0, limit: -1 };
  }
}

export default UserManager;