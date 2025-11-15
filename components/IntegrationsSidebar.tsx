'use client';

import React, { useState } from 'react';
import { IconButton } from './TouchButton';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'priority-1' | 'priority-2' | 'priority-3';
  status: 'implemented' | 'planned' | 'not-implemented';
}

const integrations: Integration[] = [
  // Priority 1 - High Value
  {
    id: 'github',
    name: 'GitHub',
    description: 'Repository management, issues, and pull requests',
    icon: '💻',
    category: 'priority-1',
    status: 'planned'
  },
  {
    id: 'todoist',
    name: 'Todoist',
    description: 'Task management and productivity tracking',
    icon: '✅',
    category: 'priority-1',
    status: 'planned'
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Knowledge management and documentation',
    icon: '📝',
    category: 'priority-1',
    status: 'planned'
  },
  {
    id: 'linear',
    name: 'Linear',
    description: 'Modern issue tracking and project management',
    icon: '📊',
    category: 'priority-1',
    status: 'planned'
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Team communication and notifications',
    icon: '💬',
    category: 'priority-1',
    status: 'planned'
  },
  // Priority 2 - Medium Value
  {
    id: 'trello',
    name: 'Trello',
    description: 'Kanban-style project management',
    icon: '📋',
    category: 'priority-2',
    status: 'not-implemented'
  },
  {
    id: 'asana',
    name: 'Asana',
    description: 'Enterprise work management platform',
    icon: '🎯',
    category: 'priority-2',
    status: 'not-implemented'
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    description: 'Meeting scheduling and calendar integration',
    icon: '📅',
    category: 'priority-2',
    status: 'implemented'
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    description: 'Cloud file storage and sharing',
    icon: '📁',
    category: 'priority-2',
    status: 'implemented'
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    description: 'File storage and sharing alternative',
    icon: '📦',
    category: 'priority-2',
    status: 'not-implemented'
  },
  // Priority 3 - Nice to Have
  {
    id: 'jira',
    name: 'Jira',
    description: 'Enterprise agile project management',
    icon: '🔵',
    category: 'priority-3',
    status: 'not-implemented'
  },
  {
    id: 'clickup',
    name: 'ClickUp',
    description: 'All-in-one productivity platform',
    icon: '⚡',
    category: 'priority-3',
    status: 'not-implemented'
  },
  {
    id: 'monday',
    name: 'Monday.com',
    description: 'Work OS for managing workflows',
    icon: '🔴',
    category: 'priority-3',
    status: 'not-implemented'
  },
  {
    id: 'airtable',
    name: 'Airtable',
    description: 'Spreadsheet-database hybrid',
    icon: '🗂️',
    category: 'priority-3',
    status: 'not-implemented'
  },
  {
    id: 'discord',
    name: 'Discord',
    description: 'Team communication and community',
    icon: '🎮',
    category: 'priority-3',
    status: 'not-implemented'
  }
];

interface IntegrationsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function IntegrationsSidebar({ isOpen, onClose }: IntegrationsSidebarProps) {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'priority-1' | 'priority-2' | 'priority-3'>('all');

  const filteredIntegrations = selectedCategory === 'all'
    ? integrations
    : integrations.filter(i => i.category === selectedCategory);

  const getStatusBadge = (status: Integration['status']) => {
    switch (status) {
      case 'implemented':
        return <span className="text-xs px-2 py-0.5 bg-green-900/30 text-green-400 rounded">✓ Active</span>;
      case 'planned':
        return <span className="text-xs px-2 py-0.5 bg-blue-900/30 text-blue-400 rounded">Planned</span>;
      case 'not-implemented':
        return <span className="text-xs px-2 py-0.5 bg-gray-800 text-gray-500 rounded">Not Available</span>;
    }
  };

  const getCategoryName = (category: Integration['category']) => {
    switch (category) {
      case 'priority-1': return 'High Value';
      case 'priority-2': return 'Medium Value';
      case 'priority-3': return 'Nice to Have';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay for mobile */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
      />

      {/* Sidebar */}
      <div className="fixed right-0 top-0 bottom-0 w-80 bg-gray-950 border-l border-gray-800 flex flex-col z-50 shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Integrations</h2>
            <p className="text-xs text-gray-500 mt-0.5">Available & Planned</p>
          </div>
          <IconButton
            icon={<span className="text-lg">✕</span>}
            label="Close integrations"
            onClick={onClose}
            variant="ghost"
            className="text-gray-400 hover:text-white"
          />
        </div>

        {/* Category Filter */}
        <div className="p-3 border-b border-gray-900">
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedCategory('priority-1')}
              className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${
                selectedCategory === 'priority-1'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              High Value
            </button>
            <button
              onClick={() => setSelectedCategory('priority-2')}
              className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${
                selectedCategory === 'priority-2'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Medium Value
            </button>
            <button
              onClick={() => setSelectedCategory('priority-3')}
              className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${
                selectedCategory === 'priority-3'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Nice to Have
            </button>
          </div>
        </div>

        {/* Integrations List */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="space-y-2">
            {filteredIntegrations.map((integration) => (
              <div
                key={integration.id}
                className="p-3 bg-gray-900 border border-gray-800 rounded-lg hover:border-gray-700 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">{integration.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="font-medium text-white text-sm">{integration.name}</h3>
                      {getStatusBadge(integration.status)}
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      {integration.description}
                    </p>
                    <div className="mt-2 text-xs text-gray-600">
                      {getCategoryName(integration.category)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-900">
          <div className="text-xs text-gray-600 text-center">
            <p>More integrations coming soon</p>
            <p className="mt-1">See INTEGRATION_RECOMMENDATIONS.md</p>
          </div>
        </div>
      </div>
    </>
  );
}
