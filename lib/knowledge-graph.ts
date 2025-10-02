import {
  knowledgeGraphDB,
  Entity,
  Relationship,
  EntityType,
  RelationshipType,
  KnowledgeGraphDB
} from './knowledge-graph-db';
import {
  entityExtractor,
  ExtractedEntity,
  ExtractedRelationship,
  ExtractionResult
} from './entity-extraction';

export interface KnowledgeGraphNode extends Entity {
  connections: number;
  centrality?: number;
  cluster?: string;
}

export interface KnowledgeGraphEdge extends Relationship {
  weight?: number;
}

export interface GraphInsight {
  type: 'connection' | 'cluster' | 'trend' | 'anomaly' | 'recommendation';
  title: string;
  description: string;
  entities: string[];
  confidence: number;
  actionable?: boolean;
  metadata?: Record<string, any>;
}

export interface RecommendationResult {
  entityId: string;
  recommendedEntities: Array<{
    entity: Entity;
    reason: string;
    confidence: number;
    relationshipType: RelationshipType;
  }>;
  potentialConnections: Array<{
    fromEntity: Entity;
    toEntity: Entity;
    suggestedRelationship: RelationshipType;
    evidence: string;
    confidence: number;
  }>;
}

export class KnowledgeGraph {
  private db: KnowledgeGraphDB;

  constructor() {
    this.db = knowledgeGraphDB;
  }

  async initialize(): Promise<void> {
    await this.db.initializeSchema();
  }

  async processContent(
    content: string,
    contentType: 'text' | 'conversation' | 'file' | 'email',
    sourceId: string,
    userId: string,
    metadata: Record<string, any> = {}
  ): Promise<{
    entities: Entity[];
    relationships: Relationship[];
    insights: GraphInsight[];
  }> {
    let extractionResult: ExtractionResult;

    // Extract entities and relationships based on content type
    switch (contentType) {
      case 'conversation':
        const messages = metadata.messages || [];
        extractionResult = await entityExtractor.extractFromConversation(messages, sourceId, userId);
        break;
      case 'file':
        extractionResult = await entityExtractor.extractFromFile(sourceId, content, userId);
        break;
      case 'email':
        extractionResult = await entityExtractor.extractFromEmail(metadata.emailData, userId);
        break;
      default:
        extractionResult = await entityExtractor.extractFromText(content, sourceId, contentType, userId);
    }

    // Create entities in the knowledge graph
    const createdEntities: Entity[] = [];
    const entityMap = new Map<string, Entity>();

    for (const extractedEntity of extractionResult.entities) {
      if (!entityExtractor.validateEntity(extractedEntity)) continue;

      try {
        // Check if similar entity already exists
        const existingEntities = await this.db.searchEntities(
          extractedEntity.name,
          userId,
          [extractedEntity.type]
        );

        let entity: Entity;

        if (existingEntities.length > 0) {
          // Update existing entity
          entity = existingEntities[0];
          await this.db.updateEntityConfidence(
            entity.id,
            Math.max(entity.confidence_score, extractedEntity.confidence)
          );
        } else {
          // Create new entity
          entity = await this.db.createEntity({
            type: extractedEntity.type,
            name: extractedEntity.name,
            content: extractedEntity.context || '',
            metadata: {
              mentions: extractedEntity.mentions,
              firstSeen: new Date().toISOString(),
              sources: [sourceId],
              ...metadata
            },
            user_id: userId,
            confidence_score: extractedEntity.confidence,
            source_id: sourceId,
            source_type: contentType
          });
        }

        createdEntities.push(entity);
        entityMap.set(extractedEntity.name.toLowerCase(), entity);
      } catch (error) {
        console.error('Error creating entity:', extractedEntity.name, error);
      }
    }

    // Create relationships
    const createdRelationships: Relationship[] = [];

    for (const extractedRel of extractionResult.relationships) {
      if (!entityExtractor.validateRelationship(extractedRel)) continue;

      const fromEntity = entityMap.get(extractedRel.fromEntity.toLowerCase());
      const toEntity = entityMap.get(extractedRel.toEntity.toLowerCase());

      if (fromEntity && toEntity) {
        try {
          const relationship = await this.db.createRelationship({
            from_entity_id: fromEntity.id,
            to_entity_id: toEntity.id,
            relationship_type: extractedRel.relationshipType,
            strength: extractedRel.confidence,
            metadata: {
              evidence: extractedRel.evidence,
              source: sourceId,
              extractedAt: new Date().toISOString()
            },
            user_id: userId,
            confidence_score: extractedRel.confidence,
            evidence: [extractedRel.evidence]
          });

          createdRelationships.push(relationship);
        } catch (error) {
          console.error('Error creating relationship:', extractedRel, error);
        }
      }
    }

    // Generate insights
    const insights = await this.generateInsights(createdEntities, createdRelationships, userId);

    return {
      entities: createdEntities,
      relationships: createdRelationships,
      insights
    };
  }

