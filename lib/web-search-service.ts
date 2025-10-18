/**
 * Web Search Service
 * Provides REAL web search capabilities using multiple providers
 *
 * Supported Providers:
 * - Zapier Pro (Recommended if you have Zapier Pro - uses existing subscription)
 * - Google Custom Search API (FREE 3000 searches/month)
 * - Bing Search API (FREE 1000 searches/month)
 * - Tavily API ($50/mo - NOT recommended for 2-user systems)
 * - Fallback (returns setup instructions)
 */

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  content?: string;
  publishedDate?: string;
  favicon?: string;
  score?: number;
}

export interface SearchResponse {
  results: SearchResult[];
  query: string;
  totalResults: number;
  searchTime: number;
  provider: string;
}

export interface SearchOptions {
  maxResults?: number;
  searchDepth?: 'basic' | 'advanced';
  includeAnswer?: boolean;
  includeDomains?: string[];
  excludeDomains?: string[];
}

class WebSearchService {
  private provider: 'zapier' | 'google' | 'bing' | 'tavily' | 'fallback';
  private apiKey: string | null = null;
  private zapierWebhookUrl: string | null = null;

  constructor() {
    // Determine which search provider is configured (priority order: cheapest first)
    if (process.env.ZAPIER_SEARCH_WEBHOOK_URL) {
      this.provider = 'zapier';
      this.zapierWebhookUrl = process.env.ZAPIER_SEARCH_WEBHOOK_URL;
    } else if (process.env.GOOGLE_CUSTOM_SEARCH_API_KEY) {
      this.provider = 'google';
      this.apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
    } else if (process.env.BING_SEARCH_API_KEY) {
      this.provider = 'bing';
      this.apiKey = process.env.BING_SEARCH_API_KEY;
    } else if (process.env.TAVILY_API_KEY) {
      this.provider = 'tavily';
      this.apiKey = process.env.TAVILY_API_KEY;
      console.warn('[WebSearch] Using Tavily ($50/mo). Consider switching to FREE Google or Zapier search.');
    } else {
      this.provider = 'fallback';
      console.warn('[WebSearch] No search API configured. Using fallback mode (limited functionality).');
    }

    console.log(`[WebSearch] Using provider: ${this.provider}`);
  }

  /**
   * Perform a web search
   */
  async search(query: string, options: SearchOptions = {}): Promise<SearchResponse> {
    const startTime = Date.now();

    try {
      let results: SearchResult[] = [];

      switch (this.provider) {
        case 'zapier':
          results = await this.searchWithZapier(query, options);
          break;
        case 'google':
          results = await this.searchWithGoogle(query, options);
          break;
        case 'bing':
          results = await this.searchWithBing(query, options);
          break;
        case 'tavily':
          results = await this.searchWithTavily(query, options);
          break;
        case 'fallback':
          results = await this.searchWithFallback(query, options);
          break;
      }

      const searchTime = Date.now() - startTime;

      return {
        results,
        query,
        totalResults: results.length,
        searchTime,
        provider: this.provider
      };

    } catch (error: any) {
      console.error('[WebSearch] Search failed:', error);

      // Return empty results on error
      return {
        results: [],
        query,
        totalResults: 0,
        searchTime: Date.now() - startTime,
        provider: this.provider
      };
    }
  }

