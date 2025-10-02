'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import {
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Plus,
  Play,
  Save,
  Settings,
  Trash2,
  Copy,
  Eye,
  AlertCircle,
  Clock,
  Zap,
  Mail,
  Calendar,
  FileText,
  Database,
  Bot,
  Webhook,
  CheckCircle,
  XCircle,
  Pause,
  SkipForward,
  RotateCcw,
  GitBranch,
  Timer,
  Bell,
  Users,
  Code,
  Cloud,
  Brain,
  Shield,
  TrendingUp
} from 'lucide-react';

// Types for the workflow designer
interface WorkflowStep {
  id: string;
  type: StepType;
  name: string;
  description?: string;
  config: any;
  position: { x: number; y: number };
  connections: string[];
  status?: 'pending' | 'running' | 'completed' | 'failed';
}

type StepType =
  | 'trigger'
  | 'action'
  | 'condition'
  | 'delay'
  | 'approval'
  | 'notification'
  | 'transform'
  | 'api_call'
  | 'ai_analysis'
  | 'loop'
  | 'parallel'
  | 'integration';

interface WorkflowData {
  id?: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  metadata: {
    category: string;
    tags: string[];
    complexity: 'low' | 'medium' | 'high';
  };
}

interface StepTemplate {
  type: StepType;
  name: string;
  icon: React.ReactNode;
  description: string;
  defaultConfig: any;
  category: string;
}

// Step templates with configurations
const stepTemplates: StepTemplate[] = [
  // Triggers
  {
    type: 'trigger',
    name: 'Manual Trigger',
    icon: <Play className="w-4 h-4" />,
    description: 'Start workflow manually',
    defaultConfig: { triggerType: 'manual' },
    category: 'Triggers'
  },
  {
    type: 'trigger',
    name: 'Schedule Trigger',
    icon: <Clock className="w-4 h-4" />,
    description: 'Start workflow on a schedule',
    defaultConfig: { triggerType: 'schedule', cron: '0 9 * * 1-5' },
    category: 'Triggers'
  },
  {
    type: 'trigger',
    name: 'Email Trigger',
    icon: <Mail className="w-4 h-4" />,
    description: 'Start when email is received',
    defaultConfig: { triggerType: 'email', filters: {} },
    category: 'Triggers'
  },

  // Actions
  {
    type: 'action',
    name: 'Send Email',
    icon: <Mail className="w-4 h-4" />,
    description: 'Send an email message',
    defaultConfig: { service: 'gmail', operation: 'send', recipients: [], subject: '', body: '' },
    category: 'Actions'
  },
  {
    type: 'action',
    name: 'Create Calendar Event',
    icon: <Calendar className="w-4 h-4" />,
    description: 'Create a calendar event',
    defaultConfig: { service: 'calendar', operation: 'create_event', title: '', startTime: '', duration: 60 },
    category: 'Actions'
  },
  {
    type: 'action',
    name: 'Create Drive File',
    icon: <FileText className="w-4 h-4" />,
    description: 'Create a new Drive file',
    defaultConfig: { service: 'drive', operation: 'create_file', name: '', content: '', folder: '' },
    category: 'Actions'
  },

  // Logic
  {
    type: 'condition',
    name: 'If/Then Condition',
    icon: <GitBranch className="w-4 h-4" />,
    description: 'Conditional branching',
    defaultConfig: { expression: '', trueActions: [], falseActions: [] },
    category: 'Logic'
  },
  {
    type: 'delay',
    name: 'Wait/Delay',
    icon: <Timer className="w-4 h-4" />,
    description: 'Add a delay or wait',
    defaultConfig: { duration: 5000, unit: 'seconds' },
    category: 'Logic'
  },
  {
    type: 'loop',
    name: 'Loop/Repeat',
    icon: <RotateCcw className="w-4 h-4" />,
    description: 'Repeat actions in a loop',
    defaultConfig: { items: [], maxIterations: 10 },
    category: 'Logic'
  },

  // Human Interaction
  {
    type: 'approval',
    name: 'Request Approval',
    icon: <Users className="w-4 h-4" />,
    description: 'Request human approval',
    defaultConfig: { approvers: [], message: '', timeout: 86400 },
    category: 'Human'
  },
  {
    type: 'notification',
    name: 'Send Notification',
    icon: <Bell className="w-4 h-4" />,
    description: 'Send a notification',
    defaultConfig: { recipients: [], message: '', channels: ['email'] },
    category: 'Human'
  },

  // Advanced
  {
    type: 'ai_analysis',
    name: 'AI Analysis',
    icon: <Brain className="w-4 h-4" />,
    description: 'Analyze content with AI',
    defaultConfig: { analysisType: 'sentiment', model: 'default', input: '' },
    category: 'AI'
  },
  {
    type: 'api_call',
    name: 'API Call',
    icon: <Cloud className="w-4 h-4" />,
    description: 'Make external API call',
    defaultConfig: { url: '', method: 'GET', headers: {}, body: {} },
    category: 'Integration'
  },
  {
    type: 'transform',
    name: 'Transform Data',
    icon: <Code className="w-4 h-4" />,
    description: 'Transform or process data',
    defaultConfig: { script: '', language: 'javascript' },
    category: 'Data'
  }
];

