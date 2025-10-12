'use client';

import { useState, useEffect } from 'react';
import { signOut, useSession } from 'next-auth/react';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: string;
  onUserChange?: (user: string) => void;
  projects?: Array<{ id: string; name: string; conversations: number }>;
  currentProject?: string;
  onProjectChange?: (projectId: string) => void;
}

export function MobileMenu({
  isOpen,
  onClose,
  currentUser,
  onUserChange,
  projects = [],
  currentProject,
  onProjectChange,
}: MobileMenuProps) {
  const { data: session } = useSession();
  const [showProjects, setShowProjects] = useState(false);

  // Close menu when clicking outside
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <div className="sidebar fixed inset-y-0 left-0 w-80 bg-gray-900 z-50 overflow-y-auto transform transition-transform duration-300 md:hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <h2 className="text-xl font-bold text-white">KimbleAI</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-2 -mr-2"
              aria-label="Close menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* User Info */}
          {session && (
            <div className="p-4 border-b border-gray-800">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {session.user?.name?.charAt(0) || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{session.user?.name}</p>
                  <p className="text-xs text-gray-400 truncate">{session.user?.email}</p>
                </div>
              </div>

              {/* User Switcher */}
              {currentUser && onUserChange && (
                <div className="flex gap-2">
                  <button
                    onClick={() => onUserChange('zach')}
                    className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
                      currentUser === 'zach'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    Zach
                  </button>
                  <button
                    onClick={() => onUserChange('rebecca')}
                    className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
                      currentUser === 'rebecca'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    Rebecca
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Projects */}
          {projects && projects.length > 0 && (
            <div className="flex-1 overflow-y-auto p-4">
              <button
                onClick={() => setShowProjects(!showProjects)}
                className="flex items-center justify-between w-full mb-2 text-sm font-semibold text-gray-300"
              >
                <span>Projects ({projects.length})</span>
                <svg
                  className={`w-4 h-4 transition-transform ${showProjects ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {showProjects && (
                <div className="space-y-1">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => {
                        onProjectChange?.(project.id);
                        onClose();
                      }}
                      className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                        currentProject === project.id
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-400 hover:bg-gray-800'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="truncate">{project.name}</span>
                        {project.conversations > 0 && (
                          <span className="text-xs opacity-75 ml-2">{project.conversations}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Menu Items */}
          <div className="p-4 space-y-2">
            <MenuItem icon={SettingsIcon} label="Settings" onClick={onClose} />
            <MenuItem icon={HelpIcon} label="Help & Support" onClick={onClose} />
            <MenuItem icon={InfoIcon} label="About KimbleAI" onClick={onClose} />
          </div>

          {/* Sign Out */}
          {session && (
            <div className="p-4 border-t border-gray-800">
              <button
                onClick={() => signOut()}
                className="w-full flex items-center gap-3 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Menu Item Component
function MenuItem({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
    >
      <Icon className="w-5 h-5" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

// Icons
function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function HelpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
