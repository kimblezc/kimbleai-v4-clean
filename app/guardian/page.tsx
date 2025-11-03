'use client';

import { useState, useEffect } from 'react';

interface ValidationIssue {
  type: 'project' | 'tag' | 'association' | 'permission' | 'orphan' | 'duplicate';
  severity: 'critical' | 'warning' | 'info';
  entity: string;
  issue: string;
  fixable: boolean;
}

interface GuardianReport {
  success: boolean;
  timestamp: string;
  issuesFound: number;
  issuesFixed: number;
  issues: ValidationIssue[];
  summary: string;
}

export default function GuardianDashboard() {
  const [report, setReport] = useState<GuardianReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<string>('Never');

  // Fetch latest report on mount
  useEffect(() => {
    // For now, we'll just show a placeholder until the first run
    // In a production setup, we'd store reports in the database
  }, []);

  const runGuardian = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/guardian/run?trigger=manual');
      const data = await response.json();

      if (data.success) {
        setReport(data);
        setLastRun(new Date(data.timestamp).toLocaleString());
      } else {
        setError(data.error || 'Guardian run failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to run guardian');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-400 border-red-500/50 bg-red-950/20';
      case 'warning': return 'text-yellow-400 border-yellow-500/50 bg-yellow-950/20';
      case 'info': return 'text-blue-400 border-blue-500/50 bg-blue-950/20';
      default: return 'text-gray-400 border-gray-500/50 bg-gray-950/20';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'project': return '📋';
      case 'tag': return '🏷️';
      case 'association': return '🔗';
      case 'permission': return '🔐';
      case 'orphan': return '🔍';
      case 'duplicate': return '🔁';
      default: return '📌';
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">🛡️</span>
            <h1 className="text-3xl font-bold">Project-Tag Guardian</h1>
          </div>
          <p className="text-gray-400">
            Autonomous agent ensuring projects and tags are properly functioning
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Last Run</div>
            <div className="text-xl font-semibold">{lastRun}</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Schedule</div>
            <div className="text-xl font-semibold">Every 6 hours</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Issues Found</div>
            <div className="text-xl font-semibold text-yellow-400">
              {report?.issuesFound ?? '—'}
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Auto-Fixed</div>
            <div className="text-xl font-semibold text-green-400">
              {report?.issuesFixed ?? '—'}
            </div>
          </div>
        </div>

        {/* Manual Trigger */}
        <div className="mb-8">
          <button
            onClick={runGuardian}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
          >
            {loading ? '🔄 Running Guardian...' : '▶️ Run Manual Check'}
          </button>
          <p className="text-gray-500 text-sm mt-2">
            Manually trigger a validation run (takes 1-2 minutes)
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-8 p-4 bg-red-950/20 border border-red-500/50 rounded-lg">
            <div className="flex items-center gap-2 text-red-400">
              <span>❌</span>
              <span className="font-medium">Error:</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Summary */}
        {report && (
          <div className="mb-8 p-6 bg-gray-900 border border-gray-800 rounded-lg">
            <h2 className="text-xl font-semibold mb-3">Summary</h2>
            <p className="text-gray-300">{report.summary}</p>
          </div>
        )}

        {/* Issues List */}
        {report && report.issues.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Issues Detected</h2>
            <div className="space-y-3">
              {report.issues.map((issue, index) => (
                <div
                  key={index}
                  className={`p-4 border rounded-lg ${getSeverityColor(issue.severity)}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{getTypeIcon(issue.type)}</span>
                        <span className="font-medium capitalize">{issue.type}</span>
                        <span className="text-xs px-2 py-1 rounded bg-gray-950/50">
                          {issue.severity}
                        </span>
                        {issue.fixable && (
                          <span className="text-xs px-2 py-1 rounded bg-green-950/50 text-green-400">
                            Auto-fixable
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-400 mb-1">{issue.entity}</div>
                      <div className="text-sm">{issue.issue}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Issues */}
        {report && report.issues.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <div className="text-6xl mb-4">✅</div>
            <div className="text-xl font-semibold mb-2">All Systems Operational</div>
            <div>No issues detected with projects or tags</div>
          </div>
        )}

        {/* How to Read Section */}
        <div className="mt-12 p-6 bg-gray-900/50 border border-gray-800 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">What Does Guardian Check?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span>📋</span>
                <span className="font-medium">Projects</span>
              </div>
              <ul className="list-disc list-inside text-gray-400 space-y-1 ml-6">
                <li>Can create new projects</li>
                <li>Can read existing projects</li>
                <li>Can update project details</li>
                <li>Can delete projects</li>
              </ul>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span>🏷️</span>
                <span className="font-medium">Tags</span>
              </div>
              <ul className="list-disc list-inside text-gray-400 space-y-1 ml-6">
                <li>Can create new tags</li>
                <li>Can read existing tags</li>
                <li>Can update tag details</li>
                <li>Can delete tags</li>
              </ul>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span>🔗</span>
                <span className="font-medium">Associations</span>
              </div>
              <ul className="list-disc list-inside text-gray-400 space-y-1 ml-6">
                <li>Projects reference valid tags</li>
                <li>No broken tag relationships</li>
                <li>Auto-creates missing tags</li>
              </ul>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span>🔍</span>
                <span className="font-medium">Data Integrity</span>
              </div>
              <ul className="list-disc list-inside text-gray-400 space-y-1 ml-6">
                <li>No orphaned records</li>
                <li>No duplicate tags</li>
                <li>Proper permissions</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Plain English Explanation */}
        <div className="mt-8 p-6 bg-blue-950/20 border border-blue-500/30 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-blue-300">
            How to Read the Results (Plain English)
          </h3>
          <div className="space-y-2 text-sm text-gray-300">
            <p>
              <strong className="text-blue-400">🛡️ Guardian</strong> automatically tests that
              projects and tags are working correctly.
            </p>
            <p>
              <strong className="text-red-400">Critical issues</strong> mean something is broken
              and needs immediate attention.
            </p>
            <p>
              <strong className="text-yellow-400">Warnings</strong> are problems that should be
              fixed but won&apos;t break the system.
            </p>
            <p>
              <strong className="text-green-400">Auto-fixable</strong> issues are automatically
              repaired by Guardian.
            </p>
            <p className="pt-2 text-gray-400">
              <strong>Bottom line:</strong> If you see "All Systems Operational", everything is
              working perfectly. If you see issues, Guardian will try to fix them automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
