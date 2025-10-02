'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Brain,
  TrendingUp,
  Clock,
  Target,
  Activity,
  Lightbulb,
  Zap,
  Eye,
  CheckCircle,
  AlertCircle,
  Users,
  FileText,
  Settings,
  RefreshCw
} from 'lucide-react';

interface Prediction {
  id: string;
  type: string;
  confidence: number;
  description: string;
  reasoning: string[];
  priority: number;
  status: 'pending' | 'processing' | 'ready' | 'completed';
  timestamp: Date;
}

interface Pattern {
  id: string;
  type: string;
  description: string;
  frequency: number;
  confidence: number;
  lastSeen: Date;
  trend: 'increasing' | 'decreasing' | 'stable';
}

interface Insight {
  id: string;
  type: string;
  title: string;
  description: string;
  impact: number;
  confidence: number;
  actionable: boolean;
}

interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: number;
  impact: number;
  effort: number;
  category: string;
}

interface SystemMetrics {
  predictionsGenerated: number;
  averageConfidence: number;
  cacheHitRate: number;
  responseTime: number;
  patternsDetected: number;
  accuracy: number;
}

export default function PredictionDashboard() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    predictionsGenerated: 0,
    averageConfidence: 0,
    cacheHitRate: 0,
    responseTime: 0,
    patternsDetected: 0,
    accuracy: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);

      // Load predictions
      const predictionsResponse = await fetch('/api/agents/context-prediction?type=predictions');
      const predictionsData = await predictionsResponse.json();
      setPredictions(predictionsData || []);

      // Load patterns
      const patternsResponse = await fetch('/api/agents/context-prediction?type=analytics');
      const patternsData = await patternsResponse.json();
      setPatterns(patternsData.patterns || []);
      setInsights(patternsData.insights || []);
      setRecommendations(patternsData.recommendations || []);

      // Load system metrics
      const metricsResponse = await fetch('/api/agents/context-prediction?type=status');
      const metricsData = await metricsResponse.json();
      setSystemMetrics({
        predictionsGenerated: predictions.length,
        averageConfidence: metricsData.performance?.accuracy || 0,
        cacheHitRate: metricsData.performance?.cacheHitRate || 0,
        responseTime: metricsData.performance?.averageResponseTime || 0,
        patternsDetected: patterns.length,
        accuracy: metricsData.performance?.accuracy || 0
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return 'bg-red-100 text-red-800';
    if (priority >= 5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Date(timestamp).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading prediction dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Context Prediction Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor AI predictions, user patterns, and system performance
          </p>
        </div>
        <Button onClick={loadDashboardData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* System Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Predictions Generated</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemMetrics.predictionsGenerated}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last hour
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Confidence</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(systemMetrics.averageConfidence * 100).toFixed(1)}%
            </div>
            <Progress value={systemMetrics.averageConfidence * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(systemMetrics.cacheHitRate * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {systemMetrics.responseTime}ms avg response
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Patterns Detected</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemMetrics.patternsDetected}</div>
            <p className="text-xs text-muted-foreground">
              {systemMetrics.accuracy * 100}% accuracy
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Recent Predictions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Recent Predictions
                </CardTitle>
                <CardDescription>
                  Latest AI predictions and their confidence levels
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {predictions.slice(0, 5).map((prediction) => (
                      <div key={prediction.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{prediction.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatTimestamp(prediction.timestamp)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={getPriorityColor(prediction.priority)}>
                            P{prediction.priority}
                          </Badge>
                          <span className={`text-sm font-medium ${getConfidenceColor(prediction.confidence)}`}>
                            {(prediction.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Top Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Key Insights
                </CardTitle>
                <CardDescription>
                  Actionable insights from behavioral analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {insights.slice(0, 4).map((insight) => (
                      <div key={insight.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-sm">{insight.title}</h4>
                          {insight.actionable && (
                            <Badge variant="secondary">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Actionable
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{insight.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs">Impact:</span>
                          <Progress value={insight.impact * 20} className="h-2 flex-1" />
                          <span className="text-xs">{insight.impact}/5</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Predictions</CardTitle>
              <CardDescription>
                Comprehensive view of all active and completed predictions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {predictions.map((prediction) => (
                    <div key={prediction.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium">{prediction.description}</h3>
                        <div className="flex items-center gap-2">
                          <Badge variant={prediction.status === 'completed' ? 'default' : 'secondary'}>
                            {prediction.status}
                          </Badge>
                          <Badge variant="outline" className={getPriorityColor(prediction.priority)}>
                            Priority {prediction.priority}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid gap-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span>Type:</span>
                          <span className="font-medium">{prediction.type}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Confidence:</span>
                          <span className={`font-medium ${getConfidenceColor(prediction.confidence)}`}>
                            {(prediction.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Generated:</span>
                          <span>{formatTimestamp(prediction.timestamp)}</span>
                        </div>
                      </div>

                      {prediction.reasoning.length > 0 && (
                        <div className="mt-3">
                          <h4 className="text-sm font-medium mb-2">Reasoning:</h4>
                          <ul className="text-xs space-y-1">
                            {prediction.reasoning.map((reason, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="text-muted-foreground">•</span>
                                <span>{reason}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Behavioral Patterns</CardTitle>
              <CardDescription>
                Detected user behavior patterns and their trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {patterns.map((pattern) => (
                    <div key={pattern.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium">{pattern.description}</h3>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {pattern.type}
                          </Badge>
                          <Badge variant={pattern.trend === 'increasing' ? 'default' : pattern.trend === 'decreasing' ? 'destructive' : 'secondary'}>
                            <TrendingUp className="h-3 w-3 mr-1" />
                            {pattern.trend}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid gap-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span>Frequency:</span>
                          <div className="flex items-center gap-2">
                            <Progress value={pattern.frequency * 100} className="h-2 w-16" />
                            <span className="font-medium">{(pattern.frequency * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Confidence:</span>
                          <span className={`font-medium ${getConfidenceColor(pattern.confidence)}`}>
                            {(pattern.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Last Seen:</span>
                          <span>{formatTimestamp(pattern.lastSeen)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Behavioral Insights</CardTitle>
              <CardDescription>
                AI-generated insights from user behavior analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {insights.map((insight) => (
                    <div key={insight.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium">{insight.title}</h3>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {insight.type}
                          </Badge>
                          {insight.actionable && (
                            <Badge variant="secondary">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Actionable
                            </Badge>
                          )}
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground mb-3">
                        {insight.description}
                      </p>

                      <div className="grid gap-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span>Impact:</span>
                          <div className="flex items-center gap-2">
                            <Progress value={insight.impact * 20} className="h-2 w-16" />
                            <span className="font-medium">{insight.impact}/5</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Confidence:</span>
                          <span className={`font-medium ${getConfidenceColor(insight.confidence)}`}>
                            {(insight.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Smart Recommendations</CardTitle>
              <CardDescription>
                AI-generated recommendations to improve productivity and efficiency
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {recommendations.map((recommendation) => (
                    <div key={recommendation.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium">{recommendation.title}</h3>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {recommendation.category}
                          </Badge>
                          <Badge variant="outline" className={getPriorityColor(recommendation.priority)}>
                            Priority {recommendation.priority}
                          </Badge>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground mb-3">
                        {recommendation.description}
                      </p>

                      <div className="grid gap-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span>Impact:</span>
                          <div className="flex items-center gap-2">
                            <Progress value={recommendation.impact * 20} className="h-2 w-16" />
                            <span className="font-medium">{recommendation.impact}/5</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Effort:</span>
                          <div className="flex items-center gap-2">
                            <Progress value={recommendation.effort * 20} className="h-2 w-16" />
                            <span className="font-medium">{recommendation.effort}/5</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex justify-end">
                        <Button size="sm" variant="outline">
                          <Settings className="h-3 w-3 mr-1" />
                          Apply Recommendation
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}