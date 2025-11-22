'use client';

import { Button } from '@/components/ui/Button';

export default function IntegrationsPage() {
  const integrations = [
    { id: 'gemini-flash', name: 'Gemini 2.5 Flash (DEFAULT)', category: '🤖 AI', status: '✅ Active', pricing: '$0 (FREE)' },
    { id: 'deepseek', name: 'DeepSeek Bulk Processing', category: '🤖 AI', status: '✅ Active', pricing: '$0.27/$1.10 per 1M' },
    { id: 'elevenlabs', name: 'ElevenLabs TTS', category: '🎙️ Voice', status: '✅ Active', pricing: '$0 (FREE)' },
    { id: 'perplexity', name: 'Perplexity Search', category: '🔍 Search', status: '⏸️ Off', pricing: '$0.005/search' },
    { id: 'flux', name: 'FLUX Images', category: '🎨 Creative', status: '⏸️ Off', pricing: '$0.055/image' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Integrations</h1>
        <div className="grid gap-4">
          {integrations.map((int) => (
            <div key={int.id} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow flex justify-between items-center">
              <div>
                <div className="font-semibold text-lg">{int.name}</div>
                <div className="text-sm text-gray-600">{int.category} • {int.pricing}</div>
              </div>
              <div className="flex gap-4">
                <span>{int.status}</span>
                <Button size="sm">Configure</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
