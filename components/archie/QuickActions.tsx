'use client';

import React from 'react';
import Link from 'next/link';

interface QuickAction {
  icon: string;
  label: string;
  href: string;
  description: string;
}

const actions: QuickAction[] = [
  {
    icon: '💬',
    label: 'New Chat',
    href: '/',
    description: 'Start a conversation'
  },
  {
    icon: '📋',
    label: 'Projects',
    href: '/projects',
    description: 'Manage your projects'
  },
  {
    icon: '📁',
    label: 'Files',
    href: '/files',
    description: 'Browse your files'
  },
  {
    icon: '⚙️',
    label: 'Settings',
    href: '/settings',
    description: 'Configure Archie'
  }
];

export function QuickActions() {
  return (
    <div className="mt-16 pt-8 border-t border-gray-800">
      <h2 className="text-2xl font-bold text-white mb-6 text-center">
        Quick Actions
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {actions.map((action, index) => (
          <Link
            key={index}
            href={action.href}
            className="
              group flex flex-col items-center gap-3 p-4
              bg-gray-900/50 border border-gray-800
              rounded-xl
              hover:border-blue-500/50 hover:bg-gray-900
              transition-all duration-200
            "
          >
            <span className="text-3xl group-hover:scale-110 transition-transform duration-200">
              {action.icon}
            </span>
            <div className="text-center">
              <div className="text-sm font-medium text-white mb-1">
                {action.label}
              </div>
              <div className="text-xs text-gray-500">
                {action.description}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
