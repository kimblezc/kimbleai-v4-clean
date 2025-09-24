# KimbleAI v4 Clean - Claude Code Development Workflow
# =======================================================

## QUICK START WITH CLAUDE CODE

### 1. SET UP YOUR API KEY (One-time setup)
```powershell
# In PowerShell (run as admin)
[Environment]::SetEnvironmentVariable("ANTHROPIC_API_KEY", "your-api-key-here", "User")
```

### 2. START DEVELOPMENT SESSION
```powershell
cd C:\Users\zachk\OneDrive\Documents\kimbleai-v4-clean

# Start Claude Code with your project context
npx @anthropic-ai/claude-code "Continue developing the cross-platform chat AI with these requirements:
- PC, Mac, Android, iPhone compatibility
- 2 users with shared memory
- Reference all previous conversations
- Google Drive and Gmail integration
- Local file access
- Maximum automation
- Fix TypeScript errors without removing features"
```

## ITERATIVE TESTING COMMANDS

### Backend Testing
```powershell
# Test backend API endpoints
npx claude-code "Test all backend routes in backend/src/routes and fix any errors. Run automated tests and ensure all services are working."

# Test memory system
npx claude-code "Test the conversation memory system. Verify it stores and retrieves past conversations correctly."

# Test Google integration
npx claude-code "Test Google Drive and Gmail integration. Verify OAuth flow and API connections."
```

### Frontend Testing
```powershell
# Test UI components
npx claude-code "Test all React components in frontend/src. Fix TypeScript errors and ensure proper rendering."

# Test cross-platform compatibility
npx claude-code "Test the frontend on different screen sizes. Ensure responsive design works."

# Test real-time features
npx claude-code "Test WebSocket connections for real-time chat. Verify message synchronization between users."
```

## DEBUG WORKFLOWS

### Fix TypeScript Errors
```powershell
npx claude-code "Find and fix all TypeScript errors in the project. Do not remove features - fix them properly."
```

### Fix API Errors
```powershell
npx claude-code "Debug API connection errors. Check backend/frontend communication and fix CORS issues."
```

### Fix Build Errors
```powershell
npx claude-code "Fix all build errors. Ensure both backend and frontend compile without warnings."
```

## AUTOMATED TESTING SUITE

### Create Test Suite
```powershell
npx claude-code "Create comprehensive test suite for:
1. User authentication
2. Message storage and retrieval
3. File upload/download
4. Google Drive integration
5. Cross-user communication
6. Memory system"
```

### Run Tests
```powershell
npx claude-code "Run all tests and fix failing ones. Generate coverage report."
```

## FEATURE IMPLEMENTATION

### Add New Feature
```powershell
npx claude-code "Implement [FEATURE_NAME] with full error handling and tests"
```

### Enhance Existing Feature
```powershell
npx claude-code "Improve [FEATURE_NAME] performance and add better error handling"
```

## DEPLOYMENT PREPARATION

### Production Build
```powershell
npx claude-code "Prepare production build. Optimize performance, minify code, and ensure all environment variables are set."
```

### Security Audit
```powershell
npx claude-code "Perform security audit. Check for vulnerabilities and fix them."
```

## COMMON ISSUES AND FIXES

### Issue: "Cannot find module"
```powershell
npx claude-code "Fix all missing module errors. Install required dependencies."
```

### Issue: "TypeScript error"
```powershell
npx claude-code "Fix TypeScript configuration and resolve all type errors."
```

### Issue: "API not responding"
```powershell
npx claude-code "Debug API endpoints. Check server logs and fix connection issues."
```

## GIT WORKFLOW INTEGRATION

### Auto-commit after fixes
```powershell
npx claude-code "Fix all current errors, test the fixes, then commit with descriptive message"
```

### Review changes before commit
```powershell
npx claude-code "Show me all changes made, run tests, then prepare commit"
```

## MONITORING AND LOGGING

### Add comprehensive logging
```powershell
npx claude-code "Add detailed logging to all API endpoints and critical functions"
```

### Set up error tracking
```powershell
npx claude-code "Implement error tracking and reporting system"
```

## BEST PRACTICES

1. **Always test after changes**
   ```powershell
   npx claude-code "Make changes to [FEATURE], test thoroughly, commit if tests pass"
   ```

2. **Document as you go**
   ```powershell
   npx claude-code "Update documentation for all recent changes"
   ```

3. **Regular dependency updates**
   ```powershell
   npx claude-code "Check for outdated packages, update safely, test everything"
   ```

## PROJECT-SPECIFIC COMMANDS

### Full System Test
```powershell
npx claude-code "Run full system test:
1. Start backend and frontend
2. Create 2 test users
3. Test chat between users
4. Upload file to Google Drive
5. Retrieve file in chat
6. Test memory recall
7. Verify cross-platform access"
```

### Daily Development Routine
```powershell
npx claude-code "Start daily development:
1. Check git status
2. Pull latest changes
3. Install any new dependencies
4. Run tests
5. Fix any failing tests
6. Start dev servers
7. Open browser for testing"
```

## TROUBLESHOOTING

If Claude Code isn't working:
```powershell
# Reinstall
npm uninstall -g @anthropic-ai/claude-code
npm install -g @anthropic-ai/claude-code

# Or use npx directly (no install needed)
npx @anthropic-ai/claude-code@latest "your command here"
```

## NOTES
- Claude Code will read your files and understand context
- It can make multiple file changes at once
- Always review changes before committing
- Use specific, detailed prompts for best results
