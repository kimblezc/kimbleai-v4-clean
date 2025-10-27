# KimbleAI v4 - Production Testing Checklist

**Last Updated:** October 27, 2025
**Purpose:** Comprehensive testing checklist for post-deployment verification

---

## Pre-Testing Setup

- [ ] Production deployment complete
- [ ] All environment variables set
- [ ] Database migrations applied
- [ ] Storage buckets created
- [ ] Google OAuth configured
- [ ] Test user accounts ready (Zach & Rebecca)

---

## 1. Core Functionality Tests

### 1.1 Home Page & Navigation
- [ ] Home page (`/`) loads without errors
- [ ] No console errors in browser
- [ ] Navigation menu displays correctly
- [ ] All navigation links work
- [ ] Footer displays version number
- [ ] Mobile responsiveness works

**How to test:**
1. Visit https://your-app.vercel.app
2. Open browser DevTools (F12)
3. Check Console tab for errors
4. Click each navigation link
5. Test on mobile device or DevTools mobile view

---

### 1.2 Authentication
- [ ] Sign in page loads
- [ ] Google OAuth redirects correctly
- [ ] Sign in with Zach's account succeeds
- [ ] Sign in with Rebecca's account succeeds
- [ ] User session persists after page refresh
- [ ] Sign out works correctly
- [ ] Tokens stored in database

**How to test:**
```bash
# After signing in, check database:
SELECT * FROM users WHERE email = 'zach.kimble@gmail.com';
SELECT * FROM user_tokens WHERE user_id = 'user_zach';
SELECT * FROM auth_logs ORDER BY created_at DESC LIMIT 5;
```

Expected: User record exists, tokens present, auth logs show signin_success

---

## 2. AI Model Tests

### 2.1 Chat Functionality - OpenAI Models
- [ ] GPT-4o responds to basic query
- [ ] GPT-4o-mini responds (if configured)
- [ ] GPT-4-turbo responds
- [ ] GPT-3.5-turbo responds
- [ ] Model switcher works
- [ ] Conversation history persists
- [ ] Cost tracking records API call

**Test queries:**
1. "Hello, what's 2+2?"
2. "Tell me about the Eiffel Tower"
3. "Write a haiku about AI"

**Verify in database:**
```sql
SELECT * FROM conversations WHERE user_id = 'user_zach' ORDER BY created_at DESC LIMIT 1;
SELECT * FROM messages WHERE conversation_id = 'conv_xxx' ORDER BY created_at;
SELECT * FROM api_cost_tracking ORDER BY timestamp DESC LIMIT 5;
```

### 2.2 Claude Models (if Phase 4 complete)
- [ ] Claude 3.5 Sonnet responds
- [ ] Claude 3 Opus responds
- [ ] Claude 3 Haiku responds
- [ ] Cost tracking includes Anthropic calls

**Test query:**
"Analyze this code: `function add(a, b) { return a + b; }`"

---

### 2.3 Embeddings & Semantic Search
- [ ] Knowledge base entry created with embedding
- [ ] Semantic search returns relevant results
- [ ] Search function works
- [ ] Similarity scores calculated

**Test:**
1. Create knowledge base entry
2. Search for related content
3. Verify results

```sql
SELECT id, title, embedding IS NOT NULL as has_embedding
FROM knowledge_base
WHERE user_id = 'user_zach'
ORDER BY created_at DESC LIMIT 5;
```

---

## 3. File Processing Tests

### 3.1 Image Upload & Analysis
- [ ] Image upload succeeds (JPG, PNG)
- [ ] Image stored in Supabase storage
- [ ] GPT-4 Vision analyzes image
- [ ] Thumbnail generated
- [ ] OCR extracts text (if image contains text)
- [ ] File record created in database

**Test files:**
- Small JPG (< 1MB)
- PNG with text
- HEIC photo (if supported)

### 3.2 Audio Transcription
- [ ] Audio upload succeeds (M4A, MP3, WAV)
- [ ] AssemblyAI transcription works
- [ ] Whisper fallback works (if AssemblyAI fails)
- [ ] Speaker diarization included
- [ ] Transcription stored in database
- [ ] Cost tracked

**Test files:**
- Short audio clip (30 seconds)
- Meeting recording (5 minutes)

```sql
SELECT * FROM audio_transcriptions WHERE user_id = 'user_zach' ORDER BY created_at DESC LIMIT 1;
SELECT * FROM files WHERE file_type = 'audio' ORDER BY created_at DESC LIMIT 5;
```

