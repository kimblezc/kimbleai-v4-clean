# Claude Connectors vs Extensions: Complete Guide

**Date:** January 8, 2025
**Context:** Understanding the differences for Google Workspace integration

---

## 🎯 Quick Summary

| Term | What It Is | Where It Runs | Your Gmail/Drive Use Case |
|------|------------|---------------|---------------------------|
| **Connectors** | Remote MCP servers | Cloud (works on web + desktop) | ✅ Google Workspace connector (cloud) |
| **Extensions** | Local MCP servers | Your computer (desktop only) | ⚠️ Could access local files |
| **Plugins** | Informal term | Both | General term for all integrations |

---

## 📊 Detailed Comparison

### **Connectors** (Remote MCP Servers)

**What they are:**
- Run on external servers in the cloud
- Connect Claude to cloud services (Gmail, Drive, Slack, Notion, etc.)
- Accessed via internet

**Where they work:**
- ✅ Claude.ai (web browser)
- ✅ Claude Desktop (Windows/Mac app)
- ✅ Claude Mobile (iOS/Android)

**Who can use them:**
- Paid plans only (Pro, Max, Team, Enterprise)
- NOT available on free tier

**Setup:**
- Click "Connect" in Claude's connector directory
- Authenticate via OAuth
- Works instantly across all devices

**Examples:**
- Google Workspace connector (Gmail, Drive, Calendar, Docs)
- Notion connector
- Slack connector
- GitHub connector
- Confluence connector

**For YOUR use case:**
```
User → Claude.ai (web browser)
         ↓
    Google Workspace Connector (cloud server)
         ↓
    Your Gmail/Drive/Calendar (cloud)
```

**Pros:**
- ✅ Works on web, desktop, mobile
- ✅ One setup, works everywhere
- ✅ No installation needed
- ✅ Maintained by connector provider
- ✅ OAuth authentication

**Cons:**
- ❌ Paid plans only
- ❌ Read-only in many cases
- ❌ Limited customization
- ❌ Depends on connector provider

---

### **Extensions** (Local MCP Servers)

**What they are:**
- Run locally on your computer
- Access local files, applications, system resources
- Packaged as `.mcpb` files (MCP Bundle)

**Where they work:**
- ✅ Claude Desktop ONLY (Windows/Mac app)
- ❌ NOT on web browser
- ❌ NOT on mobile

**Who can use them:**
- ✅ ALL users (including free tier)
- Available to anyone with Claude Desktop

**Setup:**
- Download `.mcpb` file
- Double-click to install in Claude Desktop
- Configure if needed (API keys, paths, etc.)

**Examples:**
- Filesystem access (read/write local files)
- SQLite database access
- Git repository access
- Local code execution
- System commands
- Screenshot tools

**For YOUR use case:**
```
User → Claude Desktop (local app)
         ↓
    Extension (local MCP server on your PC)
         ↓
    Local files OR APIs you configure
```

**Pros:**
- ✅ Free tier can use
- ✅ Access local resources
- ✅ Full customization
- ✅ Can write custom extensions
- ✅ No cloud dependency

**Cons:**
- ❌ Desktop only (no web/mobile)
- ❌ Must install on each computer
- ❌ More setup complexity
- ❌ You maintain it

---

### **Plugins** (Informal Term)

**What it means:**
- General term for both connectors and extensions
- Not an official category
- Used colloquially to mean "things that extend Claude"

**When you see "plugins":**
- Could mean connectors
- Could mean extensions
- Could mean both

---

## 🔍 Technical Architecture

### Connectors (Remote MCP):

```
┌─────────────┐
│  Claude.ai  │ (web browser)
└──────┬──────┘
       │
       │ HTTPS/MCP Protocol
       │
       ▼
┌─────────────────────┐
│ Remote MCP Server   │ (cloud)
│ (Connector)         │
│                     │
│ - Google Workspace  │
│ - Notion            │
│ - Slack             │
└──────┬──────────────┘
       │
       │ API Calls
       │
       ▼
┌─────────────────────┐
│  Cloud Services     │
│  (Gmail, Drive)     │
└─────────────────────┘
```

**Key Points:**
- Connector runs on external server
- Claude communicates via MCP protocol
- Connector calls service APIs
- Works from any device

