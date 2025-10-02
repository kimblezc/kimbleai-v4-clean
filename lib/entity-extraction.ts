import OpenAI from 'openai';
import { EntityType, RelationshipType, Entity, Relationship } from './knowledge-graph-db';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ExtractedEntity {
  name: string;
  type: EntityType;
  confidence: number;
  context?: string;
  mentions: number;
}

export interface ExtractedRelationship {
  fromEntity: string;
  toEntity: string;
  relationshipType: RelationshipType;
  confidence: number;
  evidence: string;
}

export interface ExtractionResult {
  entities: ExtractedEntity[];
  relationships: ExtractedRelationship[];
  summary: string;
  topics: string[];
}

export class EntityExtractor {
  private entityPatterns = {
    [EntityType.PERSON]: [
      /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, // First Last name
      /@([a-zA-Z0-9_]+)/g, // @mentions
      /\b(Mr|Mrs|Ms|Dr|Prof)\. [A-Z][a-z]+ [A-Z][a-z]+\b/g, // Titles
    ],
    [EntityType.EMAIL]: [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    ],
    [EntityType.ORGANIZATION]: [
      /\b[A-Z][A-Za-z0-9&\s]+(Inc|LLC|Corp|Ltd|Company|Co|Organization|Org)\b/g,
      /\b(Google|Microsoft|Apple|Amazon|Meta|OpenAI|Anthropic|Tesla|SpaceX)\b/g,
    ],
    [EntityType.LOCATION]: [
      /\b[A-Z][a-z]+,\s*[A-Z]{2}\b/g, // City, State
      /\b[A-Z][a-z]+\s*[A-Z][a-z]*,\s*[A-Z][a-z]+\b/g, // City, Country
    ],
    [EntityType.TECHNOLOGY]: [
      /\b(React|Next\.js|TypeScript|JavaScript|Python|Node\.js|AWS|Docker|Kubernetes|PostgreSQL|MongoDB|Redis|GraphQL|REST|API|ML|AI|LLM|GPT|Claude|Supabase)\b/gi,
    ],
    [EntityType.FILE]: [
      /\b[\w\-. ]+\.(pdf|doc|docx|txt|md|js|ts|tsx|jsx|py|java|cpp|c|h|csv|xlsx|png|jpg|jpeg|gif|svg)\b/gi,
    ],
  };

  async extractFromText(
    text: string,
    sourceId?: string,
    sourceType?: string,
    userId?: string
  ): Promise<ExtractionResult> {
    try {
      // First, use pattern-based extraction for quick identification
      const patternEntities = this.extractWithPatterns(text);

      // Then use AI for more sophisticated extraction
      const aiResult = await this.extractWithAI(text);

      // Merge and deduplicate results
      const mergedEntities = this.mergeEntities(patternEntities, aiResult.entities);

      return {
        entities: mergedEntities,
        relationships: aiResult.relationships,
        summary: aiResult.summary,
        topics: aiResult.topics,
      };
    } catch (error) {
      console.error('Error in entity extraction:', error);
      // Fallback to pattern-based extraction only
      return {
        entities: this.extractWithPatterns(text),
        relationships: [],
        summary: text.substring(0, 200) + '...',
        topics: [],
      };
    }
  }

  private extractWithPatterns(text: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];
    const entityMap = new Map<string, ExtractedEntity>();

    for (const [entityType, patterns] of Object.entries(this.entityPatterns)) {
      for (const pattern of patterns) {
        const matches = text.match(pattern) || [];

        for (const match of matches) {
          const cleanMatch = match.trim();
          if (cleanMatch.length < 2) continue;

          const key = `${cleanMatch.toLowerCase()}_${entityType}`;

          if (entityMap.has(key)) {
            entityMap.get(key)!.mentions++;
            entityMap.get(key)!.confidence = Math.min(1.0, entityMap.get(key)!.confidence + 0.1);
          } else {
            entityMap.set(key, {
              name: cleanMatch,
              type: entityType as EntityType,
              confidence: 0.7,
              mentions: 1,
              context: this.getEntityContext(text, cleanMatch),
            });
          }
        }
      }
    }

