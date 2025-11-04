# KimbleAI Integrations Setup Guide

## Overview

KimbleAI supports integrations with multiple productivity platforms to centralize your workflow.

### Currently Supported Integrations

1. ✅ **Google Workspace** - Gmail, Drive, Calendar (OAuth)
2. ✅ **OpenAI** - GPT models, embeddings
3. ✅ **Supabase** - Database and storage
4. 🆕 **GitHub** - Repositories, issues, pull requests
5. 🆕 **Notion** - Workspace pages and databases
6. 🆕 **Todoist** - Task and project management

---

## GitHub Integration

### Setup

1. **Create Personal Access Token**
   - Visit https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Select scopes:
     - `repo` - Full control of private repositories
     - `read:user` - Read user profile data
     - `read:org` - Read org data
   - Copy the generated token

2. **Add to Railway Environment**
   ```bash
   railway variables set GITHUB_TOKEN=ghp_your_token_here
   ```

3. **Verify Connection**
   - Visit https://www.kimbleai.com/integrations
   - GitHub card should show "Connected"

### API Endpoints

**GET `/api/integrations/github`**

Query parameters:
- `action=status` - Check connection status
- `action=repos` - List user repositories
- `action=issues&owner=X&repo=Y` - List issues for a repo

**POST `/api/integrations/github`**

Actions:
- `create_issue` - Create new issue
  ```json
  {
    "action": "create_issue",
    "owner": "username",
    "repo": "repository",
    "title": "Issue title",
    "body": "Issue description",
    "labels": ["bug", "enhancement"]
  }
  ```

### Use Cases

- Auto-create issues from KimbleAI conversations
- Track project progress across repositories
- Sync commits with project timelines
- Link conversations to pull requests

---

## Notion Integration

### Setup

1. **Create Internal Integration**
   - Visit https://www.notion.so/my-integrations
   - Click "+ New integration"
   - Name it "KimbleAI"
   - Select your workspace
   - Copy the "Internal Integration Token"

2. **Share Pages with Integration**
   - Open each Notion page you want to access
   - Click "Share"
   - Add your "KimbleAI" integration
   - Grant read/write access

3. **Add to Railway Environment**
   ```bash
   railway variables set NOTION_API_KEY=secret_your_key_here
   ```

4. **Verify Connection**
   - Visit https://www.kimbleai.com/integrations
   - Notion card should show "Connected"

### API Endpoints

**GET `/api/integrations/notion`**

Query parameters:
- `action=status` - Check connection status
- `action=databases` - List all databases
- `action=pages&database_id=X` - List pages in database
- `action=search&query=X` - Search workspace

**POST `/api/integrations/notion`**

Actions:
- `create_page` - Create new page
  ```json
  {
    "action": "create_page",
    "parent_id": "page_id_here",
    "title": "Page Title",
    "content": "Page content"
  }
  ```

- `add_to_database` - Add entry to database
  ```json
  {
    "action": "add_to_database",
    "database_id": "database_id_here",
    "properties": {
      "Name": { "title": [{ "text": { "content": "Entry name" } }] },
      "Status": { "select": { "name": "In Progress" } }
    }
  }
  ```

### Use Cases

- Sync conversation notes to Notion
- Create meeting notes from calendar events
- Track projects in Notion databases
- Search workspace from KimbleAI

---

## Todoist Integration

### Setup

1. **Get API Token**
   - Visit https://todoist.com/app/settings/integrations
   - Scroll to "API token"
   - Copy your token

2. **Add to Railway Environment**
   ```bash
   railway variables set TODOIST_API_KEY=your_token_here
   ```

3. **Verify Connection**
   - Visit https://www.kimbleai.com/integrations
   - Todoist card should show "Connected"

### API Endpoints

**GET `/api/integrations/todoist`**

Query parameters:
- `action=status` - Check connection status
- `action=projects` - List all projects
- `action=tasks` - List all tasks
- `action=tasks&project_id=X` - List tasks for specific project
- `action=labels` - List all labels

**POST `/api/integrations/todoist`**

Actions:
- `create_task` - Create new task
  ```json
  {
    "action": "create_task",
    "content": "Task description",
    "project_id": "123456",
    "due_string": "tomorrow at 2pm",
    "priority": 4,
    "labels": ["important", "work"]
  }
  ```

- `complete_task` - Mark task as complete
  ```json
  {
    "action": "complete_task",
    "task_id": "task_id_here"
  }
  ```

- `create_project` - Create new project
  ```json
  {
    "action": "create_project",
    "name": "Project Name",
    "color": "blue",
    "is_favorite": true
  }
  ```

### Use Cases

- Create tasks from conversation action items
- Sync project tasks with KimbleAI projects
- Track productivity metrics
- Auto-complete tasks from email confirmations

---

## Environment Variables Summary

Add these to Railway:

```bash
# GitHub
railway variables set GITHUB_TOKEN=ghp_xxxxxxxxxxxx

# Notion
railway variables set NOTION_API_KEY=secret_xxxxxxxxxxxx

# Todoist
railway variables set TODOIST_API_KEY=xxxxxxxxxxxx
```

---

## Security Notes

1. **API Keys Storage**
   - All API keys stored as Railway environment variables
   - Never commit API keys to git
   - Keys encrypted at rest on Railway

2. **Access Control**
   - Limited to authenticated users only
   - Each integration checks for valid API keys
   - Returns 503 error if keys not configured

3. **Rate Limiting**
   - GitHub: 5,000 requests/hour (authenticated)
   - Notion: 3 requests/second
   - Todoist: 450 requests/15 minutes

4. **OAuth vs API Keys**
   - Google Workspace: OAuth 2.0 (user consent)
   - GitHub, Notion, Todoist: API tokens (server-to-server)

---

## Troubleshooting

### "Not Connected" Status

1. Check environment variables are set:
   ```bash
   railway variables
   ```

2. Verify API keys are valid:
   - GitHub: Test at https://api.github.com/user
   - Notion: Test at https://api.notion.com/v1/users/me
   - Todoist: Test at https://api.todoist.com/rest/v2/projects

3. Check Railway logs:
   ```bash
   railway logs
   ```

### API Errors

- **401 Unauthorized**: Invalid API key
- **403 Forbidden**: Insufficient permissions
- **429 Too Many Requests**: Rate limit exceeded
- **503 Service Unavailable**: API key not configured

---

## Next Steps

1. Set up environment variables for each integration
2. Test connections on /integrations page
3. Build custom workflows using API endpoints
4. Monitor usage in Railway logs

For support, see logs at:
```bash
railway logs --tail
```

---

**Version**: 8.2.0
**Last Updated**: 2025-11-04
**Status**: Ready for deployment
