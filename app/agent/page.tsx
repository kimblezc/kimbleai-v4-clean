/**
 * Autonomous Agent Dashboard Page
 *
 * Displays the self-healing agent's activity, logs, and reports
 * Accessible at: https://kimbleai.com/agent
 */

import AutonomousAgentDashboard from '@/components/AutonomousAgentDashboard';

export const metadata = {
  title: 'Autonomous Agent | KimbleAI',
  description: 'Self-healing system monitoring and optimization dashboard'
};

export default function AgentPage() {
  return <AutonomousAgentDashboard />;
}