  async getEntityRecommendations(entityId: string, userId: string): Promise<RecommendationResult> {
    const entity = await this.db.getEntity(entityId);
    if (!entity) {
      throw new Error('Entity not found');
    }

    // Get connected entities
    const connected = await this.db.getConnectedEntities(entityId, 2);

    // Find similar entities
    const similar = await this.db.findSimilarEntities(entity, 0.6);

    // Get entities of the same type
    const sameType = await this.db.getEntitiesByType(entity.type, userId);

    // Generate recommendations based on graph analysis
    const recommendedEntities = [];
    const potentialConnections = [];

    // Recommend similar entities not yet connected
    for (const similarEntity of similar) {
      const isConnected = connected.relationships.some(rel =>
        rel.from_entity_id === similarEntity.id || rel.to_entity_id === similarEntity.id
      );

      if (!isConnected) {
        recommendedEntities.push({
          entity: similarEntity,
          reason: `Similar ${entity.type} with high content similarity`,
          confidence: 0.8,
          relationshipType: RelationshipType.SIMILAR_TO
        });
      }
    }

    // Recommend entities that frequently co-occur with connected entities
    for (const connectedEntity of connected.entities) {
      if (connectedEntity.id === entityId) continue;

      const connectedEntityConnections = await this.db.getConnectedEntities(connectedEntity.id, 1);

      for (const secondDegree of connectedEntityConnections.entities) {
        if (secondDegree.id === entityId || secondDegree.id === connectedEntity.id) continue;

        const isAlreadyConnected = connected.entities.some(e => e.id === secondDegree.id);

        if (!isAlreadyConnected) {
          potentialConnections.push({
            fromEntity: entity,
            toEntity: secondDegree,
            suggestedRelationship: RelationshipType.RELATES_TO,
            evidence: `Connected through ${connectedEntity.name}`,
            confidence: 0.6
          });
        }
      }
    }

    return {
      entityId,
      recommendedEntities: recommendedEntities.slice(0, 10),
      potentialConnections: potentialConnections.slice(0, 10)
    };
  }

  async discoverConnections(userId: string): Promise<GraphInsight[]> {
    const insights: GraphInsight[] = [];

    // Find highly connected entities (hubs)
    const topConnected = await this.db.getTopEntitiesByConnections(userId, 5);

    if (topConnected.length > 0) {
      insights.push({
        type: 'connection',
        title: 'Knowledge Hubs Identified',
        description: `Found ${topConnected.length} highly connected entities that serve as knowledge hubs`,
        entities: topConnected.map(e => e.name),
        confidence: 0.9,
        actionable: true,
        metadata: { entities: topConnected }
      });
    }

    // Find potential missing connections
    const potentialConnections = await this.findPotentialConnections(userId);

    if (potentialConnections.length > 0) {
      insights.push({
        type: 'recommendation',
        title: 'Potential Connections Discovered',
        description: `Identified ${potentialConnections.length} potential relationships that could strengthen your knowledge graph`,
        entities: potentialConnections.map(pc => `${pc.fromEntity.name} - ${pc.toEntity.name}`),
        confidence: 0.7,
        actionable: true,
        metadata: { potentialConnections }
      });
    }

    // Find clusters of related entities
    const clusters = await this.identifyClusters(userId);

    for (const cluster of clusters) {
      insights.push({
        type: 'cluster',
        title: `${cluster.theme} Cluster`,
        description: `Found cluster of ${cluster.entities.length} related entities around ${cluster.theme}`,
        entities: cluster.entities.map(e => e.name),
        confidence: cluster.confidence,
        metadata: { cluster }
      });
    }

    return insights;
  }

