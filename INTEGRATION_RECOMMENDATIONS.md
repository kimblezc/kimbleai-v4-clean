# KimbleAI Integration Recommendations
## Comprehensive Integration Strategy for Task Organization & Project Management

**Version**: 1.0.0
**Created**: 2025-11-15
**Status**: Planning Phase
**Current Version**: v8.24.0
**Commit**: 9fdeba2

---

## Executive Summary

This document provides a comprehensive roadmap for integrating third-party productivity platforms into KimbleAI. Based on existing infrastructure (Google Workspace, Zapier) and user requirements (Git, Todoist, Notion), we've identified **15 high-value integrations** organized into 3 priority tiers.

**Key Metrics**:
- **Total Integrations Recommended**: 15
- **Already Implemented**: 3 (Google Workspace, OpenAI, Supabase)
- **Priority 1 (High Value)**: 5 integrations (~4-6 weeks)
- **Priority 2 (Medium Value)**: 5 integrations (~6-8 weeks)
- **Priority 3 (Nice to Have)**: 5 integrations (~8-12 weeks)

---

## Table of Contents

1. [Priority Tier 1: High Value Integrations](#priority-tier-1-high-value-integrations)
2. [Priority Tier 2: Medium Value Integrations](#priority-tier-2-medium-value-integrations)
3. [Priority Tier 3: Nice to Have](#priority-tier-3-nice-to-have)
4. [Technical Architecture](#technical-architecture)
5. [Implementation Roadmap](#implementation-roadmap)
6. [Database Schema](#database-schema)
7. [Security Considerations](#security-considerations)
8. [Code Examples](#code-examples)
9. [UI/UX Components](#uiux-components)
10. [Cost Analysis](#cost-analysis)

---

## Priority Tier 1: High Value Integrations

### 1. GitHub Integration

**Status**: ✅ Partially Implemented (INTEGRATIONS_SETUP.md mentions it)

#### Description
Full GitHub integration for repository management, issue tracking, pull requests, and commit-based task management.

#### Use Cases
1. **Automatic Issue Creation**: Convert KimbleAI conversation action items into GitHub issues
2. **Commit-Based Task Tracking**: Track project progress through commit messages
3. **PR Integration**: Link conversations to pull requests for context
4. **Repository Insights**: View repository stats, contributors, and activity
5. **Code Search**: Search across repositories from KimbleAI

#### API Documentation
- **Docs**: https://docs.github.com/en/rest
- **Rate Limit**: 5,000 requests/hour (authenticated)
- **Webhook Support**: ✅ Yes

#### Authentication
- **Method**: Personal Access Token (PAT) or GitHub App
- **Scopes Required**:
  - `repo` - Full control of repositories
  - `read:user` - Read user profile
  - `read:org` - Read organization data
  - `workflow` - Update GitHub Action workflows (optional)

#### Implementation Complexity
**Medium** (2-3 weeks)

- API integration: 1 week
- UI components: 1 week
- Testing & refinement: 3-5 days

#### Cost
- **Free Tier**: ✅ Yes (for public repos)
- **Paid**: GitHub Pro ($4/mo), Team ($4/user/mo), Enterprise ($21/user/mo)

#### Sample Code

```typescript
// lib/integrations/github.ts
import { Octokit } from '@octokit/rest';

export class GitHubIntegration {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  // List repositories
  async getRepositories(username: string) {
    const { data } = await this.octokit.repos.listForUser({
      username,
      sort: 'updated',
      per_page: 100
    });
    return data;
  }

  // Create issue from conversation
  async createIssue(owner: string, repo: string, title: string, body: string, labels?: string[]) {
    const { data } = await this.octokit.issues.create({
      owner,
      repo,
      title,
      body,
      labels: labels || []
    });
    return data;
  }

  // List issues with filters
  async getIssues(owner: string, repo: string, state: 'open' | 'closed' | 'all' = 'open') {
    const { data } = await this.octokit.issues.listForRepo({
      owner,
      repo,
      state,
      sort: 'created',
      direction: 'desc'
    });
    return data;
  }

  // Get commit activity
  async getCommits(owner: string, repo: string, since?: Date) {
    const { data } = await this.octokit.repos.listCommits({
      owner,
      repo,
      since: since?.toISOString(),
      per_page: 100
    });
    return data;
  }

  // Create pull request
  async createPullRequest(
    owner: string,
    repo: string,
    title: string,
    head: string,
    base: string,
    body?: string
  ) {
    const { data } = await this.octokit.pulls.create({
      owner,
      repo,
      title,
      head,
      base,
      body
    });
    return data;
  }

  // Search code across repositories
  async searchCode(query: string) {
    const { data } = await this.octokit.search.code({
      q: query,
      per_page: 50
    });
    return data.items;
  }
}
```

#### Database Schema

```sql
-- integrations_github table
CREATE TABLE integrations_github (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  github_username TEXT NOT NULL,
  access_token TEXT NOT NULL, -- Encrypted
  token_expires_at TIMESTAMP,
  refresh_token TEXT, -- Encrypted
  default_repo TEXT,
  sync_enabled BOOLEAN DEFAULT true,
  sync_frequency INTEGER DEFAULT 30, -- minutes
  last_sync_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- github_repositories table
CREATE TABLE github_repositories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_id UUID REFERENCES integrations_github(id) ON DELETE CASCADE,
  repo_id BIGINT UNIQUE NOT NULL, -- GitHub repo ID
  owner TEXT NOT NULL,
  name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  description TEXT,
  url TEXT,
  language TEXT,
  stars INTEGER DEFAULT 0,
  forks INTEGER DEFAULT 0,
  open_issues INTEGER DEFAULT 0,
  is_private BOOLEAN DEFAULT false,
  tracked BOOLEAN DEFAULT false, -- User wants to track this repo
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- github_issues table
CREATE TABLE github_issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repo_id UUID REFERENCES github_repositories(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id),
  issue_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  state TEXT, -- open, closed
  labels TEXT[], -- Array of label names
  assignees TEXT[], -- Array of usernames
  url TEXT,
  github_created_at TIMESTAMP,
  github_updated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(repo_id, issue_number)
);

-- Indexes
CREATE INDEX idx_github_repos_integration ON github_repositories(integration_id);
CREATE INDEX idx_github_issues_repo ON github_issues(repo_id);
CREATE INDEX idx_github_issues_conversation ON github_issues(conversation_id);
```

#### UI Components

**Components to Build**:
1. `GitHubConnectButton.tsx` - OAuth connection button
2. `GitHubRepoList.tsx` - Browse and select repositories
3. `GitHubIssueCreator.tsx` - Create issues from conversations
4. `GitHubActivityFeed.tsx` - Show recent commits, PRs, issues
5. `GitHubSearchPanel.tsx` - Search code across repos
6. `GitHubSettingsPanel.tsx` - Configure sync settings

---

### 2. Todoist Integration

**Status**: ❌ Not Implemented (mentioned in INTEGRATIONS_SETUP.md but no code exists)

#### Description
Full Todoist integration for personal task management, project organization, and productivity tracking.

#### Use Cases
1. **Task Creation from Chat**: Auto-create Todoist tasks from conversation action items
2. **Project Sync**: Sync KimbleAI projects with Todoist projects
3. **Due Date Reminders**: Get reminded about upcoming tasks in KimbleAI
4. **Productivity Dashboard**: View task completion rates and productivity metrics
5. **Label-Based Organization**: Use Todoist labels to organize tasks by context

#### API Documentation
- **Docs**: https://developer.todoist.com/rest/v2/
- **Rate Limit**: 450 requests per 15 minutes
- **Webhook Support**: ✅ Yes (premium feature)

#### Authentication
- **Method**: API Token (OAuth also available)
- **Token Location**: Settings > Integrations > API token
- **Scopes**: Full access to user's Todoist data

#### Implementation Complexity
**Easy** (1-2 weeks)

- API integration: 3-5 days
- UI components: 3-5 days
- Testing: 2-3 days

#### Cost
- **Free Tier**: ✅ Yes (5 projects, basic features)
- **Pro**: $4/month (300 projects, reminders, labels)
- **Business**: $6/month (500 projects, team features)

#### Sample Code

```typescript
// lib/integrations/todoist.ts
interface TodoistTask {
  content: string;
  description?: string;
  project_id?: string;
  due_string?: string; // "tomorrow at 2pm", "next Monday"
  due_date?: string; // "2025-11-20"
  priority?: 1 | 2 | 3 | 4; // 1=normal, 4=urgent
  labels?: string[];
}

export class TodoistIntegration {
  private apiToken: string;
  private baseURL = 'https://api.todoist.com/rest/v2';

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  private async fetch(endpoint: string, options?: RequestInit) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        ...options?.headers
      }
    });

    if (!response.ok) {
      throw new Error(`Todoist API error: ${response.statusText}`);
    }

    return response.json();
  }

  // Get all projects
  async getProjects() {
    return this.fetch('/projects');
  }

  // Create project
  async createProject(name: string, color?: string, favorite?: boolean) {
    return this.fetch('/projects', {
      method: 'POST',
      body: JSON.stringify({ name, color, is_favorite: favorite })
    });
  }

  // Get all tasks
  async getTasks(projectId?: string, filter?: string) {
    const params = new URLSearchParams();
    if (projectId) params.append('project_id', projectId);
    if (filter) params.append('filter', filter);

    return this.fetch(`/tasks${params.toString() ? '?' + params : ''}`);
  }

  // Create task
  async createTask(task: TodoistTask) {
    return this.fetch('/tasks', {
      method: 'POST',
      body: JSON.stringify(task)
    });
  }

  // Complete task
  async completeTask(taskId: string) {
    return this.fetch(`/tasks/${taskId}/close`, {
      method: 'POST'
    });
  }

  // Update task
  async updateTask(taskId: string, updates: Partial<TodoistTask>) {
    return this.fetch(`/tasks/${taskId}`, {
      method: 'POST',
      body: JSON.stringify(updates)
    });
  }

  // Get labels
  async getLabels() {
    return this.fetch('/labels');
  }

  // Get task comments
  async getComments(taskId: string) {
    return this.fetch(`/comments?task_id=${taskId}`);
  }

  // Create task from KimbleAI conversation
  async createTaskFromConversation(
    conversationId: string,
    content: string,
    projectName?: string
  ) {
    // Find or create project
    const projects = await this.getProjects();
    let project = projects.find((p: any) => p.name === projectName);

    if (!project && projectName) {
      project = await this.createProject(projectName);
    }

    // Create task with link back to conversation
    return this.createTask({
      content,
      description: `Created from KimbleAI conversation: ${conversationId}`,
      project_id: project?.id,
      labels: ['kimbleai']
    });
  }
}
```

#### Database Schema

```sql
-- integrations_todoist table
CREATE TABLE integrations_todoist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  api_token TEXT NOT NULL, -- Encrypted
  default_project_id TEXT,
  sync_enabled BOOLEAN DEFAULT true,
  sync_frequency INTEGER DEFAULT 15, -- minutes
  auto_create_tasks BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- todoist_projects table
CREATE TABLE todoist_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_id UUID REFERENCES integrations_todoist(id) ON DELETE CASCADE,
  todoist_project_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  is_favorite BOOLEAN DEFAULT false,
  kimbleai_project_id UUID REFERENCES projects(id), -- Link to KimbleAI project
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- todoist_tasks table
CREATE TABLE todoist_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES todoist_projects(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id),
  todoist_task_id TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  description TEXT,
  priority INTEGER DEFAULT 1,
  due_date TIMESTAMP,
  is_completed BOOLEAN DEFAULT false,
  labels TEXT[],
  url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_todoist_projects_integration ON todoist_projects(integration_id);
CREATE INDEX idx_todoist_tasks_project ON todoist_tasks(project_id);
CREATE INDEX idx_todoist_tasks_conversation ON todoist_tasks(conversation_id);
CREATE INDEX idx_todoist_tasks_completed ON todoist_tasks(is_completed);
```

#### UI Components

**Components to Build**:
1. `TodoistConnectButton.tsx` - API token connection
2. `TodoistProjectSelector.tsx` - Select Todoist project for sync
3. `TodoistTaskCreator.tsx` - Create tasks from conversations
4. `TodoistTaskList.tsx` - View and manage tasks
5. `TodoistProductivityWidget.tsx` - Dashboard widget showing today's tasks
6. `TodoistSettingsPanel.tsx` - Configure auto-task creation

---

### 3. Notion Integration

**Status**: ❌ Not Implemented (mentioned in INTEGRATIONS_SETUP.md but no code exists)

#### Description
Full Notion integration for knowledge management, documentation, and database-style organization.

#### Use Cases
1. **Knowledge Base Sync**: Sync KimbleAI knowledge base to Notion pages
2. **Meeting Notes**: Auto-create meeting notes from calendar events
3. **Project Documentation**: Maintain project docs in Notion, searchable from KimbleAI
4. **Database Management**: Create and update Notion databases from conversations
5. **Wiki Integration**: Use Notion as team wiki accessible through KimbleAI

#### API Documentation
- **Docs**: https://developers.notion.com/
- **Rate Limit**: 3 requests per second
- **Webhook Support**: ❌ No (polling required)

#### Authentication
- **Method**: Internal Integration Token
- **Setup**: Create integration at https://www.notion.so/my-integrations
- **Permissions**: Must share specific pages with integration

#### Implementation Complexity
**Medium** (2-3 weeks)

- API integration: 1 week
- Database/page management: 1 week
- UI components: 3-5 days

#### Cost
- **Free Tier**: ✅ Yes (unlimited blocks, limited features)
- **Plus**: $8/month/user (unlimited file uploads, version history)
- **Business**: $15/month/user (SAML SSO, advanced security)

#### Sample Code

```typescript
// lib/integrations/notion.ts
import { Client } from '@notionhq/client';

export class NotionIntegration {
  private notion: Client;

  constructor(apiKey: string) {
    this.notion = new Client({ auth: apiKey });
  }

  // Search workspace
  async search(query: string) {
    const response = await this.notion.search({
      query,
      filter: { property: 'object', value: 'page' }
    });
    return response.results;
  }

  // List databases
  async getDatabases() {
    const response = await this.notion.search({
      filter: { property: 'object', value: 'database' }
    });
    return response.results;
  }

  // Get database entries
  async queryDatabase(databaseId: string, filter?: any) {
    const response = await this.notion.databases.query({
      database_id: databaseId,
      filter
    });
    return response.results;
  }

  // Create page
  async createPage(
    parentId: string,
    title: string,
    content: string,
    properties?: any
  ) {
    const response = await this.notion.pages.create({
      parent: { page_id: parentId },
      properties: {
        title: {
          title: [{ text: { content: title } }]
        },
        ...properties
      },
      children: [
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ text: { content } }]
          }
        }
      ]
    });
    return response;
  }

  // Add to database
  async addToDatabase(
    databaseId: string,
    properties: Record<string, any>
  ) {
    const response = await this.notion.pages.create({
      parent: { database_id: databaseId },
      properties
    });
    return response;
  }

  // Update page
  async updatePage(pageId: string, properties: any) {
    const response = await this.notion.pages.update({
      page_id: pageId,
      properties
    });
    return response;
  }

  // Get page content
  async getPageContent(pageId: string) {
    const blocks = await this.notion.blocks.children.list({
      block_id: pageId
    });
    return blocks.results;
  }

  // Create meeting notes from calendar event
  async createMeetingNotes(
    databaseId: string,
    eventTitle: string,
    date: Date,
    attendees: string[],
    notes: string
  ) {
    return this.addToDatabase(databaseId, {
      Name: {
        title: [{ text: { content: eventTitle } }]
      },
      Date: {
        date: { start: date.toISOString() }
      },
      Attendees: {
        multi_select: attendees.map(name => ({ name }))
      },
      Notes: {
        rich_text: [{ text: { content: notes } }]
      }
    });
  }

  // Sync KimbleAI knowledge to Notion
  async syncKnowledgeBase(
    databaseId: string,
    entries: Array<{
      title: string;
      content: string;
      tags: string[];
      source: string;
    }>
  ) {
    const results = [];

    for (const entry of entries) {
      const result = await this.addToDatabase(databaseId, {
        Title: {
          title: [{ text: { content: entry.title } }]
        },
        Content: {
          rich_text: [{ text: { content: entry.content } }]
        },
        Tags: {
          multi_select: entry.tags.map(tag => ({ name: tag }))
        },
        Source: {
          select: { name: entry.source }
        }
      });
      results.push(result);
    }

    return results;
  }
}
```

#### Database Schema

```sql
-- integrations_notion table
CREATE TABLE integrations_notion (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  api_token TEXT NOT NULL, -- Encrypted
  workspace_name TEXT,
  default_database_id TEXT,
  sync_enabled BOOLEAN DEFAULT true,
  sync_frequency INTEGER DEFAULT 60, -- minutes
  last_sync_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- notion_pages table
CREATE TABLE notion_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_id UUID REFERENCES integrations_notion(id) ON DELETE CASCADE,
  notion_page_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  url TEXT,
  parent_id TEXT,
  is_database BOOLEAN DEFAULT false,
  last_edited_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- notion_sync_mappings table
CREATE TABLE notion_sync_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_id UUID REFERENCES integrations_notion(id) ON DELETE CASCADE,
  kimbleai_type TEXT NOT NULL, -- 'conversation', 'knowledge_entry', 'project'
  kimbleai_id UUID NOT NULL,
  notion_page_id TEXT NOT NULL,
  sync_direction TEXT DEFAULT 'bidirectional', -- 'to_notion', 'from_notion', 'bidirectional'
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notion_pages_integration ON notion_pages(integration_id);
CREATE INDEX idx_notion_sync_kimbleai ON notion_sync_mappings(kimbleai_type, kimbleai_id);
CREATE INDEX idx_notion_sync_notion ON notion_sync_mappings(notion_page_id);
```

#### UI Components

**Components to Build**:
1. `NotionConnectButton.tsx` - Integration token setup
2. `NotionDatabaseSelector.tsx` - Select target database
3. `NotionPageBrowser.tsx` - Browse Notion pages
4. `NotionSyncPanel.tsx` - Configure sync settings
5. `NotionMeetingNotes.tsx` - Create meeting notes
6. `NotionSearchWidget.tsx` - Search Notion from KimbleAI

---

### 4. Linear Integration

**Status**: ❌ Not Implemented

#### Description
Linear integration for modern issue tracking and project management with emphasis on speed and developer experience.

#### Use Cases
1. **Issue Tracking**: Create and manage Linear issues from KimbleAI
2. **Sprint Management**: Track sprint progress and velocity
3. **Roadmap Planning**: View and update product roadmap
4. **Team Collaboration**: Assign issues to team members
5. **Status Updates**: Auto-update issue status from commit messages

#### API Documentation
- **Docs**: https://developers.linear.app/docs/graphql/working-with-the-graphql-api
- **Type**: GraphQL API
- **Rate Limit**: 2,000 requests per hour per user
- **Webhook Support**: ✅ Yes

#### Authentication
- **Method**: OAuth 2.0 or API Key
- **Scopes**: read, write, admin
- **Token Type**: JWT

#### Implementation Complexity
**Medium** (2-3 weeks)

- GraphQL client setup: 3-5 days
- API integration: 1 week
- UI components: 1 week

#### Cost
- **Free Tier**: ✅ Yes (up to 10 users)
- **Startup**: $8/month/user (unlimited teams)
- **Plus**: $14/month/user (advanced features)

#### Sample Code

```typescript
// lib/integrations/linear.ts
import { LinearClient } from '@linear/sdk';

export class LinearIntegration {
  private client: LinearClient;

  constructor(apiKey: string) {
    this.client = new LinearClient({ apiKey });
  }

  // Get all issues
  async getIssues(teamId?: string, state?: string) {
    const issues = await this.client.issues({
      filter: {
        team: { id: { eq: teamId } },
        state: state ? { name: { eq: state } } : undefined
      }
    });
    return issues.nodes;
  }

  // Create issue
  async createIssue(
    teamId: string,
    title: string,
    description?: string,
    priority?: number,
    assigneeId?: string,
    labels?: string[]
  ) {
    const issue = await this.client.createIssue({
      teamId,
      title,
      description,
      priority,
      assigneeId,
      labelIds: labels
    });
    return issue.issue;
  }

  // Update issue
  async updateIssue(issueId: string, updates: any) {
    const result = await this.client.updateIssue(issueId, updates);
    return result.issue;
  }

  // Get teams
  async getTeams() {
    const teams = await this.client.teams();
    return teams.nodes;
  }

  // Get projects
  async getProjects(teamId?: string) {
    const projects = await this.client.projects({
      filter: teamId ? { team: { id: { eq: teamId } } } : undefined
    });
    return projects.nodes;
  }

  // Get issue by ID
  async getIssue(issueId: string) {
    return this.client.issue(issueId);
  }

  // Search issues
  async searchIssues(query: string) {
    const results = await this.client.searchIssues(query);
    return results.nodes;
  }

  // Create issue from conversation
  async createIssueFromConversation(
    conversationId: string,
    teamId: string,
    title: string,
    description: string
  ) {
    const issue = await this.createIssue(
      teamId,
      title,
      `${description}\n\nCreated from KimbleAI conversation: ${conversationId}`,
      2 // Medium priority
    );
    return issue;
  }

  // Get sprint progress
  async getSprintProgress(projectId: string) {
    const project = await this.client.project(projectId);
    const issues = await this.getIssues(undefined, undefined);

    const total = issues.length;
    const completed = issues.filter(i => i.state?.name === 'Done').length;
    const inProgress = issues.filter(i => i.state?.name === 'In Progress').length;

    return {
      total,
      completed,
      inProgress,
      remaining: total - completed,
      velocity: completed / total
    };
  }
}
```

#### Database Schema

```sql
-- integrations_linear table
CREATE TABLE integrations_linear (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  api_key TEXT NOT NULL, -- Encrypted
  team_id TEXT,
  team_name TEXT,
  default_project_id TEXT,
  sync_enabled BOOLEAN DEFAULT true,
  webhook_url TEXT,
  webhook_secret TEXT,
  last_sync_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- linear_issues table
CREATE TABLE linear_issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_id UUID REFERENCES integrations_linear(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id),
  linear_issue_id TEXT UNIQUE NOT NULL,
  identifier TEXT NOT NULL, -- e.g., "ENG-123"
  title TEXT NOT NULL,
  description TEXT,
  state TEXT,
  priority INTEGER,
  assignee TEXT,
  labels TEXT[],
  url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_linear_issues_integration ON linear_issues(integration_id);
CREATE INDEX idx_linear_issues_conversation ON linear_issues(conversation_id);
CREATE INDEX idx_linear_issues_identifier ON linear_issues(identifier);
```

---

### 5. Slack Integration

**Status**: ❌ Not Implemented

#### Description
Slack integration for team communication, notifications, and collaborative workflows.

#### Use Cases
1. **Message Bridge**: Send KimbleAI updates to Slack channels
2. **Command Interface**: Use slash commands to interact with KimbleAI from Slack
3. **File Sharing**: Share KimbleAI knowledge base entries in Slack
4. **Notifications**: Get notified about important events
5. **Team Collaboration**: Discuss KimbleAI insights in Slack threads

#### API Documentation
- **Docs**: https://api.slack.com/
- **Rate Limit**: Tier-based (1+ requests per minute to 100+ per minute)
- **Webhook Support**: ✅ Yes (Incoming/Outgoing webhooks)

#### Authentication
- **Method**: OAuth 2.0
- **Scopes**: channels:read, chat:write, files:read, files:write, commands
- **App Setup**: Create app at https://api.slack.com/apps

#### Implementation Complexity
**Medium** (2-3 weeks)

- OAuth flow: 3-5 days
- Slash commands: 3-5 days
- Message handling: 1 week
- UI: 3-5 days

#### Cost
- **Free Tier**: ✅ Yes (90 days of message history)
- **Pro**: $7.25/month/user (unlimited history)
- **Business+**: $12.50/month/user (compliance features)

#### Sample Code

```typescript
// lib/integrations/slack.ts
import { WebClient } from '@slack/web-api';

export class SlackIntegration {
  private client: WebClient;

  constructor(token: string) {
    this.client = new WebClient(token);
  }

  // Post message to channel
  async postMessage(channel: string, text: string, blocks?: any[]) {
    const result = await this.client.chat.postMessage({
      channel,
      text,
      blocks
    });
    return result;
  }

  // List channels
  async getChannels() {
    const result = await this.client.conversations.list({
      types: 'public_channel,private_channel'
    });
    return result.channels || [];
  }

  // Upload file
  async uploadFile(channel: string, file: Buffer, filename: string, title?: string) {
    const result = await this.client.files.uploadV2({
      channel_id: channel,
      file,
      filename,
      title
    });
    return result;
  }

  // Get channel history
  async getChannelHistory(channel: string, limit: number = 100) {
    const result = await this.client.conversations.history({
      channel,
      limit
    });
    return result.messages || [];
  }

  // React to message
  async addReaction(channel: string, timestamp: string, emoji: string) {
    const result = await this.client.reactions.add({
      channel,
      timestamp,
      name: emoji
    });
    return result;
  }

  // Send KimbleAI update to Slack
  async sendKimbleAIUpdate(
    channel: string,
    title: string,
    message: string,
    url?: string
  ) {
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: title
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: message
        }
      }
    ];

    if (url) {
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View in KimbleAI'
            },
            url
          }
        ]
      });
    }

    return this.postMessage(channel, title, blocks);
  }

  // Handle slash command
  async handleSlashCommand(command: string, text: string, userId: string) {
    switch (command) {
      case '/kimble-search':
        // Search KimbleAI knowledge base
        return {
          response_type: 'ephemeral',
          text: `Searching for: ${text}...`
        };

      case '/kimble-task':
        // Create task in KimbleAI
        return {
          response_type: 'in_channel',
          text: `Created task: ${text}`
        };

      default:
        return {
          response_type: 'ephemeral',
          text: 'Unknown command'
        };
    }
  }
}
```

#### Database Schema

```sql
-- integrations_slack table
CREATE TABLE integrations_slack (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  team_id TEXT NOT NULL,
  team_name TEXT,
  access_token TEXT NOT NULL, -- Encrypted
  bot_user_id TEXT,
  default_channel TEXT,
  notification_preferences JSONB DEFAULT '{}',
  webhook_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- slack_channels table
CREATE TABLE slack_channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_id UUID REFERENCES integrations_slack(id) ON DELETE CASCADE,
  channel_id TEXT UNIQUE NOT NULL,
  channel_name TEXT NOT NULL,
  is_private BOOLEAN DEFAULT false,
  enabled_for_notifications BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_slack_channels_integration ON slack_channels(integration_id);
```

---

## Priority Tier 2: Medium Value Integrations

### 6. Trello Integration

#### Description
Kanban-style project management with boards, lists, and cards.

#### Use Cases
1. **Visual Task Management**: Drag-and-drop task organization
2. **Board Sync**: Sync KimbleAI projects with Trello boards
3. **Card Creation**: Convert conversation items to Trello cards
4. **Progress Tracking**: Monitor task movement across lists
5. **Team Collaboration**: Share boards with team members

#### API Documentation
- **Docs**: https://developer.atlassian.com/cloud/trello/rest/
- **Rate Limit**: 300 requests per 10 seconds per token
- **Webhook Support**: ✅ Yes

#### Authentication
- **Method**: API Key + Token
- **Get Key**: https://trello.com/app-key
- **OAuth**: Available for app distribution

#### Implementation Complexity
**Easy-Medium** (1-2 weeks)

#### Cost
- **Free Tier**: ✅ Yes (10 boards per workspace)
- **Standard**: $5/month/user (unlimited boards)
- **Premium**: $10/month/user (advanced automation)

#### Sample Code

```typescript
// lib/integrations/trello.ts
export class TrelloIntegration {
  private apiKey: string;
  private token: string;
  private baseURL = 'https://api.trello.com/1';

  constructor(apiKey: string, token: string) {
    this.apiKey = apiKey;
    this.token = token;
  }

  private async fetch(endpoint: string, options?: RequestInit) {
    const url = new URL(`${this.baseURL}${endpoint}`);
    url.searchParams.append('key', this.apiKey);
    url.searchParams.append('token', this.token);

    const response = await fetch(url.toString(), options);
    return response.json();
  }

  // Get boards
  async getBoards() {
    return this.fetch('/members/me/boards');
  }

  // Get lists in board
  async getLists(boardId: string) {
    return this.fetch(`/boards/${boardId}/lists`);
  }

  // Get cards in list
  async getCards(listId: string) {
    return this.fetch(`/lists/${listId}/cards`);
  }

  // Create card
  async createCard(listId: string, name: string, desc?: string, due?: string) {
    return this.fetch('/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idList: listId, name, desc, due })
    });
  }

  // Move card
  async moveCard(cardId: string, listId: string) {
    return this.fetch(`/cards/${cardId}`, {
      method: 'PUT',
      body: JSON.stringify({ idList: listId })
    });
  }

  // Add label to card
  async addLabel(cardId: string, color: string, name: string) {
    return this.fetch(`/cards/${cardId}/labels`, {
      method: 'POST',
      body: JSON.stringify({ color, name })
    });
  }
}
```

---

### 7. Asana Integration

#### Description
Enterprise-grade work management and team collaboration platform.

#### Use Cases
1. **Project Planning**: Create and manage complex projects
2. **Task Dependencies**: Track task relationships
3. **Timeline View**: Gantt-style project timelines
4. **Portfolio Management**: High-level project overview
5. **Custom Fields**: Track custom metadata

#### API Documentation
- **Docs**: https://developers.asana.com/docs
- **Rate Limit**: 1,500 requests per minute
- **Webhook Support**: ✅ Yes

#### Authentication
- **Method**: OAuth 2.0 or Personal Access Token
- **Scopes**: default (read/write access)

#### Implementation Complexity
**Medium** (2-3 weeks)

#### Cost
- **Free Tier**: ✅ Yes (up to 15 users)
- **Premium**: $10.99/month/user
- **Business**: $24.99/month/user

#### Sample Code

```typescript
// lib/integrations/asana.ts
export class AsanaIntegration {
  private token: string;
  private baseURL = 'https://app.asana.com/api/1.0';

  constructor(token: string) {
    this.token = token;
  }

  private async fetch(endpoint: string, options?: RequestInit) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options?.headers
      }
    });
    const data = await response.json();
    return data.data;
  }

  // Get workspaces
  async getWorkspaces() {
    return this.fetch('/workspaces');
  }

  // Get projects
  async getProjects(workspaceId: string) {
    return this.fetch(`/workspaces/${workspaceId}/projects`);
  }

  // Get tasks in project
  async getTasks(projectId: string) {
    return this.fetch(`/projects/${projectId}/tasks`);
  }

  // Create task
  async createTask(workspaceId: string, name: string, notes?: string, due_on?: string) {
    return this.fetch('/tasks', {
      method: 'POST',
      body: JSON.stringify({
        data: { workspace: workspaceId, name, notes, due_on }
      })
    });
  }

  // Update task
  async updateTask(taskId: string, updates: any) {
    return this.fetch(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify({ data: updates })
    });
  }
}
```

---

### 8. Google Calendar Integration

**Status**: ✅ Implemented (see GOOGLE_WORKSPACE_INTEGRATION.md)

Already fully implemented with:
- Event creation and viewing
- Meeting scheduling
- Availability checking
- Google Meet integration
- Auto-sync to knowledge base

**No additional work needed.**

---

### 9. Google Drive Integration

**Status**: ✅ Implemented (see GOOGLE_WORKSPACE_INTEGRATION.md)

Already fully implemented with:
- File browsing and search
- Import to knowledge base
- Folder navigation
- File preview and download
- Auto-sync system

**No additional work needed.**

---

### 10. Dropbox Integration

#### Description
Cloud file storage and sharing alternative to Google Drive.

#### Use Cases
1. **File Storage**: Store and retrieve files
2. **Shared Folders**: Access team shared folders
3. **Paper Integration**: Sync Dropbox Paper documents
4. **Version History**: Track file versions
5. **File Search**: Search across Dropbox files

#### API Documentation
- **Docs**: https://www.dropbox.com/developers/documentation
- **Rate Limit**: Varies by endpoint
- **Webhook Support**: ✅ Yes

#### Authentication
- **Method**: OAuth 2.0
- **Scopes**: files.metadata.read, files.content.read, files.content.write

#### Implementation Complexity
**Medium** (2 weeks)

#### Cost
- **Free Tier**: ✅ Yes (2GB storage)
- **Plus**: $11.99/month (2TB)
- **Professional**: $19.99/month (3TB)

---

## Priority Tier 3: Nice to Have

### 11. Jira Integration

#### Description
Enterprise agile project management and issue tracking.

#### Use Cases
1. **Sprint Planning**: Manage agile sprints
2. **Epic Tracking**: Track large initiatives
3. **Bug Tracking**: Report and track bugs
4. **Workflow Automation**: Custom issue workflows
5. **Reporting**: Burndown charts and velocity

#### API Documentation
- **Docs**: https://developer.atlassian.com/cloud/jira/platform/rest/v3/
- **Rate Limit**: 10 requests per second
- **Webhook Support**: ✅ Yes

#### Implementation Complexity
**Hard** (3-4 weeks) - Complex API, many features

#### Cost
- **Free Tier**: ✅ Yes (up to 10 users)
- **Standard**: $7.75/month/user
- **Premium**: $15.25/month/user

---

### 12. ClickUp Integration

#### Description
All-in-one productivity platform with tasks, docs, goals, and more.

#### Use Cases
1. **Everything App**: Unified task, doc, and goal management
2. **Custom Views**: Multiple ways to view data
3. **Time Tracking**: Built-in time tracking
4. **Goal Setting**: OKR tracking
5. **Automation**: Workflow automation

#### API Documentation
- **Docs**: https://clickup.com/api
- **Rate Limit**: 100 requests per minute
- **Webhook Support**: ✅ Yes

#### Implementation Complexity
**Medium-Hard** (2-3 weeks)

#### Cost
- **Free Tier**: ✅ Yes (100MB storage)
- **Unlimited**: $7/month/user
- **Business**: $12/month/user

---

### 13. Monday.com Integration

#### Description
Work OS for managing workflows, projects, and everyday work.

#### Use Cases
1. **Visual Workflows**: Colorful, intuitive interface
2. **Board Templates**: Pre-built templates
3. **Dashboard Builder**: Custom dashboards
4. **Integrations**: Native integrations with 200+ apps
5. **Automation**: No-code automation

#### API Documentation
- **Docs**: https://developer.monday.com/api-reference/docs
- **Type**: GraphQL API
- **Rate Limit**: 10,000,000 API calls per month
- **Webhook Support**: ✅ Yes

#### Implementation Complexity
**Medium** (2-3 weeks)

#### Cost
- **Free Tier**: ❌ No (14-day trial)
- **Basic**: $8/month/user
- **Standard**: $10/month/user
- **Pro**: $16/month/user

---

### 14. Airtable Integration

#### Description
Spreadsheet-database hybrid for organizing anything.

#### Use Cases
1. **Database-Style Storage**: Flexible data organization
2. **Custom Views**: Grid, calendar, gallery, kanban
3. **Form Integration**: Collect data via forms
4. **Rich Field Types**: Attachments, checkboxes, links
5. **API Access**: Full programmatic access

#### API Documentation
- **Docs**: https://airtable.com/developers/web/api/introduction
- **Rate Limit**: 5 requests per second per base
- **Webhook Support**: ✅ Yes

#### Implementation Complexity
**Easy-Medium** (1-2 weeks)

#### Cost
- **Free Tier**: ✅ Yes (1,200 records per base)
- **Plus**: $10/month/user (5,000 records)
- **Pro**: $20/month/user (50,000 records)

---

### 15. Discord Integration

#### Description
Team communication and community platform.

#### Use Cases
1. **Community Management**: Engage with community
2. **Bot Commands**: KimbleAI bot for Discord
3. **Voice Integration**: Voice channel transcription
4. **Rich Embeds**: Beautiful message formatting
5. **Server Management**: Moderate and manage servers

#### API Documentation
- **Docs**: https://discord.com/developers/docs/intro
- **Rate Limit**: Varies by endpoint
- **Webhook Support**: ✅ Yes

#### Implementation Complexity
**Medium** (2 weeks)

#### Cost
- **Free Tier**: ✅ Yes (unlimited users)
- **Nitro**: $9.99/month/user (perks, not required)

---

## Technical Architecture

### Unified Integration System

All integrations will follow a consistent architecture pattern:

```
lib/integrations/
├── base/
│   ├── integration-base.ts       # Abstract base class
│   ├── oauth-handler.ts          # OAuth flow handler
│   ├── webhook-manager.ts        # Webhook handling
│   └── rate-limiter.ts           # Rate limiting
├── github/
│   ├── github-integration.ts     # GitHub client
│   ├── github-sync.ts            # Sync manager
│   └── github-webhooks.ts        # Webhook handlers
├── todoist/
│   ├── todoist-integration.ts
│   ├── todoist-sync.ts
│   └── todoist-types.ts
├── notion/
│   ├── notion-integration.ts
│   ├── notion-sync.ts
│   └── notion-types.ts
└── ...
```

### Base Integration Class

```typescript
// lib/integrations/base/integration-base.ts
export abstract class IntegrationBase {
  protected userId: string;
  protected config: IntegrationConfig;

  constructor(userId: string, config: IntegrationConfig) {
    this.userId = userId;
    this.config = config;
  }

  // Abstract methods all integrations must implement
  abstract connect(): Promise<boolean>;
  abstract disconnect(): Promise<boolean>;
  abstract getStatus(): Promise<IntegrationStatus>;
  abstract sync(): Promise<SyncResult>;
  abstract handleWebhook(payload: any): Promise<void>;

  // Common utility methods
  protected async saveToDatabase(data: any): Promise<void> {
    // Save integration data to Supabase
  }

  protected async getFromDatabase(query: any): Promise<any> {
    // Retrieve integration data from Supabase
  }

  protected async logActivity(action: string, details: any): Promise<void> {
    // Log integration activity
  }

  protected async handleError(error: Error): Promise<void> {
    // Standardized error handling
  }
}

export interface IntegrationConfig {
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  webhookUrl?: string;
  syncEnabled?: boolean;
  syncFrequency?: number;
}

export interface IntegrationStatus {
  connected: boolean;
  lastSync?: Date;
  error?: string;
  rateLimitRemaining?: number;
}

export interface SyncResult {
  success: boolean;
  itemsSynced: number;
  errors: string[];
  duration: number;
}
```

### OAuth Handler

```typescript
// lib/integrations/base/oauth-handler.ts
export class OAuthHandler {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor(clientId: string, clientSecret: string, redirectUri: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
  }

  // Generate OAuth URL
  getAuthorizationUrl(state: string, scopes: string[]): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      state,
      scope: scopes.join(' ')
    });
    return `https://oauth.provider.com/authorize?${params}`;
  }

  // Exchange code for tokens
  async exchangeCodeForTokens(code: string): Promise<TokenResponse> {
    const response = await fetch('https://oauth.provider.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code'
      })
    });
    return response.json();
  }

  // Refresh access token
  async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
    const response = await fetch('https://oauth.provider.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    });
    return response.json();
  }
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}
```

### Webhook Manager

```typescript
// lib/integrations/base/webhook-manager.ts
import crypto from 'crypto';

export class WebhookManager {
  private secret: string;

  constructor(secret: string) {
    this.secret = secret;
  }

  // Verify webhook signature
  verifySignature(payload: string, signature: string, algorithm: string = 'sha256'): boolean {
    const hmac = crypto.createHmac(algorithm, this.secret);
    const digest = hmac.update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  }

  // Register webhook
  async registerWebhook(url: string, events: string[]): Promise<string> {
    // Implementation varies by service
    return 'webhook_id';
  }

  // Unregister webhook
  async unregisterWebhook(webhookId: string): Promise<void> {
    // Implementation varies by service
  }

  // Process webhook payload
  async processWebhook(payload: any): Promise<void> {
    // Route to appropriate handler based on event type
    switch (payload.event) {
      case 'task.created':
        await this.handleTaskCreated(payload.data);
        break;
      case 'task.updated':
        await this.handleTaskUpdated(payload.data);
        break;
      // ... more event handlers
    }
  }

  private async handleTaskCreated(data: any): Promise<void> {
    // Handle task creation event
  }

  private async handleTaskUpdated(data: any): Promise<void> {
    // Handle task update event
  }
}
```

### Rate Limiter

```typescript
// lib/integrations/base/rate-limiter.ts
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private limit: number;
  private window: number; // milliseconds

  constructor(limit: number, window: number) {
    this.limit = limit;
    this.window = window;
  }

  // Check if request is allowed
  async checkLimit(key: string): Promise<boolean> {
    const now = Date.now();
    const timestamps = this.requests.get(key) || [];

    // Remove old timestamps outside window
    const validTimestamps = timestamps.filter(t => now - t < this.window);

    if (validTimestamps.length >= this.limit) {
      return false; // Rate limit exceeded
    }

    // Add current request
    validTimestamps.push(now);
    this.requests.set(key, validTimestamps);
    return true;
  }

  // Get remaining requests
  getRemaining(key: string): number {
    const now = Date.now();
    const timestamps = this.requests.get(key) || [];
    const validTimestamps = timestamps.filter(t => now - t < this.window);
    return Math.max(0, this.limit - validTimestamps.length);
  }

  // Reset rate limit for key
  reset(key: string): void {
    this.requests.delete(key);
  }
}
```

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)

**Goal**: Build core integration infrastructure

**Tasks**:
1. Create `lib/integrations/base/` directory structure
2. Implement `IntegrationBase` abstract class
3. Build `OAuthHandler` for OAuth flows
4. Create `WebhookManager` for webhook handling
5. Implement `RateLimiter` for API rate limiting
6. Design database schema for integrations
7. Create unified integration settings UI

**Deliverables**:
- ✅ Base integration framework
- ✅ OAuth infrastructure
- ✅ Webhook system
- ✅ Database migrations
- ✅ Settings page

---

### Phase 2: Priority 1 Integrations (Weeks 3-8)

#### Week 3-4: GitHub Integration
- Implement GitHub client
- Build repository browser UI
- Create issue management system
- Add commit tracking
- Test and deploy

#### Week 5-6: Todoist Integration
- Implement Todoist client
- Build task sync system
- Create task creation UI
- Add productivity dashboard
- Test and deploy

#### Week 7-8: Notion Integration
- Implement Notion client
- Build page browser
- Create knowledge base sync
- Add database management
- Test and deploy

**Deliverables**:
- ✅ GitHub fully integrated
- ✅ Todoist fully integrated
- ✅ Notion fully integrated
- ✅ All three tested in production

---

### Phase 3: Priority 2 Integrations (Weeks 9-16)

#### Week 9-10: Linear Integration
- Implement Linear GraphQL client
- Build issue tracking UI
- Add sprint management
- Test and deploy

#### Week 11-12: Slack Integration
- Implement Slack OAuth
- Build slash commands
- Create notification system
- Add message bridge
- Test and deploy

#### Week 13-14: Trello Integration
- Implement Trello client
- Build board sync
- Create card management UI
- Test and deploy

#### Week 15-16: Asana Integration
- Implement Asana client
- Build project management UI
- Add timeline view
- Test and deploy

**Deliverables**:
- ✅ Linear integrated
- ✅ Slack integrated
- ✅ Trello integrated
- ✅ Asana integrated

---

### Phase 4: Priority 3 Integrations (Weeks 17-28)

Implement remaining integrations based on user demand:
- Week 17-20: Jira + ClickUp
- Week 21-24: Monday.com + Airtable
- Week 25-28: Discord + Dropbox

---

## Database Schema

### Core Integrations Table

```sql
-- Master integrations table
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'github', 'todoist', 'notion', etc.
  status TEXT DEFAULT 'disconnected', -- 'connected', 'disconnected', 'error'
  config JSONB DEFAULT '{}', -- Provider-specific configuration
  credentials JSONB, -- Encrypted tokens (use pgcrypto)
  sync_enabled BOOLEAN DEFAULT true,
  sync_frequency INTEGER DEFAULT 30, -- minutes
  last_sync_at TIMESTAMP,
  last_sync_status TEXT,
  last_error TEXT,
  webhook_url TEXT,
  webhook_secret TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Integration activity log
CREATE TABLE integration_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'sync', 'create', 'update', 'delete', 'webhook'
  resource_type TEXT, -- 'task', 'issue', 'page', etc.
  resource_id TEXT,
  status TEXT, -- 'success', 'error'
  details JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Sync mappings (links KimbleAI items to external items)
CREATE TABLE integration_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,
  kimbleai_type TEXT NOT NULL, -- 'conversation', 'project', 'task', 'knowledge'
  kimbleai_id UUID NOT NULL,
  external_type TEXT NOT NULL, -- 'issue', 'task', 'page', etc.
  external_id TEXT NOT NULL,
  sync_direction TEXT DEFAULT 'bidirectional', -- 'to_external', 'from_external', 'bidirectional'
  last_synced_at TIMESTAMP,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(integration_id, kimbleai_type, kimbleai_id)
);

-- Indexes
CREATE INDEX idx_integrations_user ON integrations(user_id);
CREATE INDEX idx_integrations_provider ON integrations(provider);
CREATE INDEX idx_integration_activity_integration ON integration_activity(integration_id);
CREATE INDEX idx_integration_activity_created ON integration_activity(created_at DESC);
CREATE INDEX idx_integration_mappings_integration ON integration_mappings(integration_id);
CREATE INDEX idx_integration_mappings_kimbleai ON integration_mappings(kimbleai_type, kimbleai_id);
CREATE INDEX idx_integration_mappings_external ON integration_mappings(external_type, external_id);

-- Encryption for credentials (requires pgcrypto extension)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to encrypt credentials
CREATE OR REPLACE FUNCTION encrypt_credentials(data JSONB, key TEXT)
RETURNS BYTEA AS $$
  SELECT pgp_sym_encrypt(data::TEXT, key);
$$ LANGUAGE SQL;

-- Function to decrypt credentials
CREATE OR REPLACE FUNCTION decrypt_credentials(data BYTEA, key TEXT)
RETURNS JSONB AS $$
  SELECT pgp_sym_decrypt(data, key)::JSONB;
$$ LANGUAGE SQL;
```

---

## Security Considerations

### 1. Token Storage

**Problem**: API tokens and OAuth credentials must be stored securely.

**Solution**:
- Use PostgreSQL `pgcrypto` extension for encryption
- Store encryption key in Railway environment variable (never in code)
- Encrypt tokens before storing in database
- Decrypt only when needed, never expose to client

```typescript
// lib/integrations/security/token-manager.ts
import { createClient } from '@supabase/supabase-js';

export class TokenManager {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  async saveToken(userId: string, provider: string, token: string): Promise<void> {
    const encryptionKey = process.env.INTEGRATION_ENCRYPTION_KEY!;

    await this.supabase.rpc('encrypt_and_save_token', {
      user_id: userId,
      provider,
      token,
      encryption_key: encryptionKey
    });
  }

  async getToken(userId: string, provider: string): Promise<string | null> {
    const encryptionKey = process.env.INTEGRATION_ENCRYPTION_KEY!;

    const { data } = await this.supabase.rpc('get_and_decrypt_token', {
      user_id: userId,
      provider,
      encryption_key: encryptionKey
    });

    return data;
  }
}
```

### 2. OAuth State Verification

**Problem**: CSRF attacks on OAuth callback.

**Solution**:
- Generate random state parameter
- Store in session/cookie
- Verify on callback
- Use short expiration (5 minutes)

```typescript
// lib/integrations/security/oauth-state.ts
import crypto from 'crypto';

export class OAuthState {
  static generate(userId: string, provider: string): string {
    const state = {
      userId,
      provider,
      nonce: crypto.randomBytes(16).toString('hex'),
      expires: Date.now() + 5 * 60 * 1000 // 5 minutes
    };
    return Buffer.from(JSON.stringify(state)).toString('base64');
  }

  static verify(stateParam: string): { userId: string; provider: string } | null {
    try {
      const state = JSON.parse(Buffer.from(stateParam, 'base64').toString());

      if (Date.now() > state.expires) {
        throw new Error('State expired');
      }

      return { userId: state.userId, provider: state.provider };
    } catch {
      return null;
    }
  }
}
```

### 3. Webhook Signature Verification

**Problem**: Malicious webhook requests.

**Solution**:
- Verify HMAC signature
- Use constant-time comparison
- Reject invalid signatures
- Log suspicious activity

```typescript
// Already implemented in WebhookManager above
```

### 4. Rate Limiting

**Problem**: API abuse and quota exhaustion.

**Solution**:
- Implement per-user rate limiting
- Track API usage per integration
- Warn users approaching limits
- Auto-disable on repeated errors

```typescript
// Already implemented in RateLimiter above
```

### 5. Scope Minimization

**Problem**: Over-privileged access tokens.

**Solution**:
- Request minimum scopes needed
- Document why each scope is required
- Allow users to review scopes
- Periodically audit scope usage

---

## Code Examples

### Complete Integration Example: GitHub

```typescript
// lib/integrations/github/github-integration.ts
import { IntegrationBase, IntegrationConfig, IntegrationStatus, SyncResult } from '../base/integration-base';
import { Octokit } from '@octokit/rest';
import { createClient } from '@supabase/supabase-js';

export class GitHubIntegration extends IntegrationBase {
  private octokit: Octokit;
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  constructor(userId: string, config: IntegrationConfig) {
    super(userId, config);
    this.octokit = new Octokit({ auth: config.accessToken });
  }

  async connect(): Promise<boolean> {
    try {
      // Test connection by getting user info
      const { data } = await this.octokit.users.getAuthenticated();

      // Save integration to database
      await this.saveToDatabase({
        user_id: this.userId,
        provider: 'github',
        status: 'connected',
        config: {
          username: data.login,
          avatar_url: data.avatar_url
        }
      });

      await this.logActivity('connect', { username: data.login });
      return true;
    } catch (error) {
      await this.handleError(error as Error);
      return false;
    }
  }

  async disconnect(): Promise<boolean> {
    try {
      await this.supabase
        .from('integrations')
        .update({ status: 'disconnected' })
        .eq('user_id', this.userId)
        .eq('provider', 'github');

      await this.logActivity('disconnect', {});
      return true;
    } catch (error) {
      await this.handleError(error as Error);
      return false;
    }
  }

  async getStatus(): Promise<IntegrationStatus> {
    try {
      const { data } = await this.supabase
        .from('integrations')
        .select('*')
        .eq('user_id', this.userId)
        .eq('provider', 'github')
        .single();

      if (!data) {
        return { connected: false };
      }

      // Check rate limit
      const { data: rateLimit } = await this.octokit.rateLimit.get();

      return {
        connected: data.status === 'connected',
        lastSync: data.last_sync_at ? new Date(data.last_sync_at) : undefined,
        error: data.last_error || undefined,
        rateLimitRemaining: rateLimit.rate.remaining
      };
    } catch (error) {
      return { connected: false, error: (error as Error).message };
    }
  }

  async sync(): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let itemsSynced = 0;

    try {
      // Get tracked repositories
      const { data: repos } = await this.supabase
        .from('github_repositories')
        .select('*')
        .eq('tracked', true);

      if (!repos || repos.length === 0) {
        return {
          success: true,
          itemsSynced: 0,
          errors: [],
          duration: Date.now() - startTime
        };
      }

      // Sync issues for each repo
      for (const repo of repos) {
        try {
          const issues = await this.octokit.issues.listForRepo({
            owner: repo.owner,
            repo: repo.name,
            state: 'all',
            since: repo.last_sync_at || undefined
          });

          for (const issue of issues.data) {
            await this.supabase
              .from('github_issues')
              .upsert({
                repo_id: repo.id,
                issue_number: issue.number,
                title: issue.title,
                body: issue.body,
                state: issue.state,
                labels: issue.labels.map((l: any) => l.name),
                url: issue.html_url,
                github_created_at: issue.created_at,
                github_updated_at: issue.updated_at
              });

            itemsSynced++;
          }

          // Update last sync time
          await this.supabase
            .from('github_repositories')
            .update({ last_sync_at: new Date().toISOString() })
            .eq('id', repo.id);

        } catch (error) {
          errors.push(`Failed to sync ${repo.owner}/${repo.name}: ${(error as Error).message}`);
        }
      }

      // Update integration last sync
      await this.supabase
        .from('integrations')
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: errors.length > 0 ? 'partial' : 'success'
        })
        .eq('user_id', this.userId)
        .eq('provider', 'github');

      await this.logActivity('sync', { itemsSynced, errors });

      return {
        success: errors.length === 0,
        itemsSynced,
        errors,
        duration: Date.now() - startTime
      };

    } catch (error) {
      await this.handleError(error as Error);
      return {
        success: false,
        itemsSynced,
        errors: [...errors, (error as Error).message],
        duration: Date.now() - startTime
      };
    }
  }

  async handleWebhook(payload: any): Promise<void> {
    try {
      switch (payload.action) {
        case 'opened':
          await this.handleIssueOpened(payload.issue);
          break;
        case 'closed':
          await this.handleIssueClosed(payload.issue);
          break;
        case 'edited':
          await this.handleIssueEdited(payload.issue);
          break;
      }

      await this.logActivity('webhook', { action: payload.action });
    } catch (error) {
      await this.handleError(error as Error);
    }
  }

  private async handleIssueOpened(issue: any): Promise<void> {
    // Create notification or update database
    await this.logActivity('issue_opened', { number: issue.number, title: issue.title });
  }

  private async handleIssueClosed(issue: any): Promise<void> {
    // Update database
    await this.supabase
      .from('github_issues')
      .update({ state: 'closed' })
      .eq('issue_number', issue.number);
  }

  private async handleIssueEdited(issue: any): Promise<void> {
    // Update database
    await this.supabase
      .from('github_issues')
      .update({
        title: issue.title,
        body: issue.body,
        github_updated_at: issue.updated_at
      })
      .eq('issue_number', issue.number);
  }

  // Custom methods for GitHub-specific functionality
  async createIssueFromConversation(
    conversationId: string,
    owner: string,
    repo: string,
    title: string,
    body: string
  ): Promise<any> {
    const issue = await this.octokit.issues.create({
      owner,
      repo,
      title,
      body: `${body}\n\n---\nCreated from KimbleAI conversation: ${conversationId}`
    });

    // Save mapping
    await this.supabase
      .from('integration_mappings')
      .insert({
        integration_id: (await this.getIntegrationId()),
        kimbleai_type: 'conversation',
        kimbleai_id: conversationId,
        external_type: 'issue',
        external_id: issue.data.id.toString(),
        sync_direction: 'to_external'
      });

    await this.logActivity('create_issue', { issue: issue.data.number });
    return issue.data;
  }

  private async getIntegrationId(): Promise<string> {
    const { data } = await this.supabase
      .from('integrations')
      .select('id')
      .eq('user_id', this.userId)
      .eq('provider', 'github')
      .single();
    return data.id;
  }
}
```

### API Route Example

```typescript
// app/api/integrations/github/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { GitHubIntegration } from '@/lib/integrations/github/github-integration';

