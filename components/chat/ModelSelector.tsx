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

const MODELS = {
  auto: {
    id: null,
    name: 'Auto',
    description: 'Smart routing based on task',
    icon: 'AI',
    cost: 'Optimized',
  },
  'gpt-5': {
    id: 'gpt-5',
    name: 'GPT-5',
    description: 'Highest accuracy, reasoning',
    icon: 'G5',
    cost: '$$$',
  },
  'gpt-4.5': {
    id: 'gpt-4.5',
    name: 'GPT-4.5',
    description: 'Best balance of cost/quality',
    icon: 'G4',
    cost: '$$',
  },
  'claude-sonnet-4.5': {
    id: 'claude-sonnet-4.5',
    name: 'Claude Sonnet 4.5',
    description: 'Best for code analysis',
    icon: 'CS',
    cost: '$$',
  },
  'gemini-2.5-flash': {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    description: '75% cheaper, fast vision',
    icon: 'GF',
    cost: '$',
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
        className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
      >
        <span className="text-xs font-bold px-2 py-1 bg-blue-600 text-white rounded">{currentModel.icon}</span>
        <div className="text-left">
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            {currentModel.name}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {currentModel.cost}
          </div>
        </div>
        <ChevronDownIcon
          className={`w-4 h-4 text-gray-500 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-20">
            <div className="p-2">
              {/* Auto Mode */}
              <button
                onClick={() => handleModelSelect(null)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  selectedModel === null
                    ? 'bg-blue-100 dark:bg-blue-900/30'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xs font-bold px-2 py-1 bg-blue-600 text-white rounded">{MODELS.auto.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {MODELS.auto.name}
                      </span>
                      <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                        Recommended
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {MODELS.auto.description}
                    </p>
                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      Saves 40-50% on costs
                    </div>
                  </div>
                </div>
              </button>

              <div className="my-2 border-t border-gray-200 dark:border-gray-700" />

              {/* Manual Models */}
              {Object.entries(MODELS)
                .filter(([key]) => key !== 'auto')
                .map(([key, model]) => (
                  <button
                    key={key}
                    onClick={() => handleModelSelect(model.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                      selectedModel === model.id
                        ? 'bg-blue-100 dark:bg-blue-900/30'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xs font-bold px-2 py-1 bg-blue-600 text-white rounded">{model.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {model.name}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {model.cost}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
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
