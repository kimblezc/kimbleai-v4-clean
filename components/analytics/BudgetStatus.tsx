/**
 * Budget Status Component
 *
 * Shows monthly budget status with visual indicator
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface BudgetStatusProps {
  compact?: boolean;
}

export default function BudgetStatus({ compact = false }: BudgetStatusProps) {
  const { data: session, status } = useSession();
  const [budgetData, setBudgetData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchBudgetStatus();
      const interval = setInterval(fetchBudgetStatus, 60000); // Refresh every minute
      return () => clearInterval(interval);
    } else if (status === 'unauthenticated') {
      setLoading(false);
    }
  }, [status]);

  const fetchBudgetStatus = async () => {
    try {
      const response = await fetch('/api/analytics');
      if (response.ok) {
        const data = await response.json();
        setBudgetData(data.budgetStatus);
      }
    } catch (error) {
      console.error('Failed to fetch budget status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !budgetData) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Loading...
        </div>
      </div>
    );
  }

  const percentage = (budgetData.currentSpend / budgetData.monthlyBudget) * 100;
  const isWarning = percentage >= 80;
  const isExceeded = budgetData.isOverBudget;

  if (compact) {
    return (
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
          isExceeded
            ? 'bg-red-100 dark:bg-red-900/30'
            : isWarning
            ? 'bg-yellow-100 dark:bg-yellow-900/30'
            : 'bg-green-100 dark:bg-green-900/30'
        }`}
      >
        {isWarning && (
          <ExclamationTriangleIcon
            className={`w-4 h-4 ${
              isExceeded
                ? 'text-red-600 dark:text-red-400'
                : 'text-yellow-600 dark:text-yellow-400'
            }`}
          />
        )}
        <div className="text-sm font-medium">
          <span
            className={
              isExceeded
                ? 'text-red-700 dark:text-red-300'
                : isWarning
                ? 'text-yellow-700 dark:text-yellow-300'
                : 'text-green-700 dark:text-green-300'
            }
          >
            ${budgetData.currentSpend.toFixed(2)}
          </span>
          <span className="text-gray-600 dark:text-gray-400 mx-1">/</span>
          <span className="text-gray-700 dark:text-gray-300">
            ${budgetData.monthlyBudget.toFixed(2)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Monthly Budget
        </h3>
        {isWarning && (
          <ExclamationTriangleIcon
            className={`w-6 h-6 ${
              isExceeded
                ? 'text-red-600 dark:text-red-400'
                : 'text-yellow-600 dark:text-yellow-400'
            }`}
          />
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600 dark:text-gray-400">
            ${budgetData.currentSpend.toFixed(2)} spent
          </span>
          <span className="text-gray-600 dark:text-gray-400">
            {percentage.toFixed(1)}%
          </span>
        </div>
        <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              isExceeded
                ? 'bg-red-600'
                : isWarning
                ? 'bg-yellow-500'
                : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Budget:</span>
          <span className="font-medium text-gray-900 dark:text-white">
            ${budgetData.monthlyBudget.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Remaining:</span>
          <span
            className={`font-medium ${
              budgetData.remaining <= 0
                ? 'text-red-600 dark:text-red-400'
                : 'text-gray-900 dark:text-white'
            }`}
          >
            ${Math.max(0, budgetData.remaining).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Warning Message */}
      {isExceeded && (
        <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-300">
            Budget exceeded! Requests will be blocked until next month or until
            you increase your budget.
          </p>
        </div>
      )}

      {isWarning && !isExceeded && (
        <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-300">
            You've used {percentage.toFixed(0)}% of your monthly budget. Consider
            monitoring your usage.
          </p>
        </div>
      )}
    </div>
  );
}
