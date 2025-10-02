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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Settings,
  DollarSign,
  Mail,
  AlertTriangle,
  Zap,
  Save,
  RefreshCw,
  TestTube,
  Shield,
  Bell,
  Clock,
  Users,
  Webhook
} from 'lucide-react';

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
  webhook?: {
    enabled: boolean;
    url: string;
    secret?: string;
  };
}

interface NotificationSettings {
  weeklyReports: boolean;
  monthlyReports: boolean;
  anomalyDetection: boolean;
  serviceUpdates: boolean;
}

export function CostMonitorConfig({ userId = 'zach-admin-001' }: { userId?: string }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // Configuration state
  const [limits, setLimits] = useState<UsageLimits>({
    daily: { cost: 50, tokens: 1000000, enabled: true },
    weekly: { cost: 200, tokens: 5000000, enabled: true },
    monthly: { cost: 500, tokens: 20000000, enabled: true },
    perRequest: { maxCost: 5, maxTokens: 100000, enabled: true }
  });

  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    email: {
      enabled: true,
      recipients: ['zach@kimbleai.com'],
      thresholds: [50, 75, 90, 100]
    },
    dashboard: {
      enabled: true,
      severity: 'warning'
    },
    autoThrottle: {
      enabled: true,
      pauseAt: 95,
      resumeAfter: 60
    },
    webhook: {
      enabled: false,
      url: '',
      secret: ''
    }
  });

  const [notifications, setNotifications] = useState<NotificationSettings>({
    weeklyReports: true,
    monthlyReports: true,
    anomalyDetection: true,
    serviceUpdates: false
  });

  const [emergencyContacts, setEmergencyContacts] = useState<string[]>(['zach@kimbleai.com']);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // Load configuration
  const loadConfiguration = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/agents/cost-monitor/config?userId=${userId}`);
      const data = await response.json();

      if (data.success) {
        if (data.limits) setLimits(data.limits);
        if (data.alertConfig) setAlertConfig(data.alertConfig);
        if (data.notifications) setNotifications(data.notifications);
        if (data.emergencyContacts) setEmergencyContacts(data.emergencyContacts);
        if (data.maintenanceMode !== undefined) setMaintenanceMode(data.maintenanceMode);
      }
    } catch (error) {
      console.error('Failed to load configuration:', error);
    } finally {
      setLoading(false);
    }
  };

  // Save configuration
  const saveConfiguration = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/agents/cost-monitor/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          limits,
          alertConfig,
          notifications,
          emergencyContacts,
          maintenanceMode
        })
      });

      if (response.ok) {
        // Show success message
        console.log('Configuration saved successfully');
      }
    } catch (error) {
      console.error('Failed to save configuration:', error);
    } finally {
      setSaving(false);
    }
  };

  // Test email alerts
  const testEmailAlerts = async () => {
    try {
      setTesting(true);
      const response = await fetch('/api/agents/cost-monitor/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          recipients: alertConfig.email.recipients
        })
      });

      if (response.ok) {
        console.log('Test email sent successfully');
      }
    } catch (error) {
      console.error('Failed to send test email:', error);
    } finally {
      setTesting(false);
    }
  };

  // Reset to defaults
  const resetToDefaults = () => {
    setLimits({
      daily: { cost: 50, tokens: 1000000, enabled: true },
      weekly: { cost: 200, tokens: 5000000, enabled: true },
      monthly: { cost: 500, tokens: 20000000, enabled: true },
      perRequest: { maxCost: 5, maxTokens: 100000, enabled: true }
    });

    setAlertConfig({
      email: {
        enabled: true,
        recipients: ['zach@kimbleai.com'],
        thresholds: [50, 75, 90, 100]
      },
      dashboard: {
        enabled: true,
        severity: 'warning'
      },
      autoThrottle: {
        enabled: true,
        pauseAt: 95,
        resumeAfter: 60
      },
      webhook: {
        enabled: false,
        url: '',
        secret: ''
      }
    });
  };

  useEffect(() => {
    loadConfiguration();
  }, [userId]);

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const formatNumber = (num: number) => num.toLocaleString();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cost Monitor Configuration</h1>
          <p className="text-muted-foreground">
            Configure spending limits, alerts, and safety measures
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={loadConfiguration} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={saveConfiguration} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save All'}
          </Button>
        </div>
      </div>

      {/* Emergency Mode Alert */}
      {maintenanceMode && (
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertTitle>Emergency Mode Active</AlertTitle>
          <AlertDescription>
            All API services are currently paused for maintenance. Normal operations will resume when maintenance mode is disabled.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="limits" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="limits">Spending Limits</TabsTrigger>
          <TabsTrigger value="alerts">Alert Settings</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        {/* Spending Limits */}
        <TabsContent value="limits" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {(['daily', 'weekly', 'monthly'] as const).map((period) => (
              <Card key={period}>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <DollarSign className="h-4 w-4 mr-2" />
                    {period.charAt(0).toUpperCase() + period.slice(1)} Limits
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`${period}-enabled`}
                      checked={limits[period].enabled}
                      onCheckedChange={(checked) => {
                        setLimits(prev => ({
                          ...prev,
                          [period]: { ...prev[period], enabled: checked }
                        }));
                      }}
                    />
                    <Label htmlFor={`${period}-enabled`}>Enable {period} limits</Label>
                  </div>

                  {limits[period].enabled && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor={`${period}-cost`}>Cost Limit ($)</Label>
                        <Input
                          id={`${period}-cost`}
                          type="number"
                          value={limits[period].cost}
                          onChange={(e) => {
                            setLimits(prev => ({
                              ...prev,
                              [period]: { ...prev[period], cost: parseFloat(e.target.value) || 0 }
                            }));
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`${period}-tokens`}>Token Limit</Label>
                        <Input
                          id={`${period}-tokens`}
                          type="number"
                          value={limits[period].tokens}
                          onChange={(e) => {
                            setLimits(prev => ({
                              ...prev,
                              [period]: { ...prev[period], tokens: parseInt(e.target.value) || 0 }
                            }));
                          }}
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}

            {/* Per-Request Limits */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="h-4 w-4 mr-2" />
                  Per-Request Limits
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="per-request-enabled"
                    checked={limits.perRequest.enabled}
                    onCheckedChange={(checked) => {
                      setLimits(prev => ({
                        ...prev,
                        perRequest: { ...prev.perRequest, enabled: checked }
                      }));
                    }}
                  />
                  <Label htmlFor="per-request-enabled">Enable per-request limits</Label>
                </div>

                {limits.perRequest.enabled && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="max-cost">Max Cost per Request ($)</Label>
                      <Input
                        id="max-cost"
                        type="number"
                        step="0.01"
                        value={limits.perRequest.maxCost}
                        onChange={(e) => {
                          setLimits(prev => ({
                            ...prev,
                            perRequest: { ...prev.perRequest, maxCost: parseFloat(e.target.value) || 0 }
                          }));
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="max-tokens">Max Tokens per Request</Label>
                      <Input
                        id="max-tokens"
                        type="number"
                        value={limits.perRequest.maxTokens}
                        onChange={(e) => {
                          setLimits(prev => ({
                            ...prev,
                            perRequest: { ...prev.perRequest, maxTokens: parseInt(e.target.value) || 0 }
                          }));
                        }}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Alert Settings */}
        <TabsContent value="alerts" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Email Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Mail className="h-4 w-4 mr-2" />
                  Email Alerts
                </CardTitle>
                <CardDescription>Configure email notifications for cost alerts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="email-alerts-enabled"
                    checked={alertConfig.email.enabled}
                    onCheckedChange={(checked) => {
                      setAlertConfig(prev => ({
                        ...prev,
                        email: { ...prev.email, enabled: checked }
                      }));
                    }}
                  />
                  <Label htmlFor="email-alerts-enabled">Enable email alerts</Label>
                </div>

                {alertConfig.email.enabled && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="email-recipients">Recipients (one per line)</Label>
                      <Textarea
                        id="email-recipients"
                        value={alertConfig.email.recipients.join('\n')}
                        onChange={(e) => {
                          setAlertConfig(prev => ({
                            ...prev,
                            email: {
                              ...prev.email,
                              recipients: e.target.value.split('\n').filter(Boolean)
                            }
                          }));
                        }}
                        placeholder="zach@kimbleai.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="alert-thresholds">Alert Thresholds (% of limit)</Label>
                      <Input
                        id="alert-thresholds"
                        value={alertConfig.email.thresholds.join(', ')}
                        onChange={(e) => {
                          const thresholds = e.target.value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
                          setAlertConfig(prev => ({
                            ...prev,
                            email: { ...prev.email, thresholds }
                          }));
                        }}
                        placeholder="50, 75, 90, 100"
                      />
                    </div>

                    <Button variant="outline" onClick={testEmailAlerts} disabled={testing}>
                      <TestTube className="h-4 w-4 mr-2" />
                      {testing ? 'Sending...' : 'Send Test Email'}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Auto-Throttle */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-4 w-4 mr-2" />
                  Auto-Throttle
                </CardTitle>
                <CardDescription>Automatically pause services when limits are reached</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="auto-throttle-enabled"
                    checked={alertConfig.autoThrottle.enabled}
                    onCheckedChange={(checked) => {
                      setAlertConfig(prev => ({
                        ...prev,
                        autoThrottle: { ...prev.autoThrottle, enabled: checked }
                      }));
                    }}
                  />
                  <Label htmlFor="auto-throttle-enabled">Enable auto-throttle</Label>
                </div>

                {alertConfig.autoThrottle.enabled && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="pause-at">Pause services at (% of limit)</Label>
                      <Input
                        id="pause-at"
                        type="number"
                        min="0"
                        max="100"
                        value={alertConfig.autoThrottle.pauseAt}
                        onChange={(e) => {
                          setAlertConfig(prev => ({
                            ...prev,
                            autoThrottle: { ...prev.autoThrottle, pauseAt: parseInt(e.target.value) || 0 }
                          }));
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="resume-after">Auto-resume after (minutes)</Label>
                      <Input
                        id="resume-after"
                        type="number"
                        min="0"
                        value={alertConfig.autoThrottle.resumeAfter}
                        onChange={(e) => {
                          setAlertConfig(prev => ({
                            ...prev,
                            autoThrottle: { ...prev.autoThrottle, resumeAfter: parseInt(e.target.value) || 0 }
                          }));
                        }}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Webhook Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Webhook className="h-4 w-4 mr-2" />
                  Webhook Alerts
                </CardTitle>
                <CardDescription>Send alerts to external webhooks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="webhook-enabled"
                    checked={alertConfig.webhook?.enabled || false}
                    onCheckedChange={(checked) => {
                      setAlertConfig(prev => ({
                        ...prev,
                        webhook: { ...prev.webhook, enabled: checked, url: prev.webhook?.url || '', secret: prev.webhook?.secret || '' }
                      }));
                    }}
                  />
                  <Label htmlFor="webhook-enabled">Enable webhook alerts</Label>
                </div>

                {alertConfig.webhook?.enabled && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="webhook-url">Webhook URL</Label>
                      <Input
                        id="webhook-url"
                        type="url"
                        value={alertConfig.webhook.url}
                        onChange={(e) => {
                          setAlertConfig(prev => ({
                            ...prev,
                            webhook: { ...prev.webhook!, url: e.target.value }
                          }));
                        }}
                        placeholder="https://hooks.slack.com/services/..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="webhook-secret">Secret (optional)</Label>
                      <Input
                        id="webhook-secret"
                        type="password"
                        value={alertConfig.webhook.secret || ''}
                        onChange={(e) => {
                          setAlertConfig(prev => ({
                            ...prev,
                            webhook: { ...prev.webhook!, secret: e.target.value }
                          }));
                        }}
                        placeholder="Optional webhook secret"
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="h-4 w-4 mr-2" />
                Notification Preferences
              </CardTitle>
              <CardDescription>Configure what notifications you want to receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="weekly-reports"
                    checked={notifications.weeklyReports}
                    onCheckedChange={(checked) => {
                      setNotifications(prev => ({ ...prev, weeklyReports: checked }));
                    }}
                  />
                  <Label htmlFor="weekly-reports">Weekly usage reports</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="monthly-reports"
                    checked={notifications.monthlyReports}
                    onCheckedChange={(checked) => {
                      setNotifications(prev => ({ ...prev, monthlyReports: checked }));
                    }}
                  />
                  <Label htmlFor="monthly-reports">Monthly usage reports</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="anomaly-detection"
                    checked={notifications.anomalyDetection}
                    onCheckedChange={(checked) => {
                      setNotifications(prev => ({ ...prev, anomalyDetection: checked }));
                    }}
                  />
                  <Label htmlFor="anomaly-detection">Anomaly detection alerts</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="service-updates"
                    checked={notifications.serviceUpdates}
                    onCheckedChange={(checked) => {
                      setNotifications(prev => ({ ...prev, serviceUpdates: checked }));
                    }}
                  />
                  <Label htmlFor="service-updates">Service update notifications</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Emergency Contacts
                </CardTitle>
                <CardDescription>People to notify in case of critical alerts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="emergency-contacts">Emergency Contacts (one per line)</Label>
                  <Textarea
                    id="emergency-contacts"
                    value={emergencyContacts.join('\n')}
                    onChange={(e) => {
                      setEmergencyContacts(e.target.value.split('\n').filter(Boolean));
                    }}
                    placeholder="zach@kimbleai.com"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-4 w-4 mr-2" />
                  Emergency Controls
                </CardTitle>
                <CardDescription>Emergency system controls</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="maintenance-mode"
                    checked={maintenanceMode}
                    onCheckedChange={setMaintenanceMode}
                  />
                  <Label htmlFor="maintenance-mode">Emergency maintenance mode</Label>
                </div>

                {maintenanceMode && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Maintenance mode will pause ALL API services immediately when saved.
                    </AlertDescription>
                  </Alert>
                )}

                <Button variant="destructive" size="sm">
                  Emergency Stop All Services
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Advanced */}
        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Configuration</CardTitle>
              <CardDescription>Advanced settings and system controls</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Button variant="outline" onClick={resetToDefaults}>
                  Reset to Defaults
                </Button>

                <Button variant="outline">
                  Export Configuration
                </Button>

                <Button variant="outline">
                  Import Configuration
                </Button>

                <Button variant="outline">
                  View Audit Log
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Configuration JSON (Read-only)</Label>
                <Textarea
                  value={JSON.stringify({ limits, alertConfig, notifications }, null, 2)}
                  readOnly
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}