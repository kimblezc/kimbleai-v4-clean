'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card-shadcn';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input-shadcn';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select-shadcn';
import { Badge } from '@/components/ui/badge';
import { Clock, Zap, Play, Info } from 'lucide-react';

interface TriggerSelectorProps {
  triggerType: 'manual' | 'scheduled' | 'event';
  triggerConfig: Record<string, any>;
  onTriggerTypeChange: (type: 'manual' | 'scheduled' | 'event') => void;
  onTriggerConfigChange: (config: Record<string, any>) => void;
}

const CRON_PRESETS = [
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every day at 7am', value: '0 7 * * *' },
  { label: 'Every day at 9am', value: '0 9 * * *' },
  { label: 'Every weekday at 8am', value: '0 8 * * 1-5' },
  { label: 'Every Monday at 9am', value: '0 9 * * 1' },
  { label: 'Every week on Sunday', value: '0 0 * * 0' },
];

const EVENT_TYPES = [
  { label: 'File uploaded', value: 'file_uploaded' },
  { label: 'Email received', value: 'email_received' },
  { label: 'Task created', value: 'task_created' },
  { label: 'Calendar event', value: 'calendar_event' },
];

export default function TriggerSelector({
  triggerType,
  triggerConfig,
  onTriggerTypeChange,
  onTriggerConfigChange,
}: TriggerSelectorProps) {
  const getTriggerIcon = () => {
    switch (triggerType) {
      case 'scheduled':
        return <Clock className="w-5 h-5 text-orange-400" />;
      case 'event':
        return <Zap className="w-5 h-5 text-blue-400" />;
      default:
        return <Play className="w-5 h-5 text-purple-400" />;
    }
  };

  return (
    <Card className="mb-6 bg-slate-900/50 border-purple-500/20 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-purple-200 flex items-center gap-2">
          {getTriggerIcon()}
          Trigger Configuration
        </CardTitle>
        <CardDescription className="text-purple-300/60">
          Choose when this workflow should execute
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Trigger Type Selection */}
        <div>
          <Label className="text-purple-300 mb-2 block">Trigger Type</Label>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => onTriggerTypeChange('manual')}
              className={`p-4 rounded-lg border-2 transition-all ${
                triggerType === 'manual'
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-purple-500/20 bg-slate-800/30 hover:border-purple-500/40'
              }`}
            >
              <Play className="w-6 h-6 mx-auto mb-2 text-purple-400" />
              <div className="text-sm font-medium text-purple-200">Manual</div>
              <div className="text-xs text-purple-300/60">Execute on demand</div>
            </button>

            <button
              onClick={() => onTriggerTypeChange('scheduled')}
              className={`p-4 rounded-lg border-2 transition-all ${
                triggerType === 'scheduled'
                  ? 'border-orange-500 bg-orange-500/10'
                  : 'border-purple-500/20 bg-slate-800/30 hover:border-purple-500/40'
              }`}
            >
              <Clock className="w-6 h-6 mx-auto mb-2 text-orange-400" />
              <div className="text-sm font-medium text-purple-200">Scheduled</div>
              <div className="text-xs text-purple-300/60">Run on schedule</div>
            </button>

            <button
              onClick={() => onTriggerTypeChange('event')}
              className={`p-4 rounded-lg border-2 transition-all ${
                triggerType === 'event'
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-purple-500/20 bg-slate-800/30 hover:border-purple-500/40'
              }`}
            >
              <Zap className="w-6 h-6 mx-auto mb-2 text-blue-400" />
              <div className="text-sm font-medium text-purple-200">Event</div>
              <div className="text-xs text-purple-300/60">Trigger on event</div>
            </button>
          </div>
        </div>

        {/* Scheduled Configuration */}
        {triggerType === 'scheduled' && (
          <div className="space-y-4 p-4 bg-orange-500/5 border border-orange-500/20 rounded-lg">
            <div>
              <Label className="text-purple-300">Schedule (Cron Expression)</Label>
              <Select
                value={triggerConfig.cron || ''}
                onValueChange={(value) =>
                  onTriggerConfigChange({ ...triggerConfig, cron: value })
                }
              >
                <SelectTrigger className="bg-slate-800/50 border-orange-500/30 text-purple-100">
                  <SelectValue placeholder="Select a schedule..." />
                </SelectTrigger>
                <SelectContent>
                  {CRON_PRESETS.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value}>
                      {preset.label} ({preset.value})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-purple-300">Custom Cron (optional)</Label>
              <Input
                value={triggerConfig.cron || ''}
                onChange={(e) =>
                  onTriggerConfigChange({ ...triggerConfig, cron: e.target.value })
                }
                placeholder="0 7 * * *"
                className="bg-slate-800/50 border-orange-500/30 text-purple-100"
              />
              <p className="text-xs text-purple-300/60 mt-1">
                Format: minute hour day month weekday
              </p>
            </div>

            {triggerConfig.cron && (
              <div className="flex items-center gap-2 p-3 bg-orange-500/10 rounded border border-orange-500/20">
                <Info className="w-4 h-4 text-orange-400 flex-shrink-0" />
                <span className="text-sm text-orange-300">
                  Schedule: <code className="font-mono">{triggerConfig.cron}</code>
                </span>
              </div>
            )}
          </div>
        )}

        {/* Event Configuration */}
        {triggerType === 'event' && (
          <div className="space-y-4 p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
            <div>
              <Label className="text-purple-300">Event Type</Label>
              <Select
                value={triggerConfig.event || ''}
                onValueChange={(value) =>
                  onTriggerConfigChange({ ...triggerConfig, event: value })
                }
              >
                <SelectTrigger className="bg-slate-800/50 border-blue-500/30 text-purple-100">
                  <SelectValue placeholder="Select an event type..." />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((event) => (
                    <SelectItem key={event.value} value={event.value}>
                      {event.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {triggerConfig.event && (
              <div className="flex items-center gap-2 p-3 bg-blue-500/10 rounded border border-blue-500/20">
                <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span className="text-sm text-blue-300">
                  Triggers when: {EVENT_TYPES.find((e) => e.value === triggerConfig.event)?.label}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Manual Configuration */}
        {triggerType === 'manual' && (
          <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-lg">
            <div className="flex items-center gap-2 text-purple-300/80">
              <Info className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">
                This workflow can only be executed manually via the Execute button
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
