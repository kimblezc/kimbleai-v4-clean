-- Test inserting a sample session log
-- Replace 'YOUR_USER_ID' with actual user ID from users table

-- First, get your user ID
SELECT id, email, name FROM users LIMIT 5;

-- Then insert a test session (replace the user_id value)
INSERT INTO session_logs (
  user_id,
  session_id,
  device_name,
  project_path,
  title,
  summary,
  files_modified,
  git_commits,
  todos,
  key_decisions,
  next_steps,
  git_branch,
  git_commit_hash,
  tags
) VALUES (
  'YOUR_USER_ID', -- ← Replace with actual user ID from query above
  'session_test_' || NOW()::TEXT,
  'laptop',
  '/Users/zach/kimbleai-v4-clean',
  'Test Session - Database Setup',
  'Created session_logs table and verified it works correctly',
  ARRAY[
    'database/migrations/session_logs_v2.sql',
    'database/verify-session-logs.sql',
    'database/test-session-log.sql'
  ],
  ARRAY[
    '{"hash": "24e5247", "message": "feat: Add auto-detecting session_logs migration", "timestamp": "2025-10-27T17:00:00Z"}'::JSONB
  ],
  ARRAY[
    '{"content": "Create session_logs table", "status": "completed"}'::JSONB,
    '{"content": "Test migration", "status": "completed"}'::JSONB
  ],
  ARRAY[
    'Use auto-detecting migration to handle UUID vs TEXT',
    'Add RLS policies for security'
  ],
  ARRAY[
    'Build API endpoints at /api/sessions',
    'Create UI at /sessions page',
    'Test laptop to PC switching'
  ],
  'master',
  '24e5247',
  ARRAY['database', 'migration', 'session-logs']
);

-- Verify it was inserted
SELECT
  session_id,
  device_name,
  title,
  created_at,
  array_length(files_modified, 1) AS num_files,
  array_length(git_commits, 1) AS num_commits,
  array_length(todos, 1) AS num_todos
FROM session_logs
ORDER BY created_at DESC
LIMIT 1;
