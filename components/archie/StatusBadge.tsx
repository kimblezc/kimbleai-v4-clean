'use client';

import React from 'react';

interface StatusBadgeProps {
  label: string;
  value: string | number;
  color: 'blue' | 'green' | 'orange' | 'purple' | 'red';
  trend?: 'up' | 'down' | 'neutral';
}

const colorMap = {
  blue: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    gradient: 'from-blue-500 to-blue-600'
  },
  green: {
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    text: 'text-green-400',
    gradient: 'from-green-500 to-green-600'
  },
  orange: {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    text: 'text-orange-400',
    gradient: 'from-orange-500 to-orange-600'
  },
  purple: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    text: 'text-purple-400',
    gradient: 'from-purple-500 to-purple-600'
  },
  red: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-400',
    gradient: 'from-red-500 to-red-600'
  }
};

export function StatusBadge({ label, value, color, trend }: StatusBadgeProps) {
  const colors = colorMap[color];

  return (
    <div className={`
      ${colors.bg} ${colors.border}
      border-2 rounded-xl p-6
      hover:scale-105 transition-transform duration-200
    `}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-sm font-medium text-gray-400 uppercase tracking-wide">
          {label}
        </span>
        {trend && (
          <span className={`text-xs ${
            trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-gray-400'
          }`}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
          </span>
        )}
      </div>
      <div className={`text-4xl font-bold ${colors.text}`}>
        {value}
      </div>
    </div>
  );
}
