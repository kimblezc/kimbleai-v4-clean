# Phase 4: Model Performance Analytics System

## Overview

A comprehensive model performance tracking and analytics system that monitors AI model performance across multiple providers (OpenAI, Anthropic) to recommend the best model for each task type.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   MODEL PERFORMANCE SYSTEM                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. TRACKING LAYER (Automatic)                                 │
│     ├─ Chat API logs every AI call                            │
│     ├─ Captures: response time, tokens, task type             │
│     └─ Stores in: model_performance_metrics table             │
│                                                                 │
│  2. ANALYTICS LAYER (API)                                      │
│     ├─ GET /api/analytics/models                              │
│     ├─ Aggregates performance data                            │
│     ├─ Groups by: model, task type, provider, time            │
│     └─ Returns: metrics, trends, recommendations              │
│                                                                 │
│  3. VISUALIZATION LAYER (Dashboard)                            │
│     ├─ /analytics/models page                                 │
│     ├─ Charts: response time, success rate, satisfaction      │
│     ├─ Tables: model performance details                      │
│     └─ Recommendations: best model by task                    │
│                                                                 │
│  4. RECOMMENDATION ENGINE                                      │
│     ├─ lib/model-recommender.ts                               │
│     ├─ Uses historical data to predict best model             │
│     ├─ Supports priorities: speed, quality, cost, balanced    │
│     └─ Falls back to rules if insufficient data               │
│                                                                 │
│  5. USER FEEDBACK SYSTEM                                       │
│     ├─ Thumbs up/down on responses                            │
│     ├─ Stored in user_rating field                            │
│     └─ Factors into quality scoring                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema

### model_performance_metrics Table

```sql
CREATE TABLE model_performance_metrics (
  id UUID PRIMARY KEY,
  model TEXT NOT NULL,                    -- e.g., "claude-sonnet-4-5", "gpt-4o"
  provider TEXT NOT NULL,                 -- "openai" or "anthropic"
  task_type TEXT NOT NULL,                -- "coding", "analysis", "reasoning", etc.
  task_complexity TEXT,                   -- "simple", "medium", "complex"
  response_time_ms INTEGER NOT NULL,      -- How long the model took to respond
  tokens_used INTEGER NOT NULL,           -- Total tokens (input + output)
  input_tokens INTEGER,
  output_tokens INTEGER,
  success BOOLEAN NOT NULL DEFAULT TRUE,  -- Did the call succeed?
  error_message TEXT,
  user_rating INTEGER,                    -- -1 (thumbs down), 0 (no rating), 1 (thumbs up)
  conversation_id TEXT,
  user_id UUID NOT NULL,
  message_id UUID,
  metadata JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
```

### Key Indexes

- `idx_model_perf_model` - Fast queries by model
- `idx_model_perf_task_type` - Fast queries by task type
- `idx_model_perf_model_task` - Fast queries by model + task combo
- `idx_model_perf_timestamp` - Fast time-based queries

### Analytics Views

1. **model_avg_response_time** - Average, min, max, median, p95 response times
2. **model_success_rate** - Success rate percentage by model
3. **model_user_satisfaction** - Thumbs up/down ratios
4. **best_model_by_task** - Top performing model for each task type
5. **model_token_efficiency** - Token usage patterns
6. **model_performance_trends** - Daily performance trends

## Components

### 1. Database Migration

**File:** `database/model-performance-tracking.sql`

Run this SQL script in Supabase to create the table, indexes, views, and functions.

```bash
# In Supabase SQL Editor
psql < database/model-performance-tracking.sql
```

### 2. Chat API Enhancement

**File:** `app/api/chat/route.ts`

Added automatic performance tracking after each AI response:

```typescript
// Track performance metrics
const responseTime = openaiEndTime - openaiStartTime;
await supabase.from('model_performance_metrics').insert({
  model: selectedModel.model,
  provider: isClaudeModel ? 'anthropic' : 'openai',
  task_type: taskTypes[0] || 'general_chat',
  task_complexity: complexity,
  response_time_ms: responseTime,
  tokens_used: inputTokens + outputTokens,
  input_tokens: inputTokens,
  output_tokens: outputTokens,
  success: true,
  conversation_id: conversationId,
  user_id: userData.id,
});
```

