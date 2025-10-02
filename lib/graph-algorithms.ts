import { Entity, Relationship, EntityType, RelationshipType, knowledgeGraphDB } from './knowledge-graph-db';

export interface GraphMetrics {
  centrality: Map<string, number>;
  clustering: Map<string, number>;
  communities: Map<string, string[]>;
  shortestPaths: Map<string, Map<string, number>>;
  pageRank: Map<string, number>;
}

export interface ConnectionRecommendation {
  fromEntityId: string;
  toEntityId: string;
  suggestedRelationship: RelationshipType;
  confidence: number;
  evidence: string[];
  reasoning: string;
  strength: number;
  metadata?: Record<string, any>;
}

export interface ClusterAnalysis {
  clusterId: string;
  entities: Entity[];
  theme: string;
  coherence: number;
  centroids: Entity[];
  relationships: Relationship[];
  keywords: string[];
}

export interface PathAnalysis {
  fromEntity: Entity;
  toEntity: Entity;
  paths: Array<{
    entities: Entity[];
    relationships: Relationship[];
    length: number;
    strength: number;
  }>;
  shortestPath: number;
  strongestPath: number;
}

export class GraphAlgorithms {
  private db = knowledgeGraphDB;

  async calculateCentralityMetrics(userId: string): Promise<GraphMetrics> {
    const graph = await this.buildGraphStructure(userId);

    return {
      centrality: this.calculateBetweennessCentrality(graph),
      clustering: this.calculateClusteringCoefficient(graph),
      communities: await this.detectCommunities(graph, userId),
      shortestPaths: this.calculateShortestPaths(graph),
      pageRank: this.calculatePageRank(graph)
    };
  }

