'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Zap,
  Settings,
  Mail,
  RefreshCw,
  Pause,
  Play,
  Download,
  Eye,
  Calendar,
  BarChart3
} from 'lucide-react';

interface UsageData {
  cost: number;
  tokens: number;
  requests: number;
  periodStart: Date;
  periodEnd: Date;
}

interface UsageLimits {
  daily: { cost: number; tokens: number; enabled: boolean };
  weekly: { cost: number; tokens: number; enabled: boolean };
  monthly: { cost: number; tokens: number; enabled: boolean };
  perRequest: { maxCost: number; maxTokens: number; enabled: boolean };
}

interface AlertConfig {
  email: {
    enabled: boolean;
    recipients: string[];
    thresholds: number[];
  };
  dashboard: {
    enabled: boolean;
    severity: 'info' | 'warning' | 'error' | 'critical';
  };
  autoThrottle: {
    enabled: boolean;
    pauseAt: number;
    resumeAfter: number;
  };
}

interface CostBreakdown {
  service: string;
  model: string;
  operation: string;
  cost: number;
  tokens: number;
  requests: number;
  percentage: number;
}

interface CostTrends {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  projection: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

interface Alert {
  id: string;
  alertType: string;
  severity: string;
  period: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

export function CostMonitorDashboard({ userId = 'zach-admin-001' }: { userId?: string }) {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [currentUsage, setCurrentUsage] = useState<UsageData | null>(null);
  const [limits, setLimits] = useState<UsageLimits | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [breakdown, setBreakdown] = useState<CostBreakdown[]>([]);
  const [trends, setTrends] = useState<CostTrends | null>(null);
  const [alertConfig, setAlertConfig] = useState<AlertConfig | null>(null);
  const [serviceStatus, setServiceStatus] = useState<{ [key: string]: string }>({});

  // Load dashboard data
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/agents/cost-monitor?userId=${userId}&period=${period}`);
      const data = await response.json();

      if (data.success) {
        setCurrentUsage(data.data.currentUsage);
        setLimits(data.data.limits);
        setAlerts(data.data.alerts);
        setBreakdown(data.data.breakdown);
        setTrends(data.data.trends);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load alert configuration
  const loadAlertConfig = async () => {
    try {
      const response = await fetch(`/api/agents/cost-monitor?userId=${userId}&type=config`);
      const data = await response.json();
      if (data.success) {
        setAlertConfig(data.config);
      }
    } catch (error) {
      console.error('Failed to load alert config:', error);
    }
  };

  // Update limits
  const updateLimits = async (newLimits: UsageLimits) => {
    try {
      const response = await fetch('/api/agents/cost-monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_limits',
          userId,
          limits: newLimits
        })
      });

      if (response.ok) {
        setLimits(newLimits);
        await loadDashboardData();
      }
    } catch (error) {
      console.error('Failed to update limits:', error);
    }
  };

  // Update alert configuration
  const updateAlertConfig = async (newConfig: AlertConfig) => {
    try {
      const response = await fetch('/api/agents/cost-monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'configure_alerts',
          userId,
          alertConfig: newConfig
        })
      });

      if (response.ok) {
        setAlertConfig(newConfig);
      }
    } catch (error) {
      console.error('Failed to update alert config:', error);
    }
  };

  // Pause/resume service
  const toggleService = async (service: string, action: 'pause' | 'resume') => {
    try {
      const response = await fetch('/api/agents/cost-monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: `${action}_service`,
          userId,
          service,
          reason: action === 'pause' ? 'Manual pause from dashboard' : undefined
        })
      });

      if (response.ok) {
        setServiceStatus(prev => ({ ...prev, [service]: action === 'pause' ? 'paused' : 'active' }));
        await loadDashboardData();
      }
    } catch (error) {
      console.error(`Failed to ${action} service:`, error);
    }
  };

  // Force usage check
  const forceUsageCheck = async () => {
    try {
      await fetch('/api/agents/cost-monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'force_check',
          userId
        })
      });
      await loadDashboardData();
    } catch (error) {
      console.error('Failed to force usage check:', error);
    }
  };

  useEffect(() => {
    loadDashboardData();
    loadAlertConfig();
  }, [userId, period]);

  const formatCurrency = (amount: number) => `$${amount.toFixed(4)}`;
  const formatNumber = (num: number) => num.toLocaleString();

  const getUsagePercentage = (current: number, limit: number) =>
    limit > 0 ? Math.min((current / limit) * 100, 100) : 0;

  const getAlertColor = (percentage: number) => {
    if (percentage >= 100) return 'destructive';
    if (percentage >= 90) return 'destructive';
    if (percentage >= 75) return 'warning';
    if (percentage >= 50) return 'warning';
    return 'default';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cost Monitor</h1>
          <p className="text-muted-foreground">
            Real-time API cost tracking and alerts for KimbleAI
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={forceUsageCheck}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.slice(0, 3).map((alert) => (
            <Alert key={alert.id} variant={alert.severity === 'critical' ? 'destructive' : 'default'}>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="capitalize">{alert.severity} Alert</AlertTitle>
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Period Selector */}
      <Tabs value={period} onValueChange={(value) => setPeriod(value as any)}>
        <TabsList>
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
        </TabsList>

        <TabsContent value={period} className="space-y-6">
          {/* Usage Overview Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Cost Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cost ({period})</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(currentUsage?.cost || 0)}
                </div>
                {limits && (
                  <div className="space-y-2">
                    <Progress
                      value={getUsagePercentage(currentUsage?.cost || 0, limits[period].cost)}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      {getUsagePercentage(currentUsage?.cost || 0, limits[period].cost).toFixed(1)}% of {formatCurrency(limits[period].cost)} limit
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tokens Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tokens ({period})</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(currentUsage?.tokens || 0)}
                </div>
                {limits && (
                  <div className="space-y-2">
                    <Progress
                      value={getUsagePercentage(currentUsage?.tokens || 0, limits[period].tokens)}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      {getUsagePercentage(currentUsage?.tokens || 0, limits[period].tokens).toFixed(1)}% of {formatNumber(limits[period].tokens)} limit
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Requests Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Requests ({period})</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(currentUsage?.requests || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  API calls made this {period}
                </p>
              </CardContent>
            </Card>

            {/* Trend Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Trend</CardTitle>
                {trends?.trend === 'increasing' ? (
                  <TrendingUp className="h-4 w-4 text-red-500" />
                ) : trends?.trend === 'decreasing' ? (
                  <TrendingDown className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                )}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {trends ? `${trends.changePercent > 0 ? '+' : ''}${trends.changePercent.toFixed(1)}%` : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {trends ? `${trends.trend} vs previous ${period}` : 'No trend data'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Analytics */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Cost Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Cost Breakdown</CardTitle>
                <CardDescription>Usage by service and model</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {breakdown.slice(0, 5).map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {item.service} - {item.model}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {item.operation} • {formatNumber(item.requests)} requests
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {formatCurrency(item.cost)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.percentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Service Status */}
            <Card>
              <CardHeader>
                <CardTitle>Service Status</CardTitle>
                <CardDescription>Current status of API services</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['openai', 'anthropic', 'google'].map((service) => (
                    <div key={service} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge variant={serviceStatus[service] === 'paused' ? 'destructive' : 'default'}>
                          {service.charAt(0).toUpperCase() + service.slice(1)}
                        </Badge>
                        <span className="text-sm">
                          {serviceStatus[service] === 'paused' ? 'Paused' : 'Active'}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleService(service, serviceStatus[service] === 'paused' ? 'resume' : 'pause')}
                      >
                        {serviceStatus[service] === 'paused' ? (
                          <><Play className="h-3 w-3 mr-1" /> Resume</>
                        ) : (
                          <><Pause className="h-3 w-3 mr-1" /> Pause</>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
              <CardDescription>Manage spending limits and alert settings</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="limits">
                <TabsList>
                  <TabsTrigger value="limits">Spending Limits</TabsTrigger>
                  <TabsTrigger value="alerts">Alert Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="limits" className="space-y-4">
                  {limits && (
                    <div className="grid gap-4 md:grid-cols-3">
                      {(['daily', 'weekly', 'monthly'] as const).map((periodType) => (
                        <div key={periodType} className="space-y-4 p-4 border rounded-lg">
                          <h4 className="font-medium capitalize">{periodType} Limits</h4>

                          <div className="space-y-2">
                            <Label htmlFor={`${periodType}-cost`}>Cost Limit ($)</Label>
                            <Input
                              id={`${periodType}-cost`}
                              type="number"
                              value={limits[periodType].cost}
                              onChange={(e) => {
                                const newLimits = {
                                  ...limits,
                                  [periodType]: {
                                    ...limits[periodType],
                                    cost: parseFloat(e.target.value) || 0
                                  }
                                };
                                setLimits(newLimits);
                              }}
                              onBlur={() => updateLimits(limits)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`${periodType}-tokens`}>Token Limit</Label>
                            <Input
                              id={`${periodType}-tokens`}
                              type="number"
                              value={limits[periodType].tokens}
                              onChange={(e) => {
                                const newLimits = {
                                  ...limits,
                                  [periodType]: {
                                    ...limits[periodType],
                                    tokens: parseInt(e.target.value) || 0
                                  }
                                };
                                setLimits(newLimits);
                              }}
                              onBlur={() => updateLimits(limits)}
                            />
                          </div>

                          <div className="flex items-center space-x-2">
                            <Switch
                              id={`${periodType}-enabled`}
                              checked={limits[periodType].enabled}
                              onCheckedChange={(checked) => {
                                const newLimits = {
                                  ...limits,
                                  [periodType]: {
                                    ...limits[periodType],
                                    enabled: checked
                                  }
                                };
                                setLimits(newLimits);
                                updateLimits(newLimits);
                              }}
                            />
                            <Label htmlFor={`${periodType}-enabled`}>Enable {periodType} limits</Label>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="alerts" className="space-y-4">
                  {alertConfig && (
                    <div className="space-y-6">
                      {/* Email Alerts */}
                      <div className="space-y-4 p-4 border rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="email-alerts"
                            checked={alertConfig.email.enabled}
                            onCheckedChange={(checked) => {
                              const newConfig = {
                                ...alertConfig,
                                email: { ...alertConfig.email, enabled: checked }
                              };
                              setAlertConfig(newConfig);
                              updateAlertConfig(newConfig);
                            }}
                          />
                          <Label htmlFor="email-alerts">Email Alerts</Label>
                          <Mail className="h-4 w-4" />
                        </div>

                        {alertConfig.email.enabled && (
                          <div className="space-y-2">
                            <Label htmlFor="alert-recipients">Recipients (comma-separated)</Label>
                            <Input
                              id="alert-recipients"
                              value={alertConfig.email.recipients.join(', ')}
                              onChange={(e) => {
                                const newConfig = {
                                  ...alertConfig,
                                  email: {
                                    ...alertConfig.email,
                                    recipients: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                                  }
                                };
                                setAlertConfig(newConfig);
                              }}
                              onBlur={() => updateAlertConfig(alertConfig)}
                            />
                          </div>
                        )}
                      </div>

                      {/* Auto-Throttle */}
                      <div className="space-y-4 p-4 border rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="auto-throttle"
                            checked={alertConfig.autoThrottle.enabled}
                            onCheckedChange={(checked) => {
                              const newConfig = {
                                ...alertConfig,
                                autoThrottle: { ...alertConfig.autoThrottle, enabled: checked }
                              };
                              setAlertConfig(newConfig);
                              updateAlertConfig(newConfig);
                            }}
                          />
                          <Label htmlFor="auto-throttle">Auto-Throttle Services</Label>
                          <Settings className="h-4 w-4" />
                        </div>

                        {alertConfig.autoThrottle.enabled && (
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="pause-at">Pause at (% of limit)</Label>
                              <Input
                                id="pause-at"
                                type="number"
                                min="0"
                                max="100"
                                value={alertConfig.autoThrottle.pauseAt}
                                onChange={(e) => {
                                  const newConfig = {
                                    ...alertConfig,
                                    autoThrottle: {
                                      ...alertConfig.autoThrottle,
                                      pauseAt: parseInt(e.target.value) || 0
                                    }
                                  };
                                  setAlertConfig(newConfig);
                                }}
                                onBlur={() => updateAlertConfig(alertConfig)}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="resume-after">Resume after (minutes)</Label>
                              <Input
                                id="resume-after"
                                type="number"
                                min="0"
                                value={alertConfig.autoThrottle.resumeAfter}
                                onChange={(e) => {
                                  const newConfig = {
                                    ...alertConfig,
                                    autoThrottle: {
                                      ...alertConfig.autoThrottle,
                                      resumeAfter: parseInt(e.target.value) || 0
                                    }
                                  };
                                  setAlertConfig(newConfig);
                                }}
                                onBlur={() => updateAlertConfig(alertConfig)}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}