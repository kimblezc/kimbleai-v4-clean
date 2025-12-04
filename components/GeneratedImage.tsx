/**
 * Generated Image Component
 * Displays FLUX-generated images with metadata
 * Ultra-minimalist dark design
 */

'use client';

import React from 'react';
import Image from 'next/image';

interface GeneratedImageProps {
  imageUrl: string;
  prompt: string;
  aspectRatio: string;
  cost: number;
  generationTime: number;
  onClear?: () => void;
}

export default function GeneratedImage({
  imageUrl,
  prompt,
  aspectRatio,
  cost,
  generationTime,
  onClear,
}: GeneratedImageProps) {
  return (
    <div className="space-y-3 max-w-full">
      {/* Image */}
      <div className="relative w-full max-w-2xl border border-gray-800 rounded-lg overflow-hidden bg-gray-900">
        <img
          src={imageUrl}
          alt={prompt}
          className="w-full h-auto max-h-[500px] object-contain"
          style={{ display: 'block' }}
        />
      </div>

      {/* Prompt */}
      <div className="text-sm text-gray-400">
        <span className="text-gray-600">Prompt: </span>
        {prompt}
      </div>

      {/* Metadata */}
      <div className="flex items-center gap-4 text-xs text-gray-600 font-mono">
        <span>Aspect: {aspectRatio}</span>
        <span>•</span>
        <span>Cost: ${cost.toFixed(3)}</span>
        <span>•</span>
        <span>Generated in {(generationTime / 1000).toFixed(1)}s</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <a
          href={imageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-500 hover:text-gray-400 transition-colors"
        >
          Open full size
        </a>
        {onClear && (
          <>
            <span className="text-gray-700">•</span>
            <button
              onClick={onClear}
              className="text-xs text-gray-500 hover:text-gray-400 transition-colors"
            >
              Clear
            </button>
          </>
        )}
      </div>
    </div>
  );
}
