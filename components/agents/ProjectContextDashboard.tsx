"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Target,
  Zap,
  BarChart3,
  PieChart as PieChartIcon,
  Search,
  Filter,
  Settings,
  Lightbulb,
  Archive,
  RefreshCw,
  Eye,
  ArrowRight
} from 'lucide-react';

interface ProjectContextDashboardProps {
  userId?: string;
  onProjectSelect?: (projectId: string) => void;
  onInsightAction?: (insight: any) => void;
}

interface DashboardData {
  summary: {
    totalProjects: number;
    activeProjects: number;
    totalConversations: number;
    totalTasks: number;
    completedTasks: number;
    lastActivity: number;
  };
  recentActivity: Array<{
    id: string;
    type: 'conversation' | 'task' | 'classification';
    title: string;
    description: string;
    projectId?: string;
    projectName?: string;
    timestamp: string;
    significance: number;
  }>;
  projectHealth: Array<{
    projectId: string;
    projectName: string;
    score: number;
    status: 'healthy' | 'at_risk' | 'critical' | 'dormant';
    factors: Array<{
      factor: string;
      impact: 'positive' | 'negative';
      severity: number;
      description: string;
    }>;
    recommendations: string[];
  }>;
  suggestions: Array<{
    conversationId: string;
    conversationTitle: string;
    suggestedProject: string;
    confidence: number;
    reasoning: string[];
  }>;
  insights: Array<{
    type: 'trend' | 'opportunity' | 'risk' | 'optimization';
    title: string;
    description: string;
    action?: string;
    priority: 'low' | 'medium' | 'high';
    projects?: string[];
  }>;
}

interface ProjectClassification {
  projectId?: string;
  projectName?: string;
  confidence: number;
  reasoning: string[];
  suggestedProjects: string[];
  extractedTags: string[];
  urgency: 'low' | 'medium' | 'high' | 'critical';
  complexity: 'simple' | 'moderate' | 'complex' | 'enterprise';
}

