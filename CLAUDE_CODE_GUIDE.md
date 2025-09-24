# CLAUDE CODE USAGE EXAMPLES FOR KIMBLEAI

## 1. ADDING GOOGLE INTEGRATION
```bash
# Claude Code can write the entire OAuth flow for you
claude-code "Add Google OAuth2 authentication to my Next.js app at D:\OneDrive\Documents\kimbleai-v4-clean with Drive and Gmail scopes"

# It would generate:
# - /app/api/auth/[...nextauth]/route.ts
# - /app/api/google/drive/route.ts  
# - /app/api/google/gmail/route.ts
# - OAuth configuration files
```

## 2. FIXING PDF SUPPORT
```bash
# Have Claude Code fix your PDF parsing
claude-code "Replace pdf-parse with pdfjs-dist in D:\OneDrive\Documents\kimbleai-v4-clean\app\api\upload\route.ts and handle PDF text extraction"
```

## 3. PROJECT ORGANIZATION FEATURES
```bash
# Add project management features
claude-code "Add a project dashboard that shows conversation statistics grouped by project with charts using recharts to D:\OneDrive\Documents\kimbleai-v4-clean"
```

## 4. DEBUGGING MEMORY ISSUES
```bash
# Debug why certain memories aren't persisting
claude-code "Debug why cross-conversation memory sometimes doesn't retrieve all messages in D:\OneDrive\Documents\kimbleai-v4-clean\app\api\chat\route.ts"
```

## 5. TESTING AUTOMATION
```bash
# Generate comprehensive tests
claude-code "Write Jest tests for the RAG system and memory persistence in my kimbleai project"
```

## ACTUAL COMMANDS TO RUN NOW:

### Fix Projects UI:
```bash
claude-code "Update D:\OneDrive\Documents\kimbleai-v4-clean\app\page.tsx to use the new ProjectSidebar component and organize conversations by project"
```

### Add Google Integration:
```bash
claude-code "Add complete Google OAuth with NextAuth.js to kimbleai-v4-clean including Drive file search and Gmail message search"
```

### Improve Memory System:
```bash
claude-code "Optimize the vector search in kimbleai-v4-clean to prioritize recent memories and improve relevance scoring"
```

## WHY CLAUDE CODE IS PERFECT FOR YOUR PROJECT:

1. **It Understands Context**: Unlike ChatGPT, Claude Code can read your entire project structure
2. **Direct File Editing**: It modifies files directly, no copy-paste
3. **Testing Built-in**: It can run tests after making changes
4. **Git Integration**: Automatically commits changes with good messages
5. **No Token Limits**: Handles large codebases better

## COMPARISON:

| Task | Without Claude Code | With Claude Code |
|------|-------------------|-----------------|
| Add Google OAuth | 4-6 hours manual coding | `claude-code "add google oauth"` - 30 mins |
| Fix PDF parsing | 1-2 hours debugging | `claude-code "fix pdf parsing"` - 15 mins |
| Write tests | 2-3 hours | `claude-code "write tests"` - 20 mins |
| Debug memory | Hours of console.log | `claude-code "debug memory"` - Gets it right |

## INSTALL AND TRY:
```bash
# Install
npm install -g @anthropic-ai/claude-code

# Authenticate (needs Anthropic API key)
claude-code auth

# Try your first command
claude-code "Show me all the places in kimbleai-v4-clean where projects and tags are referenced"
```

## FOR YOUR SPECIFIC REQUEST:
```bash
# Fix the project/tag organization right now
claude-code "In D:\OneDrive\Documents\kimbleai-v4-clean, reorganize the UI to show conversations grouped by project in the left sidebar with tags as filters, emphasizing which chats belong to which project"
```