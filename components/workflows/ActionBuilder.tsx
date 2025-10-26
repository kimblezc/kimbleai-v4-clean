'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card-shadcn';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input-shadcn';
import { Textarea } from '@/components/ui/textarea-shadcn';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select-shadcn';
import { Button } from '@/components/ui/button-shadcn';
import { Badge } from '@/components/ui/badge';
import {
  Mail,
  Calendar,
  FolderOpen,
  Bell,
  Brain,
  ListTodo,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ActionBuilderProps {
  action: any;
  index: number;
  onUpdate: (action: any) => void;
  onDelete: () => void;
}

const ACTION_TYPES = [
  { value: 'gmail', label: 'Gmail', icon: Mail, color: 'red' },
  { value: 'calendar', label: 'Calendar', icon: Calendar, color: 'blue' },
  { value: 'drive', label: 'Drive', icon: FolderOpen, color: 'green' },
  { value: 'notification', label: 'Notification', icon: Bell, color: 'purple' },
  { value: 'ai_analysis', label: 'AI Analysis', icon: Brain, color: 'pink' },
  { value: 'create_task', label: 'Create Task', icon: ListTodo, color: 'orange' },
];

export default function ActionBuilder({ action, index, onUpdate, onDelete }: ActionBuilderProps) {
  const [expanded, setExpanded] = React.useState(false);

  const actionType = ACTION_TYPES.find((t) => t.value === action.type);
  const Icon = actionType?.icon || Bell;
  const colorClass = actionType?.color || 'purple';

  const handleFieldChange = (field: string, value: any) => {
    onUpdate({
      ...action,
      [field]: value,
    });
  };

  const handleConfigChange = (field: string, value: any) => {
    onUpdate({
      ...action,
      config: {
        ...action.config,
        [field]: value,
      },
    });
  };

  const getConfigFields = () => {
    switch (action.type) {
      case 'gmail':
        return (
          <>
            <div>
              <Label className="text-purple-300">Operation</Label>
              <Select
                value={action.config.operation || ''}
                onValueChange={(value) => handleConfigChange('operation', value)}
              >
                <SelectTrigger className="bg-slate-800/50 border-purple-500/20 text-purple-100">
                  <SelectValue placeholder="Select operation..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="get_unread">Get Unread</SelectItem>
                  <SelectItem value="search">Search</SelectItem>
                  <SelectItem value="send">Send Email</SelectItem>
                  <SelectItem value="add_label">Add Label</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );

      case 'calendar':
        return (
          <>
            <div>
              <Label className="text-purple-300">Operation</Label>
              <Select
                value={action.config.operation || ''}
                onValueChange={(value) => handleConfigChange('operation', value)}
              >
                <SelectTrigger className="bg-slate-800/50 border-purple-500/20 text-purple-100">
                  <SelectValue placeholder="Select operation..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="list_events">List Events</SelectItem>
                  <SelectItem value="create_event">Create Event</SelectItem>
                  <SelectItem value="update_event">Update Event</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );

      case 'drive':
        return (
          <>
            <div>
              <Label className="text-purple-300">Operation</Label>
              <Select
                value={action.config.operation || ''}
                onValueChange={(value) => handleConfigChange('operation', value)}
              >
                <SelectTrigger className="bg-slate-800/50 border-purple-500/20 text-purple-100">
                  <SelectValue placeholder="Select operation..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="search">Search Files</SelectItem>
                  <SelectItem value="move_file">Move File</SelectItem>
                  <SelectItem value="update_metadata">Update Metadata</SelectItem>
                  <SelectItem value="share">Share File</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );

      case 'notification':
        return (
          <>
            <div>
              <Label className="text-purple-300">Message</Label>
              <Textarea
                value={action.config.message || ''}
                onChange={(e) => handleConfigChange('message', e.target.value)}
                placeholder="Notification message..."
                rows={3}
                className="bg-slate-800/50 border-purple-500/20 text-purple-100"
              />
            </div>
            <div>
              <Label className="text-purple-300">Channels</Label>
              <Select
                value={action.config.channels?.join(',') || 'in_app'}
                onValueChange={(value) => handleConfigChange('channels', value.split(','))}
              >
                <SelectTrigger className="bg-slate-800/50 border-purple-500/20 text-purple-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_app">In-App Only</SelectItem>
                  <SelectItem value="in_app,email">In-App + Email</SelectItem>
                  <SelectItem value="email">Email Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );

      case 'ai_analysis':
        return (
          <>
            <div>
              <Label className="text-purple-300">Analysis Type</Label>
              <Select
                value={action.config.analysisType || ''}
                onValueChange={(value) => handleConfigChange('analysisType', value)}
              >
                <SelectTrigger className="bg-slate-800/50 border-purple-500/20 text-purple-100">
                  <SelectValue placeholder="Select analysis type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summarize">Summarize</SelectItem>
                  <SelectItem value="categorize">Categorize</SelectItem>
                  <SelectItem value="extract_action_items">Extract Action Items</SelectItem>
                  <SelectItem value="sentiment">Sentiment Analysis</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-purple-300">Input Data Source</Label>
              <Input
                value={action.config.inputData || ''}
                onChange={(e) => handleConfigChange('inputData', e.target.value)}
                placeholder="e.g., previous_results, emails, files"
                className="bg-slate-800/50 border-purple-500/20 text-purple-100"
              />
            </div>
          </>
        );

      case 'create_task':
        return (
          <>
            <div>
              <Label className="text-purple-300">Task Title</Label>
              <Input
                value={action.config.title || ''}
                onChange={(e) => handleConfigChange('title', e.target.value)}
                placeholder="Task title..."
                className="bg-slate-800/50 border-purple-500/20 text-purple-100"
              />
            </div>
            <div>
              <Label className="text-purple-300">Description</Label>
              <Textarea
                value={action.config.description || ''}
                onChange={(e) => handleConfigChange('description', e.target.value)}
                placeholder="Task description..."
                rows={2}
                className="bg-slate-800/50 border-purple-500/20 text-purple-100"
              />
            </div>
            <div>
              <Label className="text-purple-300">Priority</Label>
              <Select
                value={action.config.priority || 'medium'}
                onValueChange={(value) => handleConfigChange('priority', value)}
              >
                <SelectTrigger className="bg-slate-800/50 border-purple-500/20 text-purple-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Card
      className={`bg-slate-800/30 border-${colorClass}-500/20 hover:border-${colorClass}-500/40 transition-all`}
    >
      <CardContent className="p-4">
        {/* Action Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3 flex-1">
            <div className={`p-2 bg-${colorClass}-500/10 rounded-lg`}>
              <Icon className={`w-5 h-5 text-${colorClass}-400`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`border-${colorClass}-500/30 text-${colorClass}-300`}>
                  Step {index + 1}
                </Badge>
                <span className="text-sm text-purple-300/60">{actionType?.label}</span>
              </div>
              {!expanded && (
                <p className="text-sm text-purple-200 mt-1 truncate">{action.name}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setExpanded(!expanded)}
              variant="ghost"
              size="sm"
              className="text-purple-300 hover:bg-purple-600/10"
            >
              {expanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
            <Button
              onClick={onDelete}
              variant="ghost"
              size="sm"
              className="text-red-400 hover:bg-red-600/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Expanded Configuration */}
        {expanded && (
          <div className="space-y-4 pt-3 border-t border-purple-500/10">
            <div>
              <Label className="text-purple-300">Action Name</Label>
              <Input
                value={action.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                placeholder="Action name..."
                className="bg-slate-800/50 border-purple-500/20 text-purple-100"
              />
            </div>

            <div>
              <Label className="text-purple-300">Action Type</Label>
              <Select value={action.type} onValueChange={(value) => handleFieldChange('type', value)}>
                <SelectTrigger className="bg-slate-800/50 border-purple-500/20 text-purple-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="w-4 h-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {getConfigFields()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
