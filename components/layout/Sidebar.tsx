/**
 * Unified Sidebar Component - ChatGPT Style
 *
 * Single sidebar with:
 * - New Chat button at top
 * - Projects section with expandable conversations
 * - Recent chats (unassigned to projects)
 * - User section at bottom
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  PlusIcon,
  ChatBubbleLeftRightIcon,
  FolderIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  EllipsisHorizontalIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

interface Conversation {
  id: string;
  title: string;
  project_id?: string | null;
  updated_at: string;
}

interface Project {
  id: string;
  name: string;
  conversation_count?: number;
}

interface SidebarProps {
  conversations?: Conversation[];
  activeConversationId?: string | null;
  onSelectConversation?: (id: string) => void;
  onNewConversation?: () => void;
  onDeleteConversation?: (id: string) => void;
  onRenameConversation?: (id: string, newTitle: string) => void;
}

export default function Sidebar({
  conversations = [],
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
}: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [versionInfo, setVersionInfo] = useState({ version: '', commit: '' });

  // Load projects
  useEffect(() => {
    if (session) {
      fetch('/api/projects')
        .then(res => res.json())
        .then(data => setProjects(data.projects || []))
        .catch(() => {});
    }
  }, [session]);

  // Load version
  useEffect(() => {
    fetch('/api/version', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => setVersionInfo({ version: data.version, commit: data.commit }))
      .catch(() => {});
  }, []);

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  // Group conversations by project
  const projectConversations = conversations.filter(c => c.project_id);
  const recentConversations = conversations.filter(c => !c.project_id);

  const getConversationsForProject = (projectId: string) => {
    return projectConversations.filter(c => c.project_id === projectId);
  };

  const handleRenameStart = (e: React.MouseEvent, conv: Conversation) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title || 'Untitled Chat');
    setMenuOpenId(null);
  };

  const handleRenameSave = (convId: string) => {
    if (onRenameConversation && editTitle.trim()) {
      onRenameConversation(convId, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle('');
  };

  const handleDelete = (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    setMenuOpenId(null);
    if (onDeleteConversation && confirm('Delete this conversation?')) {
      onDeleteConversation(convId);
    }
  };

  const ConversationItem = ({ conv }: { conv: Conversation }) => {
    const isActive = conv.id === activeConversationId;
    const isEditing = editingId === conv.id;
    const isMenuOpen = menuOpenId === conv.id;

    return (
      <div
        className={`
          group relative flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer
          ${isActive ? 'bg-neutral-700' : 'hover:bg-neutral-800'}
        `}
        onClick={() => !isEditing && onSelectConversation?.(conv.id)}
      >
        <ChatBubbleLeftRightIcon className="w-4 h-4 text-neutral-400 flex-shrink-0" />

        {isEditing ? (
          <div className="flex-1 flex items-center gap-1" onClick={e => e.stopPropagation()}>
            <input
              type="text"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleRenameSave(conv.id);
                if (e.key === 'Escape') setEditingId(null);
              }}
              autoFocus
              className="flex-1 px-2 py-1 text-sm bg-neutral-800 border border-neutral-600 rounded text-white focus:outline-none focus:border-neutral-500"
            />
            <button onClick={() => handleRenameSave(conv.id)} className="p-1 text-neutral-400 hover:text-white">
              <CheckIcon className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <span className={`flex-1 text-sm truncate ${isActive ? 'text-white' : 'text-neutral-300'}`}>
              {conv.title || 'Untitled Chat'}
            </span>

            <button
              onClick={e => { e.stopPropagation(); setMenuOpenId(isMenuOpen ? null : conv.id); }}
              className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-neutral-600"
            >
              <EllipsisHorizontalIcon className="w-4 h-4 text-neutral-400" />
            </button>
          </>
        )}

        {isMenuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)} />
            <div className="absolute right-0 top-8 z-20 w-32 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl py-1">
              <button
                onClick={e => handleRenameStart(e, conv)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-700"
              >
                <PencilIcon className="w-4 h-4" />
                Rename
              </button>
              <button
                onClick={e => handleDelete(e, conv.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-neutral-700"
              >
                <TrashIcon className="w-4 h-4" />
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-neutral-800 rounded-lg text-neutral-300 hover:text-white"
      >
        {isMobileOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-screen w-64
          bg-neutral-900 border-r border-neutral-800
          transform transition-transform duration-200
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header with New Chat */}
          <div className="p-3">
            <button
              onClick={() => { onNewConversation?.(); setIsMobileOpen(false); }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-neutral-100 text-black rounded-lg font-medium transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              New Chat
            </button>
          </div>

          {/* Main Navigation */}
          <div className="flex-1 overflow-y-auto px-3 pb-3">
            {/* Projects Section */}
            <div className="mb-4">
              <div className="flex items-center justify-between px-2 py-2">
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Projects</span>
                <Link
                  href="/projects"
                  className="text-xs text-neutral-500 hover:text-white"
                  onClick={() => setIsMobileOpen(false)}
                >
                  Manage
                </Link>
              </div>

              {projects.length === 0 ? (
                <div className="px-3 py-2 text-sm text-neutral-500">No projects yet</div>
              ) : (
                <div className="space-y-1">
                  {projects.map(project => {
                    const isExpanded = expandedProjects.has(project.id);
                    const projectConvs = getConversationsForProject(project.id);

                    return (
                      <div key={project.id}>
                        <button
                          onClick={() => toggleProject(project.id)}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-neutral-800 text-left"
                        >
                          {isExpanded ? (
                            <ChevronDownIcon className="w-4 h-4 text-neutral-400" />
                          ) : (
                            <ChevronRightIcon className="w-4 h-4 text-neutral-400" />
                          )}
                          <FolderIcon className="w-4 h-4 text-neutral-400" />
                          <span className="flex-1 text-sm text-neutral-300 truncate">{project.name}</span>
                          {projectConvs.length > 0 && (
                            <span className="text-xs text-neutral-500">{projectConvs.length}</span>
                          )}
                        </button>

                        {isExpanded && (
                          <div className="ml-6 mt-1 space-y-1">
                            {projectConvs.length === 0 ? (
                              <div className="px-3 py-2 text-xs text-neutral-500">No chats</div>
                            ) : (
                              projectConvs.map(conv => (
                                <ConversationItem key={conv.id} conv={conv} />
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent Chats Section */}
            <div>
              <div className="px-2 py-2">
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Recent</span>
              </div>

              {recentConversations.length === 0 ? (
                <div className="px-3 py-2 text-sm text-neutral-500">No recent chats</div>
              ) : (
                <div className="space-y-1">
                  {recentConversations.slice(0, 20).map(conv => (
                    <ConversationItem key={conv.id} conv={conv} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Section */}
          <div className="border-t border-neutral-800 p-3 space-y-2">
            {/* Settings Link */}
            <Link
              href="/settings"
              onClick={() => setIsMobileOpen(false)}
              className={`
                flex items-center gap-3 px-3 py-2 rounded-lg
                ${pathname === '/settings' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}
              `}
            >
              <Cog6ToothIcon className="w-5 h-5" />
              <span className="text-sm">Settings</span>
            </Link>

            {/* User Section */}
            {session?.user && (
              <div className="flex items-center gap-3 px-3 py-2">
                <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center text-white text-sm font-medium">
                  {session.user.name?.[0] || session.user.email?.[0] || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{session.user.name || 'User'}</div>
                  <div className="text-xs text-neutral-500 truncate">{session.user.email}</div>
                </div>
                <button
                  onClick={() => signOut()}
                  className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg"
                  title="Sign out"
                >
                  <ArrowLeftOnRectangleIcon className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Version */}
            <div className="flex items-center justify-between px-3 text-xs text-neutral-600">
              <span>v{versionInfo.version}</span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                Online
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  );
}
