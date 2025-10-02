'use client';

import React, { useState, useEffect } from 'react';

interface DriveAnalysis {
  totalFiles: number;
  totalFolders: number;
  totalSize: number;
  fileTypes: Record<string, number>;
  duplicates: any[];
  largeFiles: any[];
  oldFiles: any[];
  organizationScore: number;
  permissionIssues: any[];
  recommendations: string[];
  executionTime: number;
}

interface OptimizationResult {
  foldersCreated: any[];
  filesMoved: any[];
  organizationRules: any[];
  summary: any;
}

interface DuplicationResult {
  duplicateGroups: any[];
  spaceSaved: number;
  filesProcessed: number;
  mergeActions: any[];
}

interface PermissionResult {
  filesAnalyzed: number;
  permissionIssues: any[];
  recommendedChanges: any[];
  securityScore: number;
}

interface StorageReport {
  totalUsage: number;
  usageByType: Record<string, number>;
  largestFiles: any[];
  oldestFiles: any[];
  recommendations: string[];
  potentialSavings: number;
}

const DriveIntelligenceDashboard: React.FC = () => {
  const [analysis, setAnalysis] = useState<DriveAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [duplicationResult, setDuplicationResult] = useState<DuplicationResult | null>(null);
  const [permissionResult, setPermissionResult] = useState<PermissionResult | null>(null);
  const [storageReport, setStorageReport] = useState<StorageReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dryRun, setDryRun] = useState(true);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/agents/drive-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze',
          options: { maxDepth: 10 }
        })
      });

      const data = await response.json();

      if (data.success) {
        setAnalysis(data.analysis);
      } else {
        setError(data.error || 'Failed to analyze drive');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const runOrganization = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/agents/drive-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'organize',
          options: { dryRun }
        })
      });

      const data = await response.json();

      if (data.success) {
        setOptimizationResult(data.result);
      } else {
        setError(data.error || 'Failed to organize files');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const runDeduplication = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/agents/drive-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deduplicate',
          options: { dryRun, autoMerge: !dryRun }
        })
      });

      const data = await response.json();

      if (data.success) {
        setDuplicationResult(data.result);
      } else {
        setError(data.error || 'Failed to detect duplicates');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const runPermissionOptimization = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/agents/drive-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'optimize_permissions'
        })
      });

      const data = await response.json();

      if (data.success) {
        setPermissionResult(data.result);
      } else {
        setError(data.error || 'Failed to optimize permissions');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const generateStorageReport = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/agents/drive-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'storage_report'
        })
      });

      const data = await response.json();

      if (data.success) {
        setStorageReport(data.report);
      } else {
        setError(data.error || 'Failed to generate storage report');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const runFullOptimization = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/agents/drive-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'auto_organize',
          options: {
            dryRun,
            aggressiveness: 'moderate',
            includeSharedFiles: false
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        setAnalysis(data.results.analysis);
        setOptimizationResult(data.results.organization);
        setDuplicationResult(data.results.deduplication);
        setPermissionResult(data.results.permissions);
      } else {
        setError(data.error || 'Failed to run full optimization');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const prepareFileTypeData = () => {
    if (!analysis?.fileTypes) return [];

    return Object.entries(analysis.fileTypes).map(([type, count]) => ({
      name: type.split('/').pop() || type,
      value: count,
      fullType: type
    }));
  };

  const tabs = [
    { id: 'overview', name: 'Overview' },
    { id: 'organization', name: 'Organization' },
    { id: 'duplicates', name: 'Duplicates' },
    { id: 'permissions', name: 'Permissions' },
    { id: 'storage', name: 'Storage' },
    { id: 'recommendations', name: 'Recommendations' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Drive Intelligence Agent</h1>
              <p className="text-gray-600 mt-2">Smart file management and optimization for Google Drive</p>
            </div>
            <div className="flex gap-4 items-center">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={dryRun}
                  onChange={(e) => setDryRun(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm font-medium">Dry Run Mode</span>
              </label>
              <button
                onClick={runAnalysis}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                )}
                Analyze Drive
              </button>
              <button
                onClick={runFullOptimization}
                disabled={loading}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Full Optimization
              </button>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <svg className="flex-shrink-0 h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        {analysis && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Files</dt>
                    <dd className="text-lg font-medium text-gray-900">{analysis.totalFiles.toLocaleString()}</dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v0M8 5v0a2 2 0 002 2h4a2 2 0 002-2v0" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Folders</dt>
                    <dd className="text-lg font-medium text-gray-900">{analysis.totalFolders.toLocaleString()}</dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Size</dt>
                    <dd className="text-lg font-medium text-gray-900">{formatBytes(analysis.totalSize)}</dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Organization Score</dt>
                    <dd className="text-lg font-medium text-gray-900">{analysis.organizationScore}%</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm`}
                >
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && analysis && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* File Types */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">File Types Distribution</h3>
                    <div className="space-y-3">
                      {Object.entries(analysis.fileTypes).slice(0, 8).map(([type, count]) => (
                        <div key={type} className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">{type.split('/').pop() || type}</span>
                          <span className="text-sm font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Issues Summary */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Issues Summary</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-white rounded border">
                        <span className="text-sm">Duplicate Files</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          analysis.duplicates.length > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {analysis.duplicates.length}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-white rounded border">
                        <span className="text-sm">Large Files (&gt;50MB)</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          analysis.largeFiles.length > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {analysis.largeFiles.length}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-white rounded border">
                        <span className="text-sm">Old Files (&gt;1 year)</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          analysis.oldFiles.length > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {analysis.oldFiles.length}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-white rounded border">
                        <span className="text-sm">Permission Issues</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          analysis.permissionIssues.length > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {analysis.permissionIssues.length}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Organization Tab */}
            {activeTab === 'organization' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">File Organization</h2>
                  <button
                    onClick={runOrganization}
                    disabled={loading}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    Auto-Organize Files
                  </button>
                </div>

                {optimizationResult && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Organization Results</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        {dryRun ? 'Preview of changes (dry run mode)' : 'Changes applied to your Drive'}
                      </p>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span>Folders Created:</span>
                          <span className="font-medium">{optimizationResult.foldersCreated.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Files Moved:</span>
                          <span className="font-medium">{optimizationResult.filesMoved.length}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Organization Rules</h3>
                      <div className="space-y-2">
                        {optimizationResult.organizationRules?.slice(0, 6).map((rule, index) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-white rounded border">
                            <span className="text-sm font-medium">{rule.name}</span>
                            <span className="text-xs text-gray-500">{rule.targetFolder}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Duplicates Tab */}
            {activeTab === 'duplicates' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Duplicate Detection</h2>
                  <button
                    onClick={runDeduplication}
                    disabled={loading}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    Detect Duplicates
                  </button>
                </div>

                {duplicationResult && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-orange-50 rounded-lg p-6 text-center">
                        <p className="text-2xl font-bold text-orange-600">{duplicationResult.duplicateGroups.length}</p>
                        <p className="text-sm text-gray-600">Duplicate Groups</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-6 text-center">
                        <p className="text-2xl font-bold text-green-600">{formatBytes(duplicationResult.spaceSaved)}</p>
                        <p className="text-sm text-gray-600">Space Saved</p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-6 text-center">
                        <p className="text-2xl font-bold text-blue-600">{duplicationResult.filesProcessed}</p>
                        <p className="text-sm text-gray-600">Files Processed</p>
                      </div>
                    </div>

                    {duplicationResult.duplicateGroups.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Duplicate Files Found</h3>
                        <div className="space-y-4">
                          {duplicationResult.duplicateGroups.slice(0, 10).map((group, index) => (
                            <div key={index} className="bg-white border rounded p-4">
                              <div className="flex justify-between items-center mb-2">
                                <h4 className="font-medium">{group.key}</h4>
                                <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                                  {group.files.length} files
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mb-1">
                                Recommended action: {group.recommendedAction}
                              </p>
                              <p className="text-sm text-green-600">
                                Potential savings: {formatBytes(group.spaceSavings)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Permissions Tab */}
            {activeTab === 'permissions' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Permission Analysis</h2>
                  <button
                    onClick={runPermissionOptimization}
                    disabled={loading}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    Analyze Permissions
                  </button>
                </div>

                {permissionResult && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-blue-50 rounded-lg p-6 text-center">
                        <p className="text-2xl font-bold text-blue-600">{permissionResult.filesAnalyzed}</p>
                        <p className="text-sm text-gray-600">Files Analyzed</p>
                      </div>
                      <div className="bg-red-50 rounded-lg p-6 text-center">
                        <p className="text-2xl font-bold text-red-600">{permissionResult.permissionIssues.length}</p>
                        <p className="text-sm text-gray-600">Security Issues</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-6 text-center">
                        <p className="text-2xl font-bold text-green-600">{permissionResult.securityScore}%</p>
                        <p className="text-sm text-gray-600">Security Score</p>
                      </div>
                    </div>

                    {permissionResult.permissionIssues.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Permission Issues</h3>
                        <div className="space-y-3">
                          {permissionResult.permissionIssues.map((issue, index) => (
                            <div key={index} className="bg-white border rounded p-3">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <h4 className="font-medium">{issue.fileName}</h4>
                                  <p className="text-sm text-gray-600">{issue.issue}</p>
                                  <p className="text-sm text-blue-600">{issue.recommendation}</p>
                                </div>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  issue.severity === 'high' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {issue.severity}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Storage Tab */}
            {activeTab === 'storage' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Storage Analysis</h2>
                  <button
                    onClick={generateStorageReport}
                    disabled={loading}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    Generate Report
                  </button>
                </div>

                {storageReport && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-blue-50 rounded-lg p-6 text-center">
                        <p className="text-2xl font-bold text-blue-600">{formatBytes(storageReport.totalUsage)}</p>
                        <p className="text-sm text-gray-600">Total Usage</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-6 text-center">
                        <p className="text-2xl font-bold text-green-600">{formatBytes(storageReport.potentialSavings)}</p>
                        <p className="text-sm text-gray-600">Potential Savings</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-6 text-center">
                        <p className="text-2xl font-bold text-purple-600">{storageReport.largestFiles.length}</p>
                        <p className="text-sm text-gray-600">Large Files</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Storage by File Type</h3>
                        <div className="space-y-3">
                          {Object.entries(storageReport.usageByType).slice(0, 8).map(([type, size]) => (
                            <div key={type} className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">{type.split('/').pop() || type}</span>
                              <span className="text-sm font-medium">{formatBytes(size)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Largest Files</h3>
                        <div className="space-y-3">
                          {storageReport.largestFiles.slice(0, 10).map((file, index) => (
                            <div key={index} className="flex justify-between items-center p-2 bg-white rounded border">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{file.name}</p>
                                <p className="text-xs text-gray-600">{file.mimeType}</p>
                              </div>
                              <span className="text-xs px-2 py-1 bg-gray-100 rounded">{formatBytes(file.size)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Recommendations Tab */}
            {activeTab === 'recommendations' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold">Smart Recommendations</h2>

                {analysis?.recommendations && analysis.recommendations.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Drive Analysis Recommendations</h3>
                    <div className="space-y-3">
                      {analysis.recommendations.map((recommendation, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-white rounded border">
                          <svg className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <p className="text-sm">{recommendation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={runOrganization}
                      disabled={loading}
                      className="h-auto p-4 text-left border border-gray-200 bg-white rounded-lg hover:border-blue-300 disabled:opacity-50"
                    >
                      <div className="flex items-center gap-3">
                        <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                        </svg>
                        <div>
                          <div className="font-semibold">Auto-Organize Files</div>
                          <div className="text-sm text-gray-600">Sort files into logical folders</div>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={runDeduplication}
                      disabled={loading}
                      className="h-auto p-4 text-left border border-gray-200 bg-white rounded-lg hover:border-blue-300 disabled:opacity-50"
                    >
                      <div className="flex items-center gap-3">
                        <svg className="h-6 w-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <div>
                          <div className="font-semibold">Remove Duplicates</div>
                          <div className="text-sm text-gray-600">Find and merge duplicate files</div>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={runPermissionOptimization}
                      disabled={loading}
                      className="h-auto p-4 text-left border border-gray-200 bg-white rounded-lg hover:border-blue-300 disabled:opacity-50"
                    >
                      <div className="flex items-center gap-3">
                        <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <div>
                          <div className="font-semibold">Optimize Security</div>
                          <div className="text-sm text-gray-600">Review file permissions</div>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={generateStorageReport}
                      disabled={loading}
                      className="h-auto p-4 text-left border border-gray-200 bg-white rounded-lg hover:border-blue-300 disabled:opacity-50"
                    >
                      <div className="flex items-center gap-3">
                        <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div>
                          <div className="font-semibold">Storage Report</div>
                          <div className="text-sm text-gray-600">Analyze storage usage</div>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriveIntelligenceDashboard;