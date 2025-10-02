'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Calendar,
  Mail,
  FolderOpen,
  Settings,
  Play,
  Pause,
  BarChart3,
  Brain,
  Clock,
  Users,
  FileText,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Zap,
  Filter,
  Tag,
  Calendar as CalendarIcon,
  MessageSquare,
  RefreshCw,
  Eye,
  Plus
} from 'lucide-react';

interface WorkspaceStats {
  emailsProcessed: number;
  tasksCreated: number;
  meetingsPrepared: number;
  filesOrganized: number;
  automationsActive: number;
  lastExecution: string;
}

interface AutomationRule {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  successRate: number;
  executionCount: number;
  lastRun: string;
}

interface WorkflowExecution {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'failed' | 'pending';
  progress: number;
  startTime: string;
  endTime?: string;
  steps: WorkflowStep[];
}

interface WorkflowStep {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  duration?: number;
}

interface Notification {
  id: string;
  type: 'priority' | 'deadline' | 'conflict' | 'opportunity';
  title: string;
  description: string;
  timestamp: string;
  actions?: NotificationAction[];
}

interface NotificationAction {
  label: string;
  action: string;
  params?: any;
}

export default function WorkspaceOrchestratorDashboard({ userId = 'zach' }: { userId?: string }) {
  const [stats, setStats] = useState<WorkspaceStats | null>(null);
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
  const [workflowExecutions, setWorkflowExecutions] = useState<WorkflowExecution[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [systemStatus, setSystemStatus] = useState<any>(null);

  // Fetch orchestrator data
  const fetchOrchestratorData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Get system status
      const statusResponse = await fetch(`/api/agents/workspace-orchestrator?userId=${userId}&action=get_orchestrator_status`);
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setSystemStatus(statusData.status);
      }

      // Generate mock data for demonstration
      setStats({
        emailsProcessed: 1247,
        tasksCreated: 89,
        meetingsPrepared: 23,
        filesOrganized: 456,
        automationsActive: 12,
        lastExecution: new Date().toISOString()
      });

      setAutomationRules([
        {
          id: 'rule1',
          name: 'Urgent Email Detection',
          type: 'email_filing',
          enabled: true,
          successRate: 94,
          executionCount: 156,
          lastRun: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'rule2',
          name: 'Meeting File Preparation',
          type: 'meeting_preparation',
          enabled: true,
          successRate: 87,
          executionCount: 45,
          lastRun: new Date(Date.now() - 30 * 60 * 1000).toISOString()
        },
        {
          id: 'rule3',
          name: 'Duplicate File Cleanup',
          type: 'drive_organization',
          enabled: false,
          successRate: 92,
          executionCount: 78,
          lastRun: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        }
      ]);

      setNotifications([
        {
          id: 'notif1',
          type: 'priority',
          title: 'High Priority Email Detected',
          description: 'Found 3 urgent emails requiring immediate attention',
          timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          actions: [
            { label: 'Review', action: 'review_emails' },
            { label: 'Auto-File', action: 'auto_file_emails' }
          ]
        },
        {
          id: 'notif2',
          type: 'conflict',
          title: 'Calendar Conflict Detected',
          description: 'Meeting overlap found for tomorrow 2-3 PM',
          timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
          actions: [
            { label: 'Resolve', action: 'resolve_conflict' },
            { label: 'Suggest Times', action: 'suggest_times' }
          ]
        }
      ]);

    } catch (error) {
      console.error('Error fetching orchestrator data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchOrchestratorData();
    const interval = setInterval(fetchOrchestratorData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchOrchestratorData]);

  // Execute workflow action
  const executeWorkflow = async (workflowType: string, params: any = {}) => {
    try {
      const response = await fetch('/api/agents/workspace-orchestrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execute_workflow',
          userId,
          workflowType,
          params
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Workflow executed:', result);
        await fetchOrchestratorData(); // Refresh data
      }
    } catch (error) {
      console.error('Error executing workflow:', error);
    }
  };

  // Execute specific orchestrator action
  const executeAction = async (action: string, params: any = {}) => {
    try {
      const response = await fetch('/api/agents/workspace-orchestrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          userId,
          params
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`Action ${action} executed:`, result);
        await fetchOrchestratorData(); // Refresh data
        return result;
      }
    } catch (error) {
      console.error(`Error executing action ${action}:`, error);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading Workspace Orchestrator...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8 text-blue-600" />
            Workspace Orchestrator
          </h1>
          <p className="text-gray-600 mt-1">
            Unified Gmail + Drive + Calendar automation and intelligence
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => fetchOrchestratorData()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => executeAction('analyze_workspace_patterns')} size="sm">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analyze Patterns
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.emailsProcessed}</p>
                  <p className="text-xs text-gray-600">Emails Processed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.tasksCreated}</p>
                  <p className="text-xs text-gray-600">Tasks Created</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.meetingsPrepared}</p>
                  <p className="text-xs text-gray-600">Meetings Prepared</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.filesOrganized}</p>
                  <p className="text-xs text-gray-600">Files Organized</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.automationsActive}</p>
                  <p className="text-xs text-gray-600">Active Automations</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">Last Run</p>
                  <p className="text-xs text-gray-600">
                    {new Date(stats.lastExecution).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="drive">Drive</TabsTrigger>
          <TabsTrigger value="automations">Automations</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
                <CardDescription>
                  Execute common workspace orchestration tasks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => executeAction('smart_email_filing')}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Smart Email Filing
                </Button>
                <Button
                  onClick={() => executeAction('calendar_optimization')}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Optimize Calendar
                </Button>
                <Button
                  onClick={() => executeAction('drive_organization')}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Organize Drive
                </Button>
                <Button
                  onClick={() => executeAction('meeting_preparation')}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Prepare Meetings
                </Button>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Smart Notifications
                </CardTitle>
                <CardDescription>
                  AI-powered insights and recommendations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <Alert key={notification.id}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-2">
                          <div>
                            <p className="font-medium">{notification.title}</p>
                            <p className="text-sm text-gray-600">{notification.description}</p>
                          </div>
                          {notification.actions && (
                            <div className="flex gap-2">
                              {notification.actions.map((action, idx) => (
                                <Button
                                  key={idx}
                                  size="sm"
                                  variant="outline"
                                  onClick={() => executeAction(action.action, action.params)}
                                >
                                  {action.label}
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No notifications at this time</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Automation Rules */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Active Automation Rules
              </CardTitle>
              <CardDescription>
                Monitor and manage your automation rules
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {automationRules.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant={rule.enabled ? "default" : "secondary"}>
                        {rule.enabled ? 'Active' : 'Disabled'}
                      </Badge>
                      <div>
                        <p className="font-medium">{rule.name}</p>
                        <p className="text-sm text-gray-600">{rule.type.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">{rule.successRate}% success</p>
                        <p className="text-xs text-gray-600">{rule.executionCount} executions</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => executeAction('configure_automation_rules', { ruleId: rule.id })}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Tab */}
        <TabsContent value="email" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Email Management</CardTitle>
                <CardDescription>Smart email filing and organization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={() => executeAction('smart_email_filing', {
                    maxEmails: 100,
                    autoApply: true
                  })}
                  className="w-full"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Auto-File Recent Emails
                </Button>
                <Button
                  onClick={() => executeAction('email_to_task_conversion')}
                  className="w-full"
                  variant="outline"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Convert Emails to Tasks
                </Button>
                <Button
                  onClick={() => executeAction('intelligent_notifications', {
                    notificationTypes: ['priority', 'deadlines']
                  })}
                  className="w-full"
                  variant="outline"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Check Priority Emails
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Email Analytics</CardTitle>
                <CardDescription>Insights into your email patterns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Emails Processed Today</span>
                      <span>847</span>
                    </div>
                    <Progress value={85} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Auto-Filed</span>
                      <span>234</span>
                    </div>
                    <Progress value={65} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Priority Detected</span>
                      <span>12</span>
                    </div>
                    <Progress value={35} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Calendar Optimization</CardTitle>
                <CardDescription>Resolve conflicts and optimize scheduling</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={() => executeAction('calendar_optimization', {
                    optimizationType: 'conflicts'
                  })}
                  className="w-full"
                >
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Resolve Conflicts
                </Button>
                <Button
                  onClick={() => executeAction('meeting_preparation')}
                  className="w-full"
                  variant="outline"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Prepare Upcoming Meetings
                </Button>
                <Button
                  onClick={() => executeAction('calendar_drive_integration')}
                  className="w-full"
                  variant="outline"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Attach Relevant Files
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Schedule Insights</CardTitle>
                <CardDescription>Your calendar patterns and efficiency</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Meeting Efficiency</span>
                      <span>78%</span>
                    </div>
                    <Progress value={78} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Focus Time</span>
                      <span>4.5 hrs</span>
                    </div>
                    <Progress value={56} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Conflicts Resolved</span>
                      <span>3</span>
                    </div>
                    <Progress value={90} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Drive Tab */}
        <TabsContent value="drive" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Drive Organization</CardTitle>
                <CardDescription>Clean up and organize your files</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={() => executeAction('drive_organization', {
                    includeDuplicates: true
                  })}
                  className="w-full"
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Auto-Organize Files
                </Button>
                <Button
                  onClick={() => executeAction('drive_organization', {
                    organizationType: 'duplicates'
                  })}
                  className="w-full"
                  variant="outline"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Find Duplicates
                </Button>
                <Button
                  onClick={() => executeAction('drive_organization', {
                    organizationType: 'project-based'
                  })}
                  className="w-full"
                  variant="outline"
                >
                  <Tag className="h-4 w-4 mr-2" />
                  Organize by Projects
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Storage Insights</CardTitle>
                <CardDescription>Drive usage and organization metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Files Organized</span>
                      <span>1,247</span>
                    </div>
                    <Progress value={92} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Duplicates Found</span>
                      <span>23</span>
                    </div>
                    <Progress value={45} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Storage Saved</span>
                      <span>2.3 GB</span>
                    </div>
                    <Progress value={67} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Automations Tab */}
        <TabsContent value="automations" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Automation Rules</h3>
            <Button onClick={() => executeAction('configure_automation_rules')} size="sm">
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
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">{rule.successRate}% success rate</p>
                        <p className="text-xs text-gray-600">
                          Last run: {new Date(rule.lastRun).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={rule.enabled ? "secondary" : "default"}
                          onClick={() => executeAction('configure_automation_rules', {
                            ruleId: rule.id,
                            enabled: !rule.enabled
                          })}
                        >
                          {rule.enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => executeAction('configure_automation_rules', { ruleId: rule.id })}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Performance</span>
                      <span>{rule.executionCount} executions</span>
                    </div>
                    <Progress value={rule.successRate} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Productivity Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900">Email Efficiency</h4>
                    <p className="text-sm text-blue-700">
                      94% of emails are being auto-filed correctly, saving 2.3 hours weekly
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-900">Meeting Optimization</h4>
                    <p className="text-sm text-green-700">
                      Resolved 15 calendar conflicts this week, preventing scheduling issues
                    </p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h4 className="font-medium text-purple-900">File Organization</h4>
                    <p className="text-sm text-purple-700">
                      Organized 456 files automatically, maintaining 92% accuracy
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium">Suggested Automation</h4>
                    <p className="text-sm text-gray-600 mb-2">
                      Create a rule to automatically schedule focus blocks before important meetings
                    </p>
                    <Button size="sm" variant="outline">
                      Create Rule
                    </Button>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium">Pattern Detected</h4>
                    <p className="text-sm text-gray-600 mb-2">
                      You receive 23% more emails on Mondays. Consider batching email processing.
                    </p>
                    <Button size="sm" variant="outline">
                      Set Schedule
                    </Button>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium">Optimization Opportunity</h4>
                    <p className="text-sm text-gray-600 mb-2">
                      12 files are duplicated across projects. Consolidate to save 1.2 GB.
                    </p>
                    <Button size="sm" variant="outline">
                      Review Duplicates
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Workspace Analysis</CardTitle>
              <CardDescription>Deep insights into your work patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => executeAction('analyze_workspace_patterns', {
                  analysisType: 'comprehensive',
                  timeRange: '30d'
                })}
                className="w-full"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Generate Full Workspace Analysis
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}