export async function GET(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  // Get user's GitHub token
  const token = await getGitHubToken(session.user.id);
  if (!token) {
    return NextResponse.json({ error: 'GitHub not connected' }, { status: 503 });
  }

  const github = new GitHubIntegration(session.user.id, { accessToken: token });

  switch (action) {
    case 'status':
      const status = await github.getStatus();
      return NextResponse.json(status);

    case 'repos':
      const octokit = new Octokit({ auth: token });
      const { data: repos } = await octokit.repos.listForAuthenticatedUser();
      return NextResponse.json(repos);

    case 'issues':
      const owner = searchParams.get('owner');
      const repo = searchParams.get('repo');
      if (!owner || !repo) {
        return NextResponse.json({ error: 'Missing owner or repo' }, { status: 400 });
      }
      const octokit2 = new Octokit({ auth: token });
      const { data: issues } = await octokit2.issues.listForRepo({ owner, repo });
      return NextResponse.json(issues);

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { action } = body;

  const token = await getGitHubToken(session.user.id);
  if (!token) {
    return NextResponse.json({ error: 'GitHub not connected' }, { status: 503 });
  }

  const github = new GitHubIntegration(session.user.id, { accessToken: token });

  switch (action) {
    case 'create_issue':
      const { conversationId, owner, repo, title, issueBody } = body;
      const issue = await github.createIssueFromConversation(
        conversationId,
        owner,
        repo,
        title,
        issueBody
      );
      return NextResponse.json(issue);

    case 'sync':
      const result = await github.sync();
      return NextResponse.json(result);

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }
}

async function getGitHubToken(userId: string): Promise<string | null> {
  // Implement token retrieval from database
  return process.env.GITHUB_TOKEN || null;
}
```

---

## UI/UX Components

### Integration Dashboard

```typescript
// app/integrations/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Integration {
  provider: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: Date;
  error?: string;
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadIntegrations();
  }, []);

  async function loadIntegrations() {
    const response = await fetch('/api/integrations');
    const data = await response.json();
    setIntegrations(data);
    setLoading(false);
  }

  async function connect(provider: string) {
    window.location.href = `/api/integrations/${provider}/connect`;
  }

  async function disconnect(provider: string) {
    await fetch(`/api/integrations/${provider}/disconnect`, { method: 'POST' });
    await loadIntegrations();
  }

  async function sync(provider: string) {
    await fetch(`/api/integrations/${provider}/sync`, { method: 'POST' });
    await loadIntegrations();
  }

  const integrationCards = [
    {
      provider: 'github',
      name: 'GitHub',
      description: 'Manage repositories, issues, and pull requests',
      icon: '💻'
    },
    {
      provider: 'todoist',
      name: 'Todoist',
      description: 'Sync tasks and projects',
      icon: '✅'
    },
    {
      provider: 'notion',
      name: 'Notion',
      description: 'Connect your Notion workspace',
      icon: '📝'
    },
    {
      provider: 'linear',
      name: 'Linear',
      description: 'Track issues and sprints',
      icon: '📊'
    },
    {
      provider: 'slack',
      name: 'Slack',
      description: 'Team communication and notifications',
      icon: '💬'
    }
  ];

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-2">Integrations</h1>
      <p className="text-muted-foreground mb-8">
        Connect KimbleAI with your favorite productivity tools
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrationCards.map(card => {
          const integration = integrations.find(i => i.provider === card.provider);
          const connected = integration?.status === 'connected';

          return (
            <Card key={card.provider}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{card.icon}</span>
                    <div>
                      <CardTitle>{card.name}</CardTitle>
                      <Badge variant={connected ? 'default' : 'secondary'}>
                        {connected ? 'Connected' : 'Not Connected'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {connected ? (
                  <div className="space-y-3">
                    {integration?.lastSync && (
                      <p className="text-sm text-muted-foreground">
                        Last synced: {new Date(integration.lastSync).toLocaleString()}
                      </p>
                    )}
                    {integration?.error && (
                      <p className="text-sm text-red-500">{integration.error}</p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        onClick={() => sync(card.provider)}
                        variant="outline"
                        size="sm"
                      >
                        Sync Now
                      </Button>
                      <Button
                        onClick={() => disconnect(card.provider)}
                        variant="ghost"
                        size="sm"
                      >
                        Disconnect
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button onClick={() => connect(card.provider)} className="w-full">
                    Connect {card.name}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
```

### Task Creator Widget

```typescript
// components/integrations/TaskCreatorWidget.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TaskCreatorProps {
  conversationId: string;
  content: string;
}

export function TaskCreatorWidget({ conversationId, content }: TaskCreatorProps) {
  const [provider, setProvider] = useState<string>('todoist');
  const [project, setProject] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [loading, setLoading] = useState(false);

  async function createTask() {
    setLoading(true);

    try {
      const response = await fetch(`/api/integrations/${provider}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_task',
          conversationId,
          content,
          project,
          due_string: dueDate
        })
      });

      if (response.ok) {
        alert('Task created successfully!');
      } else {
        alert('Failed to create task');
      }
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Error creating task');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <h3 className="font-semibold">Create Task</h3>

      <Select value={provider} onValueChange={setProvider}>
        <SelectTrigger>
          <SelectValue placeholder="Select provider" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todoist">Todoist</SelectItem>
          <SelectItem value="asana">Asana</SelectItem>
          <SelectItem value="linear">Linear</SelectItem>
          <SelectItem value="trello">Trello</SelectItem>
        </SelectContent>
      </Select>

      <Input
        placeholder="Project (optional)"
        value={project}
        onChange={(e) => setProject(e.target.value)}
      />

      <Input
        placeholder="Due date (e.g., 'tomorrow', 'next Monday')"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
      />

      <Button onClick={createTask} disabled={loading} className="w-full">
        {loading ? 'Creating...' : 'Create Task'}
      </Button>
    </div>
  );
}
```

---

## Cost Analysis

### Development Costs

| Phase | Duration | Tasks | Estimated Hours | Cost (@$100/hr) |
|-------|----------|-------|-----------------|-----------------|
| Phase 1: Foundation | 2 weeks | Infrastructure setup | 60 hours | $6,000 |
| Phase 2: Priority 1 | 6 weeks | GitHub, Todoist, Notion, Linear, Slack | 180 hours | $18,000 |
| Phase 3: Priority 2 | 8 weeks | Trello, Asana, Dropbox | 120 hours | $12,000 |
| Phase 4: Priority 3 | 12 weeks | Jira, ClickUp, Monday, Airtable, Discord | 180 hours | $18,000 |
| **Total** | **28 weeks** | **All 15 integrations** | **540 hours** | **$54,000** |

### Ongoing Costs

| Service | Free Tier | Paid Tier | Monthly Cost |
|---------|-----------|-----------|--------------|
| GitHub | ✅ Public repos | $4/mo Pro | $0-4 |
| Todoist | ✅ 5 projects | $4/mo Pro | $0-4 |
| Notion | ✅ Unlimited blocks | $8/mo Plus | $0-8 |
| Linear | ✅ 10 users | $8/mo Startup | $0-8 |
| Slack | ✅ 90 days history | $7.25/mo Pro | $0-7.25 |
| Trello | ✅ 10 boards | $5/mo Standard | $0-5 |
| Asana | ✅ 15 users | $10.99/mo Premium | $0-11 |
| Google Workspace | ✅ Implemented | - | $0 |
| Dropbox | ✅ 2GB | $11.99/mo Plus | $0-12 |
| Jira | ✅ 10 users | $7.75/mo Standard | $0-8 |
| ClickUp | ✅ 100MB | $7/mo Unlimited | $0-7 |
| Monday.com | ❌ Trial only | $8/mo Basic | $8 |
| Airtable | ✅ 1,200 records | $10/mo Plus | $0-10 |
| Discord | ✅ Unlimited | - | $0 |
| **Total** | - | - | **$8-100/mo** |

**Recommended Budget**: $50-75/month for Pro features across key integrations

---

## Success Metrics

### Integration Performance KPIs

1. **Connection Rate**: % of users who connect at least one integration
   - Target: 60% within 3 months

2. **Sync Reliability**: % of successful syncs
   - Target: 99.5%

3. **API Error Rate**: % of failed API calls
   - Target: <1%

4. **User Engagement**: Average integrations per active user
   - Target: 2.5

5. **Task Creation**: Tasks created via integrations per week
   - Target: 100+

6. **Time Savings**: Estimated hours saved per user per week
   - Target: 5+ hours

---

## Conclusion

This comprehensive integration strategy provides:

1. **15 High-Value Integrations** across task management, project tracking, and team collaboration
2. **Phased Implementation** over 28 weeks with clear milestones
3. **Robust Architecture** with security, rate limiting, and error handling
4. **Complete Code Examples** for immediate implementation
5. **Database Schema** for all integrations
6. **UI/UX Components** for seamless user experience
7. **Cost Analysis** for budgeting and planning

**Next Steps**:
1. Review and approve Phase 1 (Foundation)
2. Allocate development resources
3. Set up environment variables for initial integrations
4. Begin implementation of base integration framework
5. Launch GitHub integration as proof of concept

**Questions?** Review existing implementations in:
- `INTEGRATIONS_SETUP.md` - Basic setup for GitHub, Notion, Todoist
- `docs/archive/GOOGLE_WORKSPACE_INTEGRATION.md` - Complete OAuth example

---

**Document Status**: Ready for Implementation
**Last Updated**: 2025-11-15
**Version**: 1.0.0
**Approved By**: Pending
