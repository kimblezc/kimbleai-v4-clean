/**
 * RAG and Knowledge System Tool Definitions with Examples
 *
 * These tools expose KimbleAI's powerful RAG, embedding, and knowledge graph
 * systems to the LLM for intelligent context retrieval and knowledge discovery.
 */

import { EnhancedTool, ToolExample } from './tool-definitions-with-examples';

/**
 * RAG Semantic Search Tools
 */
export const ragTools: EnhancedTool[] = [
  {
    type: "function",
    function: {
      name: "semantic_search",
      description: "Search across all indexed knowledge using semantic similarity. Searches conversations, files, emails, documents with AI-powered understanding of meaning and context.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Natural language search query describing what to find"
          },
          limit: {
            type: "number",
            description: "Maximum number of results to return (default: 10, max: 50)",
            default: 10
          },
          threshold: {
            type: "number",
            description: "Minimum similarity threshold 0-1 (default: 0.7). Higher = more relevant",
            default: 0.7
          },
          content_types: {
            type: "array",
            items: { type: "string" },
            description: "Filter by content types: conversation, file, email, document",
            default: []
          }
        },
        required: ["query"]
      },
      examples: [
        {
          description: "Find D&D lore about a specific topic",
          input: {
            query: "What are the rules for spellcasting in dungeons?",
            limit: 5,
            threshold: 0.8
          },
          context: "When user asks about D&D mechanics or lore not in immediate context"
        },
        {
          description: "Find all conversations about a project",
          input: {
            query: "discussions about the new website redesign",
            content_types: ["conversation"],
            limit: 20
          },
          context: "When user wants to review past discussions on a topic"
        },
        {
          description: "Search documents with high relevance",
          input: {
            query: "campaign planning notes from last month",
            threshold: 0.85,
            content_types: ["file", "document"],
            limit: 10
          },
          context: "When user needs specific information from documents"
        }
      ]
    }
  },
  {
    type: "function",
    function: {
      name: "find_related_content",
      description: "Given a piece of content (file, email, conversation), find semantically related content across the knowledge base using vector similarity.",
      parameters: {
        type: "object",
        properties: {
          content_id: {
            type: "string",
            description: "ID of the source content (file_id, email_id, message_id)"
          },
          content_type: {
            type: "string",
            description: "Type of source content",
            enum: ["file", "email", "conversation", "document"]
          },
          limit: {
            type: "number",
            description: "Maximum number of related items to return (default: 10)",
            default: 10
          }
        },
        required: ["content_id", "content_type"]
      },
      examples: [
        {
          description: "Find files related to a specific document",
          input: {
            content_id: "file_abc123",
            content_type: "file",
            limit: 10
          },
          context: "When user asks 'what else is related to this file?'"
        },
        {
          description: "Find conversations related to an email",
          input: {
            content_id: "email_xyz789",
            content_type: "email",
            limit: 5
          },
          context: "When user asks 'did we discuss this email topic before?'"
        }
      ]
    }
  }
];

/**
 * Knowledge Graph Tools
 */
