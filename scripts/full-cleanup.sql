-- ============================================================================
-- KimbleAI FULL Supabase Schema Cleanup & Fix
-- Version: 11.9.7
-- Date: 2026-02-05
--
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- PHASE 1: DROP ALL FOREIGN KEY CONSTRAINTS FIRST
-- This prevents cascade issues when dropping tables
-- ============================================================================

-- Projects FK
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_user_id_fkey;
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_parent_project_id_fkey;

-- Conversations FK
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_user_id_fkey;
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_project_id_fkey;

-- Messages FK
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_user_id_fkey;
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_conversation_id_fkey;

-- File registry FK
ALTER TABLE public.file_registry DROP CONSTRAINT IF EXISTS file_registry_user_id_fkey;

-- Audio transcriptions FK
ALTER TABLE public.audio_transcriptions DROP CONSTRAINT IF EXISTS audio_transcriptions_user_id_fkey;
ALTER TABLE public.audio_transcriptions DROP CONSTRAINT IF EXISTS audio_transcriptions_project_id_fkey;

-- Knowledge base FK
ALTER TABLE public.knowledge_base DROP CONSTRAINT IF EXISTS knowledge_base_user_id_fkey;
ALTER TABLE public.knowledge_base DROP CONSTRAINT IF EXISTS knowledge_base_file_id_fkey;

-- Indexed files FK
ALTER TABLE public.indexed_files DROP CONSTRAINT IF EXISTS indexed_files_user_id_fkey;

-- Session logs FK
ALTER TABLE public.session_logs DROP CONSTRAINT IF EXISTS session_logs_user_id_fkey;

-- Drive edit FK
ALTER TABLE public.drive_edit_history DROP CONSTRAINT IF EXISTS drive_edit_history_proposal_id_fkey;
ALTER TABLE public.drive_edit_history DROP CONSTRAINT IF EXISTS fk_user_history;
ALTER TABLE public.drive_edit_proposals DROP CONSTRAINT IF EXISTS fk_user;

-- Memories FK
ALTER TABLE public.memories DROP CONSTRAINT IF EXISTS memories_user_id_fkey;

-- Agent FK
ALTER TABLE public.agent_logs DROP CONSTRAINT IF EXISTS agent_logs_task_id_fkey;
ALTER TABLE public.agent_logs DROP CONSTRAINT IF EXISTS agent_logs_finding_id_fkey;
ALTER TABLE public.agent_findings DROP CONSTRAINT IF EXISTS agent_findings_related_task_id_fkey;
ALTER TABLE public.agent_logs_legacy DROP CONSTRAINT IF EXISTS agent_logs_legacy_agent_id_fkey;

-- Archie FK
ALTER TABLE public.archie_fix_attempts DROP CONSTRAINT IF EXISTS archie_fix_attempts_issue_id_fkey;
ALTER TABLE public.archie_fix_attempts DROP CONSTRAINT IF EXISTS archie_fix_attempts_run_id_fkey;
ALTER TABLE public.archie_issues DROP CONSTRAINT IF EXISTS archie_issues_run_id_fkey;
ALTER TABLE public.archie_learning DROP CONSTRAINT IF EXISTS archie_learning_example_issue_id_fkey;
ALTER TABLE public.archie_learning DROP CONSTRAINT IF EXISTS archie_learning_example_fix_attempt_id_fkey;

-- MCP FK
ALTER TABLE public.mcp_connection_logs DROP CONSTRAINT IF EXISTS mcp_connection_logs_server_id_fkey;
ALTER TABLE public.mcp_server_metrics DROP CONSTRAINT IF EXISTS mcp_server_metrics_server_id_fkey;
ALTER TABLE public.mcp_tool_invocations DROP CONSTRAINT IF EXISTS mcp_tool_invocations_server_id_fkey;

-- Context snapshots FK
ALTER TABLE public.context_snapshots DROP CONSTRAINT IF EXISTS context_snapshots_session_id_fkey;

-- Vector documents FK
ALTER TABLE public.vector_documents DROP CONSTRAINT IF EXISTS fk_vector_user;

-- Uploaded files FK
ALTER TABLE public.uploaded_files DROP CONSTRAINT IF EXISTS uploaded_files_user_id_fkey;

-- Tags FK
ALTER TABLE public.conversation_tags DROP CONSTRAINT IF EXISTS conversation_tags_tag_id_fkey;

-- User extensions FK
ALTER TABLE public.user_extensions DROP CONSTRAINT IF EXISTS user_extensions_extension_id_fkey;

-- ============================================================================
-- PHASE 2: DROP ALL LEGACY TABLES
-- ============================================================================

-- Agent tables
DROP TABLE IF EXISTS public.agent_logs CASCADE;
DROP TABLE IF EXISTS public.agent_logs_legacy CASCADE;
DROP TABLE IF EXISTS public.agent_findings CASCADE;
DROP TABLE IF EXISTS public.agent_reports CASCADE;
DROP TABLE IF EXISTS public.agent_state CASCADE;
DROP TABLE IF EXISTS public.agent_tasks CASCADE;
DROP TABLE IF EXISTS public.agents_legacy CASCADE;

