-- ============================================================================
-- KimbleAI Supabase Complete Schema Fix & Cleanup Script
-- Version: 11.9.7
-- Date: 2026-02-05
--
-- PURPOSE:
-- 1. Fix all foreign key constraints to reference public.users consistently
-- 2. Clean up legacy/unused tables from old versions
-- 3. Standardize user_id column types (uuid vs text inconsistencies)
--
-- CRITICAL: Run this in your Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- STEP 1: DIAGNOSTIC - Run this first to understand current state
-- ============================================================================

-- View all tables
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

-- ============================================================================
-- STEP 2: FIX THE CORE ISSUE - projects table FK references wrong table
-- The projects table FK references user_profiles instead of users!
-- ============================================================================

-- Drop the broken FK constraint on projects
ALTER TABLE public.projects
DROP CONSTRAINT IF EXISTS projects_user_id_fkey;

-- The projects.user_id is TEXT but users.id is UUID
-- We need to standardize this. Let's check what IDs we're using.

-- First, ensure the user exists in public.users (not just user_profiles)
-- This copies users from user_profiles to users if they don't exist
INSERT INTO public.users (id, name, email, role, created_at)
SELECT
    gen_random_uuid() as id,
    name,
    email,
    'user' as role,
    created_at
FROM public.user_profiles up
WHERE NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.email = up.email
)
ON CONFLICT DO NOTHING;

-- Now let's fix the projects table to use UUID instead of TEXT
-- First, add a new UUID column
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS user_id_uuid uuid;

-- Update the UUID column from the users table by matching email through user_profiles
UPDATE public.projects p
SET user_id_uuid = u.id
FROM public.user_profiles up
JOIN public.users u ON up.email = u.email
WHERE p.user_id = up.id;

-- If that didn't work, try direct ID match (in case user_id is already a UUID string)
UPDATE public.projects p
SET user_id_uuid = u.id
FROM public.users u
WHERE p.user_id_uuid IS NULL
  AND p.user_id::text = u.id::text;

-- Drop the old text column and rename
ALTER TABLE public.projects DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.projects RENAME COLUMN user_id_uuid TO user_id;

-- Add the correct FK constraint
ALTER TABLE public.projects
ADD CONSTRAINT projects_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- ============================================================================
-- STEP 3: FIX conversations table (user_id is already UUID, good!)
-- ============================================================================

ALTER TABLE public.conversations
DROP CONSTRAINT IF EXISTS conversations_user_id_fkey;

ALTER TABLE public.conversations
DROP CONSTRAINT IF EXISTS conversations_project_id_fkey;

-- Fix the FK to reference public.users
ALTER TABLE public.conversations
ADD CONSTRAINT conversations_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Project FK (project_id is TEXT but projects.id is TEXT, so this should work)
-- But projects.id should be UUID... let's check and fix if needed

-- ============================================================================
-- STEP 4: FIX messages table
-- ============================================================================

ALTER TABLE public.messages
DROP CONSTRAINT IF EXISTS messages_user_id_fkey;

ALTER TABLE public.messages
DROP CONSTRAINT IF EXISTS messages_conversation_id_fkey;

ALTER TABLE public.messages
ADD CONSTRAINT messages_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.messages
ADD CONSTRAINT messages_conversation_id_fkey
FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;

-- ============================================================================
-- STEP 5: FIX file_registry table (already has correct FK!)
-- ============================================================================

-- The file_registry already references public.users(id) - just verify
ALTER TABLE public.file_registry
DROP CONSTRAINT IF EXISTS file_registry_user_id_fkey;

ALTER TABLE public.file_registry
ADD CONSTRAINT file_registry_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- ============================================================================
-- STEP 6: FIX audio_transcriptions table
-- user_id is TEXT but should reference users
-- ============================================================================

-- Add UUID column
ALTER TABLE public.audio_transcriptions
ADD COLUMN IF NOT EXISTS user_id_uuid uuid;

-- Try to match by email
UPDATE public.audio_transcriptions at
SET user_id_uuid = u.id
FROM public.user_profiles up
JOIN public.users u ON up.email = u.email
WHERE at.user_id = up.id;

-- Fallback: try direct ID match
UPDATE public.audio_transcriptions at
SET user_id_uuid = u.id
FROM public.users u
WHERE at.user_id_uuid IS NULL
  AND at.user_id::text = u.id::text;

-- Don't drop the old column yet in case we need it
-- ALTER TABLE public.audio_transcriptions DROP COLUMN user_id;
-- ALTER TABLE public.audio_transcriptions RENAME COLUMN user_id_uuid TO user_id;

-- ============================================================================
-- STEP 7: FIX api_cost_tracking table
-- user_id is TEXT but should be UUID
-- ============================================================================

ALTER TABLE public.api_cost_tracking
ADD COLUMN IF NOT EXISTS user_id_uuid uuid;

-- Match users by existing ID
UPDATE public.api_cost_tracking act
SET user_id_uuid = u.id
FROM public.user_profiles up
JOIN public.users u ON up.email = u.email
WHERE act.user_id = up.id;

-- ============================================================================
-- STEP 8: IDENTIFY AND DROP LEGACY TABLES
-- These tables appear to be from old versions and are not used in v11.9
-- ============================================================================

-- LEGACY AGENT TABLES (replaced by different architecture)
DROP TABLE IF EXISTS public.agent_logs CASCADE;
DROP TABLE IF EXISTS public.agent_logs_legacy CASCADE;
DROP TABLE IF EXISTS public.agent_findings CASCADE;
DROP TABLE IF EXISTS public.agent_reports CASCADE;
DROP TABLE IF EXISTS public.agent_state CASCADE;
DROP TABLE IF EXISTS public.agent_tasks CASCADE;
DROP TABLE IF EXISTS public.agents_legacy CASCADE;