### 3.3 Document Processing
- [ ] PDF upload and processing
- [ ] DOCX upload and processing
- [ ] TXT file processing
- [ ] CSV/XLSX processing
- [ ] Email (EML/MSG) processing
- [ ] Text extraction works
- [ ] Content indexed for search

**Test files:**
- Multi-page PDF
- Word document
- Excel spreadsheet

---

## 4. Google Workspace Integration Tests

### 4.1 Gmail
- [ ] List emails endpoint works
- [ ] Email search works
- [ ] Get email details works
- [ ] Attachment download works
- [ ] Send email works (use test recipient)
- [ ] Attachment indexing cron runs

**Test queries:**
```
GET /api/google/gmail?action=list&userId=user_zach&maxResults=10
GET /api/google/gmail?action=search&q=important&userId=user_zach
```

### 4.2 Google Drive
- [ ] List files works
- [ ] File search works
- [ ] File download works
- [ ] Upload to Drive works
- [ ] Drive indexing cron runs

**Test:**
1. List recent Drive files
2. Upload test file to Drive
3. Download file from Drive

### 4.3 Google Calendar
- [ ] List events works
- [ ] Create event works
- [ ] Update event works (if implemented)
- [ ] Calendar sync works

**Test:**
```
GET /api/google/calendar?action=list&userId=user_zach
POST /api/google/calendar (create test event)
```

---

## 5. Cost Tracking & Budgets

### 5.1 Cost Tracking
- [ ] API calls logged in api_cost_tracking
- [ ] Costs calculated correctly
- [ ] Model usage tracked
- [ ] Token counts accurate
- [ ] Daily totals calculated
- [ ] Monthly totals calculated

**Verify:**
```sql
-- Check cost tracking
SELECT * FROM api_cost_tracking WHERE user_id = 'user_zach' ORDER BY timestamp DESC LIMIT 10;

-- Check daily total
SELECT DATE(timestamp) as date, SUM(cost_usd) as daily_cost
FROM api_cost_tracking
WHERE user_id = 'user_zach'
GROUP BY DATE(timestamp)
ORDER BY date DESC;
```

### 5.2 Budget Alerts
- [ ] Budget config exists for users
- [ ] Alert thresholds set
- [ ] Budget enforcement works
- [ ] Notifications sent at thresholds

**Test:**
```sql
SELECT * FROM budget_config WHERE user_id = 'user_zach';
SELECT * FROM budget_alerts ORDER BY created_at DESC LIMIT 5;
```

---

## 6. Projects & Organization

### 6.1 Projects
- [ ] Create new project
- [ ] List user projects
- [ ] Update project
- [ ] Delete project
- [ ] Project-scoped conversations work
- [ ] Project categories work

**Test:**
1. Create test project
2. Create conversation in project
3. Verify project association

### 6.2 Categories
- [ ] Create category
- [ ] Assign category to content
- [ ] Category hierarchy works
- [ ] Auto-categorization works (if implemented)

---

## 7. Autonomous Agents Tests

### 7.1 Main Agent Cron
- [ ] `/api/agent/cron` runs every 5 minutes
- [ ] Tasks created in agent_tasks table
- [ ] Findings recorded
- [ ] Execution log populated

**Check cron execution:**
```sql
SELECT * FROM agent_execution_log ORDER BY created_at DESC LIMIT 10;
SELECT status, COUNT(*) FROM agent_tasks GROUP BY status;
```

### 7.2 Utility Agents
- [ ] Archie Utility Agent runs (every 15 min)
- [ ] Drive Intelligence Agent runs (every 6 hours)
- [ ] Device Sync Agent runs (every 2 min)
- [ ] MCP Health Check runs (every 15 min)

**Verify in logs:**
```bash
# Vercel Dashboard > Runtime Logs
# Look for cron execution logs
```

---

## 8. Dashboard & Analytics

### 8.1 Main Dashboard
- [ ] Dashboard loads (`/dashboard`)
- [ ] Statistics displayed correctly
- [ ] Recent activity shown
- [ ] Charts render
- [ ] Real-time updates work

### 8.2 Cost Dashboard
- [ ] Cost dashboard loads (`/costs`)
- [ ] Daily costs displayed
- [ ] Monthly costs displayed
- [ ] Model breakdown shown
- [ ] Charts render correctly

### 8.3 Analytics Dashboard (if Phase 4 complete)
- [ ] Model analytics load (`/analytics/models`)
- [ ] Performance metrics shown
- [ ] Cost comparison working
- [ ] Quality ratings displayed

---

## 9. Search & Knowledge Base

### 9.1 Search Functionality
- [ ] Global search works
- [ ] Project search works
- [ ] Semantic search works
- [ ] Search suggestions work
- [ ] File search works