-- Archie tables
DROP TABLE IF EXISTS public.archie_fix_attempts CASCADE;
DROP TABLE IF EXISTS public.archie_issues CASCADE;
DROP TABLE IF EXISTS public.archie_learning CASCADE;
DROP TABLE IF EXISTS public.archie_metrics CASCADE;
DROP TABLE IF EXISTS public.archie_runs CASCADE;

-- MCP tables
DROP TABLE IF EXISTS public.mcp_connection_logs CASCADE;
DROP TABLE IF EXISTS public.mcp_server_metrics CASCADE;
DROP TABLE IF EXISTS public.mcp_tool_invocations CASCADE;
DROP TABLE IF EXISTS public.mcp_servers CASCADE;

-- Device/sync tables
DROP TABLE IF EXISTS public.context_snapshots CASCADE;
DROP TABLE IF EXISTS public.device_preferences CASCADE;
DROP TABLE IF EXISTS public.device_sessions CASCADE;
DROP TABLE IF EXISTS public.sync_queue CASCADE;

-- Session tables
DROP TABLE IF EXISTS public.session_logs CASCADE;
DROP TABLE IF EXISTS public.session_snapshots CASCADE;
DROP TABLE IF EXISTS public.transition_states CASCADE;
DROP TABLE IF EXISTS public.token_usage_tracking CASCADE;

-- Drive tables
DROP TABLE IF EXISTS public.drive_edit_history CASCADE;
DROP TABLE IF EXISTS public.drive_edit_proposals CASCADE;

-- Extension tables
DROP TABLE IF EXISTS public.user_extensions CASCADE;
DROP TABLE IF EXISTS public.extensions CASCADE;

-- Project extra tables
DROP TABLE IF EXISTS public.project_collaborators CASCADE;
DROP TABLE IF EXISTS public.project_logs CASCADE;
DROP TABLE IF EXISTS public.project_tasks CASCADE;

-- Memory tables
DROP TABLE IF EXISTS public.memories CASCADE;
DROP TABLE IF EXISTS public.memory_chunks CASCADE;

-- Message extra tables
DROP TABLE IF EXISTS public.message_links CASCADE;
DROP TABLE IF EXISTS public.message_projects CASCADE;
DROP TABLE IF EXISTS public.message_references CASCADE;
DROP TABLE IF EXISTS public.message_tags CASCADE;
DROP TABLE IF EXISTS public.conversation_tags CASCADE;
DROP TABLE IF EXISTS public.action_items CASCADE;
DROP TABLE IF EXISTS public.code_blocks CASCADE;
DROP TABLE IF EXISTS public.decisions CASCADE;
DROP TABLE IF EXISTS public.file_mentions CASCADE;

-- Indexing/knowledge tables
DROP TABLE IF EXISTS public.indexing_state CASCADE;
DROP TABLE IF EXISTS public.indexed_files CASCADE;
DROP TABLE IF EXISTS public.knowledge_base CASCADE;
DROP TABLE IF EXISTS public.knowledge_base_backup CASCADE;
DROP TABLE IF EXISTS public.vector_documents CASCADE;
DROP TABLE IF EXISTS public.connector_data CASCADE;
DROP TABLE IF EXISTS public.user_connectors CASCADE;

-- Notification tables
DROP TABLE IF EXISTS public.notification_preferences CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;

-- Logging tables
DROP TABLE IF EXISTS public.deployment_logs CASCADE;
DROP TABLE IF EXISTS public.error_logs CASCADE;
DROP TABLE IF EXISTS public.orchestrator_logs CASCADE;
DROP TABLE IF EXISTS public.zapier_logs CASCADE;

-- Budget tables (keep if you use them)
DROP TABLE IF EXISTS public.budget_alerts CASCADE;
DROP TABLE IF EXISTS public.budget_config CASCADE;

-- Migration table
DROP TABLE IF EXISTS public.schema_migrations CASCADE;

-- Extra user tables
DROP TABLE IF EXISTS public.uploaded_files CASCADE;

-- Tags table
DROP TABLE IF EXISTS public.tags CASCADE;

-- ============================================================================
-- PHASE 3: ENSURE public.users TABLE IS CORRECT
-- ============================================================================

-- Make sure users table has all needed columns
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{"can_create_projects": true}'::jsonb;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Drop the UNIQUE constraint on name if it exists (causes issues)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_name_key;

-- ============================================================================
-- PHASE 4: INSERT/UPDATE YOUR USER IN public.users
-- ============================================================================

-- First check what's in user_profiles for your email
-- SELECT * FROM public.user_profiles WHERE email = 'zach.kimble@gmail.com';

