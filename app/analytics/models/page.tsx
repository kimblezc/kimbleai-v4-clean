'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface AnalyticsData {
  summary: {
    totalCalls: number;
    avgResponseTime: number;
    successRate: number;
    satisfactionRate: number;
    avgTokens: number;
  };
  byModel: any[];
  byTaskType: any[];
  byProvider: any[];
  trends: any[];
  recommendations: string[];
  bestByTask: any[];
  dateRange: {
    start: string;
    end: string;
    days: number;
  };
}

export default function ModelAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [days]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/analytics/models?days=${days}`);

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (err: any) {
      console.error('Error fetching analytics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-96">
            <div className="text-amber-400 text-xl">Loading analytics...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 p-8">
        <div className="max-w-7xl mx-auto">
          <Card className="bg-slate-900/60 border-red-900/30">
            <CardHeader>
              <CardTitle className="text-red-400">Error Loading Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300">{error || 'Failed to load data'}</p>
              <button
                onClick={fetchAnalytics}
                className="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded"
              >
                Retry
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const COLORS = ['#f59e0b', '#8b5cf6', '#06b6d4', '#10b981', '#ef4444', '#ec4899'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-amber-400 mb-2">
              📊 Model Performance Analytics
            </h1>
            <p className="text-slate-400">
              Track AI model performance to optimize task routing and quality
            </p>
          </div>

          {/* Time Range Selector */}
          <div className="flex gap-2">
            {[7, 14, 30, 60, 90].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-4 py-2 rounded transition-colors ${
                  days === d
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="bg-slate-900/60 border-amber-900/30 backdrop-blur">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400">Total Calls</CardDescription>
              <CardTitle className="text-3xl text-amber-400">
                {analytics.summary.totalCalls.toLocaleString()}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="bg-slate-900/60 border-purple-900/30 backdrop-blur">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400">Avg Response Time</CardDescription>
              <CardTitle className="text-3xl text-purple-400">
                {(analytics.summary.avgResponseTime / 1000).toFixed(2)}s
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="bg-slate-900/60 border-green-900/30 backdrop-blur">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400">Success Rate</CardDescription>
              <CardTitle className="text-3xl text-green-400">
                {analytics.summary.successRate}%
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="bg-slate-900/60 border-cyan-900/30 backdrop-blur">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400">User Satisfaction</CardDescription>
              <CardTitle className="text-3xl text-cyan-400">
                {analytics.summary.satisfactionRate}%
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="bg-slate-900/60 border-rose-900/30 backdrop-blur">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400">Avg Tokens</CardDescription>
              <CardTitle className="text-3xl text-rose-400">
                {analytics.summary.avgTokens.toLocaleString()}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Recommendations */}
        {analytics.recommendations.length > 0 && (
          <Card className="bg-slate-900/60 border-amber-900/30 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-amber-400">💡 Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {analytics.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-amber-400">•</span>
                    <span className="text-slate-300">{rec}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Main Analytics Tabs */}
        <Tabs defaultValue="models" className="space-y-4">
          <TabsList className="bg-slate-900/60 border border-amber-900/30">
            <TabsTrigger value="models" className="data-[state=active]:bg-amber-600">
              By Model
            </TabsTrigger>
            <TabsTrigger value="tasks" className="data-[state=active]:bg-amber-600">
              By Task Type
            </TabsTrigger>
            <TabsTrigger value="trends" className="data-[state=active]:bg-amber-600">
              Trends
            </TabsTrigger>
            <TabsTrigger value="best" className="data-[state=active]:bg-amber-600">
              Best Models
            </TabsTrigger>
          </TabsList>

          {/* By Model */}
          <TabsContent value="models" className="space-y-4">
            <Card className="bg-slate-900/60 border-amber-900/30 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-amber-400">⚡ Average Response Time by Model</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.byModel}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="model" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" label={{ value: 'ms', angle: -90, position: 'insideLeft' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                      labelStyle={{ color: '#f59e0b' }}
                    />
                    <Bar dataKey="avgResponseTime" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="bg-slate-900/60 border-purple-900/30 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-purple-400">✓ Success Rate by Model</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.byModel}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="model" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                        labelStyle={{ color: '#8b5cf6' }}
                      />
                      <Bar dataKey="successRate" fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/60 border-cyan-900/30 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-cyan-400">👍 User Satisfaction by Model</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analytics.byModel.filter(m => m.totalCalls > 0)}
                        dataKey="satisfactionRate"
                        nameKey="model"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label
                      >
                        {analytics.byModel.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Model Details Table */}
            <Card className="bg-slate-900/60 border-amber-900/30 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-amber-400">Model Performance Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-2 text-amber-400">Model</th>
                        <th className="text-right py-2 text-slate-400">Calls</th>
                        <th className="text-right py-2 text-slate-400">Avg Time</th>
                        <th className="text-right py-2 text-slate-400">Success</th>
                        <th className="text-right py-2 text-slate-400">Satisfaction</th>
                        <th className="text-right py-2 text-slate-400">Quality Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.byModel.map((model, idx) => (
                        <tr key={idx} className="border-b border-slate-800 hover:bg-slate-800/30">
                          <td className="py-3 text-slate-300">{model.model}</td>
                          <td className="text-right text-slate-400">{model.totalCalls}</td>
                          <td className="text-right text-slate-400">
                            {(model.avgResponseTime / 1000).toFixed(2)}s
                          </td>
                          <td className="text-right">
                            <Badge
                              variant={model.successRate >= 95 ? 'default' : 'destructive'}
                              className={
                                model.successRate >= 95
                                  ? 'bg-green-600'
                                  : 'bg-red-600'
                              }
                            >
                              {model.successRate}%
                            </Badge>
                          </td>
                          <td className="text-right text-slate-400">
                            {model.satisfactionRate}%
                          </td>
                          <td className="text-right">
                            <Badge
                              className={
                                model.qualityScore >= 80
                                  ? 'bg-green-600'
                                  : model.qualityScore >= 60
                                  ? 'bg-amber-600'
                                  : 'bg-red-600'
                              }
                            >
                              {model.qualityScore}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* By Task Type */}
          <TabsContent value="tasks" className="space-y-4">
            <Card className="bg-slate-900/60 border-amber-900/30 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-amber-400">🎯 Performance by Task Type</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={analytics.byTaskType} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" stroke="#94a3b8" />
                    <YAxis dataKey="task_type" type="category" stroke="#94a3b8" width={150} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                    />
                    <Legend />
                    <Bar dataKey="avgResponseTime" fill="#f59e0b" name="Avg Response (ms)" />
                    <Bar dataKey="successRate" fill="#8b5cf6" name="Success Rate (%)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {analytics.byTaskType.map((task, idx) => (
                <Card key={idx} className="bg-slate-900/60 border-amber-900/30 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-amber-400 capitalize">
                      {task.task_type.replace('_', ' ')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Calls:</span>
                      <span className="text-slate-300">{task.totalCalls}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Avg Time:</span>
                      <span className="text-slate-300">
                        {(task.avgResponseTime / 1000).toFixed(2)}s
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Success:</span>
                      <Badge
                        className={
                          task.successRate >= 95 ? 'bg-green-600' : 'bg-amber-600'
                        }
                      >
                        {task.successRate}%
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Quality:</span>
                      <Badge
                        className={
                          task.qualityScore >= 80
                            ? 'bg-green-600'
                            : task.qualityScore >= 60
                            ? 'bg-amber-600'
                            : 'bg-red-600'
                        }
                      >
                        {task.qualityScore}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Trends */}
          <TabsContent value="trends" className="space-y-4">
            <Card className="bg-slate-900/60 border-amber-900/30 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-amber-400">📈 Performance Trends Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={analytics.trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#94a3b8" />
                    <YAxis yAxisId="left" stroke="#94a3b8" />
                    <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                    />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="avgResponseTime"
                      stroke="#f59e0b"
                      name="Avg Response (ms)"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="successRate"
                      stroke="#8b5cf6"
                      name="Success Rate (%)"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="satisfactionRate"
                      stroke="#06b6d4"
                      name="Satisfaction (%)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Best Models */}
          <TabsContent value="best" className="space-y-4">
            <Card className="bg-slate-900/60 border-amber-900/30 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-amber-400">🏆 Best Model by Task Type</CardTitle>
                <CardDescription className="text-slate-400">
                  Top performing models for each task category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.bestByTask.map((task, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-lg bg-slate-800/50 border border-amber-900/20"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-lg font-semibold text-amber-400 capitalize">
                          {task.taskType.replace('_', ' ')}
                        </h3>
                        {task.bestModel && (
                          <Badge className="bg-green-600">Best Choice</Badge>
                        )}
                      </div>

                      {task.bestModel ? (
                        <>
                          <div className="mb-3 p-3 rounded bg-slate-900/50">
                            <div className="text-xl font-bold text-purple-400 mb-2">
                              {task.bestModel.model}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                              <div>
                                <div className="text-slate-500">Calls</div>
                                <div className="text-slate-300">
                                  {task.bestModel.totalCalls}
                                </div>
                              </div>
                              <div>
                                <div className="text-slate-500">Avg Time</div>
                                <div className="text-slate-300">
                                  {(task.bestModel.avgResponseTime / 1000).toFixed(2)}s
                                </div>
                              </div>
                              <div>
                                <div className="text-slate-500">Success</div>
                                <div className="text-green-400">
                                  {task.bestModel.successRate}%
                                </div>
                              </div>
                              <div>
                                <div className="text-slate-500">Quality</div>
                                <div className="text-amber-400">
                                  {task.bestModel.qualityScore}
                                </div>
                              </div>
                            </div>
                          </div>

                          {task.alternatives && task.alternatives.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-sm text-slate-500">Alternatives:</div>
                              {task.alternatives.map((alt: any, altIdx: number) => (
                                <div
                                  key={altIdx}
                                  className="flex items-center justify-between p-2 rounded bg-slate-900/30"
                                >
                                  <span className="text-slate-300">{alt.model}</span>
                                  <div className="flex gap-3 text-sm">
                                    <span className="text-slate-400">
                                      {(alt.avgResponseTime / 1000).toFixed(2)}s
                                    </span>
                                    <span className="text-green-400">
                                      {alt.successRate}%
                                    </span>
                                    <Badge className="bg-amber-600">
                                      {alt.qualityScore}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-slate-500 italic">
                          Not enough data to recommend a model (minimum 3 calls required)
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
