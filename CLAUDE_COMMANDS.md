# CLAUDE CODE COMMANDS FOR KIMBLEAI PROJECT

## 🎯 COMPLETE YOUR REMAINING GOALS

### 1. ADD GOOGLE INTEGRATION (Your #1 Priority)
```bash
npx claude "Add complete Google OAuth integration to kimbleai-v4-clean. Create /app/api/auth/[...nextauth]/route.ts with NextAuth configuration for Google provider. Add Drive and Gmail scopes. Create /app/api/google/drive/route.ts to search Google Drive files and /app/api/google/gmail/route.ts to search Gmail. The Supabase database already has a user_tokens table ready. Environment variables for Google are in place."
```

### 2. FIX PDF SUPPORT
```bash
npx claude "In kimbleai-v4-clean, replace pdf-parse with pdfjs-dist in /app/api/upload/route.ts. Implement PDF text extraction that works with Next.js build process and saves the extracted text to the indexed_files table in Supabase"
```

### 3. IMPROVE PROJECT ORGANIZATION
```bash
npx claude "Update kimbleai-v4-clean to show a project dashboard. Group all conversations by project in the sidebar with collapsible sections. Show message count, last updated, and tags for each project. Add a quick filter to show only conversations from a specific project."
```

## 🚀 ENHANCEMENT COMMANDS

### 4. ADD EXPORT FUNCTIONALITY
```bash
npx claude "Add export functionality to kimbleai-v4-clean. Create an API endpoint /api/export that allows exporting conversations as Markdown, JSON, or PDF. Add export buttons in the UI for individual conversations and bulk export for all conversations in a project."
```

### 5. ADD SEARCH & FILTERS
```bash
npx claude "Add advanced search to kimbleai-v4-clean. Create a search bar that searches across all conversations, knowledge base, and uploaded files. Add filters for date range, project, tags, and user. Highlight search results in the conversation view."
```

### 6. ADD ANALYTICS DASHBOARD
```bash
npx claude "Create an analytics dashboard for kimbleai-v4-clean at /app/analytics/page.tsx. Show total messages per user, most active projects, tag cloud, conversation trends over time using recharts, and knowledge base growth. Pull data from Supabase tables."
```

### 7. IMPROVE MOBILE RESPONSIVENESS
```bash
npx claude "Make kimbleai-v4-clean fully responsive for mobile devices. Add a hamburger menu for the sidebar, make the chat input touch-friendly, optimize button sizes for touch, and ensure all features work on iPhone and Android browsers."
```

### 8. ADD CONVERSATION TEMPLATES
```bash
npx claude "Add conversation templates to kimbleai-v4-clean. Create templates for common tasks like 'Project Planning', 'Meeting Notes', 'Research', etc. Store templates in a new Supabase table and add a template selector when starting new conversations."
```

## 🔧 DEBUGGING & OPTIMIZATION

### 9. OPTIMIZE VECTOR SEARCH
```bash
npx claude "Optimize the vector search in kimbleai-v4-clean/app/api/chat/route.ts. Improve relevance scoring to prioritize recent memories, add semantic caching to reduce API calls, and implement better context window management for long conversations."
```

### 10. ADD COMPREHENSIVE ERROR HANDLING
```bash
npx claude "Add robust error handling throughout kimbleai-v4-clean. Implement retry logic for failed API calls, add user-friendly error messages, create an error boundary component, and log errors to a Supabase table for debugging."
```

### 11. ADD REAL-TIME COLLABORATION
```bash
npx claude "Add real-time collaboration to kimbleai-v4-clean using Supabase Realtime. When Zach and Rebecca are in the same conversation, show typing indicators, sync messages instantly, and add presence indicators showing who's online."
```

### 12. CREATE TEST SUITE
```bash
npx claude "Create a comprehensive test suite for kimbleai-v4-clean. Write Jest tests for the chat API, memory persistence, user isolation, file upload, and vector search. Add Cypress E2E tests for critical user flows."
```

## 💡 ADVANCED FEATURES

### 13. ADD VOICE INPUT/OUTPUT
```bash
npx claude "Add voice capabilities to kimbleai-v4-clean using the Web Speech API. Add a microphone button for voice input with speech-to-text, and a speaker button to read AI responses aloud using text-to-speech."
```

### 14. ADD SCHEDULED TASKS
```bash
npx claude "Add scheduled tasks to kimbleai-v4-clean. Create a system for scheduling reminders and follow-ups. Store scheduled tasks in Supabase and add a cron job API endpoint to process them."
```

### 15. ADD KNOWLEDGE GRAPH VISUALIZATION
```bash
npx claude "Create a knowledge graph visualization for kimbleai-v4-clean at /app/knowledge/page.tsx. Use D3.js or React Flow to visualize connections between conversations, projects, tags, and extracted knowledge. Make nodes clickable to view details."
```

## 🏃 QUICK FIXES

### 16. FIX MEMORY RETRIEVAL PRIORITY
```bash
npx claude "In kimbleai-v4-clean, modify the memory retrieval to prioritize: 1) Recent messages (last 7 days), 2) High-importance facts, 3) Project-specific context. The current system retrieves everything equally."
```

### 17. ADD DARK/LIGHT MODE TOGGLE
```bash
npx claude "Add a dark/light mode toggle to kimbleai-v4-clean. Store the preference in localStorage and apply the theme using CSS variables. The current theme is dark, create a light theme option."
```

### 18. ADD MARKDOWN SUPPORT IN MESSAGES
```bash
npx claude "Add full Markdown rendering support to kimbleai-v4-clean messages. Use react-markdown to render formatted text, code blocks with syntax highlighting, tables, and links. Ensure safe rendering to prevent XSS."
```

## 🎯 COMPLETE PROJECT IN 3 COMMANDS

### COMMAND 1: Fix Everything Broken
```bash
npx claude "In kimbleai-v4-clean: 1) Fix PDF upload using pdfjs-dist, 2) Fix project sidebar to group conversations properly, 3) Add loading states for all async operations"
```

### COMMAND 2: Add Google Integration
```bash
npx claude "Add complete Google OAuth to kimbleai-v4-clean with NextAuth. Implement Drive search and Gmail search APIs. Use the existing user_tokens table in Supabase to store OAuth tokens."
```

### COMMAND 3: Polish & Deploy
```bash
npx claude "In kimbleai-v4-clean: 1) Add export to PDF/Markdown, 2) Make fully mobile responsive, 3) Add search filters, 4) Create a help modal explaining features"
```

## 📝 TIPS FOR CLAUDE CODE

1. **Be Specific**: Include file paths and table names
2. **Provide Context**: Mention existing code/tables
3. **Request Tests**: Ask Claude to write tests too
4. **Iterate**: Use `--continue` to refine solutions
5. **Check Changes**: Use `git diff` after Claude edits

## 🚨 MOST IMPORTANT COMMANDS FOR YOU RIGHT NOW

```bash
# 1. Complete Google Integration (YOUR BIGGEST GAP)
npx claude "Implement Google OAuth with NextAuth in kimbleai-v4-clean, adding Drive and Gmail search capabilities"

# 2. Fix PDF Support (USERS NEED THIS)
npx claude "Fix PDF text extraction in kimbleai-v4-clean using pdfjs-dist"

# 3. Add Export (BACKUP YOUR DATA)
npx claude "Add conversation export to Markdown and JSON in kimbleai-v4-clean"
```

Remember: Claude can see your entire project structure and will write code that fits perfectly with your existing implementation!