  async findConnectionRecommendations(
    userId: string,
    entityId?: string,
    maxRecommendations: number = 20
  ): Promise<ConnectionRecommendation[]> {
    const recommendations: ConnectionRecommendation[] = [];

    // Get all entities for the user
    const allEntities = await this.getAllUserEntities(userId);
    const graph = await this.buildGraphStructure(userId);

    // Focus on specific entity if provided
    const targetEntities = entityId
      ? allEntities.filter(e => e.id === entityId)
      : allEntities;

    for (const entity of targetEntities) {
      const entityRecommendations = await this.generateEntityRecommendations(
        entity,
        allEntities,
        graph,
        userId
      );
      recommendations.push(...entityRecommendations);
    }

    // Sort by confidence and return top recommendations
    return recommendations
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, maxRecommendations);
  }

  private async generateEntityRecommendations(
    entity: Entity,
    allEntities: Entity[],
    graph: GraphStructure,
    userId: string
  ): Promise<ConnectionRecommendation[]> {
    const recommendations: ConnectionRecommendation[] = [];

    // 1. Similar entities not yet connected
    const similarEntities = await this.findSimilarEntities(entity, allEntities, graph);
    for (const similar of similarEntities) {
      if (!this.areConnected(entity.id, similar.id, graph)) {
        recommendations.push({
          fromEntityId: entity.id,
          toEntityId: similar.id,
          suggestedRelationship: RelationshipType.SIMILAR_TO,
          confidence: this.calculateSimilarityConfidence(entity, similar),
          evidence: ['Content similarity', 'Type similarity', 'Metadata overlap'],
          reasoning: `Similar ${entity.type} entities with overlapping characteristics`,
          strength: 0.7,
          metadata: { algorithm: 'similarity_analysis' }
        });
      }
    }

    // 2. Collaborative filtering recommendations
    const collaborativeRecs = await this.getCollaborativeRecommendations(entity, graph, userId);
    recommendations.push(...collaborativeRecs);

    // 3. Transitive closure recommendations
    const transitiveRecs = this.getTransitiveRecommendations(entity, graph);
    recommendations.push(...transitiveRecs);

    // 4. Temporal pattern recommendations
    const temporalRecs = await this.getTemporalRecommendations(entity, userId);
    recommendations.push(...temporalRecs);

    // 5. Content-based recommendations
    const contentRecs = await this.getContentBasedRecommendations(entity, allEntities);
    recommendations.push(...contentRecs);

    return recommendations;
  }

  private async getCollaborativeRecommendations(
    entity: Entity,
    graph: GraphStructure,
    userId: string
  ): Promise<ConnectionRecommendation[]> {
    const recommendations: ConnectionRecommendation[] = [];
    const connectedEntities = graph.adjacencyList.get(entity.id) || [];

    // Find entities that are frequently connected to the same entities as the target entity
    for (const connectedId of connectedEntities) {
      const secondDegreeConnections = graph.adjacencyList.get(connectedId) || [];

      for (const secondDegreeId of secondDegreeConnections) {
        if (secondDegreeId !== entity.id && !connectedEntities.includes(secondDegreeId)) {
          const commonConnections = this.findCommonConnections(entity.id, secondDegreeId, graph);

          if (commonConnections.length >= 2) {
            const targetEntity = await this.db.getEntity(secondDegreeId);
            if (targetEntity) {
              recommendations.push({
                fromEntityId: entity.id,
                toEntityId: secondDegreeId,
                suggestedRelationship: this.suggestRelationshipType(entity, targetEntity),
                confidence: Math.min(0.9, 0.5 + (commonConnections.length * 0.1)),
                evidence: [`${commonConnections.length} common connections`],
                reasoning: `Entities with multiple shared connections often have relationships`,
                strength: 0.6,
                metadata: {
                  algorithm: 'collaborative_filtering',
                  commonConnections: commonConnections.length
                }
              });
            }
          }
        }
      }
    }

    return recommendations;
  }

  private getTransitiveRecommendations(
    entity: Entity,
    graph: GraphStructure
  ): ConnectionRecommendation[] {
    const recommendations: ConnectionRecommendation[] = [];
    const paths = this.findShortestPaths(entity.id, graph, 3); // Max depth of 3

    for (const [targetId, pathLength] of paths) {
      if (pathLength === 2) { // Only recommend entities 2 steps away
        const relationshipType = this.inferTransitiveRelationship(entity.id, targetId, graph);

        recommendations.push({
          fromEntityId: entity.id,
          toEntityId: targetId,
          suggestedRelationship: relationshipType,
          confidence: 0.6 - (pathLength - 2) * 0.1,
          evidence: [`Connected through ${pathLength - 1} intermediate entities`],
          reasoning: 'Transitive relationship pattern detected',
          strength: 0.5,
          metadata: {
            algorithm: 'transitive_closure',
            pathLength
          }
        });
      }
    }

    return recommendations;
  }

  private async getTemporalRecommendations(
    entity: Entity,
    userId: string
  ): Promise<ConnectionRecommendation[]> {
    const recommendations: ConnectionRecommendation[] = [];

    // Find entities created around the same time
    const entityDate = new Date(entity.created_at);
    const timeWindow = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

    const recentActivity = await this.db.getRecentActivity(userId, 24 * 7); // Last week

    for (const recentEntity of recentActivity.entities) {
      if (recentEntity.id === entity.id) continue;

      const recentDate = new Date(recentEntity.created_at);
      const timeDiff = Math.abs(entityDate.getTime() - recentDate.getTime());

      if (timeDiff <= timeWindow) {
        recommendations.push({
          fromEntityId: entity.id,
          toEntityId: recentEntity.id,
          suggestedRelationship: RelationshipType.RELATES_TO,
          confidence: 0.5 + (1 - timeDiff / timeWindow) * 0.3,
          evidence: ['Created in similar timeframe'],
          reasoning: 'Entities created around the same time often relate to the same context',
          strength: 0.4,
          metadata: {
            algorithm: 'temporal_pattern',
            timeDiff: timeDiff
          }
        });
      }
    }

    return recommendations;
  }

  private async getContentBasedRecommendations(
    entity: Entity,
    allEntities: Entity[]
  ): Promise<ConnectionRecommendation[]> {
    const recommendations: ConnectionRecommendation[] = [];

    if (!entity.content) return recommendations;

    const entityKeywords = this.extractKeywords(entity.content);

    for (const otherEntity of allEntities) {
      if (otherEntity.id === entity.id || !otherEntity.content) continue;

      const otherKeywords = this.extractKeywords(otherEntity.content);
      const commonKeywords = entityKeywords.filter(kw => otherKeywords.includes(kw));

      if (commonKeywords.length >= 2) {
        const similarity = commonKeywords.length / Math.max(entityKeywords.length, otherKeywords.length);

        recommendations.push({
          fromEntityId: entity.id,
          toEntityId: otherEntity.id,
          suggestedRelationship: RelationshipType.RELATES_TO,
          confidence: Math.min(0.8, similarity * 1.2),
          evidence: [`Shared keywords: ${commonKeywords.join(', ')}`],
          reasoning: 'Entities with shared content keywords likely relate to similar topics',
          strength: similarity,
          metadata: {
            algorithm: 'content_based',
            sharedKeywords: commonKeywords
          }
        });
      }
    }

    return recommendations;
  }

  async analyzeConnectionPatterns(userId: string): Promise<{
    strongConnections: Relationship[];
    weakConnections: Relationship[];
    missingConnections: ConnectionRecommendation[];
    redundantConnections: Relationship[];
  }> {
    const allRelationships = await this.getAllUserRelationships(userId);

    const strongConnections = allRelationships.filter(rel => rel.strength > 0.7);
    const weakConnections = allRelationships.filter(rel => rel.strength < 0.3);
    const missingConnections = await this.findConnectionRecommendations(userId);
    const redundantConnections = this.findRedundantConnections(allRelationships);

    return {
      strongConnections,
      weakConnections,
      missingConnections,
      redundantConnections
    };
  }

  async performClusterAnalysis(userId: string): Promise<ClusterAnalysis[]> {
    const allEntities = await this.getAllUserEntities(userId);
    const graph = await this.buildGraphStructure(userId);

    const communities = await this.detectCommunities(graph, userId);
    const clusters: ClusterAnalysis[] = [];

    for (const [clusterId, entityIds] of communities) {
      const clusterEntities = allEntities.filter(e => entityIds.includes(e.id));
      const clusterRelationships = await this.getClusterRelationships(entityIds, userId);

      clusters.push({
        clusterId,
        entities: clusterEntities,
        theme: await this.identifyClusterTheme(clusterEntities),
        coherence: this.calculateClusterCoherence(clusterEntities, clusterRelationships),
        centroids: this.findClusterCentroids(clusterEntities, graph),
        relationships: clusterRelationships,
        keywords: this.extractClusterKeywords(clusterEntities)
      });
    }

    return clusters.sort((a, b) => b.coherence - a.coherence);
  }

  async findShortestPath(
    fromEntityId: string,
    toEntityId: string,
    userId: string
  ): Promise<PathAnalysis | null> {
    const graph = await this.buildGraphStructure(userId);
    const paths = this.findAllPaths(fromEntityId, toEntityId, graph, 5); // Max length 5

    if (paths.length === 0) return null;

    const fromEntity = await this.db.getEntity(fromEntityId);
    const toEntity = await this.db.getEntity(toEntityId);

    if (!fromEntity || !toEntity) return null;

    const shortestPath = Math.min(...paths.map(p => p.length));
    const strongestPath = Math.max(...paths.map(p => p.strength));

    return {
      fromEntity,
      toEntity,
      paths,
      shortestPath,
      strongestPath
    };
  }

  // Helper methods

  private async buildGraphStructure(userId: string): Promise<GraphStructure> {
    const entities = await this.getAllUserEntities(userId);
    const relationships = await this.getAllUserRelationships(userId);

    const adjacencyList = new Map<string, string[]>();
    const edgeWeights = new Map<string, number>();

    // Initialize adjacency list
    for (const entity of entities) {
      adjacencyList.set(entity.id, []);
    }

    // Build adjacency list and edge weights
    for (const rel of relationships) {
      const fromConnections = adjacencyList.get(rel.from_entity_id) || [];
      const toConnections = adjacencyList.get(rel.to_entity_id) || [];

      fromConnections.push(rel.to_entity_id);
      toConnections.push(rel.from_entity_id);

      adjacencyList.set(rel.from_entity_id, fromConnections);
      adjacencyList.set(rel.to_entity_id, toConnections);

      edgeWeights.set(`${rel.from_entity_id}-${rel.to_entity_id}`, rel.strength);
      edgeWeights.set(`${rel.to_entity_id}-${rel.from_entity_id}`, rel.strength);
    }

    return {
      entities,
      relationships,
      adjacencyList,
      edgeWeights
    };
  }

  private calculateBetweennessCentrality(graph: GraphStructure): Map<string, number> {
    const centrality = new Map<string, number>();

    // Initialize centrality scores
    for (const entity of graph.entities) {
      centrality.set(entity.id, 0);
    }

    // Calculate betweenness centrality for each node
    for (const entity of graph.entities) {
      const paths = this.findShortestPaths(entity.id, graph);

      for (const [targetId, distance] of paths) {
        if (targetId !== entity.id) {
          const pathNodes = this.getPathNodes(entity.id, targetId, graph);

          for (const nodeId of pathNodes) {
            if (nodeId !== entity.id && nodeId !== targetId) {
              const current = centrality.get(nodeId) || 0;
              centrality.set(nodeId, current + 1);
            }
          }
        }
      }
    }

    return centrality;
  }

  private calculateClusteringCoefficient(graph: GraphStructure): Map<string, number> {
    const clustering = new Map<string, number>();

    for (const entity of graph.entities) {
      const neighbors = graph.adjacencyList.get(entity.id) || [];

      if (neighbors.length < 2) {
        clustering.set(entity.id, 0);
        continue;
      }

      let connections = 0;
      const possibleConnections = (neighbors.length * (neighbors.length - 1)) / 2;

      for (let i = 0; i < neighbors.length; i++) {
        for (let j = i + 1; j < neighbors.length; j++) {
          const neighbor1Connections = graph.adjacencyList.get(neighbors[i]) || [];
          if (neighbor1Connections.includes(neighbors[j])) {
            connections++;
          }
        }
      }

      clustering.set(entity.id, connections / possibleConnections);
    }

    return clustering;
  }

  private calculatePageRank(graph: GraphStructure, dampingFactor: number = 0.85): Map<string, number> {
    const pageRank = new Map<string, number>();
    const numNodes = graph.entities.length;

    // Initialize PageRank values
    for (const entity of graph.entities) {
      pageRank.set(entity.id, 1 / numNodes);
    }

    // Iterate until convergence
    for (let iter = 0; iter < 100; iter++) {
      const newPageRank = new Map<string, number>();

      for (const entity of graph.entities) {
        let sum = 0;
        const incomingNodes = this.getIncomingNodes(entity.id, graph);

        for (const incomingId of incomingNodes) {
          const outgoingCount = (graph.adjacencyList.get(incomingId) || []).length;
          if (outgoingCount > 0) {
            sum += (pageRank.get(incomingId) || 0) / outgoingCount;
          }
        }

        newPageRank.set(entity.id, (1 - dampingFactor) / numNodes + dampingFactor * sum);
      }

      pageRank.clear();
      for (const [id, value] of newPageRank) {
        pageRank.set(id, value);
      }
    }

    return pageRank;
  }

  private async detectCommunities(graph: GraphStructure, userId: string): Promise<Map<string, string[]>> {
    // Simple community detection using connected components and modularity
    const communities = new Map<string, string[]>();
    const visited = new Set<string>();
    let communityId = 0;

    for (const entity of graph.entities) {
      if (!visited.has(entity.id)) {
        const community = this.dfsComponent(entity.id, graph, visited);
        communities.set(`community_${communityId++}`, community);
      }
    }

    return communities;
  }

  private dfsComponent(startId: string, graph: GraphStructure, visited: Set<string>): string[] {
    const component: string[] = [];
    const stack = [startId];

    while (stack.length > 0) {
      const currentId = stack.pop()!;

      if (!visited.has(currentId)) {
        visited.add(currentId);
        component.push(currentId);

        const neighbors = graph.adjacencyList.get(currentId) || [];
        for (const neighborId of neighbors) {
          if (!visited.has(neighborId)) {
            stack.push(neighborId);
          }
        }
      }
    }

    return component;
  }

  private calculateShortestPaths(graph: GraphStructure): Map<string, Map<string, number>> {
    const distances = new Map<string, Map<string, number>>();

    // Floyd-Warshall algorithm for all-pairs shortest paths
    for (const entity of graph.entities) {
      distances.set(entity.id, new Map());

      for (const other of graph.entities) {
        if (entity.id === other.id) {
          distances.get(entity.id)!.set(other.id, 0);
        } else {
          const neighbors = graph.adjacencyList.get(entity.id) || [];
          if (neighbors.includes(other.id)) {
            distances.get(entity.id)!.set(other.id, 1);
          } else {
            distances.get(entity.id)!.set(other.id, Infinity);
          }
        }
      }
    }

    // Floyd-Warshall iterations
    for (const k of graph.entities) {
      for (const i of graph.entities) {
        for (const j of graph.entities) {
          const distIK = distances.get(i.id)!.get(k.id)!;
          const distKJ = distances.get(k.id)!.get(j.id)!;
          const distIJ = distances.get(i.id)!.get(j.id)!;

          if (distIK + distKJ < distIJ) {
            distances.get(i.id)!.set(j.id, distIK + distKJ);
          }
        }
      }
    }

    return distances;
  }

  // Additional helper methods...
  private async getAllUserEntities(userId: string): Promise<Entity[]> {
    const allEntities: Entity[] = [];
    for (const type of Object.values(EntityType)) {
      const entities = await this.db.getEntitiesByType(type, userId);
      allEntities.push(...entities);
    }
    return allEntities;
  }

  private async getAllUserRelationships(userId: string): Promise<Relationship[]> {
    // This would require a new method in the database layer
    // For now, return empty array
    return [];
  }

  // ... More helper methods would be implemented here
}

interface GraphStructure {
  entities: Entity[];
  relationships: Relationship[];
  adjacencyList: Map<string, string[]>;
  edgeWeights: Map<string, number>;
}

export const graphAlgorithms = new GraphAlgorithms();