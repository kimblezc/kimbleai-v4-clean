/**
 * FLUX 1.1 Pro Image Generation Client - Phase 4 Integration
 *
 * High-quality image generation using Black Forest Labs FLUX 1.1 Pro
 * Via Replicate API
 *
 * Pricing: ~$0.055 per image (20 images = $1.10/month)
 * Pay-per-use with cost warnings
 *
 * Features:
 * - Ultra-high quality images
 * - Fast generation (~10 seconds)
 * - Multiple aspect ratios
 * - Safety checks built-in
 * - Cost tracking per image
 *
 * @see https://replicate.com/black-forest-labs/flux-1.1-pro
 */

interface FLUXConfig {
  apiKey: string;
  onCost?: (cost: number) => void;
}

interface ImageRequest {
  prompt: string;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  outputFormat?: 'webp' | 'jpg' | 'png';
  outputQuality?: number; // 0-100
  safetyTolerance?: number; // 1-5, higher = more permissive
}

interface ImageResponse {
  imageUrl: string;
  imageData?: string; // base64 if requested
  prompt: string;
  aspectRatio: string;
  cost: number;
  generationTime: number;
  predictionId: string;
}

// Pricing: ~$0.055 per image (may vary slightly)
const COST_PER_IMAGE = 0.055;

// Daily/monthly limits to prevent accidental spending
const LIMITS = {
  imagesPerDay: 5,
  imagesPerMonth: 100,
  maxCostPerMonth: 10, // $10 hard limit
};

export class FLUXClient {
  private apiKey: string;
  private baseURL: string;
  private onCost?: (cost: number) => void;
  private dailyUsage: number;
  private monthlyUsage: number;

  constructor(config: FLUXConfig) {
    if (!config.apiKey) {
      throw new Error('Replicate API key is required for FLUX');
    }

    this.apiKey = config.apiKey;
    this.baseURL = 'https://api.replicate.com/v1';
    this.onCost = config.onCost;
    this.dailyUsage = 0;
    this.monthlyUsage = 0;
  }

  /**
   * Generate an image from text prompt
   */
  async generateImage(request: ImageRequest): Promise<ImageResponse> {
    // Check limits
    if (this.dailyUsage >= LIMITS.imagesPerDay) {
      throw new Error(`Daily limit reached (${LIMITS.imagesPerDay} images/day)`);
    }

    if (this.monthlyUsage >= LIMITS.imagesPerMonth) {
      throw new Error(`Monthly limit reached (${LIMITS.imagesPerMonth} images/month)`);
    }

    const estimatedCost = this.monthlyUsage * COST_PER_IMAGE;
    if (estimatedCost >= LIMITS.maxCostPerMonth) {
      throw new Error(`Monthly budget limit reached ($${LIMITS.maxCostPerMonth})`);
    }

    try {
      console.log(`[FLUX] Generating image: "${request.prompt.substring(0, 50)}..."`);
      console.log(`[FLUX] Cost: ~$${COST_PER_IMAGE.toFixed(3)}, Daily: ${this.dailyUsage}/${LIMITS.imagesPerDay}`);

      const startTime = Date.now();

      // Create prediction
      const predictionResponse = await fetch(`${this.baseURL}/predictions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${this.apiKey}`,
        },
        body: JSON.stringify({
          version: 'black-forest-labs/flux-1.1-pro:latest',
          input: {
            prompt: request.prompt,
            aspect_ratio: request.aspectRatio || '1:1',
            output_format: request.outputFormat || 'webp',
            output_quality: request.outputQuality || 90,
            safety_tolerance: request.safetyTolerance || 2,
          },
        }),
      });

      if (!predictionResponse.ok) {
        const error = await predictionResponse.json().catch(() => ({}));
        throw new Error(
          `FLUX API error: ${predictionResponse.status} - ${error.detail || 'Unknown error'}`
        );
      }

      const prediction = await predictionResponse.json();
      const predictionId = prediction.id;

      console.log(`[FLUX] Prediction created: ${predictionId}, waiting for completion...`);

      // Poll for completion (max 60 seconds)
      let result = prediction;
      let attempts = 0;
      const maxAttempts = 60;

      while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const statusResponse = await fetch(`${this.baseURL}/predictions/${predictionId}`, {
          headers: {
            'Authorization': `Token ${this.apiKey}`,
          },
        });

        result = await statusResponse.json();
        attempts++;

