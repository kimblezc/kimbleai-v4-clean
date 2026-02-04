/**
 * Model Selector Component
 *
 * Features:
 * - Auto/manual mode toggle
 * - Model dropdown with recommendations
 * - Cost indicators
 * - Task-specific suggestions
 */

'use client';

import { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface ModelSelectorProps {
  selectedModel: string | null;
  onModelChange: (model: string | null) => void;
}

// Updated 2026-02-04 with latest models
const MODELS = {
  auto: {
    id: null,
    name: 'Auto',
    description: 'Smart routing based on task (uses GPT-5.2)',
    icon: 'AI',
    cost: 'Optimized',
  },
  'gpt-5.2': {
    id: 'gpt-5.2',
    name: 'GPT-5.2',
    description: 'Best general intelligence, agentic tasks',
    icon: '5.2',
    cost: '$$',
  },
  'gpt-5.2-pro': {
    id: 'gpt-5.2-pro',
    name: 'GPT-5.2 Pro',
    description: 'Smartest for difficult questions',
    icon: 'Pro',
    cost: '$$$',
  },
  'gpt-5.2-codex': {
    id: 'gpt-5.2-codex',
    name: 'GPT-5.2 Codex',
    description: 'Best for software engineering',
    icon: 'Cod',
    cost: '$$',
  },
  'claude-opus-4.5': {
    id: 'claude-opus-4.5',
    name: 'Claude Opus 4.5',
    description: 'Best for coding, agents, computer use',
    icon: 'C45',
    cost: '$$$',
  },
  'claude-sonnet-4.5': {
    id: 'claude-sonnet-4.5',
    name: 'Claude Sonnet 4.5',
    description: 'Best for code analysis, 1M context',
    icon: 'CS4',
    cost: '$$',
  },
  'gemini-3-flash': {
    id: 'gemini-3-flash',
    name: 'Gemini 3 Flash',
    description: 'Pro-level at Flash speed, fast vision',
    icon: 'G3F',
    cost: '$',
  },
  'gemini-3-pro': {
    id: 'gemini-3-pro',
    name: 'Gemini 3 Pro',
    description: 'Complex reasoning, 1M context',
    icon: 'G3P',
    cost: '$$',
  },
};

export default function ModelSelector({
  selectedModel,
  onModelChange,
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currentModel =
    selectedModel === null
      ? MODELS.auto
      : MODELS[selectedModel as keyof typeof MODELS] || MODELS.auto;

  const handleModelSelect = (modelId: string | null) => {
    onModelChange(modelId);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 bg-neutral-800 rounded-lg hover:bg-neutral-700 active:bg-neutral-600 transition-colors touch-manipulation min-h-[44px]"
      >
        <span className="text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 bg-white text-black rounded">{currentModel.icon}</span>
        <div className="text-left hidden xs:block">
          <div className="text-sm font-medium text-white">
            {currentModel.name}
          </div>
          <div className="text-xs text-neutral-400">
            {currentModel.cost}
          </div>
        </div>
        <ChevronDownIcon
          className={`w-4 h-4 text-neutral-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10 bg-black/50 sm:bg-transparent"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu - Bottom sheet on mobile, dropdown on desktop */}
          <div className="fixed sm:absolute bottom-0 sm:bottom-auto left-0 right-0 sm:left-0 sm:right-auto sm:top-full sm:mt-2 w-full sm:w-80 bg-neutral-900 rounded-t-2xl sm:rounded-lg shadow-xl border border-neutral-800 z-20 max-h-[70vh] sm:max-h-[400px] overflow-y-auto pb-safe">
            {/* Drag handle for mobile */}
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-neutral-600 rounded-full" />
            </div>
            <div className="p-2 sm:p-2">
              {/* Auto Mode */}
              <button
                onClick={() => handleModelSelect(null)}
                className={`w-full text-left px-4 py-3.5 sm:py-3 rounded-lg transition-colors touch-manipulation ${
                  selectedModel === null
                    ? 'bg-neutral-800'
                    : 'hover:bg-neutral-800 active:bg-neutral-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xs font-bold px-2 py-1 bg-white text-black rounded">{MODELS.auto.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-white">
                        {MODELS.auto.name}
                      </span>
                      <span className="text-xs px-2 py-1 bg-neutral-700 text-neutral-300 rounded">
                        Recommended
                      </span>
                    </div>
                    <p className="text-sm text-neutral-400 mt-1">
                      {MODELS.auto.description}
                    </p>
                    <div className="text-xs text-neutral-500 mt-1">
                      Saves 40-50% on costs
                    </div>
                  </div>
                </div>
              </button>

              <div className="my-2 border-t border-neutral-800" />

              {/* Manual Models */}
              {Object.entries(MODELS)
                .filter(([key]) => key !== 'auto')
                .map(([key, model]) => (
                  <button
                    key={key}
                    onClick={() => handleModelSelect(model.id)}
                    className={`w-full text-left px-4 py-3.5 sm:py-3 rounded-lg transition-colors touch-manipulation ${
                      selectedModel === model.id
                        ? 'bg-neutral-800'
                        : 'hover:bg-neutral-800 active:bg-neutral-700'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xs font-bold px-2 py-1 bg-white text-black rounded">{model.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-white">
                            {model.name}
                          </span>
                          <span className="text-xs text-neutral-500">
                            {model.cost}
                          </span>
                        </div>
                        <p className="text-sm text-neutral-400 mt-1">
                          {model.description}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
