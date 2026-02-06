/**
 * Conversation List Component
 *
 * Displays list of conversations with ability to switch between them
 * Features: Create, Edit, Delete conversations, Multi-select delete
 */

'use client';

import { useState } from 'react';
import {
  ChatBubbleLeftRightIcon,
  PlusIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation?: (id: string) => void;
  onDeleteMultipleConversations?: (ids: string[]) => void;
  onRenameConversation?: (id: string, newTitle: string) => void;
}

export default function ConversationList({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onDeleteMultipleConversations,
  onRenameConversation,
}: ConversationListProps) {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleMenuToggle = (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    setMenuOpenId(menuOpenId === convId ? null : convId);
  };

  const handleRenameStart = (e: React.MouseEvent, conv: Conversation) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title || 'Untitled Chat');
    setMenuOpenId(null);
  };

  const handleRenameSave = async (convId: string) => {
    if (onRenameConversation && editTitle.trim()) {
      await onRenameConversation(convId, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle('');
  };

  const handleRenameCancel = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const handleDelete = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    setMenuOpenId(null);
    if (onDeleteConversation) {
      if (confirm('Are you sure you want to delete this conversation? This cannot be undone.')) {
        await onDeleteConversation(convId);
      }
    }
  };

  // Multi-select handlers
  const toggleSelectMode = () => {
    setSelectMode(!selectMode);
    setSelectedIds(new Set());
    setMenuOpenId(null);
  };

  const toggleSelection = (convId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(convId)) {
      newSelected.delete(convId);
    } else {
      newSelected.add(convId);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === conversations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(conversations.map(c => c.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;

    const count = selectedIds.size;
    if (confirm(`Are you sure you want to delete ${count} conversation${count > 1 ? 's' : ''}? This cannot be undone.`)) {
      if (onDeleteMultipleConversations) {
        await onDeleteMultipleConversations(Array.from(selectedIds));
      } else if (onDeleteConversation) {
        // Fallback: delete one by one
        for (const id of selectedIds) {
          await onDeleteConversation(id);
        }
      }
      setSelectedIds(new Set());
      setSelectMode(false);
    }
  };

  const allSelected = conversations.length > 0 && selectedIds.size === conversations.length;

  return (
    <div className="flex flex-col h-full">
      {/* Header with New Chat / Select Mode */}
      <div className="p-4 border-b border-gray-700">
        {selectMode ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">
                {selectedIds.size} selected
              </span>
              <button
                onClick={toggleSelectMode}
                className="text-sm text-gray-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
              >
                {allSelected ? 'Deselect All' : 'Select All'}
              </button>
              <button
                onClick={handleDeleteSelected}
                disabled={selectedIds.size === 0}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                  selectedIds.size === 0
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                <TrashIcon className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={onNewConversation}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            >
              <PlusIcon className="w-5 h-5" />
              New Chat
            </button>
            {conversations.length > 0 && (onDeleteConversation || onDeleteMultipleConversations) && (
              <button
                onClick={toggleSelectMode}
                className="px-3 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                title="Select multiple chats"
              >
                <CheckCircleIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No conversations yet. Start a new chat!
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {conversations.map((conv) => {
              const isActive = conv.id === activeConversationId;
              const isEditing = editingId === conv.id;
              const isMenuOpen = menuOpenId === conv.id;
              const isSelected = selectedIds.has(conv.id);
              const date = new Date(conv.updated_at);
              const timeAgo = getTimeAgo(date);

              return (
                <div
                  key={conv.id}
                  className={`
                    relative group w-full text-left px-3 py-3 rounded-lg transition-all
                    ${
                      selectMode && isSelected
                        ? 'bg-blue-600/30 border border-blue-500/50'
                        : isActive
                        ? 'bg-blue-600/20 border border-blue-500/50'
                        : 'hover:bg-gray-800/50 border border-transparent'
                    }
                  `}
                >
                  <div
                    onClick={() => {
                      if (selectMode) {
                        toggleSelection(conv.id);
                      } else if (!isEditing) {
                        onSelectConversation(conv.id);
                      }
                    }}
                    className="flex items-start gap-2 cursor-pointer"
                  >
                    {/* Checkbox in select mode */}
                    {selectMode ? (
                      <div className="mt-0.5 flex-shrink-0">
                        {isSelected ? (
                          <CheckCircleSolidIcon className="w-5 h-5 text-blue-500" />
                        ) : (
                          <CheckCircleIcon className="w-5 h-5 text-gray-500" />
                        )}
                      </div>
                    ) : (
                      <ChatBubbleLeftRightIcon
                        className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                          isActive ? 'text-blue-400' : 'text-gray-400'
                        }`}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameSave(conv.id);
                              if (e.key === 'Escape') handleRenameCancel();
                            }}
                            autoFocus
                            className="flex-1 px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
                          />
                          <button
                            onClick={() => handleRenameSave(conv.id)}
                            className="p-1 text-green-400 hover:text-green-300"
                          >
                            <CheckIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleRenameCancel}
                            className="p-1 text-red-400 hover:text-red-300"
                          >
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div
                            className={`font-medium truncate pr-6 ${
                              isActive ? 'text-white' : 'text-gray-300'
                            }`}
                          >
                            {conv.title || 'Untitled Chat'}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {timeAgo}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Menu Button - only show when not in select mode */}
                    {!selectMode && !isEditing && (onDeleteConversation || onRenameConversation) && (
                      <button
                        onClick={(e) => handleMenuToggle(e, conv.id)}
                        className="absolute right-2 top-3 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-700 transition-opacity"
                      >
                        <EllipsisVerticalIcon className="w-4 h-4 text-gray-400" />
                      </button>
                    )}
                  </div>

                  {/* Dropdown Menu */}
                  {isMenuOpen && !selectMode && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setMenuOpenId(null)}
                      />
                      <div className="absolute right-2 top-10 z-20 w-36 bg-gray-800 border border-gray-700 rounded-lg shadow-lg py-1">
                        {onRenameConversation && (
                          <button
                            onClick={(e) => handleRenameStart(e, conv)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                          >
                            <PencilIcon className="w-4 h-4" />
                            Rename
                          </button>
                        )}
                        {onDeleteConversation && (
                          <button
                            onClick={(e) => handleDelete(e, conv.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-gray-700 hover:text-red-300"
                          >
                            <TrashIcon className="w-4 h-4" />
                            Delete
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}