        if (attempts % 5 === 0) {
          console.log(`[FLUX] Still generating... (${attempts}s)`);
        }
      }

      if (result.status !== 'succeeded') {
        throw new Error(`Image generation failed: ${result.status}`);
      }

      const generationTime = Date.now() - startTime;
      const imageUrl = result.output[0];

      // Track usage
      this.dailyUsage++;
      this.monthlyUsage++;

      // Track cost
      if (this.onCost) {
        this.onCost(COST_PER_IMAGE);
      }

      console.log(
        `[FLUX] Success: Generated in ${generationTime}ms, cost: $${COST_PER_IMAGE.toFixed(3)}`
      );
      console.log(`[FLUX] Image URL: ${imageUrl}`);

      return {
        imageUrl,
        prompt: request.prompt,
        aspectRatio: request.aspectRatio || '1:1',
        cost: COST_PER_IMAGE,
        generationTime,
        predictionId,
      };
    } catch (error) {
      console.error('[FLUX] Image generation error:', error);
      throw error;
    }
  }

  /**
   * Generate multiple images in parallel
   */
  async generateBatch(prompts: string[], options?: Partial<ImageRequest>): Promise<ImageResponse[]> {
    console.log(`[FLUX] Batch generating ${prompts.length} images`);

    // Check batch limits
    if (this.dailyUsage + prompts.length > LIMITS.imagesPerDay) {
      throw new Error(
        `Batch would exceed daily limit (${this.dailyUsage + prompts.length}/${LIMITS.imagesPerDay})`
      );
    }

    const requests = prompts.map((prompt) =>
      this.generateImage({ ...options, prompt })
    );

    const results = await Promise.all(requests);

    const totalCost = results.reduce((sum, r) => sum + r.cost, 0);
    console.log(
      `[FLUX] Batch complete: ${results.length} images, total cost: $${totalCost.toFixed(2)}`
    );

    return results;
  }

  /**
   * Get usage statistics
   */
  getUsageStats(): {
    dailyUsage: number;
    monthlyUsage: number;
    dailyLimit: number;
    monthlyLimit: number;
    estimatedMonthlyCost: number;
    remainingDailyImages: number;
    remainingMonthlyImages: number;
  } {
    return {
      dailyUsage: this.dailyUsage,
      monthlyUsage: this.monthlyUsage,
      dailyLimit: LIMITS.imagesPerDay,
      monthlyLimit: LIMITS.imagesPerMonth,
      estimatedMonthlyCost: this.monthlyUsage * COST_PER_IMAGE,
      remainingDailyImages: Math.max(0, LIMITS.imagesPerDay - this.dailyUsage),
      remainingMonthlyImages: Math.max(0, LIMITS.imagesPerMonth - this.monthlyUsage),
    };
  }

  /**
   * Reset daily usage counter
   */
  resetDailyUsage(): void {
    this.dailyUsage = 0;
    console.log('[FLUX] Daily usage counter reset');
  }

  /**
   * Reset monthly usage counter
   */
  resetMonthlyUsage(): void {
    this.monthlyUsage = 0;
    this.dailyUsage = 0;
    console.log('[FLUX] Monthly usage counter reset');
  }

  /**
   * Check if FLUX is available
   */
  static isAvailable(): boolean {
    return !!process.env.REPLICATE_API_TOKEN;
  }

  /**
   * Get pricing info
   */
  static getPricing() {
    return {
      costPerImage: COST_PER_IMAGE,
      limits: LIMITS,
      estimatedCosts: {
        '10 images': (10 * COST_PER_IMAGE).toFixed(2),
        '20 images': (20 * COST_PER_IMAGE).toFixed(2),
        '50 images': (50 * COST_PER_IMAGE).toFixed(2),
        '100 images': (100 * COST_PER_IMAGE).toFixed(2),
      },
    };
  }
}

// Singleton instance
let fluxClient: FLUXClient | null = null;

export function getFLUXClient(): FLUXClient {
  if (!fluxClient) {
    const apiKey = process.env.REPLICATE_API_TOKEN;
    if (!apiKey) {
      throw new Error('REPLICATE_API_TOKEN environment variable is required');
    }

    fluxClient = new FLUXClient({
      apiKey,
      onCost: (cost) => {
        console.log(`[FLUX] Image cost: $${cost.toFixed(3)}`);
      },
    });
  }

  return fluxClient;
}

export { COST_PER_IMAGE, LIMITS };
export type { FLUXConfig, ImageRequest, ImageResponse };
