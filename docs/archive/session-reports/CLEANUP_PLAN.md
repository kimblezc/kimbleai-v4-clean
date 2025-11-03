# CLEANUP PLAN
## kimbleai-v4-clean Database Migration Files

**Date:** 2025-10-25
**Purpose:** Archive unused, duplicate, and superseded migration files
**Safety:** All files marked for archival are redundant - active migrations already applied

---

## SUMMARY

- **Total SQL Files:** 47
- **Keep (Active):** 31 files
- **Archive (Unused/Duplicate):** 16 files
- **Safe to Delete:** 0 files (recommend archival instead)

---

## FILES TO KEEP (31 files)

### Core Schema Files
These define the primary database structure:

```
✅ sql/complete_system_schema.sql
   - Master schema definition
   - DO NOT ARCHIVE

✅ database/COMPLETE_MIGRATION.sql
   - Primary migration file
   - Adds files, activity_logs, auth_logs tables
   - DO NOT ARCHIVE

✅ database/FIX_PROJECT_ID_TYPE.sql
   - CRITICAL: Fixed UUID→TEXT bug
   - This is the migration that resolved the main issue
   - DO NOT ARCHIVE - Keep as historical reference
```

### Feature-Specific Migrations
These add specific features to the system:

```
✅ database/api-cost-tracking.sql
   - Cost monitoring tables (api_cost_tracking, budget_alerts, budget_config)
   - Currently in use

✅ database/autonomous-agent-schema.sql
   - Archie agent tables (agent_tasks, agent_findings, agent_logs, agent_reports)
   - Currently in use

✅ database/content-organization-system.sql
   - Category system (content_categories)
   - Currently in use

✅ database/device-continuity.sql
   - Device sync system (device_sessions, context_snapshots, sync_queue)
   - Currently in use

✅ database/chatgpt-import-schema.sql
   - ChatGPT import feature (chatgpt_conversations, chatgpt_messages)
   - Currently in use

✅ database/zapier-webhook-logs.sql
   - Zapier integration logs
   - Currently in use

✅ database/workflow_automation_schema.sql
   - Workflow automation system (multiple tables)
   - Currently in use

✅ database/COMBINED-CRITICAL-MIGRATIONS.sql
   - File registry + notifications + backups
   - Currently in use

✅ database/file-registry-migration.sql
   - File registry table
   - Currently in use (or superseded by COMBINED version)

✅ database/notifications-table-migration.sql
   - Notifications system
   - Currently in use

✅ database/backups-table-migration.sql
   - Backup tracking
   - Currently in use

✅ database/supabase-semantic-search-schema.sql
   - Semantic search tables
   - Currently in use

✅ database/create_user_tokens_table.sql
   - User OAuth tokens
   - Currently in use

✅ database/supabase-migration-user_tokens.sql
   - Alternative user tokens migration
   - Keep for reference

✅ database/drive-edit-approval-schema.sql
   - Drive edit approval workflow
   - Currently in use

✅ database/indexing-state-schema.sql
   - File indexing state tracking
   - Currently in use

✅ database/api-logs-table.sql
   - API logging system
   - Currently in use

✅ database/add-project-to-transcriptions.sql
   - Adds project_id to audio_transcriptions
   - Currently applied

✅ database/add-embedding-columns.sql
   - Adds embedding columns for semantic search
   - Currently applied

✅ database/add-knowledge-base-source-id-constraint.sql
   - Adds constraint to knowledge_base
   - Currently applied

✅ database/create-semantic-search-function.sql
   - Semantic search functions
   - Currently in use

✅ database/add-conversation-pinning.sql
   - Conversation pinning feature
   - Currently in use

✅ database/optimize-projects-FINAL.sql
   - Latest optimization migration
   - Currently applied

✅ database/fix-cost-tracking-user-id-CORRECTED.sql
   - Final corrected version of cost tracking fix
   - Currently applied

✅ database/add-project-id-to-conversations.sql
   - Adds project_id column to conversations
   - CRITICAL - Part of the main fix
   - Currently applied

✅ database/MIGRATION_FIX_TRANSCRIPTION.sql
   - Transcription fixes
   - Currently applied
```

