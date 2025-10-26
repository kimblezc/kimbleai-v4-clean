# 🔮 MCP Integration Setup Guide
## Complete Guide to Model Context Protocol Integration

**Version:** 1.0.0
**Status:** ✅ Production Ready
**Phase 2 Progress:** 64% Complete

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Database Setup](#database-setup)
3. [System Initialization](#system-initialization)
4. [Server Integration](#server-integration)
5. [API Usage Examples](#api-usage-examples)
6. [UI Access](#ui-access)
7. [Monitoring & Health](#monitoring--health)
8. [Troubleshooting](#troubleshooting)
9. [Proof of Concept](#proof-of-concept)

---

## 🚀 Quick Start

### Prerequisites
- ✅ Supabase database access
- ✅ Node.js environment
- ✅ MCP SDK installed (`@modelcontextprotocol/sdk`)

### 3-Step Setup

```bash
# 1. Run database migration
psql $DATABASE_URL < database/mcp-servers-schema.sql

# 2. Initialize MCP system
curl -X POST https://your-domain.com/api/mcp/init

# 3. Verify setup
curl https://your-domain.com/api/mcp/health
```

---

## 💾 Database Setup

### Step 1: Run Migration

The migration creates 4 tables and includes 3 default servers:

```sql
-- Tables created:
✓ mcp_servers (server configurations)
✓ mcp_connection_logs (connection events)
✓ mcp_tool_invocations (usage tracking)
✓ mcp_server_metrics (performance data)

-- Default servers:
✓ GitHub (requires GITHUB_PERSONAL_ACCESS_TOKEN)
✓ Filesystem (local file access)
✓ Memory (persistent knowledge graph)
```

**Run via Supabase Dashboard:**
1. Go to SQL Editor
2. Paste contents of `database/mcp-servers-schema.sql`
3. Click "Run"

**Run via CLI:**
```bash
psql $SUPABASE_DATABASE_URL < database/mcp-servers-schema.sql
```

### Step 2: Verify Tables

```sql
SELECT tablename FROM pg_tables WHERE tablename LIKE 'mcp_%';

-- Expected output:
-- mcp_servers
-- mcp_connection_logs
-- mcp_tool_invocations
-- mcp_server_metrics
```

---

## ⚙️ System Initialization

### Initialize via API

**Endpoint:** `POST /api/mcp/init`

```bash
curl -X POST https://www.kimbleai.com/api/mcp/init \
  -H "Content-Type: application/json"
```

**Success Response:**
```json
{
  "success": true,
  "message": "MCP system initialized successfully",
  "results": {
    "databaseCheck": {
      "success": true,
      "message": "Database tables verified successfully"
    },
    "managerInit": {
      "success": true,
      "message": "Manager initialized with 3 servers"
    },
    "serverConnections": [
      {
        "id": "...",
        "name": "github",
        "status": "connected",
        "enabled": true,
        "toolsCount": 15,
        "resourcesCount": 8
      }
    ]
  },
  "summary": {
    "totalServers": 3,
    "enabledServers": 3,
    "connectedServers": 2,
    "totalTools": 45,
    "totalResources": 20
  }
}
```

### Check Initialization Status

**Endpoint:** `GET /api/mcp/init`

```bash
curl https://www.kimbleai.com/api/mcp/init
```

---

## 🔌 Server Integration

### Pre-Configured Servers

The system includes templates for 8 popular MCP servers:

| Server | Icon | Description | Environment Required |
|--------|------|-------------|---------------------|
| **GitHub** | 🐙 | Repository access, code search, issues | `GITHUB_PERSONAL_ACCESS_TOKEN` |
| **Filesystem** | 📁 | Secure local file access | None |
| **Memory** | 🧠 | Persistent knowledge graph | None |
| **Slack** | 💬 | Channel management, messaging | `SLACK_BOT_TOKEN`, `SLACK_TEAM_ID` |
| **Notion** | 📝 | Pages and databases | `NOTION_API_KEY` |
| **PostgreSQL** | 🐘 | Direct database access | `POSTGRES_CONNECTION_STRING` |
| **Brave Search** | 🔍 | Privacy-focused web search | `BRAVE_API_KEY` |
| **Puppeteer** | 🎭 | Browser automation | None |

### Add Server via UI

1. Navigate to `/integrations/mcp`
2. Click "+ Add Server"
3. Select server template
4. Configure environment variables (if required)
5. Click "Install"

### Add Server via API

```bash
curl -X POST https://www.kimbleai.com/api/mcp/servers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "github",
    "description": "GitHub repository access",
    "transport": "stdio",
    "command": "npx",
    "args": ["@modelcontextprotocol/server-github"],
    "env": {
      "GITHUB_PERSONAL_ACCESS_TOKEN": "your_token_here"
    },
    "capabilities": {
      "tools": true,
      "resources": true,
      "prompts": false
    },
    "priority": 10,
    "tags": ["git", "code", "collaboration"],
    "enabled": true
  }'
```

### Connect to Server

```bash
# Connect
curl -X POST https://www.kimbleai.com/api/mcp/servers/{server_id}/connect

# Disconnect
curl -X DELETE https://www.kimbleai.com/api/mcp/servers/{server_id}/connect
```

---

## 📡 API Usage Examples

### List All Available Tools

```bash
curl https://www.kimbleai.com/api/mcp/tools
```

**Response:**
```json
{
  "success": true,
  "tools": [
    {
      "name": "search_repositories",
      "description": "Search GitHub repositories",
      "inputSchema": { ... }
    },
    {
      "name": "create_issue",
      "description": "Create a GitHub issue",
      "inputSchema": { ... }
    }
  ],
  "totalTools": 45,
  "toolsByServer": [
    {
      "serverId": "...",
      "serverName": "github",
      "toolCount": 15
    }
  ]
}
```

### Invoke a Tool

```bash
curl -X POST https://www.kimbleai.com/api/mcp/tools \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "search_repositories",
    "arguments": {
      "query": "typescript MCP server",
      "maxResults": 10
    },
    "userId": "zach"
  }'
```

**Response:**
```json
{
  "success": true,
  "result": {
    "serverId": "github-server-id",
    "toolName": "search_repositories",
    "content": [
      {
        "type": "text",
        "text": "Found 127 repositories matching 'typescript MCP server'..."
      }
    ],
    "executionTime": 245,
    "executedAt": "2025-10-26T..."
  }
}
```

### Batch Tool Invocation

```bash
curl -X PUT https://www.kimbleai.com/api/mcp/tools/batch \
  -H "Content-Type: application/json" \
  -d '{
    "tools": [
      {
        "toolName": "search_repositories",
        "arguments": { "query": "MCP" }
      },
      {
        "toolName": "list_files",
        "arguments": { "path": "/projects" }
      }
    ]
  }'
```

### Health Check

```bash
curl https://www.kimbleai.com/api/mcp/health
```

**Response:**
```json
{
  "success": true,
  "overall": {
    "healthy": true,
    "status": "healthy",
    "connectedServers": 3,
    "totalServers": 3
  },
  "capabilities": {
    "tools": 45,
    "resources": 20
  },
  "metrics": {
    "totalRequests": 247,
    "successfulRequests": 235,
    "failedRequests": 12,
    "overallSuccessRate": 95.1,
    "averageResponseTime": 183
  },
  "servers": [ ... ]
}
```

---

## 🎨 UI Access

### MCP Server Registry
**URL:** `/integrations/mcp`

**Features:**
- ✅ Real-time server status monitoring
- ✅ One-click server installation
- ✅ Advanced filtering (search, status, transport)
- ✅ Server capabilities breakdown
- ✅ Connect/disconnect controls
- ✅ Dark D&D themed interface

### Archie Dashboard Integration
**URL:** `/archie`

**MCP Section Features:**
- ✅ Connected servers count
- ✅ Available tools & resources
- ✅ Health status indicator
- ✅ Quick access to server registry
- ✅ Auto-refresh every 15 seconds

---

## 📊 Monitoring & Health

### Automated Health Checks

**Cron Schedule:** Every 15 minutes
**Endpoint:** `/api/cron/mcp-health`

**What It Checks:**
- ✅ Server connection status
- ✅ Error rates (alerts if >20%)
- ✅ Response times (alerts if >5000ms)
- ✅ Health check intervals
- ✅ Systemic issues (multiple errors)

**Findings Generated:**
- **Critical:** Server in error state, no servers connected
- **High:** Disconnected enabled servers, multiple errors
- **Medium:** High error rates, low connection ratio
- **Low:** Slow response times, overdue health checks

### Activity Stream Integration

All MCP events broadcast to the live activity feed:
- Server connections/disconnections
- Tool invocations
- Health check results
- Error alerts
- System status changes

**View in:** `/archie` → Live Activity Feed

---

## 🔧 Troubleshooting

### Server Won't Connect

**Problem:** Server status shows "error" or "disconnected"

**Solutions:**
1. Check environment variables are set correctly
2. Verify server command/URL is accessible
3. Check server logs in database:
   ```sql
   SELECT * FROM mcp_connection_logs
   WHERE server_id = 'your-server-id'
   ORDER BY created_at DESC LIMIT 10;
   ```
4. Try manual reconnect via UI or API
5. Check Supabase logs for errors

### High Error Rate

**Problem:** Server has >20% error rate

**Solutions:**
1. Check server configuration (timeout, retry settings)
2. Verify API keys/tokens are valid
3. Review tool invocation logs:
   ```sql
   SELECT tool_name, success, error_message
   FROM mcp_tool_invocations
   WHERE server_id = 'your-server-id'
   AND success = false
   ORDER BY created_at DESC;
   ```
4. Increase timeout or retry attempts in server config

### Database Migration Fails

**Problem:** SQL migration returns errors

**Solutions:**
1. Ensure UUID extension is enabled:
   ```sql
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   ```
2. Check table doesn't already exist
3. Verify RLS is enabled on database
4. Run tables individually if needed

---

## ✅ Proof of Concept

### Example: GitHub Integration

**1. Install GitHub Server**
```bash
# Via UI: /integrations/mcp → "Add Server" → Select "GitHub"
# Set GITHUB_PERSONAL_ACCESS_TOKEN in env config

# Or via API:
curl -X POST /api/mcp/servers -d '{
  "name": "github",
  "transport": "stdio",
  "command": "npx",
  "args": ["@modelcontextprotocol/server-github"],
  "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_..." },
  "enabled": true,
  "priority": 10
}'
```

**2. Verify Connection**
```bash
curl /api/mcp/health | jq '.servers[] | select(.name=="github")'

# Output:
# {
#   "name": "github",
#   "status": "connected",
#   "toolsCount": 15,
#   "resourcesCount": 8
# }
```

**3. List Available Tools**
```bash
curl '/api/mcp/tools?serverId=github-server-id' | jq '.tools[].name'

# Output:
# "search_repositories"
# "get_repository"
# "create_issue"
# "list_pull_requests"
# ... (15 total)
```

**4. Search Repositories**
```bash
curl -X POST /api/mcp/tools -d '{
  "toolName": "search_repositories",
  "arguments": {
    "query": "Model Context Protocol",
    "maxResults": 5
  }
}'

# Result: List of top 5 MCP-related repos with stars, descriptions, URLs
```

**5. Monitor Usage**
```bash
# Check metrics
curl /api/mcp/health | jq '.servers[] | select(.name=="github") | .metrics'

# Output:
# {
#   "totalRequests": 42,
#   "successfulRequests": 40,
#   "failedRequests": 2,
#   "successRate": 95.2,
#   "averageResponseTime": 245
# }
```

### Example: Filesystem + Memory Integration

**Scenario:** Index local project files into persistent memory

```bash
# 1. Connect Filesystem server
curl -X POST /api/mcp/servers/{filesystem-id}/connect

# 2. Connect Memory server
curl -X POST /api/mcp/servers/{memory-id}/connect

# 3. List project files
curl -X POST /api/mcp/tools -d '{
  "toolName": "list_files",
  "arguments": { "path": "/workspace/my-project" }
}'

# 4. Read file content
curl -X POST /api/mcp/tools -d '{
  "toolName": "read_file",
  "arguments": { "path": "/workspace/my-project/README.md" }
}'

# 5. Store in memory
curl -X POST /api/mcp/tools -d '{
  "toolName": "create_entity",
  "arguments": {
    "name": "project_readme",
    "content": "...",
    "type": "document"
  }
}'

# 6. Query memory later
curl -X POST /api/mcp/tools -d '{
  "toolName": "search_entities",
  "arguments": { "query": "README" }
}'
```

---

## 📈 Success Metrics

After successful setup, you should see:

✅ **Database:** 4 MCP tables created
✅ **Servers:** 3+ servers installed
✅ **Connections:** 2+ servers connected
✅ **Tools:** 30+ tools available
✅ **Resources:** 15+ resources accessible
✅ **Health:** "healthy" status
✅ **Monitoring:** Cron job running every 15 min
✅ **UI:** Server registry accessible at `/integrations/mcp`
✅ **Dashboard:** MCP section visible in `/archie`

---

## 🚀 Next Steps

1. **Add More Servers:** Install Slack, Notion, PostgreSQL, etc.
2. **Integrate with Chat:** Add MCP tool calling to chat interface
3. **Custom Workflows:** Build workflows using MCP tools
4. **Monitor Performance:** Track metrics in Archie dashboard
5. **Optimize:** Adjust timeouts, retries based on usage patterns

---

## 📚 Additional Resources

- **MCP Documentation:** https://modelcontextprotocol.io/
- **SDK Repository:** https://github.com/modelcontextprotocol/typescript-sdk
- **Available Servers:** https://github.com/modelcontextprotocol/servers
- **Implementation Plan:** `MCP_IMPLEMENTATION_PLAN.md`
- **API Reference:** See `/api/mcp/*` routes

---

**Status:** ✅ **PRODUCTION READY**
**Phase 2 Progress:** 64% Complete
**Last Updated:** October 26, 2025

🧙‍♂️ **Archie is now connected to the Model Context Protocol ecosystem!** 🔮
