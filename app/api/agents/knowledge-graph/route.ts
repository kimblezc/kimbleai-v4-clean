import { NextRequest, NextResponse } from 'next/server';
import { knowledgeGraph } from '@/lib/knowledge-graph';
import { knowledgeGraphDB, EntityType, RelationshipType } from '@/lib/knowledge-graph-db';
import { getServerSession } from 'next-auth';

interface KnowledgeGraphRequest {
  action: 'process' | 'search' | 'recommend' | 'discover' | 'stats' | 'graph' | 'initialize';
  content?: string;
  contentType?: 'text' | 'conversation' | 'file' | 'email';
  sourceId?: string;
  metadata?: Record<string, any>;
  query?: string;
  entityId?: string;
  entityTypes?: EntityType[];
  relationshipTypes?: RelationshipType[];
  options?: Record<string, any>;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.email;
    const body: KnowledgeGraphRequest = await request.json();

    switch (body.action) {
      case 'initialize':
        await knowledgeGraph.initialize();
        return NextResponse.json({
          success: true,
          message: 'Knowledge graph initialized successfully'
        });

      case 'process':
        if (!body.content || !body.contentType || !body.sourceId) {
          return NextResponse.json(
            { error: 'Content, contentType, and sourceId are required for processing' },
            { status: 400 }
          );
        }

        const processResult = await knowledgeGraph.processContent(
          body.content,
          body.contentType,
          body.sourceId,
          userId,
          body.metadata || {}
        );

        return NextResponse.json({
          success: true,
          data: processResult,
          message: `Processed content and extracted ${processResult.entities.length} entities and ${processResult.relationships.length} relationships`
        });

      case 'search':
        if (!body.query) {
          return NextResponse.json(
            { error: 'Query is required for search' },
            { status: 400 }
          );
        }

        const searchResult = await knowledgeGraph.searchGraph(
          body.query,
          userId,
          {
            entityTypes: body.entityTypes,
            relationshipTypes: body.relationshipTypes,
            maxResults: body.options?.maxResults || 50,
            includeConnections: body.options?.includeConnections || false
          }
        );

        return NextResponse.json({
          success: true,
          data: searchResult,
          message: `Found ${searchResult.entities.length} entities matching your search`
        });

      case 'recommend':
        if (!body.entityId) {
          return NextResponse.json(
            { error: 'Entity ID is required for recommendations' },
            { status: 400 }
          );
        }

        const recommendations = await knowledgeGraph.getEntityRecommendations(
          body.entityId,
          userId
        );

        return NextResponse.json({
          success: true,
          data: recommendations,
          message: `Generated ${recommendations.recommendedEntities.length} recommendations and ${recommendations.potentialConnections.length} potential connections`
        });

      case 'discover':
        const insights = await knowledgeGraph.discoverConnections(userId);

        return NextResponse.json({
          success: true,
          data: { insights },
          message: `Discovered ${insights.length} insights about your knowledge graph`
        });

      case 'stats':
        const stats = await knowledgeGraph.getGraphStats(userId);

        return NextResponse.json({
          success: true,
          data: stats,
          message: 'Knowledge graph statistics retrieved successfully'
        });

      case 'graph':
        const centerEntityId = body.options?.centerEntityId;
        const graphData = await knowledgeGraphDB.getEntityGraph(userId, centerEntityId);

        return NextResponse.json({
          success: true,
          data: graphData,
          message: 'Knowledge graph data retrieved successfully'
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action specified' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Knowledge Graph Agent error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.email;
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    switch (action) {
      case 'stats':
        const stats = await knowledgeGraph.getGraphStats(userId);
        return NextResponse.json({
          success: true,
          data: stats
        });

      case 'graph':
        const centerEntityId = searchParams.get('centerEntityId') || undefined;
        const graphData = await knowledgeGraphDB.getEntityGraph(userId, centerEntityId);
        return NextResponse.json({
          success: true,
          data: graphData
        });

      case 'entities':
        const entityType = searchParams.get('type') as EntityType;
        const entities = entityType
          ? await knowledgeGraphDB.getEntitiesByType(entityType, userId)
          : [];

        return NextResponse.json({
          success: true,
          data: { entities }
        });

      case 'search':
        const query = searchParams.get('query');
        if (!query) {
          return NextResponse.json(
            { error: 'Query parameter is required' },
            { status: 400 }
          );
        }

        const entityTypesParam = searchParams.get('entityTypes');
        const entityTypes = entityTypesParam
          ? entityTypesParam.split(',') as EntityType[]
          : undefined;

        const searchResult = await knowledgeGraph.searchGraph(
          query,
          userId,
          {
            entityTypes,
            maxResults: parseInt(searchParams.get('maxResults') || '50'),
            includeConnections: searchParams.get('includeConnections') === 'true'
          }
        );

        return NextResponse.json({
          success: true,
          data: searchResult
        });

      case 'insights':
        const insights = await knowledgeGraph.discoverConnections(userId);
        return NextResponse.json({
          success: true,
          data: { insights }
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action specified' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Knowledge Graph Agent GET error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Additional endpoints for specific operations

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { entityId, relationshipId, updates } = body;

    if (entityId && updates.confidence !== undefined) {
      await knowledgeGraphDB.updateEntityConfidence(entityId, updates.confidence);
      return NextResponse.json({
        success: true,
        message: 'Entity confidence updated successfully'
      });
    }

    if (relationshipId && updates.strength !== undefined) {
      await knowledgeGraphDB.updateRelationshipStrength(relationshipId, updates.strength);
      return NextResponse.json({
        success: true,
        message: 'Relationship strength updated successfully'
      });
    }

    return NextResponse.json(
      { error: 'Invalid update request' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Knowledge Graph Agent PUT error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const entityId = searchParams.get('entityId');

    if (!entityId) {
      return NextResponse.json(
        { error: 'Entity ID is required' },
        { status: 400 }
      );
    }

    await knowledgeGraphDB.deleteEntity(entityId);

    return NextResponse.json({
      success: true,
      message: 'Entity and related relationships deleted successfully'
    });
  } catch (error) {
    console.error('Knowledge Graph Agent DELETE error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}