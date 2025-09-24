-- Create deleted_projects table for persistent project deletion tracking
CREATE TABLE IF NOT EXISTS deleted_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  project_id TEXT NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  conversations_moved INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_deleted_projects_user_id ON deleted_projects(user_id);
CREATE INDEX idx_deleted_projects_project_id ON deleted_projects(project_id);
CREATE INDEX idx_deleted_projects_user_project ON deleted_projects(user_id, project_id);

-- Create unique constraint to prevent duplicate deletions
CREATE UNIQUE INDEX idx_deleted_projects_unique ON deleted_projects(user_id, project_id);

-- Enable Row Level Security
ALTER TABLE deleted_projects ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own deleted projects" ON deleted_projects
  FOR SELECT
  USING (user_id = current_setting('app.user_id')::UUID);

CREATE POLICY "Users can insert their own deleted projects" ON deleted_projects
  FOR INSERT
  WITH CHECK (user_id = current_setting('app.user_id')::UUID);

-- Grant permissions
GRANT ALL ON deleted_projects TO authenticated;