---

### Extensions (Local MCP):

```
┌─────────────────┐
│ Claude Desktop  │ (your computer)
└────────┬────────┘
         │
         │ Local IPC
         │
         ▼
┌────────────────────┐
│ Local MCP Server   │ (your computer)
│ (Extension)        │
│                    │
│ - File access      │
│ - Database access  │
│ - Git operations   │
└────────┬───────────┘
         │
         │ Direct Access
         │
         ▼
┌────────────────────┐
│ Local Resources    │
│ (Files, DBs, etc.) │
└────────────────────┘
```

**Key Points:**
- Extension runs locally
- Claude Desktop manages it
- Direct access to local resources
- Desktop-only

---

## 🎯 For Your Google Workspace Goals

### What You Want:
- Read/write Gmail
- Read/write Drive
- Read/write Calendar
- For Zach + Rebecca

---

### Option 1: Official Google Workspace Connector ⭐ EASIEST

**What it is:**
- Official remote connector from Google/Anthropic
- Announced April 2025
- Available in Claude.ai and Claude Desktop

**Setup:**
1. Go to claude.ai/connectors
2. Find "Google Workspace"
3. Click "Connect"
4. Authenticate with Google OAuth
5. Done - works everywhere

**Capabilities:**
- ✅ Read Gmail
- ✅ Read Drive
- ✅ Read Calendar
- ❌ **NO WRITE** (read-only)

**Cost:**
- Requires Claude Pro ($20/month) or higher

**Verdict:**
❌ **NOT SUFFICIENT** - Read-only, can't write/edit

---

### Option 2: Custom Extension (Local MCP) ⚠️ COMPLEX

**What it is:**
- Build your own `.mcpb` extension
- Runs locally on Claude Desktop
- Calls your Google APIs directly

**Setup:**
1. Create MCP server using your existing Google API code
2. Package as `.mcpb` file
3. Install in Claude Desktop
4. Configure OAuth credentials

**Capabilities:**
- ✅ Read Gmail
- ✅ Write Gmail (send, delete, label)
- ✅ Read Drive
- ✅ Write Drive (create, edit, delete)
- ✅ Read Calendar
- ✅ Write Calendar (create, edit, delete)

**Cost:**
- Free (works with free Claude tier)
- Just API costs

**Verdict:**
✅ **CAN WORK** - But desktop-only, complex setup

---

### Option 3: Custom Connector (Remote MCP) ⭐⭐ RECOMMENDED

**What it is:**
- Build your own remote MCP server
- Host it on your infrastructure (Vercel/Railway/etc.)
- Claude calls it from web/desktop/mobile

**Setup:**
1. Create MCP server API (Node.js/Python)
2. Implement Gmail/Drive/Calendar operations
3. Deploy to Vercel/Railway/Cloud
4. Configure in Claude.ai settings

**Capabilities:**
- ✅ Full read/write for everything
- ✅ Works on web + desktop + mobile
- ✅ Custom logic
- ✅ Multi-user support
- ✅ Your OAuth credentials

**Cost:**
- Hosting: $0-20/month (Vercel/Railway)
- Claude Pro: $20/month

**Verdict:**
✅ **BEST OPTION** - Full capabilities, works everywhere

---

### Option 4: Use Your Existing KimbleAI System ⭐⭐⭐ SIMPLEST

**What it is:**
- You ALREADY have the APIs
- Just expose them via your UI
- No connectors/extensions needed

**Capabilities:**
- ✅ Everything (you built it)
- ✅ Multi-user built-in
- ✅ Cost monitoring
- ✅ Custom agents

**Verdict:**
✅ **ALREADY DONE** - Just finish the UI

---

## 🆚 Direct Comparison for Your Needs

| Approach | Read Gmail | Write Gmail | Read Drive | Write Drive | Read Calendar | Write Calendar | Works On | Multi-User | Cost |
|----------|-----------|------------|-----------|------------|--------------|----------------|---------|-----------|------|
| **Official Connector** | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ | Web+Desktop+Mobile | ⚠️ Separate | $20/mo per user |
| **Custom Extension** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Desktop only | ❌ Separate setup | Free |
| **Custom Connector** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Web+Desktop+Mobile | ✅ Built-in | $0-40/mo |
| **Your KimbleAI** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Your web app | ✅ Built-in | $60-120/mo |

