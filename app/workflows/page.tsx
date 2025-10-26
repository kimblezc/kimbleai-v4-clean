'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card-shadcn';
import { Button } from '@/components/ui/button-shadcn';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs-shadcn';
import { Alert, AlertDescription } from '@/components/ui/alert-shadcn';
import {
  Plus,
  Play,
  Pause,
  Settings,
  Trash2,
  Clock,
  Zap,
  CheckCircle,
  AlertCircle,
  Sparkles,
  FileText,
  Calendar,
  Mail,
  FolderOpen,
  ListTodo,
} from 'lucide-react';
import WorkflowCard from '@/components/workflows/WorkflowCard';
import WorkflowBuilder from '@/components/workflows/WorkflowBuilder';

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

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  trigger_type: string;
  trigger_config: Record<string, any>;
  actions: any[];
}

export default function WorkflowsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [executingWorkflow, setExecutingWorkflow] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      loadData();
    }
  }, [status, router]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [workflowsRes, templatesRes] = await Promise.all([
        fetch('/api/workflows'),
        fetch('/api/workflows/templates'),
      ]);

      if (workflowsRes.ok) {
        const data = await workflowsRes.json();
        setWorkflows(data.workflows || []);
      }

      if (templatesRes.ok) {
        const data = await templatesRes.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error loading workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteWorkflow = async (workflowId: string) => {
    try {
      setExecutingWorkflow(workflowId);
      const res = await fetch(`/api/workflows/${workflowId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (res.ok) {
        const data = await res.json();
        alert(`Workflow executed successfully! Execution ID: ${data.execution.id}`);
      } else {
        const error = await res.json();
        alert(`Workflow execution failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Error executing workflow:', error);
      alert('Failed to execute workflow');
    } finally {
      setExecutingWorkflow(null);
    }
  };

  const handleToggleEnabled = async (workflowId: string, enabled: boolean) => {
    try {
      const res = await fetch('/api/workflows', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: workflowId, enabled }),
      });

      if (res.ok) {
        await loadData();
      }
    } catch (error) {
      console.error('Error toggling workflow:', error);
    }
  };

  const handleDeleteWorkflow = async (workflowId: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return;

    try {
      const res = await fetch(`/api/workflows?id=${workflowId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await loadData();
      }
    } catch (error) {
      console.error('Error deleting workflow:', error);
    }
  };

  const handleCreateFromTemplate = async (template: WorkflowTemplate) => {
    try {
      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: template.name,
          description: template.description,
          enabled: false, // Start disabled for new workflows
          trigger_type: template.trigger_type,
          trigger_config: template.trigger_config,
          actions: template.actions,
        }),
      });

      if (res.ok) {
        await loadData();
        alert('Workflow created from template!');
      }
    } catch (error) {
      console.error('Error creating workflow from template:', error);
    }
  };

  const handleSaveWorkflow = async (workflowData: any) => {
    try {
      const res = await fetch('/api/workflows', {
        method: selectedWorkflow ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          selectedWorkflow
            ? { id: selectedWorkflow.id, ...workflowData }
            : workflowData
        ),
      });

      if (res.ok) {
        await loadData();
        setShowBuilder(false);
        setSelectedWorkflow(null);
      }
    } catch (error) {
      console.error('Error saving workflow:', error);
    }
  };

  const getTriggerIcon = (type: string) => {
    switch (type) {
      case 'scheduled':
        return <Clock className="w-4 h-4" />;
      case 'event':
        return <Zap className="w-4 h-4" />;
      default:
        return <Play className="w-4 h-4" />;
    }
  };

  const getTemplateIcon = (category: string) => {
    switch (category) {
      case 'productivity':
        return <ListTodo className="w-5 h-5" />;
      case 'email':
        return <Mail className="w-5 h-5" />;
      case 'organization':
        return <FolderOpen className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 p-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-500 border-r-transparent"></div>
          <p className="mt-4 text-purple-300">Loading workflows...</p>
        </div>
      </div>
    );
  }

  if (showBuilder) {
    return (
      <WorkflowBuilder
        workflow={selectedWorkflow}
        onSave={handleSaveWorkflow}
        onCancel={() => {
          setShowBuilder(false);
          setSelectedWorkflow(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent mb-2">
                ✨ Workflow Automation
              </h1>
              <p className="text-purple-300/80">
                Create custom Archie workflows with triggers, schedules, and conditional logic
              </p>
            </div>
            <Button
              onClick={() => {
                setSelectedWorkflow(null);
                setShowBuilder(true);
              }}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg shadow-purple-500/50"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Workflow
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-slate-900/50 border-purple-500/20 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-300/60">Total Workflows</p>
                    <p className="text-2xl font-bold text-purple-400">{workflows.length}</p>
                  </div>
                  <Sparkles className="w-8 h-8 text-purple-400/40" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-green-500/20 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-300/60">Active</p>
                    <p className="text-2xl font-bold text-green-400">
                      {workflows.filter((w) => w.enabled).length}
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-400/40" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-orange-500/20 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-orange-300/60">Scheduled</p>
                    <p className="text-2xl font-bold text-orange-400">
                      {workflows.filter((w) => w.trigger_type === 'scheduled').length}
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-orange-400/40" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-blue-500/20 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-300/60">Templates</p>
                    <p className="text-2xl font-bold text-blue-400">{templates.length}</p>
                  </div>
                  <FileText className="w-8 h-8 text-blue-400/40" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="workflows" className="space-y-6">
          <TabsList className="bg-slate-900/50 border border-purple-500/20">
            <TabsTrigger value="workflows" className="data-[state=active]:bg-purple-600/20">
              My Workflows
            </TabsTrigger>
            <TabsTrigger value="templates" className="data-[state=active]:bg-purple-600/20">
              Templates
            </TabsTrigger>
          </TabsList>

          {/* My Workflows Tab */}
          <TabsContent value="workflows">
            {workflows.length === 0 ? (
              <Card className="bg-slate-900/50 border-purple-500/20 backdrop-blur">
                <CardContent className="p-12 text-center">
                  <Sparkles className="w-16 h-16 text-purple-400/40 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-purple-300 mb-2">
                    No workflows yet
                  </h3>
                  <p className="text-purple-300/60 mb-4">
                    Create your first workflow or start from a template
                  </p>
                  <Button
                    onClick={() => setShowBuilder(true)}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Workflow
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {workflows.map((workflow) => (
                  <WorkflowCard
                    key={workflow.id}
                    workflow={workflow}
                    onExecute={() => handleExecuteWorkflow(workflow.id)}
                    onToggleEnabled={(enabled) => handleToggleEnabled(workflow.id, enabled)}
                    onEdit={() => {
                      setSelectedWorkflow(workflow);
                      setShowBuilder(true);
                    }}
                    onDelete={() => handleDeleteWorkflow(workflow.id)}
                    isExecuting={executingWorkflow === workflow.id}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template) => (
                <Card
                  key={template.id}
                  className="bg-slate-900/50 border-purple-500/20 backdrop-blur hover:border-purple-500/40 transition-all hover:shadow-lg hover:shadow-purple-500/20"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <div className="p-2 bg-purple-500/10 rounded-lg">
                        {getTemplateIcon(template.category)}
                      </div>
                      <Badge variant="outline" className="border-purple-500/30 text-purple-300">
                        {template.category}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg text-purple-200">{template.name}</CardTitle>
                    <CardDescription className="text-purple-300/60">
                      {template.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-purple-300/60">
                        {getTriggerIcon(template.trigger_type)}
                        <span className="capitalize">{template.trigger_type}</span>
                        {template.trigger_type === 'scheduled' && template.trigger_config.cron && (
                          <Badge variant="secondary" className="ml-auto text-xs">
                            {template.trigger_config.cron}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-purple-300/60">
                        <Zap className="w-4 h-4" />
                        <span>{template.actions.length} actions</span>
                      </div>
                      <Button
                        onClick={() => handleCreateFromTemplate(template)}
                        className="w-full bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Use Template
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
