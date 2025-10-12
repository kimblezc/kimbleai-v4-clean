# KimbleAI v4 - Personal AI Workspace

> An intelligent, full-featured AI assistant with perfect memory, Google Workspace integration, and comprehensive file processing capabilities.

## Overview

KimbleAI v4 is a production-ready personal AI system that combines the power of OpenAI's GPT models with seamless Google Workspace integration, advanced file processing, and intelligent knowledge management. Built for Zach and Rebecca Kimble, it serves as a comprehensive digital assistant with cost protection and enterprise-grade features.

### Key Features

- **Intelligent Chat Interface** - GPT-4o and GPT-5 with automatic model selection based on complexity
- **Perfect Memory** - Semantic search powered knowledge base with vector embeddings
- **Audio Intelligence** - Transcription via AssemblyAI and Whisper with speaker diarization
- **Vision Capabilities** - Image analysis with GPT-4 Vision
- **Google Workspace Integration**
  - Gmail reading, searching, and sending
  - Google Drive file access and management
  - Google Calendar event creation and retrieval
- **Comprehensive File Processing**
  - Audio: M4A, MP3, WAV, FLAC (transcription + analysis)
  - Images: JPG, PNG, HEIC, WebP (vision + OCR)
  - Documents: PDF, DOCX, TXT, MD (text extraction)
  - Spreadsheets: CSV, XLSX (data parsing)
  - Email: EML, MSG (parsing + attachment extraction)
- **Cost Protection System** - Budget limits, alerts, and real-time tracking
- **Project Organization** - Multi-project workspace with context isolation
- **Automated Backups** - Google Drive backup system for data protection
- **12 Specialized Agents** - Email, Calendar, Drive, Budget, Audio, Vision, Document, Spreadsheet, Research, Task, Code, and Security agents

## Quick Start (5 Minutes)

### Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier works)
- OpenAI API key
- Google Cloud Project with Gmail, Drive, and Calendar APIs enabled
- AssemblyAI API key (optional, for better transcription)

### Installation

```bash
# Clone the repository
git clone https://github.com/zachkimble/kimbleai-v4.git
cd kimbleai-v4

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your credentials
nano .env.local
```

### Environment Variables

```env
# Database
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key

# AssemblyAI (for transcription)
ASSEMBLYAI_API_KEY=your-assemblyai-key

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-secret-here

# User Configuration
ZACH_USER_ID=user_zach
REBECCA_USER_ID=user_rebecca
```

### Database Setup

1. Create a new Supabase project
2. Run the migration script:

```bash
# Navigate to Supabase SQL Editor and run:
cat database/COMPLETE_MIGRATION.sql
```

3. Create storage buckets in Supabase:
   - `audio-files`
   - `thumbnails`
   - `gmail-attachments`
   - `documents`

4. Enable Row Level Security (RLS) policies (included in migration)

### Google Cloud Setup

