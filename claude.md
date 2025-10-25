# KimbleAI Development Rules

## Agent Visibility and Oversight

**Rule: All Active Agents Must Be Visible on the Archie Dashboard**

Archie serves as the central oversight coordinator for all autonomous agents in the system. The Archie Dashboard at `/agent` must display:

### Required Information for Each Active Agent:
1. **Agent Name and Type** (e.g., "Archie Utility Agent", "Drive Intelligence Agent")
2. **Current Status** (Active, Running, Idle, Error)
3. **Execution Schedule** (e.g., "Every 15 minutes", "Every 6 hours")
4. **Last Run Time** (When the agent last executed)
5. **What It's Doing** (Current or recent findings)
6. **Next Tasks** (Upcoming tasks in the queue)
7. **API Endpoint** (For manual triggering/debugging)

### Active Agents (as of Oct 2025):
1. **Autonomous Agent** - Every 5 minutes - `/api/agent/cron`
   - Main orchestrator, code analysis, self-improvement

2. **Archie Utility Agent** - Every 15 minutes - `/api/cron/archie-utility`
   - Actionable conversation detection, cost monitoring, task optimization

3. **Drive Intelligence Agent** - Every 6 hours - `/api/cron/drive-intelligence`
   - File organization, duplicate detection, media discovery

4. **Device Sync Agent** - Every 2 minutes - `/api/cron/device-sync`
   - Cross-device state synchronization, conflict resolution

### Dashboard Requirements:
- Must be server-side rendered (no caching)
- Must auto-update on each page visit
- Must show real-time agent status
- Must display findings and tasks from all agents
- Must provide visual indicators for agent health (active/inactive/error)

### Adding New Agents:
When adding a new autonomous agent to the system:
1. Create the agent implementation in `lib/`
2. Create the API endpoint in `app/api/cron/`
3. Add the cron schedule to `vercel.json`
4. **Update the Archie Dashboard** at `app/agent/page.tsx` to include the new agent
5. Document the agent in this file under "Active Agents"

### Rationale:
Without centralized visibility, agents can:
- Run without oversight
- Generate duplicate or conflicting tasks
- Consume resources unnecessarily
- Fail silently without alerting the team

Archie's dashboard provides a single pane of glass for monitoring all autonomous activity, ensuring transparency and accountability in the AI-driven workflow.