export default function ProjectContextDashboard({
  userId = 'zach-admin-001',
  onProjectSelect,
  onInsightAction
}: ProjectContextDashboardProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [classificationResult, setClassificationResult] = useState<ProjectClassification | null>(null);
  const [classifyingContent, setClassifyingContent] = useState('');
  const [classificationLoading, setClassificationLoading] = useState(false);

  // Color schemes for charts
  const healthColors = {
    healthy: '#10b981',
    at_risk: '#f59e0b',
    critical: '#ef4444',
    dormant: '#6b7280'
  };

  const priorityColors = {
    low: '#6b7280',
    medium: '#3b82f6',
    high: '#f59e0b',
    critical: '#ef4444'
  };

  useEffect(() => {
    loadDashboardData();
  }, [userId]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/agents/project-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_dashboard_data',
          userId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to load dashboard data');
      }

      const result = await response.json();
      if (result.success) {
        setDashboardData(result.data);
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error: any) {
      console.error('Dashboard loading error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const classifyContent = async () => {
    if (!classifyingContent.trim()) return;

    try {
      setClassificationLoading(true);
      const response = await fetch('/api/agents/project-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'classify_content',
          content: classifyingContent,
          userId
        })
      });

      if (!response.ok) {
        throw new Error('Classification failed');
      }

      const result = await response.json();
      if (result.success) {
        setClassificationResult(result.data.classification);
      }
    } catch (error: any) {
      console.error('Classification error:', error);
      setError(error.message);
    } finally {
      setClassificationLoading(false);
    }
  };

  const handleSuggestionAction = async (suggestion: any, action: 'accept' | 'reject' | 'modify') => {
    try {
      // Implementation for handling suggestion actions
      if (action === 'accept') {
        // Auto-assign conversation to suggested project
        await fetch('/api/agents/project-context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'auto_categorize',
            conversationId: suggestion.conversationId,
            userId
          })
        });
      }

      // Reload dashboard data to reflect changes
      await loadDashboardData();
    } catch (error: any) {
      console.error('Suggestion action error:', error);
      setError(error.message);
    }
  };

  const handleArchiveInactive = async () => {
    try {
      const response = await fetch('/api/agents/project-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'archive_inactive_projects',
          userId,
          filters: {
            inactiveDays: 90,
            minCompletionRate: 0.9,
            requiresConfirmation: false
          }
        })
      });

      if (response.ok) {
        await loadDashboardData();
      }
    } catch (error: any) {
      console.error('Archive error:', error);
      setError(error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading Project Context Dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Error loading dashboard: {error}
          <Button onClick={loadDashboardData} variant="outline" size="sm" className="ml-2">
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No dashboard data available</p>
      </div>
    );
  }

  const { summary, recentActivity, projectHealth, suggestions, insights } = dashboardData;

  // Prepare chart data
  const healthDistribution = Object.entries(
    projectHealth.reduce((acc, project) => {
      acc[project.status] = (acc[project.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([status, count]) => ({
    name: status.replace('_', ' '),
    value: count,
    color: healthColors[status as keyof typeof healthColors]
  }));

  const activityData = recentActivity
    .slice(0, 10)
    .map(activity => ({
      name: activity.title.substring(0, 20) + '...',
      significance: activity.significance,
      type: activity.type
    }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Brain className="h-8 w-8 text-purple-600" />
          <div>
            <h1 className="text-2xl font-bold">Project Context Agent</h1>
            <p className="text-gray-600">Intelligent project organization and insights</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleArchiveInactive} variant="outline" size="sm">
            <Archive className="h-4 w-4 mr-2" />
            Archive Inactive
          </Button>
          <Button onClick={loadDashboardData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Projects</p>
                <p className="text-2xl font-bold">{summary.activeProjects}</p>
                <p className="text-xs text-gray-500">{summary.totalProjects} total</p>
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Conversations</p>
                <p className="text-2xl font-bold">{summary.totalConversations}</p>
                <p className="text-xs text-gray-500">All time</p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Task Completion</p>
                <p className="text-2xl font-bold">
                  {summary.totalTasks > 0 ? Math.round((summary.completedTasks / summary.totalTasks) * 100) : 0}%
                </p>
                <p className="text-xs text-gray-500">{summary.completedTasks}/{summary.totalTasks} tasks</p>
              </div>
              <CheckCircle className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Last Activity</p>
                <p className="text-2xl font-bold">
                  {summary.lastActivity ? Math.round((Date.now() - summary.lastActivity) / (1000 * 60 * 60 * 24)) : 0}d
                </p>
                <p className="text-xs text-gray-500">days ago</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="classification">Classification</TabsTrigger>
          <TabsTrigger value="health">Project Health</TabsTrigger>
          <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Project Health Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChartIcon className="h-5 w-5 mr-2" />
                  Project Health Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={healthDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {healthDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={activityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="significance" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity List */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.slice(0, 5).map(activity => (
                  <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                        {activity.type === 'conversation' && <Users className="h-4 w-4 text-blue-600" />}
                        {activity.type === 'task' && <CheckCircle className="h-4 w-4 text-green-600" />}
                        {activity.type === 'classification' && <Brain className="h-4 w-4 text-purple-600" />}
                      </div>
                      <div>
                        <p className="font-medium">{activity.title}</p>
                        <p className="text-sm text-gray-600">{activity.description}</p>
                        {activity.projectName && (
                          <Badge variant="secondary" className="text-xs mt-1">
                            {activity.projectName}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">
                        {new Date(activity.timestamp).toLocaleDateString()}
                      </p>
                      <div className="flex items-center mt-1">
                        <div className="w-12 h-2 bg-gray-200 rounded-full">
                          <div
                            className="h-2 bg-blue-500 rounded-full"
                            style={{ width: `${activity.significance * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="classification" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="h-5 w-5 mr-2" />
                Content Classification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Content to Classify</label>
                <textarea
                  value={classifyingContent}
                  onChange={(e) => setClassifyingContent(e.target.value)}
                  placeholder="Enter content (conversation, message, file content) to get project suggestions..."
                  className="w-full h-32 p-3 border rounded-lg resize-none"
                />
              </div>
              <Button
                onClick={classifyContent}
                disabled={!classifyingContent.trim() || classificationLoading}
                className="w-full"
              >
                {classificationLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Classifying...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Classify Content
                  </>
                )}
              </Button>

              {classificationResult && (
                <div className="mt-6 p-4 border rounded-lg bg-gray-50">
                  <h4 className="font-semibold mb-3">Classification Result</h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium">Suggested Project</p>
                      <p className="text-lg">{classificationResult.projectName || 'New Project'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Confidence</p>
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full">
                          <div
                            className="h-2 bg-green-500 rounded-full"
                            style={{ width: `${classificationResult.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-sm">{Math.round(classificationResult.confidence * 100)}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium">Urgency</p>
                      <Badge className={`${priorityColors[classificationResult.urgency]} text-white`}>
                        {classificationResult.urgency}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Complexity</p>
                      <Badge variant="outline">{classificationResult.complexity}</Badge>
                    </div>
                  </div>

                  {classificationResult.extractedTags.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium mb-2">Extracted Tags</p>
                      <div className="flex flex-wrap gap-2">
                        {classificationResult.extractedTags.map(tag => (
                          <Badge key={tag} variant="secondary">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-sm font-medium mb-2">Reasoning</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                      {classificationResult.reasoning.map((reason, index) => (
                        <li key={index}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            {projectHealth.map(project => (
              <Card key={project.projectId}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                      <div
                        className={`w-3 h-3 rounded-full mr-3 ${
                          project.status === 'healthy' ? 'bg-green-500' :
                          project.status === 'at_risk' ? 'bg-yellow-500' :
                          project.status === 'critical' ? 'bg-red-500' :
                          'bg-gray-500'
                        }`}
                      />
                      {project.projectName}
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">
                        Health Score: {Math.round(project.score * 100)}%
                      </span>
                      <Button
                        onClick={() => onProjectSelect?.(project.projectId)}
                        variant="outline"
                        size="sm"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Health Factors */}
                    <div>
                      <h4 className="font-medium mb-2">Health Factors</h4>
                      <div className="space-y-2">
                        {project.factors.map((factor, index) => (
                          <div key={index} className="flex items-center justify-between p-2 border rounded">
                            <div className="flex items-center space-x-2">
                              {factor.impact === 'positive' ? (
                                <TrendingUp className="h-4 w-4 text-green-500" />
                              ) : (
                                <TrendingDown className="h-4 w-4 text-red-500" />
                              )}
                              <span className="font-medium">{factor.factor}</span>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center space-x-2">
                                <div className="w-16 h-2 bg-gray-200 rounded-full">
                                  <div
                                    className={`h-2 rounded-full ${
                                      factor.impact === 'positive' ? 'bg-green-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${factor.severity * 100}%` }}
                                  />
                                </div>
                              </div>
                              <p className="text-xs text-gray-600 mt-1">{factor.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recommendations */}
                    {project.recommendations.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Recommendations</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                          {project.recommendations.map((rec, index) => (
                            <li key={index}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="suggestions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lightbulb className="h-5 w-5 mr-2" />
                Project Assignment Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {suggestions.length === 0 ? (
                <div className="text-center py-8">
                  <Lightbulb className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">No pending suggestions</p>
                  <p className="text-sm text-gray-400">All conversations are properly categorized!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {suggestions.map((suggestion, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium">{suggestion.conversationTitle}</h4>
                          <p className="text-sm text-gray-600">
                            Suggested for: <strong>{suggestion.suggestedProject}</strong>
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">
                            {Math.round(suggestion.confidence * 100)}% confidence
                          </span>
                          <div className="flex items-center space-x-1">
                            <Button
                              onClick={() => handleSuggestionAction(suggestion, 'accept')}
                              size="sm"
                              variant="default"
                            >
                              Accept
                            </Button>
                            <Button
                              onClick={() => handleSuggestionAction(suggestion, 'reject')}
                              size="sm"
                              variant="outline"
                            >
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center mb-2">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full">
                          <div
                            className="h-2 bg-blue-500 rounded-full"
                            style={{ width: `${suggestion.confidence * 100}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-1">Reasoning:</p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                          {suggestion.reasoning.map((reason, reasonIndex) => (
                            <li key={reasonIndex}>{reason}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            {insights.map((insight, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-lg ${
                        insight.type === 'trend' ? 'bg-blue-100' :
                        insight.type === 'opportunity' ? 'bg-green-100' :
                        insight.type === 'risk' ? 'bg-red-100' :
                        'bg-purple-100'
                      }`}>
                        {insight.type === 'trend' && <TrendingUp className="h-5 w-5 text-blue-600" />}
                        {insight.type === 'opportunity' && <Target className="h-5 w-5 text-green-600" />}
                        {insight.type === 'risk' && <AlertTriangle className="h-5 w-5 text-red-600" />}
                        {insight.type === 'optimization' && <Zap className="h-5 w-5 text-purple-600" />}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{insight.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                        {insight.projects && insight.projects.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {insight.projects.map(projectId => (
                              <Badge key={projectId} variant="secondary" className="text-xs">
                                {projectId}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={`${priorityColors[insight.priority]} text-white`}>
                        {insight.priority}
                      </Badge>
                      {insight.action && (
                        <Button
                          onClick={() => onInsightAction?.(insight)}
                          size="sm"
                          variant="outline"
                        >
                          <ArrowRight className="h-4 w-4 mr-2" />
                          {insight.action}
                        </Button>
                      )}
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