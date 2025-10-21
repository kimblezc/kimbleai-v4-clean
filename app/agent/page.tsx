/**
 * Archie's Consolidated Dashboard Page
 *
 * Displays completed, in-progress, pending tasks and suggestions
 * Accessible at: https://kimbleai.com/agent
 *
 * Updated: Oct 21, 2025 - 4-column layout with borders
 */

import ArchieConsolidatedDashboard from '@/components/ArchieConsolidatedDashboard';

export const metadata = {
  title: 'Archie Dashboard | KimbleAI',
  description: 'Autonomous agent task tracking and project progress'
};

// Force dynamic rendering to always fetch fresh data from database
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function AgentPage() {
  return <ArchieConsolidatedDashboard />;
}
