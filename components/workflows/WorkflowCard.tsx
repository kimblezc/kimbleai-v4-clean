'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Play,
  Settings,
  Trash2,
  Clock,
  Zap,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';

interface Workflow {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  trigger_type: 'manual' | 'scheduled' | 'event';
  trigger_config: Record<string, any>;
  actions: any[];
  created_at: string;
  updated_at: string;
}

interface WorkflowCardProps {
  workflow: Workflow;
  onExecute: () => void;
  onToggleEnabled: (enabled: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  isExecuting?: boolean;
}

export default function WorkflowCard({
  workflow,
  onExecute,
  onToggleEnabled,
  onEdit,
  onDelete,
  isExecuting = false,
}: WorkflowCardProps) {
  const getTriggerIcon = () => {
    switch (workflow.trigger_type) {
      case 'scheduled':
        return <Clock className="w-4 h-4" />;
      case 'event':
        return <Zap className="w-4 h-4" />;
      default:
        return <Play className="w-4 h-4" />;
    }
  };

  const getTriggerLabel = () => {
    switch (workflow.trigger_type) {
      case 'scheduled':
        return workflow.trigger_config.cron || 'Scheduled';
      case 'event':
        return workflow.trigger_config.event || 'Event-based';
      default:
        return 'Manual';
    }
  };

  return (
    <Card
      className={`bg-slate-900/50 backdrop-blur border transition-all hover:shadow-lg ${
        workflow.enabled
          ? 'border-purple-500/30 hover:border-purple-500/50 hover:shadow-purple-500/20'
          : 'border-slate-700/30 hover:border-slate-700/50'
      }`}
    >
      <CardHeader>
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <CardTitle className="text-lg text-purple-200 mb-1">{workflow.name}</CardTitle>
            <CardDescription className="text-purple-300/60 text-sm">
              {workflow.description}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {workflow.enabled ? (
              <div className="p-1.5 bg-green-500/20 rounded-full">
                <CheckCircle className="w-4 h-4 text-green-400" />
              </div>
            ) : (
              <div className="p-1.5 bg-slate-500/20 rounded-full">
                <XCircle className="w-4 h-4 text-slate-400" />
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Trigger Info */}
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center gap-2 text-purple-300/60">
            {getTriggerIcon()}
            <span className="capitalize">{workflow.trigger_type}</span>
          </div>
          <Badge variant="secondary" className="ml-auto text-xs bg-purple-500/10 text-purple-300">
            {getTriggerLabel()}
          </Badge>
        </div>

        {/* Actions Count */}
        <div className="flex items-center gap-2 text-sm text-purple-300/60">
          <Zap className="w-4 h-4" />
          <span>{workflow.actions.length} actions</span>
        </div>

        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-purple-500/10">
          <span className="text-sm text-purple-300/80">
            {workflow.enabled ? 'Enabled' : 'Disabled'}
          </span>
          <Switch
            checked={workflow.enabled}
            onCheckedChange={onToggleEnabled}
            className="data-[state=checked]:bg-purple-600"
          />
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button
            onClick={onExecute}
            disabled={!workflow.enabled || isExecuting}
            className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30"
            size="sm"
          >
            {isExecuting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Execute
              </>
            )}
          </Button>
          <Button
            onClick={onEdit}
            variant="outline"
            className="border-purple-500/30 text-purple-300 hover:bg-purple-600/10"
            size="sm"
          >
            <Settings className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>

        <Button
          onClick={onDelete}
          variant="outline"
          className="w-full border-red-500/30 text-red-400 hover:bg-red-600/10"
          size="sm"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </Button>
      </CardContent>
    </Card>
  );
}