-- Insert your user with the correct UUID
INSERT INTO public.users (id, name, email, role, created_at, permissions)
VALUES (
    '2965a7d1-a188-4368-8460-75b90cc62a97'::uuid,
    'Zach Kimble',
    'zach.kimble@gmail.com',
    'user',
    NOW(),
    '{"can_create_projects": true}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = EXCLUDED.role;

-- Verify user exists
SELECT id, name, email, role FROM public.users WHERE email = 'zach.kimble@gmail.com';

-- ============================================================================
-- PHASE 5: FIX PROJECTS TABLE
-- ============================================================================

-- Check current state
-- SELECT id, name, user_id, status FROM public.projects LIMIT 5;

-- The projects.user_id column is TEXT but we need it to work with UUID
-- Option 1: Keep as TEXT but store UUID as text (simplest)
-- Option 2: Convert to UUID (cleaner but more complex)

-- Let's go with Option 1 for now - just make sure any existing projects
-- have the correct user_id format

-- Update any existing projects to use the new user ID
UPDATE public.projects
SET user_id = '2965a7d1-a188-4368-8460-75b90cc62a97'
WHERE user_id IS NOT NULL;

-- For new projects, the app will use the UUID from ensureUserExists

-- ============================================================================
-- PHASE 6: FIX CONVERSATIONS TABLE
-- ============================================================================

-- conversations.user_id is already UUID, which is correct
-- Just update any existing conversations to use the correct user_id

UPDATE public.conversations
SET user_id = '2965a7d1-a188-4368-8460-75b90cc62a97'::uuid
WHERE user_id IS NOT NULL;

-- ============================================================================
-- PHASE 7: FIX MESSAGES TABLE
-- ============================================================================

-- messages.user_id is already UUID
UPDATE public.messages
SET user_id = '2965a7d1-a188-4368-8460-75b90cc62a97'::uuid
WHERE user_id IS NOT NULL;

-- ============================================================================
-- PHASE 8: FIX FILE_REGISTRY TABLE
-- ============================================================================

-- file_registry.user_id is UUID
UPDATE public.file_registry
SET user_id = '2965a7d1-a188-4368-8460-75b90cc62a97'::uuid
WHERE user_id IS NOT NULL;

-- ============================================================================
-- PHASE 9: FIX AUDIO_TRANSCRIPTIONS TABLE
-- ============================================================================

-- audio_transcriptions.user_id is TEXT
UPDATE public.audio_transcriptions
SET user_id = '2965a7d1-a188-4368-8460-75b90cc62a97'
WHERE user_id IS NOT NULL;

-- ============================================================================
-- PHASE 10: FIX API_COST_TRACKING TABLE
-- ============================================================================

-- api_cost_tracking.user_id is TEXT
UPDATE public.api_cost_tracking
SET user_id = '2965a7d1-a188-4368-8460-75b90cc62a97'
WHERE user_id IS NOT NULL;

-- ============================================================================
-- PHASE 11: RE-ADD FOREIGN KEY CONSTRAINTS (pointing to public.users)
-- ============================================================================

-- NOTE: We're NOT adding FK constraints because:
-- 1. projects.user_id is TEXT, users.id is UUID (type mismatch)
-- 2. The app validates users with ensureUserExists() before DB operations
-- 3. This gives more flexibility and avoids the FK constraint errors

-- If you want FK constraints later, you'd need to:
-- 1. Convert all user_id columns to UUID type
-- 2. Then add the constraints

-- For now, the app-level validation (ensureUserExists) is sufficient

-- ============================================================================
-- PHASE 12: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Projects
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON public.projects(updated_at DESC);

-- Conversations
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_project_id ON public.conversations(project_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON public.conversations(updated_at DESC);

-- Messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON public.messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);

-- File registry
CREATE INDEX IF NOT EXISTS idx_file_registry_user_id ON public.file_registry(user_id);
CREATE INDEX IF NOT EXISTS idx_file_registry_created_at ON public.file_registry(created_at DESC);

-- Audio transcriptions
CREATE INDEX IF NOT EXISTS idx_audio_transcriptions_user_id ON public.audio_transcriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_audio_transcriptions_project_id ON public.audio_transcriptions(project_id);

-- API cost tracking
CREATE INDEX IF NOT EXISTS idx_api_cost_tracking_user_id ON public.api_cost_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_api_cost_tracking_timestamp ON public.api_cost_tracking(timestamp DESC);

-- ============================================================================
-- PHASE 13: DROP LEGACY USER TABLES (optional - keeping as backup)
-- ============================================================================

-- Uncomment these if you want to remove the legacy user tables
-- DROP TABLE IF EXISTS public.user_profiles CASCADE;
-- DROP TABLE IF EXISTS public.user_tokens CASCADE;

-- ============================================================================
-- PHASE 14: VERIFY FINAL STATE
-- ============================================================================

-- List remaining tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check your user
SELECT id, name, email, role FROM public.users;

-- Check FK constraints (should be minimal or none)
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_schema || '.' || ccu.table_name AS references_table,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- ============================================================================
-- DONE!
--
-- Expected remaining tables:
-- - api_cost_tracking
-- - audio_transcriptions
-- - conversations
-- - file_registry
-- - messages
-- - projects
-- - user_profiles (backup)
-- - user_tokens (OAuth tokens)
-- - users
--
-- After running this, test project creation in KimbleAI.
-- ============================================================================
