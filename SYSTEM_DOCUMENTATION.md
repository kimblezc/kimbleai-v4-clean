# KimbleAI V4 Clean - System Documentation
**Last Updated:** September 21, 2025  
**Version:** 4.0.1  
**Status:** Production Ready

## System Overview

KimbleAI is a comprehensive AI chat interface with RAG (Retrieval-Augmented Generation) capabilities, supporting multiple users with isolated knowledge bases and full document indexing.

## Core Features

### 1. RAG System
- **Vector Search**: Uses OpenAI text-embedding-3-small (1536 dimensions)
- **Knowledge Base**: Comprehensive storage with semantic search
- **Source Types**: conversations, files, emails, drive documents, manual entries
- **Automatic Extraction**: Learns from every conversation

### 2. User Management
- **Two Users**: Zach and Rebecca with isolated data
- **User Switching**: Simple toggle in UI
- **Data Isolation**: Complete separation of knowledge bases

### 3. File Management
- **Upload Interface**: Drag-and-drop or click to browse
- **Supported Formats**: TXT, MD, PDF, DOCX, CSV
- **Automatic Indexing**: Files are vectorized and searchable
- **Full-Text Search**: Semantic search across all documents

### 4. Organization Features
- **Projects**: Organize conversations by project
- **Tags**: Multiple tags per conversation
- **Search**: Find conversations by content, project, or tags

### 5. Integration Ready
- **Google Drive**: OAuth integration placeholder
- **Gmail**: Email search integration placeholder
- **Zapier Webhook**: Logs all interactions

## Technical Architecture

### Frontend
- **Framework**: Next.js 14 with TypeScript
- **UI**: Custom React components
- **State**: React hooks with localStorage persistence
- **Styling**: Inline styles for maximum compatibility

### Backend
- **API Routes**: Next.js API routes
- **Database**: Supabase PostgreSQL with pgvector
- **AI Model**: OpenAI GPT-4o-mini
- **Embeddings**: OpenAI text-embedding-3-small

### Database Schema

```sql
-- Core tables
users (id, name, email, created_at)
conversations (id, user_id, title, created_at, updated_at)
messages (id, conversation_id, user_id, role, content, embedding, created_at)

-- Knowledge system
knowledge_base (
  id, user_id, source_type, source_id, category,
  title, content, embedding, importance, tags,
  metadata, created_at, updated_at, expires_at, is_active
)

-- File storage
indexed_files (
  id, user_id, filename, file_type, file_size,
  full_text, chunks, metadata, indexed_at
)
```

## API Endpoints

### GET /api/chat
Returns system capabilities and status

### POST /api/chat
Main chat endpoint with RAG retrieval
```json
{
  "messages": [{"role": "user", "content": "..."}],
  "userId": "zach",
  "conversationId": "conv_123",
  "projectId": "project-name",
  "tags": ["tag1", "tag2"]
}
```

### POST /api/upload
File upload and indexing
```
FormData:
- file: File object
- userId: "zach" or "rebecca"
- category: "document"
```

### GET /api/upload
List indexed files for a user
```
?userId=zach
```

## Deployment Instructions

### Prerequisites
1. Node.js 18+
2. Git
3. Vercel CLI
4. Supabase account

### Environment Variables
```env
OPENAI_API_KEY=sk-proj-...
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ZAPIER_WEBHOOK_URL=https://hooks.zapier.com/...
```

### Deploy to Production

**Windows:**
```powershell
.\deploy.bat
```

**Mac/Linux:**
```bash
chmod +x deploy.sh
./deploy.sh
```

### Manual Deployment
```bash
npm install
npm run build
git add -A
git commit -m "Deploy update"
git push origin main
npx vercel --prod
```

## Testing Guide

### 1. Test Knowledge Persistence
```powershell
$test = @{
    messages = @(@{
        role = "user"
        content = "My project deadline is December 15th"
    })
    userId = "zach"
} | ConvertTo-Json -Depth 10
Invoke-RestMethod -Uri "https://kimbleai-v4-clean.vercel.app/api/chat" -Method Post -Body $test -ContentType "application/json"
```

### 2. Test File Upload
```bash
curl -X POST https://kimbleai-v4-clean.vercel.app/api/upload \
  -F "file=@document.txt" \
  -F "userId=zach"
```

### 3. Test Knowledge Retrieval
```powershell
$retrieve = @{
    messages = @(@{
        role = "user"
        content = "What is my project deadline?"
    })
    userId = "zach"
} | ConvertTo-Json -Depth 10
Invoke-RestMethod -Uri "https://kimbleai-v4-clean.vercel.app/api/chat" -Method Post -Body $retrieve -ContentType "application/json"
```

## Troubleshooting

### Build Errors
- Check TypeScript errors: `npx tsc --noEmit`
- Clear cache: `rm -rf .next node_modules && npm install`

### API Errors
- Check environment variables in Vercel dashboard
- Verify Supabase tables exist
- Check OpenAI API key is valid

### Database Issues
- Ensure pgvector extension is enabled
- Run migrations in Supabase SQL editor
- Check RLS policies are disabled for development

## Cost Analysis

**Monthly Costs:**
- OpenAI API: ~$5 (depends on usage)
- Supabase: Free tier (up to 500MB)
- Vercel: Free tier (hobby plan)
- Zapier: $20 (if using pro features)
- **Total: $25/month**

## Future Enhancements

### Phase 1 (Next Sprint)
- [ ] Google OAuth implementation
- [ ] Gmail integration
- [ ] Google Drive sync
- [ ] PDF text extraction

### Phase 2
- [ ] Voice input/output
- [ ] Mobile app (React Native)
- [ ] Advanced search filters
- [ ] Export conversations

### Phase 3
- [ ] Team collaboration
- [ ] Custom AI models
- [ ] Analytics dashboard
- [ ] API access for external apps

## Security Considerations

- All data is encrypted at rest (Supabase)
- User isolation enforced at database level
- API keys stored as environment variables
- No client-side exposure of sensitive data
- HTTPS enforced on all endpoints

## Support & Maintenance

### Daily Checks
1. Verify API status: https://kimbleai-v4-clean.vercel.app/api/chat
2. Check Vercel dashboard for errors
3. Monitor Supabase usage

### Weekly Tasks
1. Review Zapier logs
2. Check OpenAI usage/costs
3. Backup important conversations
4. Test user isolation

### Monthly Tasks
1. Update dependencies
2. Review and optimize queries
3. Clean up old test data
4. Security audit

## Contact & Resources

- **GitHub Repo**: [your-repo-url]
- **Live App**: https://kimbleai-v4-clean.vercel.app
- **Supabase Dashboard**: https://supabase.com/dashboard
- **Vercel Dashboard**: https://vercel.com/dashboard

## License

Private project - All rights reserved

---

**Remember**: No emojis in code, maximum automation, fix don't delete features!