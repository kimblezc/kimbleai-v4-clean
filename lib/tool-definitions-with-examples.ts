/**
 * Enhanced Tool Definitions with Usage Examples
 *
 * Following Anthropic's Advanced Tool Use guidance:
 * "Tool Use Examples improve accuracy from 72% to 90% on complex parameter handling"
 *
 * Each tool includes 2-3 concrete examples showing:
 * - Successful usage patterns
 * - Common parameter combinations
 * - Edge cases and best practices
 */

export interface ToolExample {
  description: string;
  input: Record<string, any>;
  context?: string; // When to use this pattern
}

export interface EnhancedTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, any>;
      required?: string[];
    };
    examples?: ToolExample[]; // NEW: Concrete usage examples
  };
}

/**
 * Gmail Integration Tools with Examples
 */
export const gmailTools: EnhancedTool[] = [
  {
    type: "function",
    function: {
      name: "get_recent_emails",
      description: "Get recent emails from Gmail inbox",
      parameters: {
        type: "object",
        properties: {
          maxResults: {
            type: "number",
            description: "Maximum number of emails to retrieve (default: 5, max: 20)",
            default: 5
          },
          query: {
            type: "string",
            description: "Gmail search query (e.g., 'after:2025/08/01', 'from:sender@email.com')",
            default: ""
          }
        }
      },
      examples: [
        {
          description: "Get last 10 emails from a specific sender",
          input: {
            maxResults: 10,
            query: "from:john@example.com"
          },
          context: "When user asks 'show me recent emails from John'"
        },
        {
          description: "Get unread emails from the last week",
          input: {
            maxResults: 20,
            query: "is:unread after:2025/11/18"
          },
          context: "When user asks 'what unread emails do I have from last week?'"
        },
        {
          description: "Get recent emails without filters",
          input: {
            maxResults: 5,
            query: ""
          },
          context: "When user asks 'show me my recent emails'"
        }
      ]
    }
  },
  {
    type: "function",
    function: {
      name: "get_emails_from_date_range",
      description: "Get emails from a specific date range (last 30 days, last week, etc.)",
      parameters: {
        type: "object",
        properties: {
          days: {
            type: "number",
            description: "Number of days back to search (e.g., 30 for last 30 days)",
            default: 30
          },
          maxResults: {
            type: "number",
            description: "Maximum number of emails to retrieve",
            default: 5
          }
        }
      },
      examples: [
        {
          description: "Get emails from the last 7 days",
          input: {
            days: 7,
            maxResults: 10
          },
          context: "When user asks 'emails from last week'"
        },
        {
          description: "Get all emails from the last month",
          input: {
            days: 30,
            maxResults: 20
          },
          context: "When user asks 'show me last month's emails'"
        }
      ]
    }
  },
  {
    type: "function",
    function: {
      name: "send_email",
      description: "Send an email via Gmail. Use this when the user wants to send, compose, or email someone.",
      parameters: {
        type: "object",
        properties: {
          to: {
            type: "string",
            description: "Recipient email address"
          },
          subject: {
            type: "string",
            description: "Email subject line"
          },
          body: {
            type: "string",
            description: "Email body content (plain text)"
          },
          replyToMessageId: {
            type: "string",
            description: "Optional: Gmail message ID to reply to (for threading)",
            default: ""
          }
        },
        required: ["to", "subject", "body"]
      },
      examples: [
        {
          description: "Send a simple email",
          input: {
            to: "colleague@example.com",
            subject: "Meeting Follow-up",
            body: "Thanks for the productive meeting today. Here are my notes..."
          },
          context: "When user asks to send an email with specific content"
        },
        {
          description: "Reply to an existing email thread",
          input: {
            to: "manager@example.com",
            subject: "Re: Project Update",
            body: "I've completed the tasks we discussed.",
            replyToMessageId: "18f2c3d4e5f6a7b8"
          },
          context: "When user asks to reply to a specific email"
        }
      ]
    }
  }
];

/**
 * Google Drive Tools with Examples
 */
export const driveTools: EnhancedTool[] = [
  {
    type: "function",
    function: {
      name: "search_google_drive",
      description: "Search Google Drive for files and documents",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query for files (keywords, file names, content)"
          },
          maxResults: {
            type: "number",
            description: "Maximum number of files to return (default: 5, max: 20)",
            default: 5
          }
        },
        required: ["query"]
      },
      examples: [
        {
          description: "Search for D&D campaign files",
          input: {
            query: "D&D campaign notes 2025",
            maxResults: 10
          },
          context: "When user asks 'find my D&D campaign notes'"
        },
        {
          description: "Search for specific document by name",
          input: {
            query: "Budget Report Q4",
            maxResults: 5
          },
          context: "When user asks 'find the Q4 budget report'"
        },
        {
          description: "Search for spreadsheets containing keyword",
          input: {
            query: "expense spreadsheet",
            maxResults: 10
          },
          context: "When user asks 'find spreadsheets about expenses'"
        }
      ]
    }
  }
];