// Draggable step template component
function DraggableStepTemplate({ template }: { template: StepTemplate }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `template-${template.type}-${template.name}`,
    data: { template }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="p-3 border rounded-lg cursor-grab hover:border-blue-300 bg-white shadow-sm hover:shadow-md transition-all"
    >
      <div className="flex items-center gap-2 mb-1">
        {template.icon}
        <span className="font-medium text-sm">{template.name}</span>
      </div>
      <p className="text-xs text-gray-600">{template.description}</p>
    </div>
  );
}

// Sortable workflow step component
function SortableWorkflowStep({
  step,
  onEdit,
  onDelete,
  onDuplicate
}: {
  step: WorkflowStep;
  onEdit: (step: WorkflowStep) => void;
  onDelete: (stepId: string) => void;
  onDuplicate: (step: WorkflowStep) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getStepIcon = (type: StepType) => {
    const template = stepTemplates.find(t => t.type === type);
    return template?.icon || <Zap className="w-4 h-4" />;
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running': return <Play className="w-4 h-4 text-blue-500" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      default: return null;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="p-4 border rounded-lg bg-white shadow-sm hover:shadow-md transition-all cursor-grab"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {getStepIcon(step.type)}
          <span className="font-medium">{step.name}</span>
          {step.status && getStatusIcon(step.status)}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(step)}
            className="h-6 w-6 p-0"
          >
            <Settings className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDuplicate(step)}
            className="h-6 w-6 p-0"
          >
            <Copy className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(step.id)}
            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
      {step.description && (
        <p className="text-sm text-gray-600 mb-2">{step.description}</p>
      )}
      <Badge variant="outline" className="text-xs">
        {step.type}
      </Badge>
    </div>
  );
}

