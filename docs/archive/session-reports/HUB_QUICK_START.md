# Integration Hub - Quick Start Guide

## 🚀 Quick Setup

### 1. Database Setup
Run the schema to create all necessary tables:
```bash
# In Supabase SQL Editor, run:
database/integration-hub-schema.sql
```

This creates:
- `platform_connections` - Store platform API keys and settings
- `platform_sync_logs` - Track sync history
- `cross_platform_references` - Link content across platforms
- `unified_search_index` - Universal search index
- `imported_conversations` - Imported content storage
- `platform_activity_feed` - Activity tracking
- `platform_usage_stats` - Usage metrics

### 2. Environment Variables
Ensure these are set in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_key
```

### 3. Access the Hub
Navigate to: `http://localhost:3000/hub`

## 📍 Navigation

### Main Pages
- **Hub Dashboard:** `/hub` - Central command center
- **Universal Search:** `/hub/search` - Search all platforms
- **Import Data:** `/hub/import` - Import conversations
- **Settings:** `/hub/settings` - Manage connections
- **Knowledge Graph:** `/hub/graph` - Visualize relationships

### Quick Actions
From any hub page, use the header buttons:
- 🔍 **Search** - Jump to universal search
- ⬆️ **Import** - Start importing data
- ⚙️ **Settings** - Manage platforms
- 🔄 **Refresh** - Update data

## 🎯 Common Tasks

### Import ChatGPT Conversations

1. **Export from ChatGPT:**
   - Go to ChatGPT → Settings → Data Controls
   - Click "Export data"
   - Wait for email with download link
   - Download and extract ZIP
   - Locate `conversations.json`

2. **Import to Hub:**
   - Navigate to `/hub/import`
   - Drag `conversations.json` onto the page
   - Configure options:
     - ✅ Generate embeddings (for search)
     - ✅ Upload to Drive (backup)
     - ✅ Detect duplicates
   - Click "Import All Files"
   - Wait for completion (5-10 seconds per 1000 conversations)

3. **Verify Import:**
   - Check import statistics
   - Go to `/hub/search`
   - Search for a topic from your ChatGPT history
   - Results should appear!

### Search Across All Platforms

1. **Navigate to Search:**
   - Click "Universal Search" from hub dashboard
   - Or go directly to `/hub/search`

2. **Enter Your Query:**
   - Type what you're looking for
   - Example: "machine learning tutorial"

3. **Apply Filters (Optional):**
   - Click "Filters" button
   - Select platforms: ChatGPT, KimbleAI, etc.
   - Choose content types: Conversations, Files, etc.
   - Set date range
   - Adjust similarity threshold (70% recommended)

4. **View Results:**
   - Results ranked by relevance
   - See match percentage
   - Click to view in source platform

### Connect a New Platform

1. **Go to Settings:**
   - Navigate to `/hub/settings`

2. **Add Platform:**
   - Scroll to "Connected Platforms"
   - Click "Connect" on desired platform
   - Enter API credentials (if required)

3. **Configure Sync:**
   - Select sync schedule:
     - Manual only
     - Every 5/15 minutes
     - Hourly
     - Daily
   - Toggle sync on/off
   - Save settings

4. **Verify Connection:**
   - Return to hub dashboard (`/hub`)
   - Check platform card shows "Connected" status

### View Knowledge Graph

1. **Navigate to Graph:**
   - Go to `/hub/graph`

2. **Explore Connections:**
   - View nodes (conversations, files, tags, platforms)
   - Click nodes to see details
   - Colored by type:
     - 🟣 Purple: Conversations
     - 🔵 Blue: Files
     - 🟢 Green: Tags
     - 🟠 Orange: Platforms

3. **Apply Filters:**
   - Toggle node types on/off
   - Adjust minimum connections
   - Focus on specific relationships

4. **Export Data:**
   - Click "Export" button
   - Download graph as JSON
   - Use for external analysis

## 🔧 Troubleshooting

### No Search Results?
- ✅ Check embeddings were generated during import
- ✅ Lower similarity threshold to 60-70%
- ✅ Remove all filters to search everything
- ✅ Verify data exists in unified_search_index table

### Import Failed?
- ✅ Check file is valid JSON
- ✅ Verify file format matches expected structure
- ✅ File size under 50MB
- ✅ Review error message for details
- ✅ Try smaller batch if large dataset