---

## 💡 How They Match Your Requirements

### Your Requirements:
1. Read/write Gmail
2. Read/write Drive
3. Read/write Calendar
4. Use agents/MCPs/APIs
5. Work for Zach + Rebecca

### Matching Solutions:

**Official Connector:**
- ✅ Uses MCP (connector)
- ❌ Read-only (NO write)
- ❌ **DOESN'T MATCH**

**Custom Extension:**
- ✅ Uses MCP (extension)
- ✅ Full read/write
- ⚠️ Desktop-only
- ⚠️ **PARTIALLY MATCHES**

**Custom Connector:**
- ✅ Uses MCP (connector)
- ✅ Full read/write
- ✅ Works everywhere
- ✅ **FULLY MATCHES**

**Your KimbleAI:**
- ✅ Uses APIs directly
- ✅ Full read/write
- ✅ Your web app
- ✅ **FULLY MATCHES** (best)

---

## 🛠️ Implementation Guide

### If You Want to Build Custom Connector:

**Step 1: Create MCP Server**

```typescript
// server.ts
import { MCPServer } from '@modelcontextprotocol/sdk';
import { gmail, drive, calendar } from './google-apis'; // Your existing code

const server = new MCPServer({
  name: 'kimbleai-workspace',
  version: '1.0.0'
});

// Register tools
server.addTool({
  name: 'send_email',
  description: 'Send an email via Gmail',
  parameters: { /* ... */ },
  execute: async (params) => {
    return await gmail.send(params);
  }
});

server.addTool({
  name: 'create_drive_file',
  description: 'Create file in Drive',
  parameters: { /* ... */ },
  execute: async (params) => {
    return await drive.create(params);
  }
});

// Start server
server.listen(3001);
```

**Step 2: Deploy**

```bash
# Deploy to Vercel/Railway
vercel deploy
# or
railway up
```

**Step 3: Configure in Claude**

Go to claude.ai → Settings → Connectors → Add Custom Connector
```json
{
  "url": "https://your-app.vercel.app/mcp",
  "auth": {
    "type": "oauth",
    "clientId": "...",
    "clientSecret": "..."
  }
}
```

---

### If You Want to Build Custom Extension:

**Step 1: Create Local MCP Server**

```typescript
// extension.ts
import { MCPServer } from '@modelcontextprotocol/sdk';
import { gmail, drive, calendar } from './google-apis';

const server = new MCPServer({
  name: 'kimbleai-local',
  version: '1.0.0'
});

// Same tools as connector

server.start();
```

**Step 2: Package as .mcpb**

```bash
npx mcp-bundle package extension.ts -o kimbleai.mcpb
```

**Step 3: Install in Claude Desktop**

Double-click `kimbleai.mcpb` file

---

## 🎬 Final Recommendation

### For Your Specific Needs:

**SKIP connectors and extensions.**

**Why:**
1. You already have the Google APIs working
2. You already have OAuth setup
3. You already have the infrastructure
4. Building a connector/extension is MORE work than finishing your UI

**Instead:**
1. Finish your write agent endpoints (1-2 weeks)
2. Add UI buttons to trigger them
3. Done - you have full read/write without MCP

**IF you want Claude's reasoning:**
- Build custom connector using your existing APIs
- OR use Claude Agent SDK (from previous analysis)

**But for basic read/write/edit:**
- You don't need connectors
- You don't need extensions
- You just need to expose your existing APIs via your UI

---

## 📋 Summary

**Connectors** = Cloud-based, work everywhere, read-only (unless custom)
**Extensions** = Local desktop, full access, desktop-only
**Your System** = Direct APIs, full control, already 80% done

**Match for your goals:**
- Official Connector: ❌ Read-only
- Custom Extension: ⚠️ Desktop-only
- Custom Connector: ✅ Could work
- **Your KimbleAI:** ✅✅ Best option

**Finish building your write agents. Skip the connector/extension complexity unless you specifically want Claude's reasoning.**

---

Ready to build those write agents instead? 🚀