/**
 * File Management Tools with Examples
 */
export const fileTools: EnhancedTool[] = [
  {
    type: "function",
    function: {
      name: "search_files",
      description: "Search across all uploaded files by content, name, or type. Searches audio transcriptions, PDFs, documents, images, emails, and spreadsheets.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query for file names or content"
          },
          file_type: {
            type: "string",
            description: "Filter by file type: audio, image, pdf, document, spreadsheet, email, or 'all'",
            enum: ["audio", "image", "pdf", "document", "spreadsheet", "email", "all"],
            default: "all"
          },
          project_id: {
            type: "string",
            description: "Optional project ID to filter files",
            default: ""
          },
          max_results: {
            type: "number",
            description: "Maximum number of files to return (default: 10)",
            default: 10
          }
        },
        required: ["query"]
      },
      examples: [
        {
          description: "Search audio files about D&D sessions",
          input: {
            query: "dungeon master",
            file_type: "audio",
            max_results: 5
          },
          context: "When user asks 'find audio recordings mentioning the dungeon master'"
        },
        {
          description: "Search all files in a project",
          input: {
            query: "campaign planning",
            file_type: "all",
            project_id: "proj_abc123",
            max_results: 20
          },
          context: "When user asks 'search for campaign planning files in my D&D project'"
        },
        {
          description: "Search PDFs containing specific text",
          input: {
            query: "spellcasting rules",
            file_type: "pdf",
            max_results: 10
          },
          context: "When user asks 'find PDFs about spellcasting'"
        }
      ]
    }
  },
  {
    type: "function",
    function: {
      name: "get_uploaded_files",
      description: "Get a list of recently uploaded files with optional filters",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: "Filter by category: audio, image, pdf, document, spreadsheet, email",
            default: ""
          },
          project_id: {
            type: "string",
            description: "Filter by project ID",
            default: ""
          },
          limit: {
            type: "number",
            description: "Number of files to return (default: 20)",
            default: 20
          }
        }
      },
      examples: [
        {
          description: "Get recent audio files",
          input: {
            category: "audio",
            limit: 10
          },
          context: "When user asks 'show me my recent audio files'"
        },
        {
          description: "Get all files in a project",
          input: {
            project_id: "proj_abc123",
            limit: 20
          },
          context: "When user asks 'what files are in my D&D project?'"
        }
      ]
    }
  },
  {
    type: "function",
    function: {
      name: "organize_files",
      description: "Organize files by moving them to a project or adding tags",
      parameters: {
        type: "object",
        properties: {
          file_ids: {
            type: "array",
            items: { type: "string" },
            description: "Array of file IDs to organize"
          },
          project_id: {
            type: "string",
            description: "Project ID to move files to",
            default: ""
          },
          tags: {
            type: "array",
            items: { type: "string" },
            description: "Tags to add to the files",
            default: []
          }
        },
        required: ["file_ids"]
      },
      examples: [
        {
          description: "Move files to a project with tags",
          input: {
            file_ids: ["file_123", "file_456", "file_789"],
            project_id: "proj_dnd_campaign",
            tags: ["session-notes", "important"]
          },
          context: "When user asks 'organize these session notes into my D&D campaign project'"
        },
        {
          description: "Just add tags without moving to project",
          input: {
            file_ids: ["file_abc"],
            tags: ["reviewed", "archived"]
          },
          context: "When user asks 'tag this file as reviewed'"
        }
      ]
    }
  },
  {
    type: "function",
    function: {
      name: "get_file_details",
      description: "Get detailed information about a specific file including its content, transcription, or analysis",
      parameters: {
        type: "object",
        properties: {
          file_id: {
            type: "string",
            description: "The ID of the file to retrieve"
          }
        },
        required: ["file_id"]
      },
      examples: [
        {
          description: "Get details of a specific file",
          input: {
            file_id: "file_xyz789"
          },
          context: "When user asks 'show me details about this file' or 'what's in this audio recording?'"
        }
      ]
    }
  }
];

/**
 * Calendar Tools with Examples
 */