export const knowledgeGraphTools: EnhancedTool[] = [
  {
    type: "function",
    function: {
      name: "find_entities",
      description: "Find entities (people, projects, concepts, locations, etc.) in the knowledge graph. Useful for discovering key topics, tracking mentions, and understanding relationships.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Entity name or search query"
          },
          entity_types: {
            type: "array",
            items: {
              type: "string",
              enum: ["PERSON", "PROJECT", "ORGANIZATION", "LOCATION", "CONCEPT", "TOPIC", "TECHNOLOGY", "EVENT", "DOCUMENT", "TASK"]
            },
            description: "Filter by entity types",
            default: []
          },
          limit: {
            type: "number",
            description: "Maximum number of entities to return (default: 20)",
            default: 20
          }
        },
        required: ["query"]
      },
      examples: [
        {
          description: "Find all mentions of a person",
          input: {
            query: "Strahd von Zarovich",
            entity_types: ["PERSON"],
            limit: 10
          },
          context: "When user asks 'tell me about Strahd' or 'who is Strahd?'"
        },
        {
          description: "Find D&D campaign-related projects",
          input: {
            query: "D&D campaign",
            entity_types: ["PROJECT", "EVENT"],
            limit: 20
          },
          context: "When user asks 'what D&D projects do I have?'"
        },
        {
          description: "Find concepts related to a topic",
          input: {
            query: "magic system",
            entity_types: ["CONCEPT", "TOPIC"],
            limit: 15
          },
          context: "When user asks 'what have we discussed about magic systems?'"
        }
      ]
    }
  },
  {
    type: "function",
    function: {
      name: "get_entity_relationships",
      description: "Get relationships between entities (who works with whom, what relates to what, etc.). Useful for understanding connections and discovering insights.",
      parameters: {
        type: "object",
        properties: {
          entity_name: {
            type: "string",
            description: "Name of the entity to get relationships for"
          },
          relationship_types: {
            type: "array",
            items: {
              type: "string",
              enum: ["WORKS_ON", "WORKS_WITH", "RELATES_TO", "DEPENDS_ON", "MENTIONS", "CREATED", "ASSIGNED_TO", "SIMILAR_TO", "CONTAINED_IN", "REFERENCES"]
            },
            description: "Filter by relationship types",
            default: []
          },
          depth: {
            type: "number",
            description: "Relationship depth: 1=direct, 2=friends-of-friends, etc. (max: 3)",
            default: 1,
            minimum: 1,
            maximum: 3
          }
        },
        required: ["entity_name"]
      },
      examples: [
        {
          description: "Find who works on a project",
          input: {
            entity_name: "Curse of Strahd Campaign",
            relationship_types: ["WORKS_ON", "WORKS_WITH"],
            depth: 1
          },
          context: "When user asks 'who's involved in this campaign?'"
        },
        {
          description: "Find all related concepts",
          input: {
            entity_name: "Spellcasting",
            relationship_types: ["RELATES_TO", "REFERENCES"],
            depth: 2
          },
          context: "When user asks 'what topics are connected to spellcasting?'"
        }
      ]
    }
  },
  {
    type: "function",
    function: {
      name: "get_knowledge_insights",
      description: "Get AI-powered insights from the knowledge graph including trending topics, connection recommendations, hubs, and patterns. Useful for discovering what's important and finding hidden connections.",
      parameters: {
        type: "object",
        properties: {
          insight_types: {
            type: "array",
            items: {
              type: "string",
              enum: ["trending_topics", "connection_recommendations", "hubs", "isolated_entities", "recent_activity", "anomalies"]
            },
            description: "Types of insights to generate",
            default: ["trending_topics", "connection_recommendations"]
          },
          time_window_days: {
            type: "number",
            description: "Look at activity from last N days (default: 30)",
            default: 30
          }
        }
      },
      examples: [
        {
          description: "Find trending D&D topics",
          input: {
            insight_types: ["trending_topics", "recent_activity"],
            time_window_days: 7
          },
          context: "When user asks 'what have I been focusing on lately?'"
        },
        {
          description: "Get connection recommendations",
          input: {
            insight_types: ["connection_recommendations", "hubs"],
            time_window_days: 30
          },
          context: "When user asks 'what connections am I missing?' or 'show me insights'"
        }
      ]
    }
  }
];

/**
 * Advanced AI Integration Tools (Perplexity, DeepSeek, ElevenLabs)
 */
