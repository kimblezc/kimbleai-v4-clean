'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card-shadcn';
import { Button } from '@/components/ui/button-shadcn';
import { Input } from '@/components/ui/input-shadcn';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea-shadcn';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert-shadcn';
import {
  Save,
  X,
  Plus,
  Trash2,
  ArrowLeft,
  Sparkles,
  Info,
} from 'lucide-react';
import TriggerSelector from './TriggerSelector';
import ActionBuilder from './ActionBuilder';

interface WorkflowBuilderProps {
  workflow?: any;
  onSave: (workflow: any) => void;
  onCancel: () => void;
}

export default function WorkflowBuilder({ workflow, onSave, onCancel }: WorkflowBuilderProps) {
  const [name, setName] = useState(workflow?.name || '');
  const [description, setDescription] = useState(workflow?.description || '');
  const [enabled, setEnabled] = useState(workflow?.enabled ?? false);
  const [triggerType, setTriggerType] = useState<'manual' | 'scheduled' | 'event'>(
    workflow?.trigger_type || 'manual'
  );
  const [triggerConfig, setTriggerConfig] = useState(workflow?.trigger_config || {});
  const [actions, setActions] = useState(workflow?.actions || []);

  const handleAddAction = () => {
    setActions([
      ...actions,
      {
        id: `action_${Date.now()}`,
        type: 'notification',
        name: 'New Action',
        config: {},
      },
    ]);
  };

  const handleUpdateAction = (index: number, updatedAction: any) => {
    const newActions = [...actions];
    newActions[index] = updatedAction;
    setActions(newActions);
  };

  const handleDeleteAction = (index: number) => {
    setActions(actions.filter((_: any, i: number) => i !== index));
  };

  const handleSave = () => {
    if (!name.trim()) {
      alert('Please enter a workflow name');
      return;
    }

    if (actions.length === 0) {
      alert('Please add at least one action');
      return;
    }

    onSave({
      name,
      description,
      enabled,
      trigger_type: triggerType,
      trigger_config: triggerConfig,
      actions,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            onClick={onCancel}
            variant="ghost"
            className="text-purple-300 hover:text-purple-200 hover:bg-purple-600/10 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Workflows
          </Button>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent mb-2">
            {workflow ? 'Edit Workflow' : 'Create New Workflow'}
          </h1>
          <p className="text-purple-300/80">
            Define triggers, actions, and conditions for your automated workflow
          </p>
        </div>

        {/* Info Alert */}
        <Alert className="mb-6 bg-purple-500/10 border-purple-500/30">
          <Info className="h-4 w-4 text-purple-400" />
          <AlertDescription className="text-purple-300/80">
            Workflows execute actions sequentially when triggered. You can schedule them with cron
            expressions or trigger them manually.
          </AlertDescription>
        </Alert>

        {/* Basic Info */}
        <Card className="mb-6 bg-slate-900/50 border-purple-500/20 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-purple-200 flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Basic Information
            </CardTitle>
            <CardDescription className="text-purple-300/60">
              Name and describe your workflow
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-purple-300">
                Workflow Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Morning Briefing, File Organizer"
                className="bg-slate-800/50 border-purple-500/20 text-purple-100 placeholder:text-purple-300/40"
              />
            </div>
            <div>
              <Label htmlFor="description" className="text-purple-300">
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this workflow does..."
                rows={3}
                className="bg-slate-800/50 border-purple-500/20 text-purple-100 placeholder:text-purple-300/40"
              />
            </div>
          </CardContent>
        </Card>

        {/* Trigger Configuration */}
        <TriggerSelector
          triggerType={triggerType}
          triggerConfig={triggerConfig}
          onTriggerTypeChange={setTriggerType}
          onTriggerConfigChange={setTriggerConfig}
        />

        {/* Actions */}
        <Card className="mb-6 bg-slate-900/50 border-purple-500/20 backdrop-blur">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-purple-200">Actions</CardTitle>
                <CardDescription className="text-purple-300/60">
                  {actions.length} action{actions.length !== 1 ? 's' : ''} configured
                </CardDescription>
              </div>
              <Button
                onClick={handleAddAction}
                size="sm"
                className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Action
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {actions.length === 0 ? (
              <div className="text-center py-8 text-purple-300/60">
                <p className="mb-4">No actions configured yet</p>
                <Button
                  onClick={handleAddAction}
                  className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Action
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {actions.map((action: any, index: number) => (
                  <div key={action.id} className="relative">
                    {index > 0 && (
                      <div className="absolute -top-2 left-8 text-purple-400/40 text-xs">
                        ↓ then
                      </div>
                    )}
                    <ActionBuilder
                      action={action}
                      index={index}
                      onUpdate={(updatedAction) => handleUpdateAction(index, updatedAction)}
                      onDelete={() => handleDeleteAction(index)}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Save/Cancel Buttons */}
        <div className="flex items-center justify-end gap-4">
          <Button
            onClick={onCancel}
            variant="outline"
            className="border-purple-500/30 text-purple-300 hover:bg-purple-600/10"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg shadow-purple-500/50"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Workflow
          </Button>
        </div>
      </div>
    </div>
  );
}