export const calendarTools: EnhancedTool[] = [
  {
    type: "function",
    function: {
      name: "create_calendar_event",
      description: "Create a new Google Calendar event with automatic Google Meet link",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Event title/summary"
          },
          description: {
            type: "string",
            description: "Event description or agenda",
            default: ""
          },
          start: {
            type: "string",
            description: "Start date-time in ISO 8601 format (e.g., '2025-01-13T14:00:00-05:00')"
          },
          end: {
            type: "string",
            description: "End date-time in ISO 8601 format"
          },
          attendees: {
            type: "array",
            items: { type: "string" },
            description: "Array of attendee email addresses",
            default: []
          },
          location: {
            type: "string",
            description: "Event location",
            default: ""
          }
        },
        required: ["title", "start", "end"]
      },
      examples: [
        {
          description: "Schedule D&D session with players",
          input: {
            title: "D&D Campaign Session 15",
            description: "Continue the Curse of Strahd campaign. Bring character sheets!",
            start: "2025-01-27T19:00:00-05:00",
            end: "2025-01-27T22:00:00-05:00",
            attendees: ["player1@example.com", "player2@example.com", "player3@example.com"]
          },
          context: "When user asks 'schedule our next D&D session for Friday at 7pm'"
        },
        {
          description: "Simple meeting without attendees",
          input: {
            title: "Campaign Planning",
            start: "2025-01-25T15:00:00-05:00",
            end: "2025-01-25T16:00:00-05:00"
          },
          context: "When user asks 'block off time tomorrow at 3pm for planning'"
        }
      ]
    }
  },
  {
    type: "function",
    function: {
      name: "get_calendar_events",
      description: "Get upcoming calendar events from Google Calendar",
      parameters: {
        type: "object",
        properties: {
          days_ahead: {
            type: "number",
            description: "Number of days to look ahead (default: 7)",
            default: 7
          },
          max_results: {
            type: "number",
            description: "Maximum number of events to return (default: 20)",
            default: 20
          }
        }
      },
      examples: [
        {
          description: "Get this week's events",
          input: {
            days_ahead: 7,
            max_results: 20
          },
          context: "When user asks 'what's on my calendar this week?'"
        },
        {
          description: "Get today and tomorrow's events",
          input: {
            days_ahead: 2,
            max_results: 10
          },
          context: "When user asks 'what do I have scheduled for today and tomorrow?'"
        }
      ]
    }
  }
];

/**
 * Get all tools in OpenAI format (without examples for API compatibility)
 */
export function getToolsForAPI(): any[] {
  const allTools = [
    ...gmailTools,
    ...driveTools,
    ...fileTools,
    ...calendarTools
  ];

  // Remove examples when sending to API (they're for documentation/training only)
  return allTools.map(tool => ({
    type: tool.type,
    function: {
      name: tool.function.name,
      description: tool.function.description,
      parameters: tool.function.parameters
    }
  }));
}

/**
 * Get tool definition with examples for debugging/testing
 */
export function getToolWithExamples(toolName: string): EnhancedTool | undefined {
  const allTools = [
    ...gmailTools,
    ...driveTools,
    ...fileTools,
    ...calendarTools
  ];

  return allTools.find(tool => tool.function.name === toolName);
}

/**
 * Get all tool examples for documentation
 */
export function getAllToolExamples(): Record<string, ToolExample[]> {
  const allTools = [
    ...gmailTools,
    ...driveTools,
    ...fileTools,
    ...calendarTools
  ];

  const examples: Record<string, ToolExample[]> = {};

  allTools.forEach(tool => {
    if (tool.function.examples) {
      examples[tool.function.name] = tool.function.examples;
    }
  });

  return examples;
}

/**
 * Validate if tool input matches expected patterns from examples
 * Returns confidence score (0-1) and suggestions
 */
export function validateToolInput(
  toolName: string,
  input: Record<string, any>
): {
  isValid: boolean;
  confidence: number;
  suggestions: string[];
} {
  const tool = getToolWithExamples(toolName);

  if (!tool || !tool.function.examples) {
    return {
      isValid: true,
      confidence: 0.5,
      suggestions: ["No examples available for this tool"]
    };
  }

  // Check if input matches any example patterns
  const matchScores = tool.function.examples.map(example => {
    let matches = 0;
    let total = 0;

    Object.keys(example.input).forEach(key => {
      total++;
      if (input[key] !== undefined) {
        matches++;
      }
    });

    return total > 0 ? matches / total : 0;
  });

  const confidence = Math.max(...matchScores);
  const suggestions: string[] = [];

  if (confidence < 0.8) {
    suggestions.push("Consider checking the examples for this tool");
    tool.function.examples.forEach((ex, i) => {
      suggestions.push(`Example ${i + 1}: ${ex.description}`);
    });
  }

  return {
    isValid: confidence > 0.3,
    confidence,
    suggestions
  };
}
