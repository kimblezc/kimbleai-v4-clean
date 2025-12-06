'use client';

import { useState } from 'react';

interface CollapsibleSectionProps {
  title: string;
  count?: number;
  isCollapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
}

export function CollapsibleSection({
  title,
  count,
  isCollapsed,
  onToggle,
  children,
  className = ''
}: CollapsibleSectionProps) {
  return (
    <div className={`mb-2 ${className}`}>
      {/* Section Header - Clickable to toggle */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-2 py-1 hover:bg-gray-900 rounded transition-colors group"
        aria-expanded={!isCollapsed}
        aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${title} section`}
      >
        <div className="flex items-center gap-1.5">
          {/* Chevron icon - rotates when expanded */}
          <svg
            className={`w-3 h-3 text-gray-500 transition-transform duration-200 ${
              isCollapsed ? '' : 'rotate-90'
            }`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 6l6 6-6 6" />
          </svg>

          {/* Section title */}
          <span className="text-xs text-gray-500 font-medium tracking-wider">
            {title}
          </span>
        </div>

        {/* Item count badge */}
        {count !== undefined && (
          <span className="text-xs text-gray-600 font-mono">
            {count}
          </span>
        )}
      </button>

      {/* Collapsible content area */}
      <div
        className={`transition-all duration-200 ease-in-out overflow-hidden ${
          isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[2000px] opacity-100'
        }`}
        style={{
          transitionProperty: 'max-height, opacity',
        }}
      >
        <div className="space-y-0.5 mt-1 px-1">
          {children}
        </div>
      </div>
    </div>
  );
}
