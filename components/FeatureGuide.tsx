'use client';

import { useState } from 'react';

interface Feature {
  id: string;
  label: string;
  description: string;
  usage: string[];
  example?: string;
}

const FEATURES: Feature[] = [
  {
    id: 'gemini-flash',
    label: 'Gemini Flash',
    description: 'Fast, default AI model. FREE tier (1,500 requests/day).',
    usage: [
      'Automatic - used for most requests',
      'Type normally in chat',
      'No setup required'
    ]
  },
  {
    id: 'gemini-pro',
    label: 'Gemini Pro',
    description: 'Advanced reasoning. FREE tier (50 requests/day).',
    usage: [
      'Automatic for complex queries',
      'Triggered by keywords: analyze, research, complex',
      'No setup required'
    ]
  },
  {
    id: 'bulk-processing',
    label: 'Bulk Processing',
    description: 'Process 100+ documents via DeepSeek.',
    usage: [
      'Not yet implemented in UI',
      'Will be available in future update',
      'Use /api/bulk-process endpoint directly'
    ]
  },
  {
    id: 'search',
    label: 'AI Search',
    description: 'Perplexity search with citations.',
    usage: [
      'Not yet implemented in UI',
      'Will be available in future update',
      'Use /api/search endpoint directly'
    ]
  },
  {
    id: 'voice-output',
    label: 'Voice Output',
    description: 'ElevenLabs text-to-speech. FREE (10K chars/month).',
    usage: [
      'Not yet implemented in UI',
      'Will be available in future update',
      'Use /api/tts endpoint directly'
    ]
  },
  {
    id: 'image-gen',
    label: 'Image Generation',
    description: 'FLUX 1.1 Pro images ($0.055 each).',
    usage: [
      'Not yet implemented in UI',
      'Will be available in future update',
      'Use FLUX client directly'
    ]
  }
];

export default function FeatureGuide() {
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);
  const [expandedFeature, setExpandedFeature] = useState<string | null>(null);

  return (
    <div className="w-64 bg-gray-950 border-l border-gray-800 flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-gray-900">
        <h3 className="text-sm font-mono text-gray-500 uppercase tracking-wider">Features</h3>
      </div>

      {/* Feature List */}
      <div className="flex-1 p-2">
        {FEATURES.map((feature) => (
          <div
            key={feature.id}
            className="mb-1"
            onMouseEnter={() => setHoveredFeature(feature.id)}
            onMouseLeave={() => setHoveredFeature(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setExpandedFeature(expandedFeature === feature.id ? null : feature.id);
            }}
          >
            <button
              onClick={() => setExpandedFeature(expandedFeature === feature.id ? null : feature.id)}
              className="w-full text-left px-3 py-2 rounded text-sm text-gray-400 hover:text-gray-300 hover:bg-gray-900/50 transition-colors"
            >
              {feature.label}
            </button>

            {/* Hover Tooltip */}
            {hoveredFeature === feature.id && expandedFeature !== feature.id && (
              <div className="ml-3 px-3 py-2 text-xs text-gray-500 bg-gray-900/30 rounded border border-gray-800">
                {feature.description}
              </div>
            )}

            {/* Expanded Details (on click or right-click) */}
            {expandedFeature === feature.id && (
              <div className="ml-3 px-3 py-2 text-xs bg-gray-900/50 rounded border border-gray-800 mt-1">
                <div className="text-gray-500 mb-2">{feature.description}</div>
                <div className="text-gray-600 font-mono text-[10px] mb-1">USAGE:</div>
                <ul className="space-y-1">
                  {feature.usage.map((step, idx) => (
                    <li key={idx} className="text-gray-500">
                      <span className="text-gray-700">•</span> {step}
                    </li>
                  ))}
                </ul>
                {feature.example && (
                  <div className="mt-2 p-2 bg-black/30 rounded text-gray-600 font-mono text-[10px]">
                    {feature.example}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer hint */}
      <div className="p-3 border-t border-gray-900 text-[10px] text-gray-700 font-mono">
        Click or right-click for details
      </div>
    </div>
  );
}