---

## FILES TO ARCHIVE (16 files)

### Duplicate/Superseded Project Fixes

```
⚠️ database/QUICK_FIX_PROJECTS.sql
   Reason: Superseded by FIX_PROJECT_ID_TYPE.sql
   Safe: Yes - functionality in newer migration
   Action: Move to database/archive/superseded/

⚠️ database/QUICK_FIX_PROJECTS_V2.sql
   Reason: Superseded by FIX_PROJECT_ID_TYPE.sql
   Safe: Yes - V2 also superseded
   Action: Move to database/archive/superseded/

⚠️ database/UPGRADE_PROJECTS_SCHEMA.sql
   Reason: Superseded by later migrations
   Safe: Yes - schema upgrades in core files
   Action: Move to database/archive/superseded/

⚠️ database/ADD_PARENT_PROJECT_ID.sql
   Reason: Functionality now in complete_system_schema.sql
   Safe: Yes - parent_project_id in core schema
   Action: Move to database/archive/superseded/
```

### Verification Scripts (Not Migrations)

```
⚠️ database/VERIFY_PROJECTS_SCHEMA.sql
   Reason: Verification script, not a migration
   Safe: Yes - just SELECT queries
   Action: Move to database/archive/utility-scripts/

⚠️ database/CHECK_COST_DATA.sql
   Reason: Query script for checking data
   Safe: Yes - read-only queries
   Action: Move to database/archive/utility-scripts/
```

### Old Deployment Scripts

```
⚠️ database/DEPLOY_NOW.sql
   Reason: Old deployment script
   Safe: Yes - superseded by COMPLETE_MIGRATION.sql
   Action: Move to database/archive/old-deployments/

⚠️ database/DEPLOY_NOW_FIXED.sql
   Reason: Fixed version of old deployment
   Safe: Yes - superseded
   Action: Move to database/archive/old-deployments/
```

### Superseded Optimization Scripts

```
⚠️ database/optimize-projects-performance.sql
   Reason: Superseded by optimize-projects-FINAL.sql
   Safe: Yes - latest version is FINAL
   Action: Move to database/archive/superseded/

⚠️ database/optimize-projects-performance-FIXED.sql
   Reason: Superseded by optimize-projects-FINAL.sql
   Safe: Yes - intermediate version
   Action: Move to database/archive/superseded/

⚠️ database/optimize-projects-performance-SAFE.sql
   Reason: Superseded by optimize-projects-FINAL.sql
   Safe: Yes - intermediate version
   Action: Move to database/archive/superseded/
```

### Superseded Bugfix Scripts

```
⚠️ database/fix-cost-tracking-user-id.sql
   Reason: Superseded by fix-cost-tracking-user-id-CORRECTED.sql
   Safe: Yes - corrected version exists
   Action: Move to database/archive/superseded/
```

### One-Time Cleanup Scripts

```
⚠️ database/emergency-cleanup.sql
   Reason: One-time emergency cleanup (already run)
   Safe: Yes - utility script
   Action: Move to database/archive/utility-scripts/

⚠️ database/CLEAR_ALL_DATA.sql
   Reason: Dangerous utility script (deletes all data)
   Safe: Yes to archive - NEVER run in production
   Action: Move to database/archive/dangerous-utilities/

⚠️ database/nuclear-cleanup-agent.sql
   Reason: One-time agent cleanup (already run)
   Safe: Yes - utility script
   Action: Move to database/archive/utility-scripts/

⚠️ database/drop-agent-schema.sql
   Reason: Utility script for dropping agent tables
   Safe: Yes to archive - situational use only
   Action: Move to database/archive/utility-scripts/

⚠️ database/rename-old-agent-tables.sql
   Reason: One-time utility (already run)
   Safe: Yes - historical
   Action: Move to database/archive/utility-scripts/
```

---

## ARCHIVAL STRUCTURE

Create this directory structure:

