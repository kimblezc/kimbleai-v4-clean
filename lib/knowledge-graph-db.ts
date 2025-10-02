import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Database Schema for Knowledge Graph
export interface Entity {
  id: string;
  type: EntityType;
  name: string;
  content?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  user_id: string;
  confidence_score: number;
  source_id?: string;
  source_type?: string;
}

export interface Relationship {
  id: string;
  from_entity_id: string;
  to_entity_id: string;
  relationship_type: RelationshipType;
  strength: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  user_id: string;
  confidence_score: number;
  evidence?: string[];
}

export enum EntityType {
  PERSON = 'person',
  PROJECT = 'project',
  DOCUMENT = 'document',
  CONVERSATION = 'conversation',
  EMAIL = 'email',
  FILE = 'file',
  CONCEPT = 'concept',
  LOCATION = 'location',
  ORGANIZATION = 'organization',
  EVENT = 'event',
  TASK = 'task',
  TOPIC = 'topic',
  TECHNOLOGY = 'technology',
  MEETING = 'meeting'
}

export enum RelationshipType {
  MENTIONS = 'mentions',
  WORKS_ON = 'works_on',
  COLLABORATES_WITH = 'collaborates_with',
  CONTAINS = 'contains',
  RELATES_TO = 'relates_to',
  DEPENDS_ON = 'depends_on',
  CREATED_BY = 'created_by',
  MODIFIED_BY = 'modified_by',
  PART_OF = 'part_of',
  SIMILAR_TO = 'similar_to',
  REFERENCES = 'references',
  FOLLOWS = 'follows',
  PRECEDES = 'precedes',
  LOCATED_IN = 'located_in',
  ASSIGNED_TO = 'assigned_to'
}

export class KnowledgeGraphDB {
  async initializeSchema(): Promise<void> {
    try {
      // Create entities table
      await supabase.rpc('create_entities_table');

      // Create relationships table
      await supabase.rpc('create_relationships_table');

      // Create indexes for performance
      await supabase.rpc('create_kg_indexes');

      console.log('Knowledge graph schema initialized successfully');
    } catch (error) {
      console.error('Error initializing knowledge graph schema:', error);
      throw error;
    }
  }

  async createEntity(entity: Omit<Entity, 'id' | 'created_at' | 'updated_at'>): Promise<Entity> {
    const { data, error } = await supabase
      .from('kg_entities')
      .insert({
        ...entity,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async createRelationship(relationship: Omit<Relationship, 'id' | 'created_at' | 'updated_at'>): Promise<Relationship> {
    const { data, error } = await supabase
      .from('kg_relationships')
      .insert({
        ...relationship,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getEntity(id: string): Promise<Entity | null> {
    const { data, error } = await supabase
      .from('kg_entities')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  async getEntitiesByType(type: EntityType, userId: string): Promise<Entity[]> {
    const { data, error } = await supabase
      .from('kg_entities')
      .select('*')
      .eq('type', type)
      .eq('user_id', userId)
      .order('confidence_score', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getRelationships(entityId: string): Promise<Relationship[]> {
    const { data, error } = await supabase
      .from('kg_relationships')
      .select('*')
      .or(`from_entity_id.eq.${entityId},to_entity_id.eq.${entityId}`)
      .order('strength', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async findSimilarEntities(entity: Entity, threshold: number = 0.7): Promise<Entity[]> {
    // Use text similarity and metadata matching
    const { data, error } = await supabase.rpc('find_similar_entities', {
      entity_id: entity.id,
      entity_type: entity.type,
      entity_name: entity.name,
      similarity_threshold: threshold,
      user_id: entity.user_id
    });

    if (error) throw error;
    return data || [];
  }

  async getConnectedEntities(entityId: string, maxDepth: number = 2): Promise<{
    entities: Entity[];
    relationships: Relationship[];
  }> {
    const { data, error } = await supabase.rpc('get_connected_entities', {
      start_entity_id: entityId,
      max_depth: maxDepth
    });

    if (error) throw error;
    return data || { entities: [], relationships: [] };
  }

  async searchEntities(query: string, userId: string, entityTypes?: EntityType[]): Promise<Entity[]> {
    let queryBuilder = supabase
      .from('kg_entities')
      .select('*')
      .eq('user_id', userId)
      .or(`name.ilike.%${query}%,content.ilike.%${query}%`);

    if (entityTypes && entityTypes.length > 0) {
      queryBuilder = queryBuilder.in('type', entityTypes);
    }

    const { data, error } = await queryBuilder
      .order('confidence_score', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data || [];
  }

  async getEntityGraph(userId: string, centerEntityId?: string): Promise<{
    nodes: Array<Entity & { connections: number }>;
    edges: Relationship[];
  }> {
    const { data, error } = await supabase.rpc('get_entity_graph', {
      user_id: userId,
      center_entity_id: centerEntityId
    });

    if (error) throw error;
    return data || { nodes: [], edges: [] };
  }

  async updateEntityConfidence(entityId: string, newConfidence: number): Promise<void> {
    const { error } = await supabase
      .from('kg_entities')
      .update({
        confidence_score: newConfidence,
        updated_at: new Date().toISOString()
      })
      .eq('id', entityId);

    if (error) throw error;
  }

  async updateRelationshipStrength(relationshipId: string, newStrength: number): Promise<void> {
    const { error } = await supabase
      .from('kg_relationships')
      .update({
        strength: newStrength,
        updated_at: new Date().toISOString()
      })
      .eq('id', relationshipId);

    if (error) throw error;
  }

  async deleteEntity(entityId: string): Promise<void> {
    // Delete relationships first
    await supabase
      .from('kg_relationships')
      .delete()
      .or(`from_entity_id.eq.${entityId},to_entity_id.eq.${entityId}`);

    // Delete entity
    const { error } = await supabase
      .from('kg_entities')
      .delete()
      .eq('id', entityId);

    if (error) throw error;
  }

  async getTopEntitiesByConnections(userId: string, limit: number = 10): Promise<Entity[]> {
    const { data, error } = await supabase.rpc('get_top_connected_entities', {
      user_id: userId,
      result_limit: limit
    });

    if (error) throw error;
    return data || [];
  }

  async getRecentActivity(userId: string, hours: number = 24): Promise<{
    entities: Entity[];
    relationships: Relationship[];
  }> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const [entitiesResponse, relationshipsResponse] = await Promise.all([
      supabase
        .from('kg_entities')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', cutoff)
        .order('created_at', { ascending: false }),

      supabase
        .from('kg_relationships')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', cutoff)
        .order('created_at', { ascending: false })
    ]);

    if (entitiesResponse.error) throw entitiesResponse.error;
    if (relationshipsResponse.error) throw relationshipsResponse.error;

    return {
      entities: entitiesResponse.data || [],
      relationships: relationshipsResponse.data || []
    };
  }
}

export const knowledgeGraphDB = new KnowledgeGraphDB();