### 3. Analytics API

**File:** `app/api/analytics/models/route.ts`

Provides comprehensive analytics endpoints:

#### GET /api/analytics/models

Query Parameters:
- `days` - Number of days to analyze (default: 30)
- `task_type` - Filter by task type (optional)
- `model` - Filter by specific model (optional)
- `group_by` - Grouping option: model, task_type, provider, time

Response:
```json
{
  "summary": {
    "totalCalls": 1234,
    "avgResponseTime": 2456,
    "successRate": 98,
    "satisfactionRate": 87,
    "avgTokens": 1523
  },
  "byModel": [...],
  "byTaskType": [...],
  "byProvider": [...],
  "trends": [...],
  "recommendations": [...],
  "bestByTask": [...]
}
```

### 4. Analytics Dashboard

**File:** `app/analytics/models/page.tsx`

Beautiful dark-themed dashboard featuring:

- **Summary Cards** - Key metrics at a glance
- **Response Time Chart** - Bar chart showing avg response time by model
- **Success Rate Chart** - Bar chart showing reliability
- **Satisfaction Pie Chart** - User feedback distribution
- **Performance Table** - Detailed metrics for each model
- **Task Type Analysis** - Performance breakdown by task
- **Trends** - Line chart showing performance over time
- **Best Models** - Recommendations for each task type

**Access:** Navigate to `/analytics/models` in the app

### 5. Model Recommender

**File:** `lib/model-recommender.ts`

Intelligent model selection based on historical performance:

```typescript
import { ModelRecommender } from '@/lib/model-recommender';

// Get recommendation for a task
const recommendation = await ModelRecommender.getModelRecommendation(
  taskContext,
  'quality' // or 'speed', 'cost', 'balanced'
);

console.log(recommendation);
// {
//   model: "claude-sonnet-4-5",
//   provider: "anthropic",
//   confidence: 87,
//   reason: "best overall performance for coding (quality score: 92)",
//   metrics: {
//     avgResponseTime: 2341,
//     successRate: 98,
//     satisfactionRate: 89,
//     qualityScore: 92,
//     sampleSize: 147
//   },
//   alternatives: [...]
// }
```

**Priorities:**
- `speed` - Fastest response time
- `quality` - Highest success + satisfaction rates
- `cost` - Lowest token usage
- `balanced` - Optimal mix of all factors (default)

### 6. User Feedback Component

**File:** `components/ModelFeedback.tsx`

Thumbs up/down component for gathering user feedback:

```tsx
import ModelFeedback from '@/components/ModelFeedback';

<ModelFeedback
  conversationId={conversation.id}
  onFeedbackSubmitted={(rating) => console.log('User rated:', rating)}
/>
```

**API:** `POST /api/analytics/models/feedback`

## Metrics & Scoring

### Quality Score Formula

```
Quality Score = 40% × Success Rate
              + 40% × User Satisfaction
              + 20% × Speed Score

Speed Score = max(0, 100 - min(100, avgResponseTime / 100))
```

### Confidence Score

Based on:
1. **Sample Size** (50%) - More data = higher confidence
2. **Reliability** (30%) - Success rate consistency
3. **Satisfaction** (20%) - User feedback consistency

## Task Types

The system tracks performance across these task categories:

1. **general_chat** - General conversation and questions
2. **coding** - Code generation, debugging, refactoring
3. **analysis** - Data analysis, evaluation, comparison
4. **reasoning** - Complex logical problems, math
5. **creative** - Writing, content creation
6. **file_processing** - Document analysis, transcription review
7. **function_calling** - API integrations, tool usage
8. **other** - Uncategorized tasks

## Usage Examples

### 1. View Analytics Dashboard

Navigate to: `https://your-app.com/analytics/models`

### 2. Get Recommendations via API

```bash
# Get overall analytics
curl https://your-app.com/api/analytics/models?days=30

# Get coding task analytics
curl https://your-app.com/api/analytics/models?task_type=coding

# Get last 7 days
curl https://your-app.com/api/analytics/models?days=7
```

### 3. Submit User Feedback

