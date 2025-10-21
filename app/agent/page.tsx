/**
 * Archie's Consolidated Dashboard Page
 *
 * Displays completed, in-progress, pending tasks and suggestions
 * Accessible at: https://kimbleai.com/agent
 */

import ArchieConsolidatedDashboard from '@/components/ArchieConsolidatedDashboard';

export const metadata = {
  title: 'Archie Dashboard | KimbleAI',
  description: 'Autonomous agent task tracking and project progress'
};

export default function AgentPage() {
  return <ArchieConsolidatedDashboard />;
}
