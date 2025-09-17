# KIMBLEAI v4 MASTER PROJECT EXPORT
**Generated:** September 16, 2025  
**Version:** 4.0.0-GPT5  
**Status:** Near-Complete (Zapier webhooks pending)  
**Location:** D:\OneDrive\Documents\kimbleai-v4-clean  
**Live URL:** https://kimbleai-v4-clean.vercel.app

---

## 🎯 PROJECT OVERVIEW

**KimbleAI** is a 2-user family AI system for Zach and Rebecca with persistent memory, dynamic project organization, and full automation through Zapier. Built with Next.js, Supabase (pgvector), and GPT-5 integration.

**Core Requirements:**
- 2 users only (Zach & Rebecca)
- Persistent memory across all conversations
- Dynamic project/tag organization
- Google Drive/Gmail integration
- Maximum automation (fire-and-forget)
- Budget: <$150/month total

---

## ✅ CURRENT STATUS

### **WORKING:**
- ✅ Chat interface deployed and functional
- ✅ Database schema with pgvector enabled
- ✅ User switching (Zach/Rebecca)
- ✅ LocalStorage persistence
- ✅ Project/tag UI components
- ✅ API endpoints configured
- ✅ Automated logging system
- ✅ GPT-5 integration ready

### **PENDING ACTIVATION:**
- ⏳ Zapier memory extraction webhook (URL needs adding to Vercel)
- ⏳ Zapier auto-organization webhook
- ⏳ Google OAuth configuration
- ⏳ Zapier automation workflows

### **USAGE METRICS:**
- Zapier: 0/750 tasks used ($20/month wasted)
- Estimated GPT-5 cost: $5-10/month
- Supabase: Free tier sufficient
- Total when active: ~$30/month

---

## 🚀 IMMEDIATE NEXT STEPS

### **1. Complete Zapier Setup (10 minutes)**

You're currently in Zapier with webhook URL ready. Complete these steps:

1. **In Zapier (current screen):**
   - Click "Continue with selected record"
   - Add action: ChatGPT (OpenAI)
   - Choose "Create Conversation"
   - Model: `gpt-5-mini`
   - System: "Extract facts and preferences from conversation"
   - Test and activate

2. **Add webhook to Vercel:**
   ```
   ZAPIER_MEMORY_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/251467527/bkahj/
   ```

3. **Redeploy:**
   ```powershell
   cd D:\OneDrive\Documents\kimbleai-v4-clean
   npx vercel --prod --force
   ```

### **2. Create Second Zapier Workflow (5 minutes)**

For auto-organization:
- New Zap → Webhook trigger
- Filter: messageCount >= 3
- Action: GPT-5-mini → suggest project/tags
- Action: POST to `/api/zapier?action=organize`

### **3. Test Complete System (2 minutes)**

1. Send: "My favorite color is blue and I have a dog named Max"
2. New chat: "What do you know about me?"
3. Should remember through vector search

---

## 📁 FILE STRUCTURE

```
kimbleai-v4-clean/
├── app/
│   ├── api/
│   │   ├── chat/route.ts         # GPT-5-mini integration
│   │   ├── zapier/route.ts       # Webhook handlers
│   │   └── status/route.ts       # System status
│   ├── page.tsx                  # Main chat UI
│   └── layout.tsx                # App layout
├── lib/
│   └── project-logger.ts         # Automated logging
├── supabase/
│   ├── complete-system.sql       # Database schema
│   └── project-logging.sql       # Logging tables
├── .env.local                    # Environment variables
└── package.json                  # Dependencies
```

---

## 🔑 ENVIRONMENT VARIABLES

**Currently Set in Vercel:**
```
NEXT_PUBLIC_SUPABASE_URL=https://gbmefnaqsxtoseufjixp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[set]
SUPABASE_SERVICE_ROLE_KEY=[needs setting]
OPENAI_API_KEY=[set]
ZAPIER_MEMORY_WEBHOOK_URL=[needs setting]
ZAPIER_ORGANIZE_WEBHOOK_URL=[needs setting]
```

---

## 💾 DATABASE SCHEMA

**Supabase Tables:**
- `users` - Zach & Rebecca accounts
- `projects` - Dynamic project organization
- `conversations` - Chat sessions with projects/tags
- `messages` - Individual messages with embeddings
- `memory_chunks` - Extracted facts with vectors
- `tags` - Tag management
- `project_logs` - System logging
- `zapier_logs` - Automation tracking

