/**
 * Image Generation Hook
 * Generate images using FLUX 1.1 Pro
 */

import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

interface GenerateOptions {
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  outputFormat?: 'webp' | 'jpg' | 'png';
}

interface GeneratedImage {
  imageUrl: string;
  prompt: string;
  aspectRatio: string;
  cost: number;
  generationTime: number;
  usage: {
    dailyUsage: number;
    monthlyUsage: number;
    dailyLimit: number;
    monthlyLimit: number;
    estimatedMonthlyCost: number;
    remainingDailyImages: number;
    remainingMonthlyImages: number;
  };
}

interface ImageGenerationState {
  image: GeneratedImage | null;
  isGenerating: boolean;
  error: string | null;
}

export function useImageGeneration(userId: string = 'zach') {
  const [state, setState] = useState<ImageGenerationState>({
    image: null,
    isGenerating: false,
    error: null,
  });

  const generate = useCallback(
    async (prompt: string, options: GenerateOptions = {}) => {
      if (!prompt.trim()) {
        toast.error('Please enter an image prompt');
        return null;
      }

      setState({ image: null, isGenerating: true, error: null });

      try {
        console.log(`[ImageGeneration] Generating: "${prompt.substring(0, 50)}..."`);

        const response = await fetch('/api/image/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt,
            userId,
            aspectRatio: options.aspectRatio || '1:1',
            outputFormat: options.outputFormat || 'webp',
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || error.details || 'Image generation failed');
        }

        const data = await response.json();

        setState({
          image: {
            imageUrl: data.imageUrl,
            prompt: data.prompt,
            aspectRatio: data.aspectRatio,
            cost: data.cost,
            generationTime: data.generationTime,
            usage: data.usage,
          },
          isGenerating: false,
          error: null,
        });

        console.log(
          `[ImageGeneration] Success: $${data.cost.toFixed(3)}, ${data.generationTime}ms`
        );

        // Show usage warning if approaching limits
        if (data.usage.remainingDailyImages <= 1) {
          toast(`⚠️ Only ${data.usage.remainingDailyImages} images left today`, {
            duration: 4000,
          });
        }

        return data;
      } catch (error: any) {
        console.error('[ImageGeneration] Error:', error);
        const errorMessage = error.message || 'Image generation failed';

        setState({
          image: null,
          isGenerating: false,
          error: errorMessage,
        });

        toast.error(errorMessage);
        return null;
      }
    },
    [userId]
  );

  const clearImage = useCallback(() => {
    setState({
      image: null,
      isGenerating: false,
      error: null,
    });
  }, []);

  return {
    generate,
    clearImage,
    image: state.image,
    isGenerating: state.isGenerating,
    error: state.error,
  };
}