### Platform Shows Offline?
- ✅ Verify API credentials in settings
- ✅ Check network connectivity
- ✅ Review sync logs for errors
- ✅ Re-authenticate if needed
- ✅ Check platform's actual status

### Slow Performance?
- ✅ Ensure database indexes are built
- ✅ Check HNSW indexes on vector columns
- ✅ Reduce result limit
- ✅ Optimize similarity threshold
- ✅ Review database performance

## 📊 Features Overview

### 1. Unified Dashboard (`/hub`)
- View all connected platforms
- See platform status (green/yellow/red)
- Check recent activity
- Quick actions to search, import, settings

### 2. Universal Search (`/hub/search`)
- Search across ALL platforms
- Semantic AI-powered search
- Filter by platform, content type, date
- Adjustable similarity threshold
- Sub-second results

### 3. Import System (`/hub/import`)
- Drag-and-drop upload
- Multiple file formats:
  - ChatGPT JSON
  - Claude Projects
  - Notion Markdown
  - Google Docs
  - Plain text/Markdown
- Automatic deduplication
- Embedding generation
- Google Drive backup

### 4. Platform Status Monitor
- Real-time health monitoring
- API connectivity status
- Sync schedules and logs
- Error tracking
- Response times
- Uptime percentage

### 5. Settings (`/hub/settings`)
- Manage platform connections
- Configure sync schedules
- Set data retention policies
- Notification preferences
- Import/export settings

### 6. Knowledge Graph (`/hub/graph`)
- Interactive visualization
- Node connections
- Tag relationships
- Platform links
- Export capabilities

## 🎨 Platform Colors

- **KimbleAI:** 🟣 Purple
- **Claude Projects:** 🔵 Blue
- **ChatGPT:** 🟦 Teal
- **Google Workspace:** 🌈 Multi-color
- **MCP Servers:** 🟠 Orange
- **Notion:** ⬛ Gray
- **GitHub:** ⬛ Black/Slate
- **Slack:** 💜 Purple/Pink

## 💡 Pro Tips

### Search Tips
1. Use specific keywords for better results
2. Start with 70% similarity threshold
3. Filter by platform to narrow scope
4. Use date ranges for recent content
5. Check multiple content types

### Import Tips
1. Import in batches of 1000-5000 items
2. Always enable embeddings for searchability
3. Use duplicate detection to avoid redundancy
4. Back up to Drive for safety
5. Review statistics after import

### Performance Tips
1. Regular database maintenance
2. Monitor sync schedules
3. Clean up old data periodically
4. Optimize retention policies
5. Review error logs weekly

### Organization Tips
1. Use consistent tagging
2. Categorize by project/topic
3. Link related conversations
4. Archive old content
5. Export important data

## 📚 API Endpoints

### Get Platform Stats
```
GET /api/hub/stats
```
Returns all platform cards with status

### Get Recent Activity
```
GET /api/hub/activity?limit=20
```
Returns recent activity feed

### Universal Search
```
POST /api/hub/search
Body: { query, platforms, contentTypes, minSimilarity }
```
Search across all platforms

### Import Data
```
POST /api/hub/import
Body: FormData with file and options
```
Import conversations from file

### Get Platforms
```
GET /api/hub/platforms
```
List all platform connections

### Get Graph Data
```
GET /api/hub/graph
```
Get knowledge graph nodes and edges

## 🔐 Security Notes

- All data is user-scoped with RLS
- API keys are encrypted
- Sessions validated server-side
- HTTPS required for production
- Regular security audits recommended

## 📞 Support

For issues or questions:
1. Check troubleshooting section above
2. Review INTEGRATION_HUB_REPORT.md
3. Check database logs
4. Review API error messages
5. Contact system administrator

## 🎓 Next Steps

After setup:
1. ✅ Import your ChatGPT history
2. ✅ Try universal search
3. ✅ Explore knowledge graph
4. ✅ Configure platform connections
5. ✅ Set up sync schedules
6. ✅ Customize retention policies
7. ✅ Enable notifications
8. ✅ Regular monitoring

---

**Last Updated:** October 27, 2025
**Version:** 1.0.0
**Status:** Ready for Use ✅