**Test searches:**
- "test query" (general)
- File name search
- Semantic similarity search

### 9.2 Knowledge Base
- [ ] Knowledge entries created automatically
- [ ] Manual entries work
- [ ] Embedding generation works
- [ ] Knowledge retrieval in chat works

---

## 10. Notifications & Backups

### 10.1 Notifications
- [ ] Notifications display in UI
- [ ] Notification types work (info, success, warning, error)
- [ ] Email notifications send (for budget alerts)
- [ ] Notification preferences work

### 10.2 Backup System
- [ ] Backup cron runs daily (2 AM UTC)
- [ ] Backup creates Drive file
- [ ] Backup metadata stored
- [ ] Restore functionality works

**Check backups:**
```sql
SELECT * FROM backups ORDER BY created_at DESC LIMIT 5;
```

---

## 11. Device Sync (if implemented)

- [ ] Device registration works
- [ ] Context sync works
- [ ] Sync queue processes
- [ ] Conflict resolution works
- [ ] Heartbeat endpoint works

---

## 12. MCP Servers (Phase 2 feature)

### 12.1 MCP Integration
- [ ] MCP servers table populated
- [ ] Server status tracked
- [ ] Health checks run
- [ ] Tools registered
- [ ] MCP integration page loads (`/integrations/mcp`)

**Check MCP status:**
```sql
SELECT name, status, health_status, last_health_check FROM mcp_servers;
SELECT * FROM mcp_health_checks ORDER BY created_at DESC LIMIT 10;
```

---

## 13. Performance Tests

### 13.1 Page Load Times
- [ ] Home page loads < 2s
- [ ] Dashboard loads < 3s
- [ ] Chat page loads < 2s
- [ ] File upload page loads < 2s

### 13.2 API Response Times
- [ ] Chat API responds < 5s (for simple query)
- [ ] File upload processes < 10s (for small file)
- [ ] Search returns results < 2s
- [ ] Gmail list responds < 3s

### 13.3 Database Query Performance
- [ ] Common queries run < 100ms
- [ ] Search queries run < 500ms
- [ ] Embedding searches run < 1s

---

## 14. Security Tests

### 14.1 Authentication
- [ ] Unauthenticated users redirected to sign in
- [ ] Protected routes require auth
- [ ] API endpoints require auth
- [ ] Session timeout works

### 14.2 Row-Level Security (RLS)
- [ ] Users can only see own data
- [ ] Cross-user data access blocked
- [ ] RLS policies enforced on all tables

**Test:**
Try accessing another user's data (should fail):
```sql
-- Set session user
SET LOCAL role = 'user_zach';
-- Try to access Rebecca's data (should return empty)
SELECT * FROM conversations WHERE user_id = 'user_rebecca';
```

### 14.3 Input Validation
- [ ] SQL injection prevented
- [ ] XSS attacks prevented
- [ ] File upload validation works
- [ ] API input sanitization works

---

## 15. Error Handling

### 15.1 Error Pages
- [ ] 404 page displays for invalid routes
- [ ] 500 page displays for server errors
- [ ] Error boundary catches React errors
- [ ] Helpful error messages shown

### 15.2 API Error Handling
- [ ] API returns proper status codes
- [ ] Error messages are informative
- [ ] Errors logged to database
- [ ] Critical errors trigger alerts

---

## 16. Mobile & Responsive Design

- [ ] Mobile layout works (< 768px)
- [ ] Tablet layout works (768px - 1024px)
- [ ] Desktop layout works (> 1024px)
- [ ] Touch interactions work on mobile
- [ ] Mobile navigation works

**Test devices:**
- iPhone (iOS Safari)
- Android phone (Chrome)
- iPad (Safari)
- Desktop browser mobile view

---

## 17. Browser Compatibility

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

---

## Test Results Template

### Summary
- **Date:** YYYY-MM-DD
- **Tested By:** [Name]
- **Environment:** Production
- **Total Tests:** X
- **Passed:** Y
- **Failed:** Z
- **Success Rate:** Y/X %

### Critical Issues Found
1. [Issue description] - Priority: High/Medium/Low
2. [Issue description]

### Recommendations
1. [Recommendation]
2. [Recommendation]

### Sign-Off
- [ ] All critical tests passed
- [ ] No blocking issues found
- [ ] Production ready for users

---

## Support

For issues found during testing:
- Document in GitHub Issues
- Email: zach.kimble@gmail.com
- Check Vercel logs for errors
- Review Supabase logs

---

**End of Testing Checklist**
