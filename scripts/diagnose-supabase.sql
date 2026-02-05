-- ============================================================================
-- KimbleAI Supabase Diagnostic Script
-- Run this FIRST to see the current state of your database
-- ============================================================================

-- 1. List all tables in public schema
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. Show all foreign key constraints and what they reference
SELECT
    tc.table_name AS "Table",
    kcu.column_name AS "Column",
    ccu.table_schema || '.' || ccu.table_name AS "References",
    tc.constraint_name AS "Constraint Name"
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- 3. Check if user exists in public.users
SELECT id, email, name, role, created_at
FROM public.users
WHERE email = 'zach.kimble@gmail.com';

-- 4. Check if same user exists in auth.users (Supabase Auth)
SELECT id, email, created_at
FROM auth.users
WHERE email = 'zach.kimble@gmail.com';

-- 5. Count records in each table
SELECT 'users' as table_name, COUNT(*) as count FROM public.users
UNION ALL SELECT 'projects', COUNT(*) FROM public.projects
UNION ALL SELECT 'conversations', COUNT(*) FROM public.conversations
UNION ALL SELECT 'messages', COUNT(*) FROM public.messages
UNION ALL SELECT 'file_registry', COUNT(*) FROM public.file_registry
UNION ALL SELECT 'audio_transcriptions', COUNT(*) FROM public.audio_transcriptions
UNION ALL SELECT 'api_cost_tracking', COUNT(*) FROM public.api_cost_tracking;

-- 6. Show columns for each table (to identify schema mismatches)
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name IN ('users', 'projects', 'conversations', 'messages', 'file_registry', 'audio_transcriptions', 'api_cost_tracking')
ORDER BY table_name, ordinal_position;