export const aiIntegrationTools: EnhancedTool[] = [
  {
    type: "function",
    function: {
      name: "web_search_with_citations",
      description: "Search the web for current information using Perplexity AI with automatic citations. Perfect for real-time D&D rules lookups, current events, fact-checking, and research.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query"
          },
          focus: {
            type: "string",
            description: "Search focus area for better results",
            enum: ["internet", "academic", "writing", "wolfram", "youtube", "reddit"],
            default: "internet"
          },
          recency_filter: {
            type: "string",
            description: "Filter by recency",
            enum: ["day", "week", "month", "year", "all"],
            default: "all"
          }
        },
        required: ["query"]
      },
      examples: [
        {
          description: "Look up current D&D 5e rules",
          input: {
            query: "D&D 5e spellcasting rules for concentration",
            focus: "internet"
          },
          context: "When user asks about current D&D rules or errata"
        },
        {
          description: "Research campaign setting lore",
          input: {
            query: "Curse of Strahd Barovia history",
            focus: "academic",
            recency_filter: "year"
          },
          context: "When user wants detailed campaign setting research"
        },
        {
          description: "Find recent community discussions",
          input: {
            query: "best D&D encounter design tips 2025",
            focus: "reddit",
            recency_filter: "month"
          },
          context: "When user wants current community insights"
        }
      ]
    }
  },
  {
    type: "function",
    function: {
      name: "bulk_document_processing",
      description: "Process multiple documents in bulk using DeepSeek ($0.27 per 1M tokens input). Perfect for analyzing many campaign notes, emails, or files at once with tasks like summarization, extraction, or analysis.",
      parameters: {
        type: "object",
        properties: {
          document_ids: {
            type: "array",
            items: { type: "string" },
            description: "Array of document/file IDs to process"
          },
          task_type: {
            type: "string",
            description: "Type of processing task",
            enum: ["summarize", "extract_entities", "sentiment_analysis", "key_points"],
            default: "summarize"
          },
          custom_prompt: {
            type: "string",
            description: "Optional custom prompt for specialized processing",
            default: ""
          },
          max_concurrent: {
            type: "number",
            description: "Maximum concurrent processing (default: 5)",
            default: 5
          }
        },
        required: ["document_ids", "task_type"]
      },
      examples: [
        {
          description: "Summarize all session notes",
          input: {
            document_ids: ["file_001", "file_002", "file_003", "file_004"],
            task_type: "summarize"
          },
          context: "When user asks 'summarize all my D&D session notes'"
        },
        {
          description: "Extract NPCs from campaign notes",
          input: {
            document_ids: ["file_campaign_1", "file_campaign_2"],
            task_type: "extract_entities",
            custom_prompt: "Extract all NPC names, descriptions, and locations"
          },
          context: "When user asks 'who are all the NPCs in my campaign?'"
        }
      ]
    }
  },
  {
    type: "function",
    function: {
      name: "text_to_speech",
      description: "Convert text to natural-sounding speech using ElevenLabs (FREE 10K chars/month). Perfect for D&D NPC voices, narration, or reading campaign descriptions.",
      parameters: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "Text to convert to speech"
          },
          voice: {
            type: "string",
            description: "Voice preset for different characters",
            enum: ["narrator", "villain", "hero", "elderly", "mysterious", "default"],
            default: "default"
          },
          save_to_files: {
            type: "boolean",
            description: "Save audio file to file system",
            default: false
          }
        },
        required: ["text"]
      },
      examples: [
        {
          description: "Generate Strahd's voice",
          input: {
            text: "I am the ancient, I am the land. You will never leave Barovia.",
            voice: "villain",
            save_to_files: true
          },
          context: "When DM wants voice acting for villain NPCs"
        },
        {
          description: "Narrate scene description",
          input: {
            text: "As you enter the throne room, shadows dance along the stone walls...",
            voice: "narrator"
          },
          context: "When DM wants atmospheric narration"
        }
      ]
    }
  }
];

/**
 * Get all RAG and advanced tools for API
 */
export function getAdvancedToolsForAPI(): any[] {
  const allTools = [
    ...ragTools,
    ...knowledgeGraphTools,
    ...aiIntegrationTools
  ];

  return allTools.map(tool => ({
    type: tool.type,
    function: {
      name: tool.function.name,
      description: tool.function.description,
      parameters: tool.function.parameters
    }
  }));
}
