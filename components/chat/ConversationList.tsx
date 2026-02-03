/**
 * Conversation List Component
 *
 * Displays list of conversations with ability to switch between them
 */

'use client';

import { ChatBubbleLeftRightIcon, PlusIcon } from '@heroicons/react/24/outline';

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
}

export default function ConversationList({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
}: ConversationListProps) {
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
              const date = new Date(conv.updated_at);
              const timeAgo = getTimeAgo(date);

              return (
                <button
                  key={conv.id}
                  onClick={() => onSelectConversation(conv.id)}
                  className={`
                    w-full text-left px-3 py-3 rounded-lg transition-all
                    ${
                      isActive
                        ? 'bg-blue-600/20 border border-blue-500/50'
                        : 'hover:bg-gray-800/50 border border-transparent'
                    }
                  `}
                >
                  <div className="flex items-start gap-2">
                    <ChatBubbleLeftRightIcon
                      className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                        isActive ? 'text-blue-400' : 'text-gray-400'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div
                        className={`font-medium truncate ${
                          isActive ? 'text-white' : 'text-gray-300'
                        }`}
                      >
                        {conv.title || 'Untitled Chat'}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {timeAgo}
                      </div>
                    </div>
                  </div>
                </button>
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
