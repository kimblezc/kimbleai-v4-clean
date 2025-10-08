# Knowledge Graph Agent Setup Guide

The Knowledge Graph Agent is a powerful system that intelligently connects all your data through entity extraction and relationship mapping. This guide will help you set up and configure the system.

## Overview

The Knowledge Graph Agent automatically:
- Extracts entities (people, projects, concepts, etc.) from your content
- Maps relationships between entities
- Discovers hidden patterns and connections
- Provides intelligent recommendations
- Visualizes your knowledge network

## Architecture

### Core Components

1. **Database Layer** (`lib/knowledge-graph-db.ts`)
   - PostgreSQL-based graph storage
   - Entity and relationship tables
   - Graph query functions

2. **Entity Extraction** (`lib/entity-extraction.ts`)
   - AI-powered entity recognition
   - Pattern-based extraction
   - Content type specific processors

3. **Knowledge Graph Core** (`lib/knowledge-graph.ts`)
   - Main graph operations
   - Content processing pipeline
   - Insight generation

4. **Graph Algorithms** (`lib/graph-algorithms.ts`)
   - Connection discovery
   - Centrality calculations
   - Community detection
   - Recommendation engine

5. **Workspace Integration** (`lib/workspace-integration.ts`)
   - Data source connectors
   - Sync management
   - Integration health monitoring

6. **API Endpoints** (`app/api/agents/knowledge-graph/route.ts`)
   - RESTful API for all operations
   - Authentication and authorization
   - Error handling

7. **Visualization** (`components/agents/KnowledgeGraphViz.tsx`)
   - Interactive graph visualization
   - D3.js-powered network display
   - Real-time updates

## Setup Instructions

### 1. Database Setup

First, run the SQL schema to create the necessary tables:

```sql
-- Execute the schema from sql/knowledge-graph-schema.sql
psql -d your_database -f sql/knowledge-graph-schema.sql
```

### 2. Environment Variables

Ensure these environment variables are set:

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_api_key

# Optional (for enhanced features)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### 3. Initialize the Knowledge Graph

Call the initialization endpoint to set up the database schema:

```typescript
// Initialize the knowledge graph
const response = await fetch('/api/agents/knowledge-graph', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'initialize' })
});
```

### 4. Install Dependencies

The system requires D3.js for visualization:

```bash
npm install d3 @types/d3
```

## Usage Guide

### Processing Content

```typescript
// Process text content
const response = await fetch('/api/agents/knowledge-graph', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'process',
    content: 'Your text content here',
    contentType: 'text',
    sourceId: 'unique_source_id',
    metadata: { /* optional metadata */ }
  })
});
```

### Searching the Graph

```typescript
// Search for entities
const response = await fetch('/api/agents/knowledge-graph?action=search&query=john&includeConnections=true');
```

### Getting Recommendations

```typescript
// Get recommendations for an entity
const response = await fetch('/api/agents/knowledge-graph', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'recommend',
    entityId: 'entity_uuid'
  })
});
```

### Visualizing the Graph

```tsx
import KnowledgeGraphViz from '@/components/agents/KnowledgeGraphViz';

function MyComponent() {
  return (
    <KnowledgeGraphViz
      width={800}
      height={600}
      onNodeClick={(node) => console.log('Clicked:', node)}
      colorScheme="type"
      showLabels={true}
    />
  );
}
```

## Data Source Integration

### Available Integrations

1. **Chat Conversations** - Automatically processes chat history
2. **Google Drive** - Extracts entities from documents
3. **Gmail** - Processes email content and metadata
4. **Uploaded Files** - Analyzes user-uploaded documents
5. **Google Calendar** - Extracts meeting and event information

### Sync Data Sources

```typescript
import { workspaceIntegration } from '@/lib/workspace-integration';

// Sync all enabled data sources
const results = await workspaceIntegration.syncAllDataSources(userId, {
  enabledOnly: true
});

// Sync specific data source
const result = await workspaceIntegration.syncDataSource('conversations', userId, {
  limit: 100,
  since: '2024-01-01'
});
```

## Entity Types

The system recognizes these entity types:

- **Person** - Individuals mentioned in content
- **Project** - Work projects and initiatives
- **Document** - Files and documents
- **Conversation** - Chat conversations
- **Email** - Email messages
- **File** - Uploaded files
- **Concept** - Abstract concepts and ideas
- **Location** - Geographic locations
- **Organization** - Companies and organizations
- **Event** - Events and meetings
- **Task** - To-do items and tasks
- **Topic** - Discussion topics
- **Technology** - Technical tools and platforms
- **Meeting** - Scheduled meetings

## Relationship Types

The system identifies these relationship types:

- **mentions** - Entity is mentioned in content
- **works_on** - Person works on project
- **collaborates_with** - People collaborate together
- **contains** - Entity contains another entity
- **relates_to** - General relationship
- **depends_on** - Dependency relationship
- **created_by** - Creation relationship
- **modified_by** - Modification relationship
- **part_of** - Part-whole relationship
- **similar_to** - Similarity relationship
- **references** - Reference relationship
- **follows** - Sequential relationship
- **precedes** - Temporal precedence
- **located_in** - Location relationship
- **assigned_to** - Assignment relationship