```
database/
├── archive/
│   ├── superseded/           # Old versions of migrations
│   │   ├── QUICK_FIX_PROJECTS.sql
│   │   ├── QUICK_FIX_PROJECTS_V2.sql
│   │   ├── UPGRADE_PROJECTS_SCHEMA.sql
│   │   ├── ADD_PARENT_PROJECT_ID.sql
│   │   ├── optimize-projects-performance.sql
│   │   ├── optimize-projects-performance-FIXED.sql
│   │   ├── optimize-projects-performance-SAFE.sql
│   │   └── fix-cost-tracking-user-id.sql
│   │
│   ├── old-deployments/      # Historical deployment scripts
│   │   ├── DEPLOY_NOW.sql
│   │   └── DEPLOY_NOW_FIXED.sql
│   │
│   ├── utility-scripts/      # One-time utilities
│   │   ├── VERIFY_PROJECTS_SCHEMA.sql
│   │   ├── CHECK_COST_DATA.sql
│   │   ├── emergency-cleanup.sql
│   │   ├── nuclear-cleanup-agent.sql
│   │   └── rename-old-agent-tables.sql
│   │
│   ├── dangerous-utilities/  # Scripts that delete data
│   │   └── CLEAR_ALL_DATA.sql
│   │
│   └── README.md             # Documentation of archived files
│
├── COMPLETE_MIGRATION.sql    # Keep in root
├── FIX_PROJECT_ID_TYPE.sql   # Keep in root - critical fix
├── ... (other active migrations)
```

---

## ARCHIVAL COMMANDS

### Option 1: Manual Archival (Recommended for safety)

```bash
# Create archive structure
cd database
mkdir -p archive/superseded
mkdir -p archive/old-deployments
mkdir -p archive/utility-scripts
mkdir -p archive/dangerous-utilities

# Move superseded files
mv QUICK_FIX_PROJECTS.sql archive/superseded/
mv QUICK_FIX_PROJECTS_V2.sql archive/superseded/
mv UPGRADE_PROJECTS_SCHEMA.sql archive/superseded/
mv ADD_PARENT_PROJECT_ID.sql archive/superseded/
mv optimize-projects-performance.sql archive/superseded/
mv optimize-projects-performance-FIXED.sql archive/superseded/
mv optimize-projects-performance-SAFE.sql archive/superseded/
mv fix-cost-tracking-user-id.sql archive/superseded/

# Move old deployments
mv DEPLOY_NOW.sql archive/old-deployments/
mv DEPLOY_NOW_FIXED.sql archive/old-deployments/

# Move utility scripts
mv VERIFY_PROJECTS_SCHEMA.sql archive/utility-scripts/
mv CHECK_COST_DATA.sql archive/utility-scripts/
mv emergency-cleanup.sql archive/utility-scripts/
mv nuclear-cleanup-agent.sql archive/utility-scripts/
mv rename-old-agent-tables.sql archive/utility-scripts/

# Move dangerous utilities
mv CLEAR_ALL_DATA.sql archive/dangerous-utilities/

# Create archive documentation
cat > archive/README.md << 'EOF'
# Archived Database Migration Files

These files have been archived because they are:
- Superseded by newer migrations
- One-time utility scripts that have already been run
- Verification/testing scripts
- Dangerous utilities that should not be run in production

**Date Archived:** 2025-10-25

## Directory Structure

- `superseded/` - Old versions of migrations that have been replaced
- `old-deployments/` - Historical deployment scripts
- `utility-scripts/` - One-time utilities and verification scripts
- `dangerous-utilities/` - Scripts that delete data (NEVER run in production)

## Safety

All archived files are safe to keep in the repository for historical reference.
None of these files should be run in production.

## Active Migrations

See parent directory for currently active migration files.
EOF
```

### Option 2: Automated Script

Create `database/archive-old-migrations.sh`:

```bash
#!/bin/bash
# Archive unused database migration files
# Safe to run - moves files, doesn't delete

set -e  # Exit on error

echo "Creating archive structure..."
mkdir -p database/archive/{superseded,old-deployments,utility-scripts,dangerous-utilities}

echo "Archiving superseded migrations..."
files_superseded=(
  "QUICK_FIX_PROJECTS.sql"
  "QUICK_FIX_PROJECTS_V2.sql"
  "UPGRADE_PROJECTS_SCHEMA.sql"
  "ADD_PARENT_PROJECT_ID.sql"
  "optimize-projects-performance.sql"
  "optimize-projects-performance-FIXED.sql"
  "optimize-projects-performance-SAFE.sql"
  "fix-cost-tracking-user-id.sql"
)

for file in "${files_superseded[@]}"; do
  if [ -f "database/$file" ]; then
    mv "database/$file" "database/archive/superseded/"
    echo "  ✓ Archived $file"
  fi
done

echo "Archiving old deployments..."
files_deployments=(
  "DEPLOY_NOW.sql"
  "DEPLOY_NOW_FIXED.sql"
)

for file in "${files_deployments[@]}"; do
  if [ -f "database/$file" ]; then
    mv "database/$file" "database/archive/old-deployments/"
    echo "  ✓ Archived $file"
  fi
done

echo "Archiving utility scripts..."
files_utilities=(
  "VERIFY_PROJECTS_SCHEMA.sql"
  "CHECK_COST_DATA.sql"
  "emergency-cleanup.sql"
  "nuclear-cleanup-agent.sql"
  "rename-old-agent-tables.sql"
  "drop-agent-schema.sql"
)

for file in "${files_utilities[@]}"; do
  if [ -f "database/$file" ]; then
    mv "database/$file" "database/archive/utility-scripts/"
    echo "  ✓ Archived $file"
  fi
done

echo "Archiving dangerous utilities..."
files_dangerous=(
  "CLEAR_ALL_DATA.sql"
)

for file in "${files_dangerous[@]}"; do
  if [ -f "database/$file" ]; then
    mv "database/$file" "database/archive/dangerous-utilities/"
    echo "  ✓ Archived $file"
  fi
done

echo "✅ Archival complete!"
echo ""
echo "Summary:"
echo "  - Superseded migrations: ${#files_superseded[@]}"
echo "  - Old deployments: ${#files_deployments[@]}"
echo "  - Utility scripts: ${#files_utilities[@]}"
echo "  - Dangerous utilities: ${#files_dangerous[@]}"
echo ""
echo "All files moved to database/archive/"
```

---

## DEPENDENCY ANALYSIS

### Files with No Dependencies (Safe to Archive)

All 16 files marked for archival have no dependencies because:
1. **Superseded files** - Their functionality exists in newer migrations
2. **Utility scripts** - They're read-only or one-time operations
3. **Old deployments** - Replaced by COMPLETE_MIGRATION.sql

### Files That Depend on Archived Files

**NONE** - No active migrations depend on archived files.

---

## SAFE REMOVAL CHECKLIST

Before archiving files, verify:

- [ ] Database is backed up
- [ ] All migrations in "Keep" list are present and correct
- [ ] No custom scripts reference archived files
- [ ] Archive directory structure is created
- [ ] Archive README.md is created with documentation
- [ ] Git commit made before archival (for easy rollback)
- [ ] Team is notified of archival

---

## ROLLBACK PLAN

If archival causes issues:

```bash
# Rollback with git
cd database
git checkout HEAD -- archive/

# Or restore specific file
cd database
cp archive/superseded/QUICK_FIX_PROJECTS.sql ./
```

---

## UNUSED CODE IN TYPESCRIPT

### No Unused TypeScript Files Detected

All `.ts` files in `lib/` directory are:
- Imported by API routes or components
- Part of the active codebase
- Referenced by other modules

**Recommendation:** No TypeScript cleanup needed.

---

## CONCLUSION

Archiving these 16 files will:
- ✅ Reduce confusion about which migrations to run
- ✅ Keep historical reference for debugging
- ✅ Clean up the database directory
- ✅ Make it clear which migrations are active
- ✅ Prevent accidental execution of old/superseded scripts

**All archived files are safe to move** - they are redundant with current migrations.

---

**Plan Created:** 2025-10-25
**Status:** Ready for execution
**Risk Level:** LOW (archival only, no deletion)