// Droppable workflow canvas
function WorkflowCanvas({
  steps,
  onStepsChange,
  onEditStep,
  onDeleteStep,
  onDuplicateStep
}: {
  steps: WorkflowStep[];
  onStepsChange: (steps: WorkflowStep[]) => void;
  onEditStep: (step: WorkflowStep) => void;
  onDeleteStep: (stepId: string) => void;
  onDuplicateStep: (step: WorkflowStep) => void;
}) {
  const { setNodeRef } = useDroppable({
    id: 'workflow-canvas',
  });

  return (
    <div
      ref={setNodeRef}
      className="min-h-96 p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50"
    >
      {steps.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <Zap className="w-12 h-12 mb-2" />
          <p className="text-lg font-medium">Drag steps here to build your workflow</p>
          <p className="text-sm">Start by adding a trigger, then add actions and logic</p>
        </div>
      ) : (
        <SortableContext items={steps.map(s => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {steps.map((step) => (
              <SortableWorkflowStep
                key={step.id}
                step={step}
                onEdit={onEditStep}
                onDelete={onDeleteStep}
                onDuplicate={onDuplicateStep}
              />
            ))}
          </div>
        </SortableContext>
      )}
    </div>
  );
}

// Step configuration modal
function StepConfigModal({
  step,
  isOpen,
  onClose,
  onSave
}: {
  step: WorkflowStep | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (step: WorkflowStep) => void;
}) {
  const [editedStep, setEditedStep] = useState<WorkflowStep | null>(null);

  useEffect(() => {
    if (step) {
      setEditedStep({ ...step });
    }
  }, [step]);

  const handleSave = () => {
    if (editedStep) {
      onSave(editedStep);
      onClose();
    }
  };

  if (!isOpen || !editedStep) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Configure Step</h2>
          <Button variant="ghost" onClick={onClose}>
            <XCircle className="w-5 h-5" />
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="step-name">Step Name</Label>
            <Input
              id="step-name"
              value={editedStep.name}
              onChange={(e) => setEditedStep({ ...editedStep, name: e.target.value })}
              placeholder="Enter step name"
            />
          </div>

          <div>
            <Label htmlFor="step-description">Description</Label>
            <Textarea
              id="step-description"
              value={editedStep.description || ''}
              onChange={(e) => setEditedStep({ ...editedStep, description: e.target.value })}
              placeholder="Describe what this step does"
              rows={3}
            />
          </div>

          {/* Step-specific configuration */}
          {editedStep.type === 'action' && (
            <div className="space-y-3">
              <div>
                <Label>Service</Label>
                <Select
                  value={editedStep.config.service}
                  onValueChange={(value) =>
                    setEditedStep({
                      ...editedStep,
                      config: { ...editedStep.config, service: value }
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gmail">Gmail</SelectItem>
                    <SelectItem value="calendar">Calendar</SelectItem>
                    <SelectItem value="drive">Drive</SelectItem>
                    <SelectItem value="workspace">Workspace</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Operation</Label>
                <Input
                  value={editedStep.config.operation || ''}
                  onChange={(e) =>
                    setEditedStep({
                      ...editedStep,
                      config: { ...editedStep.config, operation: e.target.value }
                    })
                  }
                  placeholder="e.g., send_email, create_event"
                />
              </div>
            </div>
          )}

          {editedStep.type === 'condition' && (
            <div>
              <Label>Condition Expression</Label>
              <Textarea
                value={editedStep.config.expression || ''}
                onChange={(e) =>
                  setEditedStep({
                    ...editedStep,
                    config: { ...editedStep.config, expression: e.target.value }
                  })
                }
                placeholder="e.g., email.subject.contains('urgent')"
                rows={3}
              />
            </div>
          )}

          {editedStep.type === 'delay' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Duration</Label>
                <Input
                  type="number"
                  value={editedStep.config.duration || 0}
                  onChange={(e) =>
                    setEditedStep({
                      ...editedStep,
                      config: { ...editedStep.config, duration: parseInt(e.target.value) }
                    })
                  }
                />
              </div>
              <div>
                <Label>Unit</Label>
                <Select
                  value={editedStep.config.unit || 'seconds'}
                  onValueChange={(value) =>
                    setEditedStep({
                      ...editedStep,
                      config: { ...editedStep.config, unit: value }
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="seconds">Seconds</SelectItem>
                    <SelectItem value="minutes">Minutes</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                    <SelectItem value="days">Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {editedStep.type === 'notification' && (
            <div className="space-y-3">
              <div>
                <Label>Message</Label>
                <Textarea
                  value={editedStep.config.message || ''}
                  onChange={(e) =>
                    setEditedStep({
                      ...editedStep,
                      config: { ...editedStep.config, message: e.target.value }
                    })
                  }
                  placeholder="Notification message"
                  rows={3}
                />
              </div>
              <div>
                <Label>Recipients</Label>
                <Input
                  value={editedStep.config.recipients?.join(', ') || ''}
                  onChange={(e) =>
                    setEditedStep({
                      ...editedStep,
                      config: {
                        ...editedStep.config,
                        recipients: e.target.value.split(',').map(r => r.trim()).filter(r => r)
                      }
                    })
                  }
                  placeholder="email1@example.com, email2@example.com"
                />
              </div>
            </div>
          )}

          {editedStep.type === 'ai_analysis' && (
            <div className="space-y-3">
              <div>
                <Label>Analysis Type</Label>
                <Select
                  value={editedStep.config.analysisType}
                  onValueChange={(value) =>
                    setEditedStep({
                      ...editedStep,
                      config: { ...editedStep.config, analysisType: value }
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sentiment">Sentiment Analysis</SelectItem>
                    <SelectItem value="classification">Content Classification</SelectItem>
                    <SelectItem value="extraction">Information Extraction</SelectItem>
                    <SelectItem value="summary">Text Summary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Input Field</Label>
                <Input
                  value={editedStep.config.input || ''}
                  onChange={(e) =>
                    setEditedStep({
                      ...editedStep,
                      config: { ...editedStep.config, input: e.target.value }
                    })
                  }
                  placeholder="Field containing text to analyze"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Step
          </Button>
        </div>
      </div>
    </div>
  );
}

// Main Workflow Designer Component
export function WorkflowDesigner() {
  const [workflow, setWorkflow] = useState<WorkflowData>({
    name: 'New Workflow',
    description: '',
    steps: [],
    metadata: {
      category: 'general',
      tags: [],
      complexity: 'medium'
    }
  });

  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [activeStepType, setActiveStepType] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Group step templates by category
  const stepTemplatesByCategory = stepTemplates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, StepTemplate[]>);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveStepType(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveStepType(null);

    if (!over) return;

    // Handle dropping template to canvas
    if (over.id === 'workflow-canvas' && active.data.current?.template) {
      const template = active.data.current.template as StepTemplate;
      const newStep: WorkflowStep = {
        id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: template.type,
        name: template.name,
        description: template.description,
        config: { ...template.defaultConfig },
        position: { x: 0, y: 0 },
        connections: []
      };

      setWorkflow(prev => ({
        ...prev,
        steps: [...prev.steps, newStep]
      }));
      return;
    }

    // Handle reordering steps
    if (over.id !== active.id) {
      const oldIndex = workflow.steps.findIndex(step => step.id === active.id);
      const newIndex = workflow.steps.findIndex(step => step.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newSteps = arrayMove(workflow.steps, oldIndex, newIndex);
        setWorkflow(prev => ({ ...prev, steps: newSteps }));
      }
    }
  }, [workflow.steps]);

  const handleEditStep = (step: WorkflowStep) => {
    setEditingStep(step);
    setIsConfigModalOpen(true);
  };

  const handleSaveStep = (updatedStep: WorkflowStep) => {
    setWorkflow(prev => ({
      ...prev,
      steps: prev.steps.map(step =>
        step.id === updatedStep.id ? updatedStep : step
      )
    }));
    setEditingStep(null);
  };

  const handleDeleteStep = (stepId: string) => {
    setWorkflow(prev => ({
      ...prev,
      steps: prev.steps.filter(step => step.id !== stepId)
    }));
  };

  const handleDuplicateStep = (step: WorkflowStep) => {
    const duplicatedStep: WorkflowStep = {
      ...step,
      id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: `${step.name} (Copy)`
    };

    setWorkflow(prev => ({
      ...prev,
      steps: [...prev.steps, duplicatedStep]
    }));
  };

  const validateWorkflow = (): string[] => {
    const errors: string[] = [];

    if (!workflow.name.trim()) {
      errors.push('Workflow name is required');
    }

    if (workflow.steps.length === 0) {
      errors.push('Workflow must have at least one step');
    }

    const hasTrigger = workflow.steps.some(step => step.type === 'trigger');
    if (!hasTrigger) {
      errors.push('Workflow must have at least one trigger');
    }

    // Check for required step configurations
    workflow.steps.forEach((step, index) => {
      if (!step.name.trim()) {
        errors.push(`Step ${index + 1} is missing a name`);
      }

      if (step.type === 'action' && !step.config.service) {
        errors.push(`Action step "${step.name}" is missing service configuration`);
      }

      if (step.type === 'condition' && !step.config.expression) {
        errors.push(`Condition step "${step.name}" is missing expression`);
      }
    });

    return errors;
  };

  const handleSaveWorkflow = async () => {
    setIsSaving(true);
    const errors = validateWorkflow();

    if (errors.length > 0) {
      setValidationErrors(errors);
      setIsSaving(false);
      return;
    }

    setValidationErrors([]);

    try {
      const response = await fetch('/api/agents/workflow-automation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create_workflow',
          workflowData: workflow
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setWorkflow(prev => ({ ...prev, id: result.workflow.id }));
        // Show success message
      } else {
        throw new Error('Failed to save workflow');
      }
    } catch (error) {
      console.error('Error saving workflow:', error);
      // Show error message
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestWorkflow = async () => {
    setIsExecuting(true);
    const errors = validateWorkflow();

    if (errors.length > 0) {
      setValidationErrors(errors);
      setIsExecuting(false);
      return;
    }

    try {
      const response = await fetch('/api/agents/workflow-automation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'test_workflow',
          workflowId: workflow.id,
          testData: {},
          mode: 'safe'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        // Update step statuses based on test results
        const updatedSteps = workflow.steps.map(step => {
          const stepResult = result.test_result.results[step.id];
          return {
            ...step,
            status: stepResult ? 'completed' : 'pending'
          };
        });

        setWorkflow(prev => ({ ...prev, steps: updatedSteps }));
        // Show test results
      } else {
        throw new Error('Failed to test workflow');
      }
    } catch (error) {
      console.error('Error testing workflow:', error);
      // Show error message
    } finally {
      setIsExecuting(false);
    }
  };

  const handleExecuteWorkflow = async () => {
    if (!workflow.id) {
      await handleSaveWorkflow();
      if (!workflow.id) return;
    }

    setIsExecuting(true);

    try {
      const response = await fetch('/api/agents/workflow-automation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'execute_workflow',
          workflowId: workflow.id,
          triggerData: {},
          context: {}
        }),
      });

      if (response.ok) {
        const result = await response.json();
        // Update UI with execution status
      } else {
        throw new Error('Failed to execute workflow');
      }
    } catch (error) {
      console.error('Error executing workflow:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <Input
              value={workflow.name}
              onChange={(e) => setWorkflow(prev => ({ ...prev, name: e.target.value }))}
              className="text-lg font-semibold border-none p-0 focus:ring-0"
              placeholder="Workflow Name"
            />
            <Textarea
              value={workflow.description}
              onChange={(e) => setWorkflow(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what this workflow does..."
              className="mt-1 border-none p-0 resize-none focus:ring-0"
              rows={2}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleTestWorkflow}
              disabled={isExecuting || workflow.steps.length === 0}
            >
              <Eye className="w-4 h-4 mr-2" />
              Test
            </Button>
            <Button
              onClick={handleSaveWorkflow}
              disabled={isSaving}
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            <Button
              onClick={handleExecuteWorkflow}
              disabled={isExecuting || !workflow.id}
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="w-4 h-4 mr-2" />
              {isExecuting ? 'Running...' : 'Run'}
            </Button>
          </div>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                {validationErrors.map((error, index) => (
                  <div key={index} className="text-sm">{error}</div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Workflow Stats */}
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>{workflow.steps.length} steps</span>
          <Badge variant="outline">{workflow.metadata.complexity}</Badge>
          <Badge variant="outline">{workflow.metadata.category}</Badge>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {/* Step Templates Panel */}
          <div className="w-80 border-r bg-gray-50 p-4 overflow-y-auto">
            <h3 className="font-semibold mb-4">Workflow Steps</h3>

            <Tabs defaultValue="Triggers" className="w-full">
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="Triggers" className="text-xs">Triggers</TabsTrigger>
                <TabsTrigger value="Actions" className="text-xs">Actions</TabsTrigger>
                <TabsTrigger value="Logic" className="text-xs">Logic</TabsTrigger>
              </TabsList>

              {Object.entries(stepTemplatesByCategory).map(([category, templates]) => (
                <TabsContent key={category} value={category} className="space-y-2">
                  {templates.map((template) => (
                    <DraggableStepTemplate
                      key={`${template.type}-${template.name}`}
                      template={template}
                    />
                  ))}
                </TabsContent>
              ))}

              <TabsContent value="Human" className="space-y-2">
                {stepTemplatesByCategory.Human?.map((template) => (
                  <DraggableStepTemplate
                    key={`${template.type}-${template.name}`}
                    template={template}
                  />
                ))}
              </TabsContent>

              <TabsContent value="AI" className="space-y-2">
                {stepTemplatesByCategory.AI?.map((template) => (
                  <DraggableStepTemplate
                    key={`${template.type}-${template.name}`}
                    template={template}
                  />
                ))}
              </TabsContent>

              <TabsContent value="Integration" className="space-y-2">
                {stepTemplatesByCategory.Integration?.map((template) => (
                  <DraggableStepTemplate
                    key={`${template.type}-${template.name}`}
                    template={template}
                  />
                ))}
              </TabsContent>

              <TabsContent value="Data" className="space-y-2">
                {stepTemplatesByCategory.Data?.map((template) => (
                  <DraggableStepTemplate
                    key={`${template.type}-${template.name}`}
                    template={template}
                  />
                ))}
              </TabsContent>
            </Tabs>
          </div>

          {/* Workflow Canvas */}
          <div className="flex-1 p-6">
            <div className="mb-4">
              <h3 className="font-semibold text-lg">Workflow Steps</h3>
              <p className="text-sm text-gray-600">
                Drag steps from the left panel to build your workflow
              </p>
            </div>

            <WorkflowCanvas
              steps={workflow.steps}
              onStepsChange={(steps) => setWorkflow(prev => ({ ...prev, steps }))}
              onEditStep={handleEditStep}
              onDeleteStep={handleDeleteStep}
              onDuplicateStep={handleDuplicateStep}
            />
          </div>

          <DragOverlay>
            {activeStepType ? (
              <div className="p-3 border rounded-lg bg-white shadow-lg">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  <span className="font-medium">Step Template</span>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Step Configuration Modal */}
      <StepConfigModal
        step={editingStep}
        isOpen={isConfigModalOpen}
        onClose={() => {
          setIsConfigModalOpen(false);
          setEditingStep(null);
        }}
        onSave={handleSaveStep}
      />
    </div>
  );
}

export default WorkflowDesigner;