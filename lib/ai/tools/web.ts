/**
 * Web Tools - Search and fetch web content
 */

import type { Tool, ToolContext, ToolResult } from './index';

/**
 * Web search tool using Brave Search API or fallback
 */
const webSearch: Tool = {
  name: 'web_search',
  description: 'Search the web for information. Returns relevant search results with titles, URLs, and snippets.',
  category: 'web',
  requiresConfirmation: false,
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query',
      },
      count: {
        type: 'number',
        description: 'Number of results to return (default: 5, max: 10)',
      },
    },
    required: ['query'],
  },
  execute: async (args: { query: string; count?: number }): Promise<ToolResult> => {
    const { query, count = 5 } = args;

    try {
      // Try Brave Search API if available
      if (process.env.BRAVE_API_KEY) {
        const response = await fetch(
          `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${Math.min(count, 10)}`,
          {
            headers: {
              'Accept': 'application/json',
              'X-Subscription-Token': process.env.BRAVE_API_KEY,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          const results = (data.web?.results || []).map((r: any) => ({
            title: r.title,
            url: r.url,
            snippet: r.description,
          }));

          return {
            success: true,
            data: results,
            display: {
              type: 'json',
              content: results,
            },
          };
        }
      }

      // Fallback: Use DuckDuckGo instant answers (no API key needed)
      const ddgResponse = await fetch(
        `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`
      );

      if (ddgResponse.ok) {
        const data = await ddgResponse.json();
        const results = [];

        if (data.Abstract) {
          results.push({
            title: data.Heading || query,
            url: data.AbstractURL || '',
            snippet: data.Abstract,
          });
        }

        data.RelatedTopics?.slice(0, count).forEach((topic: any) => {
          if (topic.Text) {
            results.push({
              title: topic.Text.split(' - ')[0] || topic.Text.substring(0, 50),
              url: topic.FirstURL || '',
              snippet: topic.Text,
            });
          }
        });

        return {
          success: true,
          data: results,
          display: {
            type: 'json',
            content: results,
          },
        };
      }

      return {
        success: false,
        error: 'Search failed - no search API available',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed',
      };
    }
  },
};

/**
 * Fetch webpage content
 */
const webFetch: Tool = {
  name: 'web_fetch',
  description: 'Fetch and extract text content from a webpage URL.',
  category: 'web',
  requiresConfirmation: false,
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The URL to fetch',
      },
      maxLength: {
        type: 'number',
        description: 'Maximum characters to return (default: 5000)',
      },
    },
    required: ['url'],
  },
  execute: async (args: { url: string; maxLength?: number }): Promise<ToolResult> => {
    const { url, maxLength = 5000 } = args;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'KimbleAI/1.0 (Web Fetcher)',
        },
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Failed to fetch URL: ${response.status} ${response.statusText}`,
        };
      }

      const html = await response.text();

      // Simple HTML to text extraction
      let text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // Truncate if too long
      if (text.length > maxLength) {
        text = text.substring(0, maxLength) + '...';
      }

      return {
        success: true,
        data: {
          url,
          content: text,
          length: text.length,
        },
        display: {
          type: 'text',
          content: text,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Fetch failed',
      };
    }
  },
};

/**
 * Get current date and time
 */
const getCurrentTime: Tool = {
  name: 'get_current_time',
  description: 'Get the current date and time in various formats.',
  category: 'web',
  requiresConfirmation: false,
  inputSchema: {
    type: 'object',
    properties: {
      timezone: {
        type: 'string',
        description: 'Timezone (e.g., "America/New_York", "UTC"). Default: UTC',
      },
      format: {
        type: 'string',
        description: 'Format: "iso", "readable", or "unix". Default: "readable"',
      },
    },
  },
  execute: async (args: { timezone?: string; format?: string }): Promise<ToolResult> => {
    const { timezone = 'UTC', format = 'readable' } = args;

    try {
      const now = new Date();

      let result: string | number;

      switch (format) {
        case 'iso':
          result = now.toISOString();
          break;
        case 'unix':
          result = Math.floor(now.getTime() / 1000);
          break;
        default:
          result = now.toLocaleString('en-US', {
            timeZone: timezone,
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZoneName: 'short',
          });
      }

      return {
        success: true,
        data: {
          timestamp: now.toISOString(),
          unix: Math.floor(now.getTime() / 1000),
          formatted: result,
          timezone,
        },
        display: {
          type: 'text',
          content: String(result),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get time',
      };
    }
  },
};

export const webTools: Tool[] = [webSearch, webFetch, getCurrentTime];
