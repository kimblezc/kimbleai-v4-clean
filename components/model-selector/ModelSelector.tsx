'use client';

/**
 * Model Selector Component
 *
 * Allows users to choose between GPT-4 and Claude models with
 * real-time cost comparison and capability visualization.
 *
 * Features:
 * - GPT-4o / GPT-4o mini
 * - Claude Opus 4.1 / Sonnet 4.5 / Haiku 4.5 / Haiku 3.5 / Haiku 3
 * - Real-time cost comparison
 * - Capability ratings (speed, quality, cost)
 * - Automatic model recommendations
 * - Dark D&D themed design
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card-shadcn';
import { Button } from '@/components/ui/button-shadcn';
import { Zap, Brain, DollarSign, Star, TrendingUp, Check } from 'lucide-react';

export type AIModel =
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'claude-opus-4-1'
  | 'claude-sonnet-4-5'
  | 'claude-haiku-4-5'
  | 'claude-3-5-haiku'
  | 'claude-3-haiku';

interface ModelInfo {
  id: AIModel;
  name: string;
  provider: 'OpenAI' | 'Anthropic';
  description: string;
  pricing: {
    input: number; // per million tokens
    output: number;
  };
  capabilities: {
    speed: number; // 1-10
    quality: number;
    reasoning: number;
    coding: number;
  };
  bestFor: string[];
  icon: string;
  color: string;
}

const MODELS: Record<AIModel, ModelInfo> = {
  'gpt-4o': {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    description: 'Most capable GPT model with vision and real-time capabilities',
    pricing: { input: 2.5, output: 10 },
    capabilities: { speed: 8, quality: 9, reasoning: 9, coding: 9 },
    bestFor: ['Multimodal tasks', 'Vision analysis', 'Real-time chat'],
    icon: '⚡',
    color: 'from-green-600 to-emerald-600',
  },
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    name: 'GPT-4o mini',
    provider: 'OpenAI',
    description: 'Fast and affordable GPT model for simple tasks',
    pricing: { input: 0.15, output: 0.6 },
    capabilities: { speed: 10, quality: 7, reasoning: 7, coding: 7 },
    bestFor: ['Quick responses', 'High-volume tasks', 'Cost-sensitive apps'],
    icon: '⚡',
    color: 'from-green-500 to-emerald-500',
  },
  'claude-opus-4-1': {
    id: 'claude-opus-4-1',
    name: 'Claude Opus 4.1',
    provider: 'Anthropic',
    description: 'Most powerful Claude model for complex reasoning',
    pricing: { input: 15, output: 75 },
    capabilities: { speed: 6, quality: 10, reasoning: 10, coding: 9 },
    bestFor: ['Complex reasoning', 'Strategic planning', 'Research'],
    icon: '🧠',
    color: 'from-purple-600 to-pink-600',
  },
  'claude-sonnet-4-5': {
    id: 'claude-sonnet-4-5',
    name: 'Claude Sonnet 4.5',
    provider: 'Anthropic',
    description: 'Best coding model with strong reasoning',
    pricing: { input: 3, output: 15 },
    capabilities: { speed: 7, quality: 9, reasoning: 9, coding: 10 },
    bestFor: ['Coding', 'Technical writing', 'Data analysis'],
    icon: '💻',
    color: 'from-purple-500 to-pink-500',
  },
  'claude-haiku-4-5': {
    id: 'claude-haiku-4-5',
    name: 'Claude Haiku 4.5',
    provider: 'Anthropic',
    description: 'Fast and efficient for quick responses',
    pricing: { input: 1, output: 5 },
    capabilities: { speed: 9, quality: 8, reasoning: 7, coding: 8 },
    bestFor: ['Quick responses', 'Chat', 'Content generation'],
    icon: '🚀',
    color: 'from-purple-400 to-pink-400',
  },
  'claude-3-5-haiku': {
    id: 'claude-3-5-haiku',
    name: 'Claude 3.5 Haiku',
    provider: 'Anthropic',
    description: 'Fastest Claude model for high-volume tasks',
    pricing: { input: 0.8, output: 4 },
    capabilities: { speed: 10, quality: 7, reasoning: 6, coding: 7 },
    bestFor: ['High-volume tasks', 'Simple queries', 'Fast responses'],
    icon: '⚡',
    color: 'from-purple-300 to-pink-300',
  },
  'claude-3-haiku': {
    id: 'claude-3-haiku',
    name: 'Claude 3 Haiku',
    provider: 'Anthropic',
    description: 'Most affordable Claude for bulk processing',
    pricing: { input: 0.25, output: 1.25 },
    capabilities: { speed: 10, quality: 6, reasoning: 5, coding: 6 },
    bestFor: ['Bulk processing', 'Classification', 'Data extraction'],
    icon: '💰',
    color: 'from-purple-200 to-pink-200',
  },
};

interface ModelSelectorProps {
  selectedModel: AIModel;
  onSelect: (model: AIModel) => void;
  estimatedTokens?: { input: number; output: number };
}

export function ModelSelector({
  selectedModel,
  onSelect,
  estimatedTokens = { input: 1000, output: 500 },
}: ModelSelectorProps) {
  const [filterProvider, setFilterProvider] = useState<'all' | 'OpenAI' | 'Anthropic'>('all');
  const [sortBy, setSortBy] = useState<'speed' | 'quality' | 'cost'>('quality');

  // Calculate estimated cost for each model
  const modelsWithCost = Object.values(MODELS).map((model) => {
    const inputCost = (estimatedTokens.input / 1_000_000) * model.pricing.input;
    const outputCost = (estimatedTokens.output / 1_000_000) * model.pricing.output;
    const totalCost = inputCost + outputCost;
    return { ...model, estimatedCost: totalCost };
  });

  // Filter by provider
  const filteredModels =
    filterProvider === 'all'
      ? modelsWithCost
      : modelsWithCost.filter((m) => m.provider === filterProvider);

  // Sort models
  const sortedModels = [...filteredModels].sort((a, b) => {
    if (sortBy === 'cost') return a.estimatedCost - b.estimatedCost;
    if (sortBy === 'speed') return b.capabilities.speed - a.capabilities.speed;
    return b.capabilities.quality - a.capabilities.quality;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
            Select AI Model
          </h2>
          <p className="text-slate-400 mt-1">
            Choose the best model for your task
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <select
            value={filterProvider}
            onChange={(e) => setFilterProvider(e.target.value as any)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="all">All Providers</option>
            <option value="OpenAI">OpenAI</option>
            <option value="Anthropic">Anthropic</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="quality">Sort by Quality</option>
            <option value="speed">Sort by Speed</option>
            <option value="cost">Sort by Cost</option>
          </select>
        </div>
      </div>

      {/* Model Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedModels.map((model) => (
          <ModelCard
            key={model.id}
            model={model}
            isSelected={selectedModel === model.id}
            onSelect={() => onSelect(model.id)}
            estimatedCost={model.estimatedCost}
          />
        ))}
      </div>

      {/* Cost Comparison */}
      <Card className="bg-slate-900/50 border-purple-500/20 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-purple-300 flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Cost Comparison
          </CardTitle>
          <CardDescription className="text-slate-400">
            Estimated cost for {estimatedTokens.input.toLocaleString()} input + {estimatedTokens.output.toLocaleString()} output tokens
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sortedModels
              .sort((a, b) => a.estimatedCost - b.estimatedCost)
              .map((model) => (
                <div
                  key={model.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-800/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{model.icon}</span>
                    <div>
                      <div className="text-sm font-medium text-slate-200">
                        {model.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {model.provider}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-purple-400">
                      ${model.estimatedCost.toFixed(4)}
                    </div>
                    <div className="text-xs text-slate-500">
                      ${model.pricing.input}/{model.pricing.output} per 1M
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Model Card Component
function ModelCard({
  model,
  isSelected,
  onSelect,
  estimatedCost,
}: {
  model: ModelInfo & { estimatedCost: number };
  isSelected: boolean;
  onSelect: () => void;
  estimatedCost: number;
}) {
  return (
    <Card
      className={`cursor-pointer transition-all ${
        isSelected
          ? `bg-gradient-to-br ${model.color} border-transparent`
          : 'bg-slate-900/50 border-purple-500/20 hover:border-purple-500/40'
      } backdrop-blur`}
      onClick={onSelect}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-3xl">{model.icon}</span>
            <div>
              <CardTitle className={`text-lg ${isSelected ? 'text-white' : 'text-purple-300'}`}>
                {model.name}
              </CardTitle>
              <CardDescription className={isSelected ? 'text-white/80' : 'text-slate-400'}>
                {model.provider}
              </CardDescription>
            </div>
          </div>
          {isSelected && (
            <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
              <Check className="w-4 h-4 text-purple-600" />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className={`text-sm ${isSelected ? 'text-white/90' : 'text-slate-300'}`}>
          {model.description}
        </p>

        {/* Capabilities */}
        <div className="space-y-2">
          <CapabilityBar
            label="Speed"
            value={model.capabilities.speed}
            icon={<Zap className="w-3 h-3" />}
            isSelected={isSelected}
          />
          <CapabilityBar
            label="Quality"
            value={model.capabilities.quality}
            icon={<Star className="w-3 h-3" />}
            isSelected={isSelected}
          />
          <CapabilityBar
            label="Reasoning"
            value={model.capabilities.reasoning}
            icon={<Brain className="w-3 h-3" />}
            isSelected={isSelected}
          />
        </div>

        {/* Best For */}
        <div>
          <div className={`text-xs font-medium mb-1 ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
            Best for:
          </div>
          <div className="flex flex-wrap gap-1">
            {model.bestFor.map((use, idx) => (
              <span
                key={idx}
                className={`text-xs px-2 py-1 rounded-full ${
                  isSelected
                    ? 'bg-white/20 text-white'
                    : 'bg-purple-500/20 text-purple-300'
                }`}
              >
                {use}
              </span>
            ))}
          </div>
        </div>

        {/* Cost */}
        <div className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-purple-400'}`}>
          ~${estimatedCost.toFixed(4)} per request
        </div>
      </CardContent>
    </Card>
  );
}

// Capability Bar Component
function CapabilityBar({
  label,
  value,
  icon,
  isSelected,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  isSelected: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className={`flex items-center gap-1 w-20 text-xs ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
        {icon}
        {label}
      </div>
      <div className="flex-1 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isSelected ? 'bg-white' : 'bg-gradient-to-r from-purple-500 to-pink-500'
          }`}
          style={{ width: `${value * 10}%` }}
        />
      </div>
      <div className={`text-xs w-6 text-right ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>
        {value}/10
      </div>
    </div>
  );
}
