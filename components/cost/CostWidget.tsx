'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface CostWidgetProps {
  compact?: boolean; // If true, shows ultra-minimal version
}

interface CostData {
  daily: {
    used: number;
    limit: number;
    percentage: number;
  };
  hourly: {
    used: number;
    limit: number;
    percentage: number;
  };
  monthly: {
    used: number;
    limit: number;
    percentage: number;
  };
}

export function CostWidget({ compact = false }: CostWidgetProps) {
  const { data: session } = useSession();
  const [costData, setCostData] = useState<CostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const loadCostData = async () => {
    if (!session?.user?.email) {
      setLoading(false);
      return;
    }

    try {
      // Get user UUID
      const userResponse = await fetch(`/api/users?email=${encodeURIComponent(session.user.email)}`);
      const userData = await userResponse.json();

      if (!userData.success || !userData.user?.id) {
        setLoading(false);
        return;
      }

      const userId = userData.user.id;

      // Fetch cost data
      const response = await fetch(`/api/costs?action=summary&userId=${userId}`);
      const data = await response.json();

      if (!data.error) {
        setCostData(data);
      }
    } catch (err) {
      console.error('Failed to load cost data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      loadCostData();
      const interval = setInterval(loadCostData, 30000); // Refresh every 30s
      return () => clearInterval(interval);
    }
  }, [session]);

  if (!session || loading || !costData) {
    return null; // Don't show widget if not logged in or no data
  }

  const getStatusInfo = (percentage: number) => {
    if (percentage >= 90) return { label: 'Critical', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' };
    if (percentage >= 75) return { label: 'High', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)' };
    if (percentage >= 50) return { label: 'Moderate', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' };
    return { label: 'Low', color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.1)' };
  };

  const status = getStatusInfo(costData.daily.percentage);

  // Ultra-compact version for header
  if (compact) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-1.5 text-xs border border-gray-700 rounded cursor-pointer transition-all hover:border-gray-600"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="font-mono text-gray-600 dark:text-gray-400">
          ${costData.daily.used.toFixed(2)}
        </span>
        <span className="text-gray-500">/</span>
        <span className="font-mono text-gray-500">
          ${costData.daily.limit.toFixed(2)}
        </span>
      </div>
    );
  }

  // Standard widget version
  return (
    <div
      className="relative"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* Collapsed state */}
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all border"
        style={{
          backgroundColor: status.bgColor,
          borderColor: status.color + '40',
        }}
      >
        <div className="flex items-center gap-2 flex-1">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-mono text-gray-300">
                ${costData.daily.used.toFixed(2)} / ${costData.daily.limit.toFixed(2)}
              </span>
            </div>
            <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${Math.min(costData.daily.percentage, 100)}%`,
                  backgroundColor: status.color,
                }}
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/costs"
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            Details
          </Link>
        </div>
      </div>

      {/* Expanded state */}
      {expanded && (
        <div
          className="absolute top-full right-0 mt-2 p-4 bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-50"
          style={{ minWidth: '320px', maxWidth: '360px' }}
        >
          <div className="space-y-3">
            {/* Hourly */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">Hourly</span>
                <span className="text-xs font-medium text-gray-300">
                  ${costData.hourly.used.toFixed(2)} / ${costData.hourly.limit.toFixed(2)}
                </span>
              </div>
              <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${Math.min(costData.hourly.percentage, 100)}%`,
                    backgroundColor: getStatusInfo(costData.hourly.percentage).color,
                  }}
                />
              </div>
            </div>

            {/* Daily */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">Daily</span>
                <span className="text-xs font-medium text-gray-300">
                  ${costData.daily.used.toFixed(2)} / ${costData.daily.limit.toFixed(2)}
                </span>
              </div>
              <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${Math.min(costData.daily.percentage, 100)}%`,
                    backgroundColor: getStatusInfo(costData.daily.percentage).color,
                  }}
                />
              </div>
            </div>

            {/* Monthly */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">Monthly</span>
                <span className="text-xs font-medium text-gray-300">
                  ${costData.monthly.used.toFixed(2)} / ${costData.monthly.limit.toFixed(2)}
                </span>
              </div>
              <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${Math.min(costData.monthly.percentage, 100)}%`,
                    backgroundColor: getStatusInfo(costData.monthly.percentage).color,
                  }}
                />
              </div>
            </div>

            {/* View full dashboard link */}
            <Link
              href="/costs"
              className="block text-center text-xs text-blue-400 hover:text-blue-300 transition-colors pt-2 border-t border-gray-700"
            >
              View Full Dashboard →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
