-- Add task_id column to agent_findings table to track which findings have been converted
ALTER TABLE agent_findings 
ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES agent_tasks(id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_agent_findings_task_id ON agent_findings(task_id);

-- Show current findings count
SELECT 
  finding_type,
  COUNT(*) as count,
  COUNT(task_id) as converted_to_tasks
FROM agent_findings
GROUP BY finding_type
ORDER BY count DESC;