    return Array.from(entityMap.values());
  }

  private async extractWithAI(text: string): Promise<{
    entities: ExtractedEntity[];
    relationships: ExtractedRelationship[];
    summary: string;
    topics: string[];
  }> {
    const prompt = `
Analyze the following text and extract structured information:

Text: """${text}"""

Please provide a JSON response with the following structure:
{
  "entities": [
    {
      "name": "Entity name",
      "type": "person|project|document|conversation|email|file|concept|location|organization|event|task|topic|technology|meeting",
      "confidence": 0.0-1.0,
      "context": "brief context where mentioned"
    }
  ],
  "relationships": [
    {
      "fromEntity": "Entity 1",
      "toEntity": "Entity 2",
      "relationshipType": "mentions|works_on|collaborates_with|contains|relates_to|depends_on|created_by|modified_by|part_of|similar_to|references|follows|precedes|located_in|assigned_to",
      "confidence": 0.0-1.0,
      "evidence": "text evidence for this relationship"
    }
  ],
  "summary": "Brief summary of the content",
  "topics": ["topic1", "topic2", "topic3"]
}

Focus on:
- Named entities (people, organizations, technologies, projects)
- Clear relationships between entities
- High-confidence extractions only
- Preserve exact entity names as they appear
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at extracting structured information from text. Always respond with valid JSON.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 2000,
    });

    try {
      const result = JSON.parse(response.choices[0].message.content || '{}');
      return {
        entities: result.entities || [],
        relationships: result.relationships || [],
        summary: result.summary || '',
        topics: result.topics || [],
      };
    } catch (error) {
      console.error('Error parsing AI extraction result:', error);
      return {
        entities: [],
        relationships: [],
        summary: '',
        topics: [],
      };
    }
  }

  private mergeEntities(
    patternEntities: ExtractedEntity[],
    aiEntities: ExtractedEntity[]
  ): ExtractedEntity[] {
    const entityMap = new Map<string, ExtractedEntity>();

    // Add pattern-based entities
    for (const entity of patternEntities) {
      const key = `${entity.name.toLowerCase()}_${entity.type}`;
      entityMap.set(key, entity);
    }

    // Merge AI entities
    for (const aiEntity of aiEntities) {
      const key = `${aiEntity.name.toLowerCase()}_${aiEntity.type}`;

      if (entityMap.has(key)) {
        const existing = entityMap.get(key)!;
        existing.confidence = Math.max(existing.confidence, aiEntity.confidence);
        existing.mentions = (existing.mentions || 1) + 1;
        if (aiEntity.context && !existing.context) {
          existing.context = aiEntity.context;
        }
      } else {
        entityMap.set(key, {
          ...aiEntity,
          mentions: 1,
        });
      }
    }

    return Array.from(entityMap.values())
      .filter(entity => entity.confidence > 0.5)
      .sort((a, b) => b.confidence - a.confidence);
  }

  private getEntityContext(text: string, entity: string, contextLength: number = 100): string {
    const index = text.toLowerCase().indexOf(entity.toLowerCase());
    if (index === -1) return '';

    const start = Math.max(0, index - contextLength / 2);
    const end = Math.min(text.length, index + entity.length + contextLength / 2);

    let context = text.substring(start, end);
    if (start > 0) context = '...' + context;
    if (end < text.length) context = context + '...';

    return context;
  }

  async extractFromConversation(messages: any[], conversationId: string, userId: string): Promise<ExtractionResult> {
    const conversationText = messages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n\n');

    const result = await this.extractFromText(
      conversationText,
      conversationId,
      'conversation',
      userId
    );

    // Add conversation-specific entities
    result.entities.push({
      name: `Conversation ${conversationId}`,
      type: EntityType.CONVERSATION,
      confidence: 1.0,
      mentions: 1,
      context: result.summary,
    });

    // Add participant relationships
    const participants = messages
      .map(msg => msg.role)
      .filter((role, index, arr) => arr.indexOf(role) === index);

    for (const participant of participants) {
      if (participant !== 'system') {
        result.relationships.push({
          fromEntity: participant,
          toEntity: `Conversation ${conversationId}`,
          relationshipType: RelationshipType.PART_OF,
          confidence: 1.0,
          evidence: 'Participant in conversation',
        });
      }
    }

    return result;
  }

  async extractFromFile(filePath: string, content: string, userId: string): Promise<ExtractionResult> {
    const result = await this.extractFromText(content, filePath, 'file', userId);

    // Add file entity
    result.entities.push({
      name: filePath.split('/').pop() || filePath,
      type: EntityType.FILE,
      confidence: 1.0,
      mentions: 1,
      context: `File: ${filePath}`,
    });

    return result;
  }

  async extractFromEmail(email: any, userId: string): Promise<ExtractionResult> {
    const emailText = `
From: ${email.from}
To: ${email.to}
Subject: ${email.subject}
Date: ${email.date}

${email.body}
`;

    const result = await this.extractFromText(emailText, email.id, 'email', userId);

    // Add email-specific entities
    result.entities.push({
      name: email.subject,
      type: EntityType.EMAIL,
      confidence: 1.0,
      mentions: 1,
      context: `Email from ${email.from}`,
    });

    // Add sender/recipient relationships
    if (email.from) {
      result.relationships.push({
        fromEntity: email.from,
        toEntity: email.subject,
        relationshipType: RelationshipType.CREATED_BY,
        confidence: 1.0,
        evidence: 'Email sender',
      });
    }

    return result;
  }

  validateEntity(entity: ExtractedEntity): boolean {
    return (
      entity.name &&
      entity.name.length > 1 &&
      entity.confidence > 0.5 &&
      Object.values(EntityType).includes(entity.type)
    );
  }

  validateRelationship(relationship: ExtractedRelationship): boolean {
    return (
      relationship.fromEntity &&
      relationship.toEntity &&
      relationship.fromEntity !== relationship.toEntity &&
      relationship.confidence > 0.5 &&
      Object.values(RelationshipType).includes(relationship.relationshipType)
    );
  }
}

export const entityExtractor = new EntityExtractor();