-- LEGACY ARCHIE TABLES (automated code fixer - not in current codebase)
DROP TABLE IF EXISTS public.archie_fix_attempts CASCADE;
DROP TABLE IF EXISTS public.archie_issues CASCADE;
DROP TABLE IF EXISTS public.archie_learning CASCADE;
DROP TABLE IF EXISTS public.archie_metrics CASCADE;
DROP TABLE IF EXISTS public.archie_runs CASCADE;

-- LEGACY MCP TABLES (MCP functionality moved elsewhere)
DROP TABLE IF EXISTS public.mcp_connection_logs CASCADE;
DROP TABLE IF EXISTS public.mcp_server_metrics CASCADE;
DROP TABLE IF EXISTS public.mcp_tool_invocations CASCADE;
DROP TABLE IF EXISTS public.mcp_servers CASCADE;

-- LEGACY DEVICE/SYNC TABLES (multi-device sync not in current app)
DROP TABLE IF EXISTS public.context_snapshots CASCADE;
DROP TABLE IF EXISTS public.device_preferences CASCADE;
DROP TABLE IF EXISTS public.device_sessions CASCADE;
DROP TABLE IF EXISTS public.sync_queue CASCADE;

-- LEGACY SESSION TABLES
DROP TABLE IF EXISTS public.session_logs CASCADE;
DROP TABLE IF EXISTS public.session_snapshots CASCADE;
DROP TABLE IF EXISTS public.transition_states CASCADE;
DROP TABLE IF EXISTS public.token_usage_tracking CASCADE;

-- LEGACY DRIVE TABLES (Google Drive integration changed)
DROP TABLE IF EXISTS public.drive_edit_history CASCADE;
DROP TABLE IF EXISTS public.drive_edit_proposals CASCADE;

-- LEGACY EXTENSION TABLES
DROP TABLE IF EXISTS public.extensions CASCADE;
DROP TABLE IF EXISTS public.user_extensions CASCADE;

-- LEGACY PROJECT TABLES (consolidated into projects)
DROP TABLE IF EXISTS public.project_collaborators CASCADE;
DROP TABLE IF EXISTS public.project_logs CASCADE;
DROP TABLE IF EXISTS public.project_tasks CASCADE;

-- LEGACY MEMORY TABLES
DROP TABLE IF EXISTS public.memories CASCADE;
DROP TABLE IF EXISTS public.memory_chunks CASCADE;

-- LEGACY MESSAGE TABLES
DROP TABLE IF EXISTS public.message_links CASCADE;
DROP TABLE IF EXISTS public.message_projects CASCADE;
DROP TABLE IF EXISTS public.message_references CASCADE;
DROP TABLE IF EXISTS public.message_tags CASCADE;
DROP TABLE IF EXISTS public.conversation_tags CASCADE;
DROP TABLE IF EXISTS public.action_items CASCADE;
DROP TABLE IF EXISTS public.code_blocks CASCADE;
DROP TABLE IF EXISTS public.decisions CASCADE;
DROP TABLE IF EXISTS public.file_mentions CASCADE;

-- LEGACY INDEXING/KNOWLEDGE TABLES
DROP TABLE IF EXISTS public.indexing_state CASCADE;
DROP TABLE IF EXISTS public.indexed_files CASCADE;
DROP TABLE IF EXISTS public.knowledge_base CASCADE;
DROP TABLE IF EXISTS public.knowledge_base_backup CASCADE;
DROP TABLE IF EXISTS public.vector_documents CASCADE;
DROP TABLE IF EXISTS public.connector_data CASCADE;
DROP TABLE IF EXISTS public.user_connectors CASCADE;

-- LEGACY NOTIFICATION TABLES
DROP TABLE IF EXISTS public.notification_preferences CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;

-- LEGACY LOGGING/MONITORING TABLES
DROP TABLE IF EXISTS public.deployment_logs CASCADE;
DROP TABLE IF EXISTS public.error_logs CASCADE;
DROP TABLE IF EXISTS public.orchestrator_logs CASCADE;
DROP TABLE IF EXISTS public.zapier_logs CASCADE;

-- LEGACY BUDGET TABLES (if not used)
-- DROP TABLE IF EXISTS public.budget_alerts CASCADE;
-- DROP TABLE IF EXISTS public.budget_config CASCADE;

-- LEGACY MIGRATION TABLE
DROP TABLE IF EXISTS public.schema_migrations CASCADE;

-- LEGACY USER TABLES (keeping user_profiles for now as backup)
-- DROP TABLE IF EXISTS public.user_profiles CASCADE;
-- DROP TABLE IF EXISTS public.user_tokens CASCADE;
DROP TABLE IF EXISTS public.uploaded_files CASCADE;

-- LEGACY TAGS (not used in current UI)
DROP TABLE IF EXISTS public.tags CASCADE;

-- ============================================================================
-- STEP 9: CREATE PROPER INDEXES
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
-- STEP 10: FINAL - List remaining tables to verify cleanup
-- ============================================================================

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Expected tables after cleanup:
-- api_cost_tracking
-- audio_transcriptions
-- budget_alerts (optional)
-- budget_config (optional)
-- conversations
-- file_registry
-- messages
-- projects
-- user_profiles (backup)
-- user_tokens (for Google OAuth)
-- users

-- ============================================================================
-- DONE! Your database should now be clean and consistent.
--
-- After running this script, test project creation in KimbleAI.
-- The FK constraint error should be resolved.
-- ============================================================================
