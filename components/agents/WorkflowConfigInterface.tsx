'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Plus,
  Trash2,
  Settings,
  Play,
  Save,
  Copy,
  Edit3,
  Zap,
  Mail,
  Calendar,
  FolderOpen,
  Brain,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Filter,
  Tag,
  ArrowRight,
  ArrowDown,
  ChevronRight,
  ChevronDown
} from 'lucide-react';

interface WorkflowConfig {
  id: string;
  name: string;
  description: string;
  services: ('gmail' | 'drive' | 'calendar')[];
  steps: WorkflowStep[];
  triggers: WorkflowTrigger[];
  enabled: boolean;
  priority: 'low' | 'medium' | 'high';
  schedule?: string;
  metadata: Record<string, any>;
}

interface WorkflowStep {
  id: string;
  service: 'gmail' | 'drive' | 'calendar' | 'analysis' | 'action';
  action: string;
  params: Record<string, any>;
  conditions?: Record<string, any>;
  onSuccess?: string;
  onFailure?: string;
}

interface WorkflowTrigger {
  type: 'schedule' | 'event' | 'condition' | 'manual';
  config: Record<string, any>;
}

interface AutomationRule {
  id: string;
  name: string;
  type: 'email_filing' | 'calendar_optimization' | 'drive_organization' | 'cross_service' | 'notification';
  conditions: Record<string, any>;
  actions: Record<string, any>;
  enabled: boolean;
  priority: number;
  learningEnabled: boolean;
}

interface EmailFilingRule {
  name: string;
  patterns: string[];
  folder?: string;
  labels?: string[];
  importance: number;
  autoFile: boolean;
}

interface CalendarRule {
  name: string;
  type: 'conflict_resolution' | 'travel_time' | 'focus_blocks' | 'meeting_grouping';
  parameters: Record<string, any>;
  priority: number;
}

