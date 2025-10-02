# Claude Agent SDK Integration Plan for KimbleAI

## Overview
Integrate Claude Agent SDK to create specialized AI agents that enhance KimbleAI's capabilities beyond basic chat.

## Current Architecture
- **Chat**: OpenAI GPT-4
- **Transcription**: AssemblyAI
- **Storage**: Google Drive (2TB) + Supabase (metadata)
- **Features**: Memory system, project organization, multi-user

## Proposed Agent Architecture

### 1. **Transcription Analysis Agent**
**Purpose**: Automatically analyze transcribed audio and extract insights

**Tools**:
- Read transcription from Supabase
- Access Google Drive for full audio context
- Generate summaries, action items, key topics
- Tag conversations automatically

**Use Case**:
```typescript
// After transcription completes
const analysisAgent = new ClaudeAgent({
  systemPrompt: "You are a transcription analyst. Extract key insights, action items, and topics from meeting transcriptions.",
  tools: [supabaseRead, driveRead, tagGenerator]
});

const analysis = await analysisAgent.run({
  transcription: result.text,
  speakers: result.utterances
});
```

**Benefits**:
- Automatic meeting summaries
- Smart tagging for 2GB audio files
- Action item extraction
- Speaker analysis

---

### 2. **Workspace Organization Agent**
**Purpose**: Maintain Google Drive organization and suggest optimizations

**Tools**:
- Google Drive API (list, move, organize files)
- Supabase metadata queries
- Storage analytics

**Use Case**:
```typescript
const workspaceAgent = new ClaudeAgent({
  systemPrompt: "You manage a 2TB Google Drive workspace. Organize files, suggest cleanup, and maintain optimal structure.",
  tools: [googleDriveTools, supabaseTools]
});

// Run weekly
await workspaceAgent.run({
  action: "analyze_and_organize",
  userId: "zach"
});
```

**Benefits**:
- Automatic file organization in Drive
- Duplicate detection
- Storage optimization suggestions
- Smart folder structures based on projects

---

### 3. **Research Assistant Agent** (with Subagents)
**Purpose**: Complex research tasks using multiple specialized subagents

**Architecture**:
```
Main Research Agent
├── Web Search Subagent (gather info)
├── Knowledge Base Subagent (check existing conversations)
├── Synthesis Subagent (combine & summarize)
└── Citation Subagent (track sources)
```

**Use Case**:
- User asks: "What did we discuss about D&D character builds last month?"
- Agent searches conversations, finds relevant transcriptions, synthesizes answer
- Includes citations with timestamps from audio files

---

### 4. **Memory Management Agent**
**Purpose**: Intelligent context management across conversations

**Tools**:
- Vector search (existing knowledge base)
- Conversation history
- User preferences
- Project context

**Use Case**:
```typescript
const memoryAgent = new ClaudeAgent({
  systemPrompt: "You maintain context across conversations. Surface relevant past discussions when needed.",
  tools: [vectorSearch, conversationHistory]
});

// Before each chat
const relevantContext = await memoryAgent.getRelevantContext({
  currentMessage: userInput,
  userId: "zach",
  project: currentProject
});
```

**Benefits**:
- Better long-term memory than current system
- Automatic context retrieval
- Cross-conversation insights

---

### 5. **Multi-Modal Processing Agent**
**Purpose**: Handle audio, images, and text in unified workflows

**Tools**:
- AssemblyAI integration
- Image analysis (Claude vision)
- Document parsing

**Use Case**:
- Upload D&D session recording (2GB audio)
- Upload character sheet images
- Agent transcribes audio, analyzes sheets, generates campaign summary

---

## Implementation Steps

### Phase 1: Setup (Week 1)
```bash
npm install @anthropic-ai/claude-agent-sdk
```

**Files to create**:
- `lib/agents/base-agent.ts` - Base configuration
- `lib/agents/transcription-agent.ts`
- `lib/agents/workspace-agent.ts`

**Environment variables**:
```env
ANTHROPIC_API_KEY=your_key_here
AGENT_MAX_ITERATIONS=10
```

### Phase 2: Replace OpenAI Chat (Week 2)
**Current**: `app/api/chat/route.ts` uses OpenAI
**New**: Use Claude Agent SDK with tools

```typescript
// lib/agents/chat-agent.ts
import { ClaudeAgent } from '@anthropic-ai/claude-agent-sdk';

export const chatAgent = new ClaudeAgent({
  model: 'claude-3-5-sonnet-20241022',
  systemPrompt: `You are KimbleAI, an AI assistant with access to:
  - User's conversation history
  - Transcribed audio files
  - Google Drive workspace
  - Project organization system`,
  tools: [
    searchConversations,
    searchTranscriptions,
    accessGoogleDrive,
    createProject,
    tagConversation
  ],
  maxIterations: 5
});
```

### Phase 3: Add Specialized Agents (Week 3)
- Create transcription analysis agent
- Integrate with existing AssemblyAI workflow
- Auto-generate summaries after transcription

### Phase 4: Advanced Features (Week 4)
- Implement subagent architecture for complex tasks
- Add workspace organization agent
- Create scheduled jobs for maintenance

