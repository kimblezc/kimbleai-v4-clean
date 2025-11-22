/**
 * Perplexity Sonar Pro Client - Phase 3 Integration
 *
 * AI-powered search using Perplexity Sonar Pro
 * Better search results than Google with citations
 *
 * Pricing: $0.005 per search (500 searches = $2.50)
 * Disabled by default, user must toggle ON
 *
 * Features:
 * - Real-time web search with AI analysis
 * - Automatic citations and sources
 * - Multiple search modes (speed/quality)
 * - Cost tracking per search
 *
 * @see https://docs.perplexity.ai
 */

interface PerplexityConfig {
  apiKey: string;
  model?: 'sonar-pro' | 'sonar' | 'sonar-reasoning';
  onCost?: (cost: number) => void;
}

interface SearchRequest {
  query: string;
  model?: 'sonar-pro' | 'sonar' | 'sonar-reasoning';
  searchDomainFilter?: string[]; // Limit to specific domains
  searchRecencyFilter?: 'day' | 'week' | 'month' | 'year';
  returnImages?: boolean;
  returnRelatedQuestions?: boolean;
  temperature?: number;
}

interface Citation {
  url: string;
  title: string;
  snippet: string;
}

interface SearchResponse {
  answer: string;
  citations: Citation[];
  images?: string[];
  relatedQuestions?: string[];
  model: string;
  searchesPerformed: number;
  cost: number;
}

// Pricing per model
const MODEL_PRICING = {
  'sonar-pro': 0.005,      // $0.005 per search (best quality)
  'sonar': 0.001,          // $0.001 per search (fast)
  'sonar-reasoning': 0.01, // $0.010 per search (deep analysis)
};

export class PerplexityClient {
  private apiKey: string;
  private baseURL: string;
  private defaultModel: string;
  private onCost?: (cost: number) => void;

  constructor(config: PerplexityConfig) {
    if (!config.apiKey) {
      throw new Error('Perplexity API key is required');
    }

    this.apiKey = config.apiKey;
    this.baseURL = 'https://api.perplexity.ai';
    this.defaultModel = config.model || 'sonar-pro';
    this.onCost = config.onCost;
  }

  /**
   * Perform AI-powered search
   */
  async search(request: SearchRequest): Promise<SearchResponse> {
    const model = request.model || this.defaultModel;
    const cost = MODEL_PRICING[model];

    try {
      console.log(`[Perplexity] Searching: "${request.query}"`);
      console.log(`[Perplexity] Model: ${model}, Cost: $${cost.toFixed(4)}`);

      const messages = [
        {
          role: 'system',
          content: 'You are a helpful AI search assistant. Provide accurate, well-cited answers.',
        },
        {
          role: 'user',
          content: request.query,
        },
      ];

      const requestBody: any = {
        model,
        messages,
        temperature: request.temperature ?? 0.2,
        return_citations: true,
        return_images: request.returnImages ?? false,
        return_related_questions: request.returnRelatedQuestions ?? false,
      };

      // Add optional filters
      if (request.searchDomainFilter) {
        requestBody.search_domain_filter = request.searchDomainFilter;
      }

      if (request.searchRecencyFilter) {
        requestBody.search_recency_filter = request.searchRecencyFilter;
      }

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          `Perplexity API error: ${response.status} - ${error.error?.message || 'Unknown error'}`
        );
      }

      const data = await response.json();

      // Extract answer
      const answer = data.choices[0]?.message?.content || 'No answer provided';

      // Extract citations
      const citations: Citation[] = (data.citations || []).map((c: any) => ({
        url: c.url || '',
        title: c.title || 'Unknown',
        snippet: c.snippet || '',
      }));

      // Track cost
      if (this.onCost) {
        this.onCost(cost);
      }

      console.log(`[Perplexity] Success: ${citations.length} citations, cost: $${cost.toFixed(4)}`);

      return {
        answer,
        citations,
        images: data.images || [],
        relatedQuestions: data.related_questions || [],
        model,
        searchesPerformed: 1,
        cost,
      };
    } catch (error) {
      console.error('[Perplexity] Search error:', error);
      throw error;
    }
  }

  /**
   * Perform multiple searches in parallel
   */
  async batchSearch(queries: string[], model?: string): Promise<SearchResponse[]> {
    console.log(`[Perplexity] Batch searching ${queries.length} queries`);

    const searches = queries.map((query) =>
      this.search({ query, model: model as any })
    );

    const results = await Promise.all(searches);

    const totalCost = results.reduce((sum, r) => sum + r.cost, 0);
    console.log(
      `[Perplexity] Batch complete: ${queries.length} searches, total cost: $${totalCost.toFixed(4)}`
    );

    return results;
  }

  /**
   * Calculate cost for a search
   */
  calculateCost(model: string = 'sonar-pro'): number {
    return MODEL_PRICING[model as keyof typeof MODEL_PRICING] || MODEL_PRICING['sonar-pro'];
  }

  /**
   * Get available models
   */
  static getModels(): Array<{ model: string; cost: number; description: string }> {
    return [
      {
        model: 'sonar-pro',
        cost: MODEL_PRICING['sonar-pro'],
        description: 'Best quality, most accurate citations',
      },
      {
        model: 'sonar',
        cost: MODEL_PRICING['sonar'],
        description: 'Fast, cost-effective',
      },
      {
        model: 'sonar-reasoning',
        cost: MODEL_PRICING['sonar-reasoning'],
        description: 'Deep reasoning and analysis',
      },
    ];
  }

  /**
   * Check if Perplexity is available
   */
  static isAvailable(): boolean {
    return !!process.env.PERPLEXITY_API_KEY;
  }
}

// Singleton instance
let perplexityClient: PerplexityClient | null = null;

export function getPerplexityClient(): PerplexityClient {
  if (!perplexityClient) {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      throw new Error('PERPLEXITY_API_KEY environment variable is required');
    }

    perplexityClient = new PerplexityClient({
      apiKey,
      model: 'sonar-pro',
      onCost: (cost) => {
        console.log(`[Perplexity] Search cost: $${cost.toFixed(4)}`);
      },
    });
  }

  return perplexityClient;
}

export { MODEL_PRICING };
export type { PerplexityConfig, SearchRequest, SearchResponse, Citation };