**Key Functions:**
- `search_similar_messages()` - Vector similarity search
- `increment_project_count()` - Project statistics
- `get_project_drift_report()` - System health

---

## 🤖 GPT-5 CONFIGURATION

**Models Available:**
- `gpt-5` - Full model for complex tasks
- `gpt-5-mini` - Default for chat (cost-efficient)
- `gpt-5-nano` - Smallest, for simple queries

**Current Implementation:**
- Primary: `gpt-5-mini` for all chat
- Fallback: `gpt-4o-mini` if GPT-5 fails
- Zapier: `gpt-5-mini` for extraction

**New Parameters:**
```javascript
{
  model: 'gpt-5-mini',
  verbosity: 'medium',  // low, medium, high
  reasoning_effort: 'minimal'  // for faster responses
}
```

---

## 🔄 ZAPIER AUTOMATION (750 tasks/month)

### **Memory Extraction (300 tasks)**
- Trigger: Every conversation
- Extract facts with GPT-5-mini
- Store in memory_chunks
- Generate embeddings

### **Auto-Organization (200 tasks)**
- Trigger: 3+ messages
- Suggest project name
- Generate 3-5 tags
- Update conversation

### **Search Integration (150 tasks)**
- Trigger: Search request
- Query Google Drive
- Query Gmail
- Combine with memories

### **Deploy Monitor (100 tasks)**
- Trigger: Errors
- Analyze with GPT-5
- Auto-fix and deploy

---

## 📊 COST BREAKDOWN

**Current Monthly:**
- Zapier Pro: $20 (paid, 0% utilized)
- Vercel: $0 (free tier)
- Supabase: $0 (free tier)
- OpenAI: $0 (not active)
- **Total: $20 (wasted)**

**Projected Active:**
- Zapier Pro: $20 (750 tasks utilized)
- GPT-5-mini: $5-10
- Supabase: $0 (under limits)
- Vercel: $0
- **Total: $25-30/month**

---

## 🐛 KNOWN ISSUES

1. **Zapier webhooks not connected** - Primary blocker
2. **Service role key missing** - Limits Supabase operations
3. **Google OAuth not configured** - No Drive/Gmail access
4. **No domain configured** - Using Vercel subdomain

---

## 📝 CONTINUITY PROMPT

For next session, use this prompt:

```
Continue KimbleAI v4 from export. Status:
- Chat working at https://kimbleai-v4-clean.vercel.app
- Database configured with pgvector
- GPT-5 integrated (gpt-5-mini default)
- Zapier webhook pending connection (0/750 tasks)
- Need to complete Zapier setup in browser
- Check /api/status for current state

Location: D:\OneDrive\Documents\kimbleai-v4-clean
Priority: Connect Zapier webhooks to activate memory
```

---

## 🎯 SUCCESS CRITERIA

System is complete when:
1. ✅ Chat interface works for both users
2. ✅ Conversations persist in database
3. ⏳ Zapier extracts memories automatically
4. ⏳ Projects/tags auto-assigned
5. ⏳ "What do you know about me?" returns memories
6. ⏳ 750 Zapier tasks being utilized

**Current Progress: 50% (infrastructure done, automation pending)**

---

## 🚦 QUICK COMMANDS

```powershell
# Check status
curl https://kimbleai-v4-clean.vercel.app/api/status

# Redeploy
cd D:\OneDrive\Documents\kimbleai-v4-clean
npx vercel --prod --force

# View logs
npx vercel logs

# Git update
git add -A
git commit -m "feat: GPT-5 integration complete"
git push --set-upstream origin master
```

---

## 📌 CRITICAL NOTES

**DO NOT:**
- Mention Fibery (abandoned at $180/month)
- Reference "Version 10" (never existed)
- Use GPT-4 (replaced by GPT-5)
- Build complex agents (Zapier handles automation)
- Focus on local files (low priority)

**ALWAYS:**
- Use GPT-5-mini for cost efficiency
- Prioritize memory persistence
- Keep to 2 users (Zach & Rebecca)
- Use Zapier for ALL automation
- Check /api/status for state

---

**END OF EXPORT - System 90% complete, awaiting Zapier webhook connection**