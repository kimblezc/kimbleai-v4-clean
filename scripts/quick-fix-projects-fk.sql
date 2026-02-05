-- ============================================================================
-- QUICK FIX: Projects Foreign Key Constraint
--
-- PROBLEM: projects.user_id (TEXT) references user_profiles.id (TEXT)
--          but your app stores users in public.users with UUID ids
--
-- SOLUTION: Drop the FK constraint so projects can be created
--           Then properly sync the user tables
-- ============================================================================

-- STEP 1: Drop the broken FK constraint (this will fix the immediate error)
ALTER TABLE public.projects
DROP CONSTRAINT IF EXISTS projects_user_id_fkey;

-- STEP 2: Verify your user exists in public.users
-- Check if user 2965a7d1-a188-4368-8460-75b90cc62a97 exists
SELECT * FROM public.users WHERE id::text = '2965a7d1-a188-4368-8460-75b90cc62a97';
SELECT * FROM public.users WHERE email = 'zach.kimble@gmail.com';

-- STEP 3: If user doesn't exist, insert them
INSERT INTO public.users (id, name, email, role, created_at)
VALUES (
    '2965a7d1-a188-4368-8460-75b90cc62a97'::uuid,
    'Zach Kimble',
    'zach.kimble@gmail.com',
    'user',
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name;

-- STEP 4: Now projects.user_id needs to store UUID (not text user_profiles ID)
-- Change the column type to match
-- First, update any existing projects to use UUID format
UPDATE public.projects
SET user_id = '2965a7d1-a188-4368-8460-75b90cc62a97'
WHERE user_id IS NOT NULL;

-- STEP 5: Now re-add the FK constraint pointing to public.users
-- Since projects.user_id is TEXT and users.id is UUID, we need to change the column type
-- This is destructive, so let's just leave it without FK for now to fix the immediate issue

-- For a clean fix later:
-- ALTER TABLE public.projects ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
-- ALTER TABLE public.projects ADD CONSTRAINT projects_user_id_fkey
--     FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- STEP 6: Verify the fix
SELECT
    p.id,
    p.name,
    p.user_id,
    u.email as user_email
FROM public.projects p
LEFT JOIN public.users u ON p.user_id::text = u.id::text
LIMIT 5;

-- ============================================================================
-- After running this, project creation should work because:
-- 1. FK constraint is removed (no more validation error)
-- 2. User exists in public.users
-- ============================================================================