  /**
   * Search with Zapier Pro (BEST if you have Zapier Pro)
   * Uses your existing Zapier Pro subscription - no additional cost
   */
  private async searchWithZapier(query: string, options: SearchOptions): Promise<SearchResult[]> {
    if (!this.zapierWebhookUrl) {
      throw new Error('Zapier webhook URL not configured');
    }

    const response = await fetch(this.zapierWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query,
        maxResults: options.maxResults || 10
      })
    });

    if (!response.ok) {
      throw new Error(`Zapier webhook error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Zapier returns results in various formats depending on search action used
    // Handle common formats
    if (Array.isArray(data)) {
      return data.map((result: any) => ({
        title: result.title || result.name || 'Untitled',
        url: result.url || result.link || '',
        snippet: result.snippet || result.description || '',
        content: result.content,
        publishedDate: result.publishedDate || result.date
      }));
    }

    // If Zapier returns single object with results array
    if (data.results && Array.isArray(data.results)) {
      return data.results.map((result: any) => ({
        title: result.title || result.name || 'Untitled',
        url: result.url || result.link || '',
        snippet: result.snippet || result.description || '',
        content: result.content,
        publishedDate: result.publishedDate || result.date
      }));
    }

    // Fallback: return empty results
    console.warn('[WebSearch] Zapier returned unexpected format:', data);
    return [];
  }

  /**
   * Search with Tavily ($50/mo - NOT RECOMMENDED for 2-user systems)
   * Consider using FREE alternatives: Google Custom Search or Zapier
   */
  private async searchWithTavily(query: string, options: SearchOptions): Promise<SearchResult[]> {
    if (!this.apiKey) {
      throw new Error('Tavily API key not configured');
    }

    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        query,
        max_results: options.maxResults || 5,
        search_depth: options.searchDepth || 'basic',
        include_answer: options.includeAnswer || false,
        include_domains: options.includeDomains || [],
        exclude_domains: options.excludeDomains || []
      })
    });

    if (!response.ok) {
      throw new Error(`Tavily API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return data.results.map((result: any) => ({
      title: result.title,
      url: result.url,
      snippet: result.content || result.snippet,
      content: result.raw_content,
      publishedDate: result.published_date,
      score: result.score
    }));
  }

  /**
   * Search with Bing Search API
   */
  private async searchWithBing(query: string, options: SearchOptions): Promise<SearchResult[]> {
    if (!this.apiKey) {
      throw new Error('Bing API key not configured');
    }

    const params = new URLSearchParams({
      q: query,
      count: String(options.maxResults || 10),
      mkt: 'en-US'
    });

    const response = await fetch(`https://api.bing.microsoft.com/v7.0/search?${params}`, {
      headers: {
        'Ocp-Apim-Subscription-Key': this.apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Bing API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return (data.webPages?.value || []).map((result: any) => ({
      title: result.name,
      url: result.url,
      snippet: result.snippet,
      publishedDate: result.datePublished
    }));
  }

  /**
   * Search with Google Custom Search API
   */
  private async searchWithGoogle(query: string, options: SearchOptions): Promise<SearchResult[]> {
    if (!this.apiKey) {
      throw new Error('Google Custom Search API key not configured');
    }

    const searchEngineId = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;
    if (!searchEngineId) {
      throw new Error('Google Custom Search Engine ID not configured');
    }

    const params = new URLSearchParams({
      key: this.apiKey,
      cx: searchEngineId,
      q: query,
      num: String(options.maxResults || 10)
    });

    const response = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`);

    if (!response.ok) {
      throw new Error(`Google API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return (data.items || []).map((result: any) => ({
      title: result.title,
      url: result.link,
      snippet: result.snippet,
      content: result.htmlSnippet
    }));
  }

  /**
   * Fallback search (no API required, but limited)
   * Returns setup instructions for FREE search options
   */
  private async searchWithFallback(query: string, options: SearchOptions): Promise<SearchResult[]> {
    // Return a helpful message instead of fake results
    return [{
      title: 'Configure a FREE Search API',
      url: 'file://SETUP-GOOGLE-SEARCH.md',
      snippet: `To enable real web search, add ONE of these FREE options to .env.local:

OPTION 1 (EASIEST): Use Zapier Pro (you already have this!)
  ZAPIER_SEARCH_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/YOUR_HOOK_ID

OPTION 2: Google Custom Search (3000 FREE searches/month)
  GOOGLE_CUSTOM_SEARCH_API_KEY=your-key
  GOOGLE_CUSTOM_SEARCH_ENGINE_ID=your-engine-id

OPTION 3: Bing Search (1000 FREE searches/month)
  BING_SEARCH_API_KEY=your-key

See SETUP-GOOGLE-SEARCH.md for detailed instructions.
Current search query: "${query}"`,
      score: 0
    }];
  }

  /**
   * Get the current provider
   */
  getProvider(): string {
    return this.provider;
  }

  /**
   * Check if a real search API is configured
   */
  isConfigured(): boolean {
    return this.provider !== 'fallback';
  }
}

// Export singleton instance
export const webSearch = new WebSearchService();

/**
 * Helper function to search and format results for LLMs
 */
export async function searchAndFormatForLLM(
  query: string,
  options: SearchOptions = {}
): Promise<string> {
  const response = await webSearch.search(query, options);

  if (response.results.length === 0) {
    return `No results found for: "${query}"`;
  }

  const formatted = response.results.map((result, idx) => {
    return `[${idx + 1}] ${result.title}
URL: ${result.url}
${result.snippet}
${result.publishedDate ? `Published: ${result.publishedDate}` : ''}
`;
  }).join('\n---\n\n');

  return `Search Results for "${query}" (${response.provider}):

${formatted}

Total results: ${response.totalResults}
Search time: ${response.searchTime}ms`;
}