## API Reference

### POST /api/agents/knowledge-graph

#### Actions

##### initialize
Initialize the knowledge graph database schema.

```json
{
  "action": "initialize"
}
```

##### process
Process content and extract entities/relationships.

```json
{
  "action": "process",
  "content": "Content to process",
  "contentType": "text|conversation|file|email",
  "sourceId": "unique_source_identifier",
  "metadata": {}
}
```

##### search
Search entities in the knowledge graph.

```json
{
  "action": "search",
  "query": "search query",
  "entityTypes": ["person", "project"],
  "options": {
    "maxResults": 50,
    "includeConnections": true
  }
}
```

##### recommend
Get recommendations for an entity.

```json
{
  "action": "recommend",
  "entityId": "entity_uuid"
}
```

##### discover
Discover insights and patterns.

```json
{
  "action": "discover"
}
```

##### stats
Get knowledge graph statistics.

```json
{
  "action": "stats"
}
```

##### graph
Get graph data for visualization.

```json
{
  "action": "graph",
  "options": {
    "centerEntityId": "optional_entity_uuid"
  }
}
```

### GET /api/agents/knowledge-graph

Query parameters:
- `action`: stats|graph|entities|search|insights
- `query`: Search query (for search action)
- `type`: Entity type filter
- `centerEntityId`: Center entity for graph visualization
- `includeConnections`: Include relationships in search results

## Dashboard Usage

The Knowledge Graph Dashboard (`components/agents/KnowledgeGraphDashboard.tsx`) provides:

1. **Graph Visualization** - Interactive network view
2. **Statistics** - Entity and relationship counts
3. **Insights** - Discovered patterns and recommendations
4. **Search** - Find entities and relationships
5. **Content Processing** - Add new content to the graph

### Dashboard Features

- Real-time graph updates
- Entity type filtering
- Connection strength visualization
- Zoom and pan controls
- Entity details panel
- Recommendation engine
- Sync status monitoring

## Performance Considerations

### Database Optimization

1. **Indexes** - The schema includes optimized indexes for common queries
2. **Pagination** - Use limits for large result sets
3. **Caching** - Consider caching frequently accessed data

### Large Datasets

1. **Batch Processing** - Process content in batches
2. **Background Jobs** - Use background processing for large syncs
3. **Incremental Updates** - Sync only new/changed content

### Visualization Performance

1. **Node Limits** - Limit visualization to 100-200 nodes
2. **Clustering** - Group related entities for large graphs
3. **Level of Detail** - Show/hide labels based on zoom level

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check Supabase credentials
   - Verify network connectivity
   - Ensure schema is properly initialized

2. **Entity Extraction Failures**
   - Check OpenAI API key
   - Verify content format
   - Review error logs

3. **Visualization Not Loading**
   - Check D3.js installation
   - Verify browser compatibility
   - Review console for JavaScript errors

4. **Sync Issues**
   - Check data source permissions
   - Verify API endpoints
   - Review sync logs

### Debugging

Enable detailed logging:

```typescript
// Add to your environment
DEBUG=knowledge-graph:*
```

Check the browser console and server logs for detailed error information.

## Advanced Configuration

### Custom Entity Types

Add custom entity types by extending the `EntityType` enum:

```typescript
export enum EntityType {
  // ... existing types
  CUSTOM_TYPE = 'custom_type'
}
```

### Custom Relationship Types

Add custom relationship types:

```typescript
export enum RelationshipType {
  // ... existing types
  CUSTOM_RELATION = 'custom_relation'
}
```

### AI Model Configuration

Customize the entity extraction model:

```typescript
// In entity-extraction.ts
const response = await openai.chat.completions.create({
  model: 'gpt-4', // or your preferred model
  temperature: 0.1, // adjust for creativity vs consistency
  // ... other parameters
});
```

## Security Considerations

1. **Authentication** - All endpoints require valid user sessions
2. **Data Isolation** - Users can only access their own data
3. **Input Validation** - All inputs are validated and sanitized
4. **Rate Limiting** - Consider implementing rate limits for API calls

## Future Enhancements

Planned improvements include:

1. **Real-time Collaboration** - Share graphs with team members
2. **Advanced Analytics** - More sophisticated graph metrics
3. **Custom Algorithms** - User-defined connection discovery rules
4. **Export/Import** - Backup and restore graph data
5. **Mobile App** - Native mobile graph exploration
6. **Integration APIs** - Connect with more data sources

## Support

For issues and questions:

1. Check the troubleshooting section
2. Review the API documentation
3. Examine the example code
4. Check the database logs
5. Contact the development team

## License

This Knowledge Graph Agent is part of the KimbleAI system and follows the project's licensing terms.