export default function WorkflowConfigInterface({ userId = 'zach' }: { userId?: string }) {
  const [workflows, setWorkflows] = useState<WorkflowConfig[]>([]);
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowConfig | null>(null);
  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('workflows');
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  // Email filing rules state
  const [emailRules, setEmailRules] = useState<EmailFilingRule[]>([
    {
      name: 'Urgent Emails',
      patterns: ['urgent', 'asap', 'critical', 'emergency'],
      folder: 'Priority/Urgent',
      labels: ['urgent'],
      importance: 0.9,
      autoFile: true
    },
    {
      name: 'Meeting Invites',
      patterns: ['meeting', 'calendar invite', 'appointment'],
      folder: 'Meetings',
      labels: ['meetings'],
      importance: 0.8,
      autoFile: true
    }
  ]);

  // Calendar rules state
  const [calendarRules, setCalendarRules] = useState<CalendarRule[]>([
    {
      name: 'Auto Travel Time',
      type: 'travel_time',
      parameters: { defaultBuffer: 15, includeTraffic: true },
      priority: 8
    },
    {
      name: 'Focus Block Protection',
      type: 'focus_blocks',
      parameters: { minDuration: 60, protectedHours: ['9-12', '14-16'] },
      priority: 7
    }
  ]);

  useEffect(() => {
    loadWorkflowConfigs();
    loadAutomationRules();
  }, [userId]);

  const loadWorkflowConfigs = async () => {
    // Load existing workflow configurations
    // For demo purposes, using mock data
    const mockWorkflows: WorkflowConfig[] = [
      {
        id: 'workflow1',
        name: 'Smart Email Processing',
        description: 'Automatically categorize, file, and convert emails to tasks',
        services: ['gmail'],
        steps: [
          {
            id: 'step1',
            service: 'gmail',
            action: 'get_recent_emails',
            params: { maxResults: 50, timeRange: '24h' }
          },
          {
            id: 'step2',
            service: 'analysis',
            action: 'categorize_emails',
            params: { useAI: true, categories: ['urgent', 'meetings', 'tasks'] }
          },
          {
            id: 'step3',
            service: 'action',
            action: 'file_emails',
            params: { autoApply: true }
          }
        ],
        triggers: [
          {
            type: 'schedule',
            config: { interval: 'hourly' }
          }
        ],
        enabled: true,
        priority: 'high',
        metadata: { createdAt: new Date().toISOString() }
      }
    ];

    setWorkflows(mockWorkflows);
  };

  const loadAutomationRules = async () => {
    // Load existing automation rules
    const mockRules: AutomationRule[] = [
      {
        id: 'rule1',
        name: 'Priority Email Detection',
        type: 'email_filing',
        conditions: {
          patterns: ['urgent', 'asap', 'critical'],
          senderImportance: 'high'
        },
        actions: {
          addLabel: 'Priority',
          moveToFolder: 'Urgent',
          createNotification: true
        },
        enabled: true,
        priority: 9,
        learningEnabled: true
      }
    ];

    setAutomationRules(mockRules);
  };

  const createNewWorkflow = () => {
    const newWorkflow: WorkflowConfig = {
      id: `workflow_${Date.now()}`,
      name: 'New Workflow',
      description: '',
      services: [],
      steps: [],
      triggers: [],
      enabled: false,
      priority: 'medium',
      metadata: { createdAt: new Date().toISOString() }
    };

    setSelectedWorkflow(newWorkflow);
    setIsEditing(true);
  };

  const createNewRule = () => {
    const newRule: AutomationRule = {
      id: `rule_${Date.now()}`,
      name: 'New Automation Rule',
      type: 'email_filing',
      conditions: {},
      actions: {},
      enabled: false,
      priority: 5,
      learningEnabled: true
    };

    setSelectedRule(newRule);
    setIsEditing(true);
  };

  const saveWorkflow = async (workflow: WorkflowConfig) => {
    try {
      // Save workflow to backend
      const response = await fetch('/api/agents/workspace-orchestrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_workflow_config',
          userId,
          workflow
        })
      });

      if (response.ok) {
        // Update local state
        const existingIndex = workflows.findIndex(w => w.id === workflow.id);
        if (existingIndex >= 0) {
          const updatedWorkflows = [...workflows];
          updatedWorkflows[existingIndex] = workflow;
          setWorkflows(updatedWorkflows);
        } else {
          setWorkflows([...workflows, workflow]);
        }

        setIsEditing(false);
        setSelectedWorkflow(null);
      }
    } catch (error) {
      console.error('Error saving workflow:', error);
    }
  };

  const saveAutomationRule = async (rule: AutomationRule) => {
    try {
      // Save rule to backend
      const response = await fetch('/api/agents/workspace-orchestrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'configure_automation_rules',
          userId,
          ruleType: rule.type,
          ruleName: rule.name,
          conditions: rule.conditions,
          actions: rule.actions,
          enabled: rule.enabled,
          priority: rule.priority.toString()
        })
      });

      if (response.ok) {
        // Update local state
        const existingIndex = automationRules.findIndex(r => r.id === rule.id);
        if (existingIndex >= 0) {
          const updatedRules = [...automationRules];
          updatedRules[existingIndex] = rule;
          setAutomationRules(updatedRules);
        } else {
          setAutomationRules([...automationRules, rule]);
        }

        setIsEditing(false);
        setSelectedRule(null);
      }
    } catch (error) {
      console.error('Error saving automation rule:', error);
    }
  };

  const addWorkflowStep = (workflow: WorkflowConfig) => {
    const newStep: WorkflowStep = {
      id: `step_${Date.now()}`,
      service: 'gmail',
      action: '',
      params: {}
    };

    const updatedWorkflow = {
      ...workflow,
      steps: [...workflow.steps, newStep]
    };

    setSelectedWorkflow(updatedWorkflow);
  };

  const removeWorkflowStep = (workflow: WorkflowConfig, stepId: string) => {
    const updatedWorkflow = {
      ...workflow,
      steps: workflow.steps.filter(step => step.id !== stepId)
    };

    setSelectedWorkflow(updatedWorkflow);
  };

  const updateWorkflowStep = (workflow: WorkflowConfig, stepId: string, updates: Partial<WorkflowStep>) => {
    const updatedWorkflow = {
      ...workflow,
      steps: workflow.steps.map(step =>
        step.id === stepId ? { ...step, ...updates } : step
      )
    };

    setSelectedWorkflow(updatedWorkflow);
  };

  const toggleStepExpansion = (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  const getServiceIcon = (service: string) => {
    switch (service) {
      case 'gmail': return <Mail className="h-4 w-4" />;
      case 'drive': return <FolderOpen className="h-4 w-4" />;
      case 'calendar': return <Calendar className="h-4 w-4" />;
      case 'analysis': return <Brain className="h-4 w-4" />;
      case 'action': return <Zap className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  const getActionOptions = (service: string) => {
    const actions = {
      gmail: ['get_recent_emails', 'search_emails', 'send_email', 'file_emails', 'add_labels'],
      drive: ['list_files', 'search_files', 'organize_files', 'create_folder', 'move_files'],
      calendar: ['get_events', 'create_event', 'resolve_conflicts', 'add_travel_time'],
      analysis: ['categorize_emails', 'analyze_content', 'detect_patterns', 'generate_insights'],
      action: ['file_emails', 'create_tasks', 'send_notifications', 'update_calendar']
    };

    return actions[service as keyof typeof actions] || [];
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8 text-blue-600" />
            Workflow Configuration
          </h1>
          <p className="text-gray-600 mt-1">
            Configure automation rules and workflows for your workspace
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="rules">Automation Rules</TabsTrigger>
          <TabsTrigger value="email">Email Rules</TabsTrigger>
          <TabsTrigger value="calendar">Calendar Rules</TabsTrigger>
        </TabsList>

        {/* Workflows Tab */}
        <TabsContent value="workflows" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Workflow Configurations</h3>
            <Button onClick={createNewWorkflow}>
              <Plus className="h-4 w-4 mr-2" />
              New Workflow
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Workflow List */}
            <div className="space-y-4">
              {workflows.map((workflow) => (
                <Card
                  key={workflow.id}
                  className={`cursor-pointer transition-colors ${
                    selectedWorkflow?.id === workflow.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setSelectedWorkflow(workflow)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{workflow.name}</h4>
                          <Badge variant={workflow.enabled ? "default" : "secondary"}>
                            {workflow.enabled ? 'Active' : 'Disabled'}
                          </Badge>
                          <Badge variant="outline">{workflow.priority}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{workflow.description}</p>
                        <div className="flex items-center gap-2 mb-2">
                          {workflow.services.map((service) => (
                            <div key={service} className="flex items-center gap-1 text-xs bg-gray-100 px-2 py-1 rounded">
                              {getServiceIcon(service)}
                              <span className="capitalize">{service}</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500">{workflow.steps.length} steps</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedWorkflow(workflow);
                            setIsEditing(true);
                          }}
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Execute workflow
                          }}
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Workflow Editor */}
            <div>
              {selectedWorkflow ? (
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {isEditing ? (
                            <Input
                              value={selectedWorkflow.name}
                              onChange={(e) => setSelectedWorkflow({
                                ...selectedWorkflow,
                                name: e.target.value
                              })}
                              className="text-lg font-semibold"
                            />
                          ) : (
                            selectedWorkflow.name
                          )}
                        </CardTitle>
                        <CardDescription>
                          {isEditing ? (
                            <Textarea
                              value={selectedWorkflow.description}
                              onChange={(e) => setSelectedWorkflow({
                                ...selectedWorkflow,
                                description: e.target.value
                              })}
                              placeholder="Workflow description..."
                            />
                          ) : (
                            selectedWorkflow.description
                          )}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {isEditing ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => saveWorkflow(selectedWorkflow)}
                            >
                              <Save className="h-4 w-4 mr-2" />
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setIsEditing(false);
                                setSelectedWorkflow(null);
                              }}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => setIsEditing(true)}
                          >
                            <Edit3 className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Workflow Settings */}
                    {isEditing && (
                      <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Priority</Label>
                            <Select
                              value={selectedWorkflow.priority}
                              onValueChange={(value: 'low' | 'medium' | 'high') =>
                                setSelectedWorkflow({
                                  ...selectedWorkflow,
                                  priority: value
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={selectedWorkflow.enabled}
                              onCheckedChange={(enabled) =>
                                setSelectedWorkflow({
                                  ...selectedWorkflow,
                                  enabled
                                })
                              }
                            />
                            <Label>Enabled</Label>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Workflow Steps */}
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-medium">Workflow Steps</h4>
                        {isEditing && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => addWorkflowStep(selectedWorkflow)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Step
                          </Button>
                        )}
                      </div>

                      <div className="space-y-3">
                        {selectedWorkflow.steps.map((step, index) => (
                          <div key={step.id} className="border rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-xs flex items-center justify-center font-medium">
                                  {index + 1}
                                </span>
                                {getServiceIcon(step.service)}
                                <span className="font-medium capitalize">{step.service}</span>
                                <ChevronRight className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-600">{step.action || 'No action'}</span>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => toggleStepExpansion(step.id)}
                                >
                                  {expandedSteps.has(step.id) ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </Button>
                                {isEditing && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => removeWorkflowStep(selectedWorkflow, step.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>

                            {expandedSteps.has(step.id) && (
                              <div className="ml-8 space-y-3 pt-3 border-t">
                                {isEditing ? (
                                  <>
                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <Label>Service</Label>
                                        <Select
                                          value={step.service}
                                          onValueChange={(value) =>
                                            updateWorkflowStep(selectedWorkflow, step.id, { service: value as any })
                                          }
                                        >
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="gmail">Gmail</SelectItem>
                                            <SelectItem value="drive">Drive</SelectItem>
                                            <SelectItem value="calendar">Calendar</SelectItem>
                                            <SelectItem value="analysis">Analysis</SelectItem>
                                            <SelectItem value="action">Action</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div>
                                        <Label>Action</Label>
                                        <Select
                                          value={step.action}
                                          onValueChange={(value) =>
                                            updateWorkflowStep(selectedWorkflow, step.id, { action: value })
                                          }
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select action" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {getActionOptions(step.service).map((action) => (
                                              <SelectItem key={action} value={action}>
                                                {action.replace(/_/g, ' ')}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>
                                    <div>
                                      <Label>Parameters (JSON)</Label>
                                      <Textarea
                                        value={JSON.stringify(step.params, null, 2)}
                                        onChange={(e) => {
                                          try {
                                            const params = JSON.parse(e.target.value);
                                            updateWorkflowStep(selectedWorkflow, step.id, { params });
                                          } catch (error) {
                                            // Invalid JSON, don't update
                                          }
                                        }}
                                        placeholder='{ "maxResults": 50 }'
                                        rows={3}
                                      />
                                    </div>
                                  </>
                                ) : (
                                  <div className="text-sm text-gray-600">
                                    <p><strong>Parameters:</strong> {JSON.stringify(step.params)}</p>
                                    {step.conditions && (
                                      <p><strong>Conditions:</strong> {JSON.stringify(step.conditions)}</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Select a workflow to view details</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Automation Rules Tab */}
        <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Automation Rules</h3>
            <Button onClick={createNewRule}>
              <Plus className="h-4 w-4 mr-2" />
              New Rule
            </Button>
          </div>

          <div className="grid gap-4">
            {automationRules.map((rule) => (
              <Card key={rule.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant={rule.enabled ? "default" : "secondary"}>
                        {rule.enabled ? 'Active' : 'Disabled'}
                      </Badge>
                      <div>
                        <h4 className="font-medium">{rule.name}</h4>
                        <p className="text-sm text-gray-600 capitalize">
                          {rule.type.replace('_', ' ')} automation
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedRule(rule);
                          setIsEditing(true);
                        }}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // Test rule
                        }}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Email Rules Tab */}
        <TabsContent value="email" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Email Filing Rules</h3>
            <Button onClick={() => setEmailRules([...emailRules, {
              name: 'New Rule',
              patterns: [],
              importance: 0.5,
              autoFile: false
            }])}>
              <Plus className="h-4 w-4 mr-2" />
              Add Rule
            </Button>
          </div>

          <div className="space-y-4">
            {emailRules.map((rule, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Input
                        value={rule.name}
                        onChange={(e) => {
                          const updated = [...emailRules];
                          updated[index].name = e.target.value;
                          setEmailRules(updated);
                        }}
                        className="font-medium"
                      />
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={rule.autoFile}
                          onCheckedChange={(checked) => {
                            const updated = [...emailRules];
                            updated[index].autoFile = checked;
                            setEmailRules(updated);
                          }}
                        />
                        <Label>Auto-file</Label>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Patterns (comma-separated)</Label>
                        <Input
                          value={rule.patterns.join(', ')}
                          onChange={(e) => {
                            const updated = [...emailRules];
                            updated[index].patterns = e.target.value.split(',').map(p => p.trim());
                            setEmailRules(updated);
                          }}
                          placeholder="urgent, important, deadline"
                        />
                      </div>
                      <div>
                        <Label>Folder</Label>
                        <Input
                          value={rule.folder || ''}
                          onChange={(e) => {
                            const updated = [...emailRules];
                            updated[index].folder = e.target.value;
                            setEmailRules(updated);
                          }}
                          placeholder="Priority/Urgent"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Calendar Rules Tab */}
        <TabsContent value="calendar" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Calendar Optimization Rules</h3>
            <Button onClick={() => setCalendarRules([...calendarRules, {
              name: 'New Rule',
              type: 'conflict_resolution',
              parameters: {},
              priority: 5
            }])}>
              <Plus className="h-4 w-4 mr-2" />
              Add Rule
            </Button>
          </div>

          <div className="space-y-4">
            {calendarRules.map((rule, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Input
                        value={rule.name}
                        onChange={(e) => {
                          const updated = [...calendarRules];
                          updated[index].name = e.target.value;
                          setCalendarRules(updated);
                        }}
                        className="font-medium"
                      />
                      <Badge variant="outline">{rule.type.replace('_', ' ')}</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Rule Type</Label>
                        <Select
                          value={rule.type}
                          onValueChange={(value: any) => {
                            const updated = [...calendarRules];
                            updated[index].type = value;
                            setCalendarRules(updated);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="conflict_resolution">Conflict Resolution</SelectItem>
                            <SelectItem value="travel_time">Travel Time</SelectItem>
                            <SelectItem value="focus_blocks">Focus Blocks</SelectItem>
                            <SelectItem value="meeting_grouping">Meeting Grouping</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Priority (1-10)</Label>
                        <Input
                          type="number"
                          min="1"
                          max="10"
                          value={rule.priority}
                          onChange={(e) => {
                            const updated = [...calendarRules];
                            updated[index].priority = parseInt(e.target.value);
                            setCalendarRules(updated);
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Parameters (JSON)</Label>
                      <Textarea
                        value={JSON.stringify(rule.parameters, null, 2)}
                        onChange={(e) => {
                          try {
                            const parameters = JSON.parse(e.target.value);
                            const updated = [...calendarRules];
                            updated[index].parameters = parameters;
                            setCalendarRules(updated);
                          } catch (error) {
                            // Invalid JSON, don't update
                          }
                        }}
                        rows={3}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}