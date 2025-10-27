'use client';

import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';

interface FamilyEmail {
  id: string;
  gmail_message_id: string;
  thread_id: string;
  user_email: string;
  from_email: string;
  subject: string;
  snippet: string;
  category: string;
  subcategory: string;
  is_shared: boolean;
  shared_with: string[];
  priority: string;
  action_required: boolean;
  action_items: string[];
  tags: string[];
  is_archived: boolean;
  has_attachments: boolean;
  attachment_count: number;
  received_date: string;
}

const EMAIL_CATEGORIES = [
  { value: 'bills_financial', label: 'Bills & Financial', icon: '💰', color: 'yellow' },
  { value: 'travel', label: 'Travel', icon: '✈️', color: 'cyan' },
  { value: 'home_property', label: 'Home & Property', icon: '🏠', color: 'green' },
  { value: 'joint_projects', label: 'Joint Projects', icon: '🎯', color: 'purple' },
  { value: 'family', label: 'Family', icon: '👨‍👩‍👧', color: 'blue' },
  { value: 'shopping', label: 'Shopping', icon: '🛒', color: 'pink' },
  { value: 'insurance', label: 'Insurance', icon: '🛡️', color: 'indigo' },
  { value: 'legal', label: 'Legal', icon: '⚖️', color: 'gray' },
  { value: 'healthcare', label: 'Healthcare', icon: '❤️', color: 'red' },
  { value: 'utilities', label: 'Utilities', icon: '⚡', color: 'orange' },
  { value: 'subscriptions', label: 'Subscriptions', icon: '📱', color: 'violet' },
  { value: 'other', label: 'Other', icon: '📧', color: 'gray' },
];

export default function FamilyEmail() {
  const router = useRouter();
  const [emails, setEmails] = useState<FamilyEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showSharedOnly, setShowSharedOnly] = useState(false);
  const [showActionRequired, setShowActionRequired] = useState(false);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    loadEmails();
  }, [selectedCategory, showSharedOnly, showActionRequired]);

  const loadEmails = async () => {
    try {
      setLoading(true);
      let url = '/api/family/emails?limit=100';
      if (selectedCategory) url += `&category=${selectedCategory}`;
      if (showSharedOnly) url += '&is_shared=true';
      if (showActionRequired) url += '&action_required=true';

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setEmails(data.emails || []);
        setCategoryCounts(data.categoryCounts || {});
      }
    } catch (error) {
      console.error('Failed to load emails:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchAndCategorize = async () => {
    try {
      setIsFetching(true);
      const response = await fetch('/api/family/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fetch_and_categorize' }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`Successfully categorized ${data.categorized} new emails!`);
        loadEmails();
      } else {
        alert(`Error: ${data.error || 'Failed to fetch emails'}`);
      }
    } catch (error) {
      console.error('Failed to fetch emails:', error);
      alert('Failed to fetch and categorize emails');
    } finally {
      setIsFetching(false);
    }
  };

  const handleShareEmail = async (emailId: string) => {
    try {
      const response = await fetch('/api/family/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'share', emailId }),
      });

      if (response.ok) {
        loadEmails();
        alert('Email shared successfully!');
      }
    } catch (error) {
      console.error('Failed to share email:', error);
      alert('Failed to share email');
    }
  };

  const getCategoryInfo = (categoryValue: string) => {
    return EMAIL_CATEGORIES.find((c) => c.value === categoryValue) || EMAIL_CATEGORIES[EMAIL_CATEGORIES.length - 1];
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-400';
      case 'high':
        return 'text-orange-400';
      case 'normal':
        return 'text-gray-400';
      case 'low':
        return 'text-gray-500';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Family Email Management</h1>
            <p className="text-gray-400">
              Categorized and shared emails relevant to the family
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              icon="🏠"
              variant="secondary"
              onClick={() => router.push('/family')}
            >
              Back to Dashboard
            </Button>
            <Button
              icon="🔄"
              onClick={handleFetchAndCategorize}
              disabled={isFetching}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {isFetching ? 'Fetching...' : 'Fetch & Categorize'}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => setShowSharedOnly(!showSharedOnly)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                showSharedOnly
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              🔗 Shared Only
            </button>
            <button
              onClick={() => setShowActionRequired(!showActionRequired)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                showActionRequired
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              ⚠️ Action Required
            </button>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === null
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              All Categories
            </button>
            {EMAIL_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === cat.value
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {cat.icon} {cat.label} {categoryCounts[cat.value] ? `(${categoryCounts[cat.value]})` : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Email List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        ) : emails.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-12 text-center">
            <span className="text-6xl mb-4 block">📧</span>
            <h3 className="text-xl font-semibold text-white mb-2">No emails found</h3>
            <p className="text-gray-400 mb-4">
              Click "Fetch & Categorize" to load and organize your family emails
            </p>
            <Button icon="🔄" onClick={handleFetchAndCategorize} disabled={isFetching}>
              {isFetching ? 'Fetching...' : 'Fetch Emails'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-gray-400 mb-2">
              Showing {emails.length} email(s)
            </div>
            {emails.map((email) => {
              const catInfo = getCategoryInfo(email.category);
              return (
                <div
                  key={email.id}
                  className="bg-gray-900 border border-gray-800 rounded-lg p-5 hover:border-gray-700 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-2xl">{catInfo.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded ${
                              email.user_email.includes('zach')
                                ? 'bg-purple-900 text-purple-300'
                                : 'bg-pink-900 text-pink-300'
                            }`}
                          >
                            {email.user_email.includes('zach') ? 'zach' : 'rebecca'}
                          </span>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded bg-gray-800 text-gray-300`}>
                            {catInfo.label}
                          </span>
                          {email.is_shared && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-900 text-blue-300">
                              🔗 Shared
                            </span>
                          )}
                          {email.action_required && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded bg-red-900 text-red-300">
                              ⚠️ Action Required
                            </span>
                          )}
                          {email.has_attachments && (
                            <span className="text-xs text-gray-400">
                              📎 {email.attachment_count}
                            </span>
                          )}
                        </div>
                        <h3 className="text-white font-medium mb-1 truncate">{email.subject}</h3>
                        <div className="text-sm text-gray-400 mb-1 truncate">
                          From: {email.from_email}
                        </div>
                        <p className="text-sm text-gray-500 line-clamp-2">{email.snippet}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 ml-4">
                      <span className={`text-xs font-medium ${getPriorityColor(email.priority)}`}>
                        {email.priority}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(email.received_date).toLocaleDateString()}
                      </span>
                      {!email.is_shared && (
                        <Button
                          size="sm"
                          onClick={() => handleShareEmail(email.id)}
                          className="text-xs"
                        >
                          Share
                        </Button>
                      )}
                    </div>
                  </div>

                  {email.action_items.length > 0 && (
                    <div className="mt-3 p-3 bg-gray-800 rounded-lg">
                      <div className="text-sm font-medium text-white mb-2">Action Items:</div>
                      <ul className="space-y-1">
                        {email.action_items.map((item, index) => (
                          <li key={index} className="text-sm text-gray-300 flex items-start gap-2">
                            <span className="text-orange-400">•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {email.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {email.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 text-xs bg-gray-800 text-gray-400 rounded"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Category Overview */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Email Categories Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {EMAIL_CATEGORIES.map((cat) => {
              const count = categoryCounts[cat.value] || 0;
              return (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className="p-4 bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-lg transition-colors text-left"
                >
                  <div className="text-2xl mb-2">{cat.icon}</div>
                  <div className="text-white font-medium text-sm mb-1">{cat.label}</div>
                  <div className="text-gray-400 text-xs">{count} emails</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