```typescript
// In your chat component
const submitFeedback = async (rating: number) => {
  await fetch('/api/analytics/models/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversationId: 'conv-123',
      rating: 1 // or -1
    })
  });
};
```

### 4. Use Model Recommender

```typescript
import { ModelRecommender } from '@/lib/model-recommender';

// In your model selection logic
const recommendation = await ModelRecommender.getModelRecommendation(
  {
    messageContent: userMessage,
    hasCodeContent: true,
    userPreference: 'quality'
  },
  'quality'
);

// Use the recommended model
const selectedModel = recommendation.model;
```

## Performance Insights

The system provides actionable insights:

### Example Recommendations

- ✅ "Claude Haiku 4.5 is 2.3x faster for simple tasks"
- ✅ "GPT-4o has 2% higher success rate for analysis tasks"
- ✅ "Users prefer Claude Sonnet 4.5 for coding (89% satisfaction)"
- ⚠️ "Coding tasks are slow (8.2s avg). Consider optimizing prompts."
- ⚠️ "User satisfaction is at 67%. Review model quality."

## Database Functions

### get_best_model_for_task(task_type, priority)

Returns the best model for a specific task type.

```sql
SELECT * FROM get_best_model_for_task('coding', 'quality');
```

### get_model_performance_summary(days)

Returns comprehensive performance summary.

```sql
SELECT * FROM get_model_performance_summary(30);
```

## Integration with Existing Systems

### Cost Monitor

Performance tracking integrates with the existing cost monitor:
- Performance metrics are logged **after** cost tracking
- Both systems share the same conversation_id
- Analytics can correlate cost with performance

### Model Selector

The recommender can enhance the existing ModelSelector:

```typescript
// Before (rule-based)
const model = ModelSelector.selectModel(taskContext);

// After (data-driven)
const recommendation = await ModelRecommender.getModelRecommendation(
  taskContext,
  userPreference
);
const model = recommendation.model;
```

## Maintenance

### Data Retention

Performance data is kept for 90 days by default.

```sql
-- Manual cleanup
SELECT cleanup_old_performance_data();

-- Or schedule via cron
-- 0 0 1 * * (monthly)
```

### Monitoring Queries

```sql
-- Check data volume
SELECT COUNT(*) FROM model_performance_metrics;

-- Recent performance
SELECT * FROM model_avg_response_time;

-- Model usage
SELECT model, COUNT(*) as calls
FROM model_performance_metrics
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY model
ORDER BY calls DESC;
```

## Troubleshooting

### No data showing in dashboard

1. Check if the table exists:
```sql
SELECT COUNT(*) FROM model_performance_metrics;
```

2. Run the migration:
```bash
psql < database/model-performance-tracking.sql
```

3. Verify tracking is working in chat API logs:
```
[PerformanceTracking] Logged metrics: 2456ms, coding, complex
```

### Feedback not saving

Check API response:
```bash
curl -X POST https://your-app.com/api/analytics/models/feedback \
  -H "Content-Type: application/json" \
  -d '{"conversationId": "conv-123", "rating": 1}'
```

### Recommendations not accurate

- Ensure sufficient data (minimum 5 samples per model per task)
- Check data quality: `SELECT * FROM model_success_rate;`
- Review confidence scores in recommendations

## Future Enhancements

1. **A/B Testing** - Automatically test model variants
2. **Cost-Performance Optimization** - Balance quality with cost
3. **Real-time Alerts** - Notify when model performance degrades
4. **Auto-routing** - Automatically select best model per message
5. **Comparative Analysis** - Side-by-side model comparisons
6. **User Segmentation** - Different recommendations per user type

## Summary

This Phase 4 implementation provides:

✅ **Automatic Performance Tracking** - Every AI call is logged
✅ **Comprehensive Analytics** - 6+ views and aggregate functions
✅ **Beautiful Dashboard** - Dark D&D themed, responsive UI
✅ **Smart Recommendations** - Data-driven model selection
✅ **User Feedback** - Thumbs up/down for quality scoring
✅ **Integration Ready** - Works with existing cost monitor

The system enables data-driven decisions about which AI model to use for each task type, optimizing for speed, quality, cost, or a balanced approach.