  private async generateInsights(
    entities: Entity[],
    relationships: Relationship[],
    userId: string
  ): Promise<GraphInsight[]> {
    const insights: GraphInsight[] = [];

    // Analyze new connections
    if (relationships.length > 0) {
      insights.push({
        type: 'connection',
        title: 'New Connections Established',
        description: `Added ${relationships.length} new relationships to your knowledge graph`,
        entities: entities.map(e => e.name),
        confidence: 0.8
      });
    }

    // Identify high-value entities
    const highValueEntities = entities.filter(e => e.confidence_score > 0.8);

    if (highValueEntities.length > 0) {
      insights.push({
        type: 'trend',
        title: 'High-Confidence Entities Added',
        description: `Identified ${highValueEntities.length} high-confidence entities`,
        entities: highValueEntities.map(e => e.name),
        confidence: 0.9,
        actionable: true
      });
    }

    return insights;
  }

  private async findPotentialConnections(userId: string): Promise<Array<{
    fromEntity: Entity;
    toEntity: Entity;
    suggestedRelationship: RelationshipType;
    evidence: string;
    confidence: number;
  }>> {
    const allEntities = await this.db.getEntitiesByType(EntityType.PERSON, userId);
    allEntities.push(...await this.db.getEntitiesByType(EntityType.PROJECT, userId));
    allEntities.push(...await this.db.getEntitiesByType(EntityType.ORGANIZATION, userId));

    const potentialConnections = [];

    // Look for entities that appear in similar contexts
    for (let i = 0; i < allEntities.length; i++) {
      for (let j = i + 1; j < allEntities.length; j++) {
        const entity1 = allEntities[i];
        const entity2 = allEntities[j];

        // Check if they're already connected
        const relationships = await this.db.getRelationships(entity1.id);
        const isConnected = relationships.some(rel =>
          rel.from_entity_id === entity2.id || rel.to_entity_id === entity2.id
        );

        if (!isConnected) {
          // Analyze potential connection based on metadata and content
          const similarity = this.calculateEntitySimilarity(entity1, entity2);

          if (similarity > 0.6) {
            potentialConnections.push({
              fromEntity: entity1,
              toEntity: entity2,
              suggestedRelationship: RelationshipType.RELATES_TO,
              evidence: 'Similar content and metadata patterns',
              confidence: similarity
            });
          }
        }
      }
    }

    return potentialConnections.slice(0, 10);
  }

  private async identifyClusters(userId: string): Promise<Array<{
    theme: string;
    entities: Entity[];
    confidence: number;
  }>> {
    const clusters = [];

    // Group by entity type first
    const entityTypes = Object.values(EntityType);

    for (const type of entityTypes) {
      const entities = await this.db.getEntitiesByType(type, userId);

      if (entities.length >= 3) {
        clusters.push({
          theme: type.charAt(0).toUpperCase() + type.slice(1),
          entities: entities.slice(0, 10),
          confidence: 0.8
        });
      }
    }

    return clusters;
  }