---

## Benefits Over Current System

### 1. **Better Context Management**
- Claude's 200K context window (vs OpenAI's 128K)
- Automatic relevance filtering
- Better long-term memory

### 2. **Tool Integration**
- Built-in tool calling (more reliable than OpenAI function calling)
- MCP support for external services
- Better error handling

### 3. **Cost Efficiency**
- Claude Sonnet: $3/million tokens (input), $15/million (output)
- OpenAI GPT-4: $10/million tokens (input), $30/million (output)
- **Potential 60-70% cost savings**

### 4. **Specialized Agents**
- Different agents for different tasks
- Better results than one general-purpose model
- Parallel processing with subagents

### 5. **Production Ready**
- Built-in error handling
- Session management
- Rate limiting
- Monitoring hooks

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                   KimbleAI Frontend                  │
│              (Next.js + React + Vercel)              │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│              Claude Agent Orchestrator               │
│         (Routes requests to specialized agents)      │
└─────┬──────────┬──────────┬──────────┬──────────────┘
      │          │          │          │
      ▼          ▼          ▼          ▼
  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐
  │ Chat │  │Trans-│  │Work- │  │Memory│
  │Agent │  │cript │  │space │  │Agent │
  │      │  │Agent │  │Agent │  │      │
  └──┬───┘  └──┬───┘  └──┬───┘  └──┬───┘
     │         │         │         │
     └─────────┴─────────┴─────────┘
                   │
        ┌──────────┴──────────┐
        │    Tool Registry    │
        ├─────────────────────┤
        │ • Supabase Tools    │
        │ • Google Drive API  │
        │ • AssemblyAI API    │
        │ • Vector Search     │
        │ • Knowledge Base    │
        └─────────────────────┘
```

---

## Sample Code: Transcription Agent

```typescript
// lib/agents/transcription-agent.ts
import { ClaudeAgent, Tool } from '@anthropic-ai/claude-agent-sdk';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Define tools
const getTranscription: Tool = {
  name: 'get_transcription',
  description: 'Retrieve a transcription by ID from the database',
  inputSchema: {
    type: 'object',
    properties: {
      transcriptionId: { type: 'string' }
    },
    required: ['transcriptionId']
  },
  handler: async ({ transcriptionId }) => {
    const { data } = await supabase
      .from('audio_transcriptions')
      .select('*')
      .eq('id', transcriptionId)
      .single();

    return data;
  }
};

const tagTranscription: Tool = {
  name: 'tag_transcription',
  description: 'Add tags to a transcription',
  inputSchema: {
    type: 'object',
    properties: {
      transcriptionId: { type: 'string' },
      tags: { type: 'array', items: { type: 'string' } }
    },
    required: ['transcriptionId', 'tags']
  },
  handler: async ({ transcriptionId, tags }) => {
    const { data } = await supabase
      .from('audio_transcriptions')
      .update({
        metadata: {
          ...data.metadata,
          auto_tags: tags
        }
      })
      .eq('id', transcriptionId);

    return { success: true, tags };
  }
};

// Create agent
export const transcriptionAgent = new ClaudeAgent({
  model: 'claude-3-5-sonnet-20241022',
  systemPrompt: `You are a transcription analysis expert. Your job is to:
  1. Analyze transcribed audio for key insights
  2. Extract action items and important topics
  3. Identify speakers and their main points
  4. Generate appropriate tags
  5. Create concise summaries

  Focus on practical, actionable insights.`,
  tools: [getTranscription, tagTranscription],
  maxIterations: 3
});

// Usage in API route
export async function analyzeTranscription(transcriptionId: string) {
  const result = await transcriptionAgent.run({
    input: `Analyze transcription ${transcriptionId}. Provide:
    1. Summary (2-3 sentences)
    2. Key topics (5-10 tags)
    3. Action items (if any)
    4. Speaker insights`
  });

  return result;
}
```

---

## Cost Comparison

### Current (OpenAI GPT-4)
- **Input**: $10 / 1M tokens
- **Output**: $30 / 1M tokens
- **Typical conversation** (5K in, 1K out): $0.08

### With Claude Agent SDK
- **Input**: $3 / 1M tokens
- **Output**: $15 / 1M tokens
- **Same conversation**: $0.03
- **Savings**: 62.5% per conversation

### Monthly Estimate (1000 conversations)
- **Current**: $80/month
- **With Claude**: $30/month
- **Annual savings**: $600

---

## Next Steps

1. **Install SDK**: `npm install @anthropic-ai/claude-agent-sdk`
2. **Get API Key**: https://console.anthropic.com/
3. **Start with Chat Agent**: Replace OpenAI in `app/api/chat/route.ts`
4. **Add Transcription Agent**: Auto-analyze audio files
5. **Expand**: Add more specialized agents as needed

## Questions?
- Read full docs: https://docs.claude.com/en/api/agent-sdk
- Check examples: https://github.com/anthropics/anthropic-sdk-typescript
- API reference: https://docs.anthropic.com/en/api
