/**
 * Conversation List Component
 *
 * Displays list of conversations with ability to switch between them
 * Features: Create, Edit, Delete conversations
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
} from '@heroicons/react/24/outline';

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
  onRenameConversation?: (id: string, newTitle: string) => void;
}

export default function ConversationList({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
}: ConversationListProps) {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

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

  return (
    <div className="flex flex-col h-full">
      {/* New Chat Button */}
      <div className="p-4 border-b border-gray-700">
        <button
          onClick={onNewConversation}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
        >
          <PlusIcon className="w-5 h-5" />
          New Chat
        </button>
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
              const date = new Date(conv.updated_at);
              const timeAgo = getTimeAgo(date);

              return (
                <div
                  key={conv.id}
                  className={`
                    relative group w-full text-left px-3 py-3 rounded-lg transition-all
                    ${
                      isActive
                        ? 'bg-blue-600/20 border border-blue-500/50'
                        : 'hover:bg-gray-800/50 border border-transparent'
                    }
                  `}
                >
                  <div
                    onClick={() => !isEditing && onSelectConversation(conv.id)}
                    className="flex items-start gap-2 cursor-pointer"
                  >
                    <ChatBubbleLeftRightIcon
                      className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                        isActive ? 'text-blue-400' : 'text-gray-400'
                      }`}
                    />
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

                    {/* Menu Button */}
                    {!isEditing && (onDeleteConversation || onRenameConversation) && (
                      <button
                        onClick={(e) => handleMenuToggle(e, conv.id)}
                        className="absolute right-2 top-3 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-700 transition-opacity"
                      >
                        <EllipsisVerticalIcon className="w-4 h-4 text-gray-400" />
                      </button>
                    )}
                  </div>

                  {/* Dropdown Menu */}
                  {isMenuOpen && (
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