  private calculateEntitySimilarity(entity1: Entity, entity2: Entity): number {
    let similarity = 0;

    // Type similarity
    if (entity1.type === entity2.type) {
      similarity += 0.3;
    }

    // Name similarity (simple word overlap)
    const words1 = entity1.name.toLowerCase().split(/\s+/);
    const words2 = entity2.name.toLowerCase().split(/\s+/);
    const commonWords = words1.filter(word => words2.includes(word));
    const wordSimilarity = commonWords.length / Math.max(words1.length, words2.length);
    similarity += wordSimilarity * 0.4;

    // Metadata similarity
    const metadata1 = entity1.metadata || {};
    const metadata2 = entity2.metadata || {};
    const commonKeys = Object.keys(metadata1).filter(key => key in metadata2);
    const metadataSimilarity = commonKeys.length / Math.max(
      Object.keys(metadata1).length,
      Object.keys(metadata2).length
    );
    similarity += metadataSimilarity * 0.3;

    return Math.min(1, similarity);
  }

  async getGraphStats(userId: string): Promise<{
    totalEntities: number;
    totalRelationships: number;
    entityTypeDistribution: Record<string, number>;
    relationshipTypeDistribution: Record<string, number>;
    topConnectedEntities: Entity[];
    recentActivity: {
      entities: Entity[];
      relationships: Relationship[];
    };
  }> {
    const [entityStats, relationshipStats, topConnected, recentActivity] = await Promise.all([
      this.getEntityStats(userId),
      this.getRelationshipStats(userId),
      this.db.getTopEntitiesByConnections(userId, 5),
      this.db.getRecentActivity(userId, 24)
    ]);

    return {
      totalEntities: entityStats.total,
      totalRelationships: relationshipStats.total,
      entityTypeDistribution: entityStats.typeDistribution,
      relationshipTypeDistribution: relationshipStats.typeDistribution,
      topConnectedEntities: topConnected,
      recentActivity
    };
  }

  private async getEntityStats(userId: string): Promise<{
    total: number;
    typeDistribution: Record<string, number>;
  }> {
    const typeDistribution: Record<string, number> = {};
    let total = 0;

    for (const type of Object.values(EntityType)) {
      const entities = await this.db.getEntitiesByType(type, userId);
      typeDistribution[type] = entities.length;
      total += entities.length;
    }

    return { total, typeDistribution };
  }

  private async getRelationshipStats(userId: string): Promise<{
    total: number;
    typeDistribution: Record<string, number>;
  }> {
    // This would require a database query to count relationships by type
    // For now, returning a placeholder implementation
    return {
      total: 0,
      typeDistribution: {}
    };
  }

  async searchGraph(
    query: string,
    userId: string,
    options: {
      entityTypes?: EntityType[];
      relationshipTypes?: RelationshipType[];
      maxResults?: number;
      includeConnections?: boolean;
    } = {}
  ): Promise<{
    entities: Entity[];
    relationships: Relationship[];
    graph?: { nodes: KnowledgeGraphNode[]; edges: KnowledgeGraphEdge[] };
  }> {
    const entities = await this.db.searchEntities(
      query,
      userId,
      options.entityTypes
    );

    let relationships: Relationship[] = [];
    let graph;

    if (options.includeConnections && entities.length > 0) {
      // Get relationships between found entities
      const entityIds = entities.map(e => e.id);
      const allRelationships = await Promise.all(
        entityIds.map(id => this.db.getRelationships(id))
      );

      relationships = allRelationships
        .flat()
        .filter((rel, index, arr) =>
          arr.findIndex(r => r.id === rel.id) === index
        )
        .filter(rel =>
          entityIds.includes(rel.from_entity_id) &&
          entityIds.includes(rel.to_entity_id)
        );

      // Build graph structure
      graph = {
        nodes: entities.map(entity => ({
          ...entity,
          connections: relationships.filter(rel =>
            rel.from_entity_id === entity.id || rel.to_entity_id === entity.id
          ).length
        })),
        edges: relationships.map(rel => ({
          ...rel,
          weight: rel.strength
        }))
      };
    }

    return {
      entities: entities.slice(0, options.maxResults || 50),
      relationships,
      graph
    };
  }
}

export const knowledgeGraph = new KnowledgeGraph();