1. Create a project at [console.cloud.google.com](https://console.cloud.google.com)
2. Enable APIs:
   - Gmail API
   - Google Drive API
   - Google Calendar API
3. Create OAuth 2.0 credentials
4. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
5. Add test users (your Gmail addresses)

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with Google!

## Architecture

### Tech Stack

- **Frontend**: Next.js 15, React 18, TailwindCSS
- **Backend**: Next.js API Routes, Node.js 20+
- **Database**: Supabase (PostgreSQL + pgvector)
- **AI**: OpenAI GPT-4o/GPT-5, text-embedding-3-small
- **Transcription**: AssemblyAI (primary), Whisper (fallback)
- **Storage**: Supabase Storage, Google Drive
- **Auth**: NextAuth.js with Google OAuth
- **File Processing**: Sharp, pdf-parse, XLSX, mammoth

### Key Components

```
kimbleai-v4/
├── app/
│   ├── api/
│   │   ├── chat/route.ts              # Main chat endpoint
│   │   ├── google/
│   │   │   ├── gmail/route.ts         # Gmail integration
│   │   │   ├── gmail/attachments/route.ts  # Attachment extraction
│   │   │   ├── drive/route.ts         # Drive integration
│   │   │   └── calendar/route.ts      # Calendar integration
│   │   ├── audio/route.ts             # Audio transcription
│   │   ├── backup/route.ts            # Backup system
│   │   └── files/upload/route.ts      # File upload
│   └── page.tsx                       # Main UI
├── components/
│   ├── GmailInbox.tsx                 # Email interface
│   ├── GoogleServicesPanel.tsx        # Google services UI
│   ├── UnifiedFileViewer.tsx          # File viewer
│   └── NotificationSystem.tsx         # Notifications
├── lib/
│   ├── file-processors.ts             # File processing logic
│   ├── unified-file-system.ts         # File registry
│   ├── backup-system.ts               # Backup logic
│   ├── notification-manager.ts        # Notification logic
│   └── agents/                        # 12 specialized agents
└── database/
    └── COMPLETE_MIGRATION.sql         # Database schema
```

### Database Schema

**Core Tables:**
- `users` - User accounts and preferences
- `projects` - Project workspaces
- `conversations` - Chat conversations
- `messages` - Individual messages
- `knowledge_base` - Vector-indexed knowledge entries
- `files` - Unified file registry
- `audio_transcriptions` - Transcription results
- `processed_images` - Image analysis results
- `processed_documents` - Document processing results
- `api_cost_tracking` - Cost monitoring
- `budget_config` - Budget limits
- `budget_alerts` - Budget alert history

## API Reference

### Chat API

```typescript
POST /api/chat
{
  messages: Message[],
  userId: 'zach' | 'rebecca',
  projectId?: string,
  useDeepResearch?: boolean,
  agentMode?: 'email' | 'calendar' | 'drive' | ...
}
```

### Gmail API

```typescript
// List emails
GET /api/google/gmail?action=list&userId=zach&maxResults=20

// Get email details
GET /api/google/gmail?action=get&messageId=xxx&userId=zach

// Search emails
GET /api/google/gmail?action=search&q=query&userId=zach

// Download attachment
GET /api/google/gmail/attachments?userId=zach&messageId=xxx&attachmentId=yyy

// Send email
POST /api/google/gmail
{
  action: 'send_email',
  userId: 'zach',
  emailData: { to, subject, body }
}
```

### Drive API

```typescript
// List files
GET /api/google/drive?action=list&userId=zach

// Upload file
POST /api/google/drive
{
  action: 'upload',
  userId: 'zach',
  filename: 'doc.pdf',
  mimeType: 'application/pdf',
  content: base64Data
}
```

### Calendar API

```typescript
// Get events
GET /api/google/calendar?action=list&userId=zach

// Create event
POST /api/google/calendar
{
  action: 'create',
  userId: 'zach',
  event: { summary, start, end, description }
}
```

### Audio API

```typescript
POST /api/audio
{
  userId: 'zach',
  projectId: 'project-id',
  file: File
}
```

### Backup API

```typescript
// Create backup
POST /api/backup
{
  userId: 'zach',
  includeFiles: true
}

// List backups
GET /api/backup?userId=zach

// Restore backup
POST /api/backup/restore
{
  userId: 'zach',
  backupId: 'backup-xxx'
}
```

## Features in Detail

### 1. Intelligent Chat with Perfect Memory

- **Semantic Search**: Every conversation and file is indexed with vector embeddings
- **Context Awareness**: AI remembers all previous conversations across projects
- **Smart Routing**: Automatically routes requests to specialized agents
- **Cost-Aware**: Uses GPT-4o for standard queries, GPT-5 for complex reasoning

### 2. Audio Intelligence

- **High-Quality Transcription**: AssemblyAI with speaker diarization
- **Automatic Chapters**: AI-generated chapter markers
- **Sentiment Analysis**: Emotional tone detection
- **Entity Recognition**: Automatic extraction of names, places, dates
- **Batch Processing**: Upload multiple files at once

### 3. Vision Capabilities

- **Image Analysis**: Detailed descriptions via GPT-4 Vision
- **OCR**: Text extraction from images
- **Object Detection**: Identifies people, objects, scenes
- **Thumbnail Generation**: Automatic previews

### 4. Google Workspace Integration

- **Gmail**: Read, search, send emails, extract attachments
- **Drive**: Browse files, upload documents, access shared files
- **Calendar**: View events, create meetings, check availability

### 5. File Processing

All files are automatically:
- Stored in Supabase/Drive
- Processed by appropriate AI model
- Indexed with embeddings
- Linked to knowledge base
- Tagged and categorized

### 6. Cost Protection

- **Budget Limits**: Set daily/monthly spending caps
- **Real-Time Tracking**: Monitor costs per API call
- **Smart Alerts**: Email notifications at 50%, 75%, 90%, 100%
- **Usage Analytics**: Detailed breakdowns by model and endpoint

### 7. Project Organization

- **Isolated Workspaces**: Separate projects with independent contexts
- **Conversation Histories**: All chats organized by project
- **File Management**: Files linked to projects
- **Knowledge Scope**: Project-specific or global knowledge

### 8. Automated Backups

- **Daily Backups**: Automatic backup to Google Drive
- **Comprehensive**: All conversations, knowledge, files, settings
- **One-Click Restore**: Full system recovery
- **Version History**: Keep 30 days of backups

## 12 Specialized Agents

1. **Email Agent** - Search, read, compose, and manage emails
2. **Calendar Agent** - Schedule meetings, check availability, send invites
3. **Drive Agent** - Manage files, folders, sharing, and permissions
4. **Budget Agent** - Track costs, set limits, generate reports
5. **Audio Agent** - Transcribe, analyze, and summarize audio
6. **Vision Agent** - Analyze images, extract text, identify objects
7. **Document Agent** - Process PDFs, Word docs, extract information
8. **Spreadsheet Agent** - Parse CSVs, analyze data, generate insights
9. **Research Agent** - Deep research with multi-step reasoning
10. **Task Agent** - Break down projects, track TODOs, manage workflows
11. **Code Agent** - Write, debug, and explain code
12. **Security Agent** - Audit permissions, check for threats, validate data

## Development

### Running Tests

```bash
# All tests
npm test

# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# With coverage
npm run test:coverage
```

### Code Quality

```bash
# Linting
npm run lint

# Type checking
tsc --noEmit

# Environment validation
npm run validate-env
```

### Deployment

#### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

#### Environment Variables in Production

Add all variables from `.env.local` to your deployment platform.

#### Post-Deployment Checklist

- [ ] Update Google OAuth redirect URIs
- [ ] Update NEXTAUTH_URL
- [ ] Configure Supabase RLS policies
- [ ] Set up cron jobs for backups
- [ ] Test all integrations

## Usage Examples

### Chat with Files

```
User: "Analyze this audio file"
[Uploads meeting-notes.m4a]

AI: "I've transcribed your 45-minute meeting. Here are the key points:
- Project timeline moved to Q2 2025
- Budget approved at $150k
- 3 action items assigned
Would you like me to create calendar events for the deadlines?"
```

### Email Management

```
User: "Find all emails from Sarah about the Johnson project"

AI: [Searches Gmail, returns 12 emails]
"I found 12 emails. The most recent discusses budget concerns.
Would you like me to summarize the thread?"
```

### Knowledge Retrieval

```
User: "What did we decide about the pricing model?"

AI: [Searches knowledge base]
"Based on your conversation from Oct 3rd, you decided on
tiered pricing: $49/mo starter, $99/mo pro, $199/mo enterprise."
```

## Troubleshooting

### Common Issues

**"User not authenticated with Google"**
- Sign in again to refresh OAuth tokens
- Check that tokens are stored in `user_tokens` table

**"File processing failed"**
- Check file size limits (2GB audio, 100MB PDF, 50MB images)
- Verify file format is supported
- Check API key quotas

**"Budget limit exceeded"**
- Check budget config: `SELECT * FROM budget_config WHERE user_id = 'your-id'`
- Adjust limits or wait for reset

**"Embedding error"**
- Verify OpenAI API key is valid
- Check that text is under 8000 characters
- Ensure model is `text-embedding-3-small`

### Debug Mode

Enable verbose logging:

```bash
# .env.local
DEBUG=true
LOG_LEVEL=verbose
```

## Roadmap

### v4.1 (Current Release)
- [x] Gmail integration
- [x] Calendar integration
- [x] Drive integration
- [x] Audio transcription
- [x] Budget system
- [x] Cost tracking
- [x] File processing

### v4.2 (COMPLETED ✅)
- [x] Email attachment extraction
- [x] Unified file viewer (20+ formats)
- [x] Mobile-responsive UI
- [x] PWA support (installable app)
- [x] Automated backups (daily at 2 AM UTC)
- [x] Notification system (real-time + email)
- [x] RAG semantic search (vector embeddings)
- [x] Advanced file processing (officeparser + AI)

### v4.3 (Planned)
- [ ] Voice chat interface
- [ ] Real-time collaboration
- [ ] Advanced analytics dashboard
- [ ] Plugin system for custom agents
- [ ] Zapier integration
- [ ] Slack integration

## Security

- **OAuth 2.0**: Secure Google authentication
- **Row-Level Security**: Database-level access control
- **API Key Management**: Encrypted storage in Supabase
- **Input Validation**: All user inputs sanitized
- **Rate Limiting**: Prevents abuse
- **Audit Logs**: Track all user actions

## Contributing

This is a personal project for Zach and Rebecca Kimble. For questions or suggestions, contact zach.kimble@gmail.com.

## License

Private - All Rights Reserved

## Credits

Built with love by Zach Kimble using:
- Next.js by Vercel
- OpenAI GPT models
- Supabase
- AssemblyAI
- Google Cloud Platform

## Support

For issues or questions:
- Email: zach.kimble@gmail.com
- Check logs in Supabase Dashboard
- Review API cost tracking: `SELECT * FROM api_cost_tracking ORDER BY timestamp DESC LIMIT 100`

---

**Version:** 4.2.0
**Last Updated:** January 13, 2025
**Status:** Production Ready - Major Feature Release ✅
