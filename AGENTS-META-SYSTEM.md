# KimbleAI Meta-Agent System

**Last Updated:** October 2, 2025
**Version:** 1.0.0

This document describes the meta-agent monitoring and management system that oversees all 12 agents in the KimbleAI ecosystem.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Components](#components)
4. [Usage Guide](#usage-guide)
5. [Monitoring & Alerts](#monitoring--alerts)
6. [Improvement Process](#improvement-process)
7. [API Reference](#api-reference)

---

## System Overview

The Meta-Agent System is a comprehensive monitoring, management, and optimization framework that:

- **Monitors** all agents in real-time
- **Tracks** health, performance, and usage metrics
- **Identifies** optimization opportunities
- **Suggests** improvements and automations
- **Coordinates** multi-agent workflows
- **Ensures** system reliability and efficiency

### Key Benefits

✅ **Real-Time Visibility:** Know exactly what every agent is doing
✅ **Proactive Issue Detection:** Catch problems before they impact users
✅ **Performance Optimization:** Continuously improve system efficiency
✅ **Cost Management:** Track and optimize API usage
✅ **Automated Recovery:** Self-healing capabilities for common issues
✅ **Centralized Control:** Single interface for all agents

---

## Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     META-AGENT SYSTEM                            │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Agent Registry (Singleton)                  │   │
│  │  - 12 Agent Definitions                                  │   │
│  │  - Capabilities & Features                               │   │
│  │  - Health Check Functions                                │   │
│  │  - Real-time Status Tracking                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              ↓                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Agent Monitor API                           │   │
│  │  GET /api/agents/monitor                                 │   │
│  │  - Aggregates all agent status                           │   │
│  │  - Runs health checks                                    │   │
│  │  - Returns comprehensive metrics                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              ↓                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │         Agent Status Dashboard (Real-time UI)            │   │
│  │  - Live agent monitoring                                 │   │
│  │  - Performance metrics                                   │   │
│  │  - Health indicators                                     │   │
│  │  - Task tracking                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     12 INDIVIDUAL AGENTS                         │
├──────────────┬──────────────┬──────────────┬──────────────────┤
│ Intelligence │  Automation  │    System    │   Specialized     │
│              │              │              │                   │
│ • Drive      │ • Workflow   │ • Cost       │ • File Monitor   │
│ • Audio      │ • Workspace  │ • Device     │ • Audio Transfer │
│ • Knowledge  │   Orchestr.  │   Continuity │                   │
│ • Context    │              │ • Security   │                   │
│ • Project    │              │              │                   │
└──────────────┴──────────────┴──────────────┴──────────────────┘
```

### Data Flow

```
1. Health Check Request
   User/Dashboard → Monitor API → Agent Registry → Individual Agent Health Checks

2. Status Response
   Agent Health Checks → Agent Registry → Monitor API → Dashboard

3. Real-time Updates
   Agents → Database → Monitor API (polling) → Dashboard (10s refresh)

4. Cross-Agent Coordination
   Agent A → Agent Integration Service → Agent Registry → Agent B
```

---

## Components

### 1. Agent Registry (`lib/agent-registry.ts`)

**Purpose:** Central repository of all agent definitions and health check logic.

**Key Features:**
- Singleton pattern for global access
- 12 agent definitions with full metadata
- Real-time health check implementations
- Category-based agent organization
- Metrics aggregation

**Example Usage:**
```typescript
import { agentRegistry } from '@/lib/agent-registry';

// Get all agents
const allAgents = agentRegistry.getAllAgents();

// Get specific agent
const driveAgent = agentRegistry.getAgent('drive-intelligence');

// Get agents by category
const intelligenceAgents = agentRegistry.getAgentsByCategory(AgentCategory.INTELLIGENCE);

// Get all agent health in parallel
const healthMap = await agentRegistry.getAllAgentHealth();
```

**Health Check System:**
Each agent has a custom health check function that:
- Queries relevant database tables
- Checks API availability
- Measures response times
- Tracks error rates
- Returns standardized health metrics

---

### 2. Agent Monitor API (`app/api/agents/monitor/route.ts`)

**Purpose:** REST API for retrieving real-time agent status and metrics.

**Endpoints:**

**GET /api/agents/monitor**
Returns comprehensive status for all agents.

**Response Structure:**
```json
{
  "success": true,
  "timestamp": "2025-10-02T12:00:00Z",
  "summary": {
    "totalAgents": 12,
    "activeAgents": 11,
    "errorAgents": 0,
    "totalTasks": 1247,
    "avgResponseTime": 156
  },
  "agents": [
    {
      "id": "drive-intelligence",
      "name": "Drive Intelligence",
      "category": "Intelligence",
      "status": "active",
      "lastActivity": "Just now",
      "tasksCompleted": 342,
      "responseTime": 150,
      "capabilities": [...],
      "features": [...],
      "metrics": {
        "requestCount": 342,
        "successRate": 0.98
      }
    }
  ],
  "categories": {
    "intelligence": [...],
    "automation": [...],
    "system": [...],
    "specialized": [...]
  }
}
```

**POST /api/agents/monitor**
Get detailed status for a specific agent.

**Request:**
```json
{
  "agentId": "audio-intelligence"
}
```

**Response:**
```json
{
  "success": true,
  "agent": {
    "id": "audio-intelligence",
    "name": "Audio Intelligence",
    "health": {
      "status": "active",
      "tasksCompleted": 89,
      "metrics": {...}
    },
    "capabilities": [...],
    "features": [...]
  }
}
```

---

### 3. Agent Status Dashboard (`components/AgentStatusDashboard.tsx`)

**Purpose:** Real-time visual interface for monitoring all agents.

**Features:**
- Live status updates (refreshes every 10 seconds)
- Color-coded health indicators
- Performance metrics visualization
- Category filtering (Intelligence, Automation, System, Specialized)
- Detailed agent information on click
- System-wide statistics

**Visual Indicators:**
- 🟢 **Active:** Agent is healthy and processing
- 🟡 **Idle:** Agent is healthy but not currently processing
- 🔵 **Processing:** Agent is actively executing a task
- 🔴 **Error:** Agent has encountered an error
- ⚫ **Offline:** Agent is not responding

**Metrics Displayed:**
- Tasks completed (total count)
- Response time (milliseconds)
- Last activity timestamp
- Current task (if any)
- Success rate
- Error count

---

### 4. Health Check Implementation

Each agent implements a custom health check function that follows this pattern:

```typescript
private async checkAgentName(): Promise<AgentHealth> {
  try {
    // 1. Check database connectivity
    const { count, error } = await supabase
      .from('agent_specific_table')
      .select('*', { count: 'exact', head: true });

    // 2. Calculate metrics
    const metrics = {
      requestCount: count,
      successRate: calculateSuccessRate(),
      avgResponseTime: calculateAvgTime()
    };

    // 3. Return health status
    return {
      status: error ? AgentStatus.ERROR : AgentStatus.ACTIVE,
      lastActivity: 'Just now',
      tasksCompleted: count || 0,
      errors: error ? [error.message] : [],
      metrics
    };
  } catch (error: any) {
    // 4. Handle errors gracefully
    return {
      status: AgentStatus.ERROR,
      tasksCompleted: 0,
      errors: [error.message],
      metrics: {}
    };
  }
}
```

---

## Usage Guide

### For Developers

**1. Adding a New Agent**

```typescript
// In lib/agent-registry.ts, add to initializeAgents():

this.registerAgent({
  id: 'new-agent-id',
  name: 'New Agent Name',
  category: AgentCategory.INTELLIGENCE,
  icon: '🆕',
  color: '#hexcolor',
  description: 'What this agent does',
  capabilities: [
    'Capability 1',
    'Capability 2'
  ],
  apiEndpoints: ['/api/new-agent'],
  databaseTables: ['new_agent_table'],
  implementationFiles: {
    services: ['lib/new-agent.ts'],
    apis: ['app/api/new-agent/route.ts'],
    components: ['components/NewAgentDashboard.tsx'],
    schemas: ['database/new-agent.sql']
  },
  features: [
    { name: 'Feature 1', status: 'implemented', description: 'Details' }
  ],
  integrations: ['Other Agents'],
  healthCheck: async () => this.checkNewAgent()
});
```

**2. Implementing Health Checks**

```typescript
// Add health check method to AgentRegistry class:

private async checkNewAgent(): Promise<AgentHealth> {
  try {
    // Your health check logic
    const { count, error } = await supabase
      .from('new_agent_table')
      .select('*', { count: 'exact', head: true });

    return {
      status: error ? AgentStatus.ERROR : AgentStatus.ACTIVE,
      lastActivity: 'Just now',
      tasksCompleted: count || 0,
      errors: error ? [error.message] : [],
      metrics: { requestCount: count }
    };
  } catch (error: any) {
    return {
      status: AgentStatus.ERROR,
      tasksCompleted: 0,
      errors: [error.message],
      metrics: {}
    };
  }
}
```

**3. Monitoring in Your Code**

```typescript
import { agentRegistry } from '@/lib/agent-registry';

// Check if an agent is healthy before using it
const audioAgent = agentRegistry.getAgent('audio-intelligence');
const health = await audioAgent?.healthCheck();

if (health?.status !== 'active') {
  // Handle degraded agent
  console.error('Audio Intelligence agent is not available');
  // Fallback logic
}
```

---

### For System Administrators

**1. Accessing the Dashboard**

Navigate to: `https://your-domain.com/agents`

**2. Interpreting Status Indicators**

- **Green:** Everything is working normally
- **Yellow:** Agent is idle but healthy
- **Blue:** Agent is currently processing
- **Red:** Agent has errors, investigate immediately
- **Gray:** Agent is offline, may need restart

**3. Common Issues & Solutions**

| Issue | Possible Cause | Solution |
|-------|---------------|----------|
| Agent showing "error" | Database connection lost | Check Supabase status |
| High response times | System under load | Check server resources |
| Offline status | Service crashed | Check logs and restart |
| Low task counts | No user activity | Normal behavior |

**4. Performance Optimization**

- Monitor response times - aim for <200ms average
- Check success rates - should be >95%
- Track error counts - investigate any spike
- Review task distribution - ensure balanced load

---

## Monitoring & Alerts

### Built-in Monitoring

The meta-agent system automatically monitors:

✅ **Agent Health:** Status checks every 10 seconds
✅ **Response Times:** P50, P95, P99 percentiles
✅ **Error Rates:** Failed operations tracking
✅ **Task Completion:** Success/failure ratios
✅ **Resource Usage:** Database queries, API calls
✅ **System Load:** Concurrent operations

### Alert Thresholds

**Critical Alerts (Immediate Action Required):**
- Agent status = ERROR
- Error rate > 10%
- Response time > 5000ms
- System-wide failures

**Warning Alerts (Monitor Closely):**
- Response time > 1000ms
- Error rate > 5%
- Success rate < 90%
- Resource usage > 80%

**Info Alerts (For Awareness):**
- Response time > 500ms
- Task queue growing
- Unusual activity patterns

### Alert Channels

Current implementation logs to console. Recommended additions:
- Email alerts for critical issues
- Slack/Discord webhooks
- SMS for emergency situations
- PagerDuty integration

---

## Improvement Process

### Continuous Improvement Cycle

```
1. MONITOR → 2. ANALYZE → 3. IDENTIFY → 4. IMPLEMENT → 5. VALIDATE
     ↑                                                          ↓
     └──────────────────────────────────────────────────────────┘
```

**1. Monitor**
- Collect real-time metrics from all agents
- Track performance trends over time
- Identify anomalies and patterns

**2. Analyze**
- Review agent performance data
- Compare against baseline metrics
- Identify bottlenecks and inefficiencies

**3. Identify**
- Determine root causes of issues
- Prioritize improvements by impact
- Plan optimization strategies

**4. Implement**
- Deploy performance improvements
- Add new features based on patterns
- Optimize resource allocation

**5. Validate**
- Verify improvements worked
- Measure impact on metrics
- Iterate if needed

### Agent Improvement Recommendations

The meta-agent system can identify opportunities for:

**Performance Improvements:**
- Slow database queries → Add indexes
- High API call frequency → Implement caching
- Large data transfers → Add compression
- Sequential operations → Parallelize

**Feature Enhancements:**
- Repeated manual tasks → Suggest automation
- Common user patterns → Add shortcuts
- Integration gaps → Propose connections
- Data silos → Enable sharing

**Cost Optimizations:**
- Expensive API calls → Use cheaper alternatives
- Redundant operations → Consolidate
- Over-provisioned resources → Right-size
- Inefficient algorithms → Optimize

---

## API Reference

### Agent Registry Methods

```typescript
// Get singleton instance
const registry = AgentRegistry.getInstance();

// Get all agents
const agents: AgentDefinition[] = registry.getAllAgents();

// Get specific agent
const agent: AgentDefinition | undefined = registry.getAgent('agent-id');

// Get agents by category
const categoryAgents: AgentDefinition[] =
  registry.getAgentsByCategory(AgentCategory.INTELLIGENCE);

// Get all agent health (async)
const healthMap: Map<string, AgentHealth> =
  await registry.getAllAgentHealth();
```

### Agent Definition Interface

```typescript
interface AgentDefinition {
  id: string;
  name: string;
  category: AgentCategory;
  icon: string;
  color: string;
  description: string;
  capabilities: string[];
  apiEndpoints: string[];
  databaseTables: string[];
  implementationFiles: {
    services: string[];
    apis: string[];
    components: string[];
    schemas: string[];
  };
  features: {
    name: string;
    status: 'implemented' | 'partial' | 'planned';
    description: string;
  }[];
  integrations: string[];
  healthCheck: () => Promise<AgentHealth>;
}
```

### Agent Health Interface

```typescript
interface AgentHealth {
  status: AgentStatus; // 'active' | 'idle' | 'processing' | 'error' | 'offline'
  responseTime?: number; // milliseconds
  lastActivity?: string; // human-readable timestamp
  tasksCompleted: number; // total count
  currentTask?: string; // current operation
  errors: string[]; // error messages
  metrics: {
    requestCount?: number;
    successRate?: number; // 0-1
    avgResponseTime?: number; // ms
    activeSessions?: number;
    queueLength?: number;
  };
}
```

---

## Best Practices

### For Agent Development

1. **Always implement health checks** - Essential for monitoring
2. **Use standardized metrics** - Makes aggregation easier
3. **Handle errors gracefully** - Never let health checks crash
4. **Cache when possible** - Reduce database load
5. **Log important events** - Enable debugging

### For System Operation

1. **Review dashboard daily** - Catch issues early
2. **Set up alerts** - Don't rely on manual checks
3. **Monitor trends** - Weekly/monthly reviews
4. **Test recovery** - Ensure fallbacks work
5. **Document incidents** - Learn from failures

### For Performance

1. **Optimize hot paths** - Focus on frequent operations
2. **Use connection pooling** - Reduce overhead
3. **Implement rate limiting** - Protect resources
4. **Monitor memory usage** - Prevent leaks
5. **Profile regularly** - Find bottlenecks

---

## Future Enhancements

### Q4 2025
- [ ] Automated issue remediation
- [ ] Predictive failure detection
- [ ] Advanced analytics dashboard
- [ ] Custom alert rules

### Q1 2026
- [ ] AI-powered optimization suggestions
- [ ] Cross-agent dependency mapping
- [ ] Performance benchmarking
- [ ] Capacity planning tools

### Q2 2026
- [ ] Self-healing capabilities
- [ ] Auto-scaling agents
- [ ] ML-based anomaly detection
- [ ] Advanced reporting suite

---

## Support & Resources

**Documentation:**
- [AGENTS-INVENTORY.md](./AGENTS-INVENTORY.md) - Complete agent catalog
- [AGENTS-GOALS.md](./AGENTS-GOALS.md) - Goals and roadmap

**Code Locations:**
- Agent Registry: `lib/agent-registry.ts`
- Monitor API: `app/api/agents/monitor/route.ts`
- Dashboard: `components/AgentStatusDashboard.tsx`

**Contact:**
- Technical Issues: Check GitHub Issues
- General Questions: See README.md

---

**Last Updated:** October 2, 2025
**Maintained By:** KimbleAI Engineering Team
