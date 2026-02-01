/**
 * Sidebar Navigation Component
 *
 * D&D-themed sidebar with navigation and user info
 */

'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  ChatBubbleLeftRightIcon,
  FolderIcon,
  DocumentIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import D20Icon from '@/components/ui/D20Icon';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const navigation: NavItem[] = [
  {
    name: 'Chat',
    href: '/',
    icon: ChatBubbleLeftRightIcon,
    description: 'Multimodal AI conversations',
  },
  {
    name: 'Projects',
    href: '/projects',
    icon: FolderIcon,
    description: 'Manage your quests',
  },
  {
    name: 'Files',
    href: '/files',
    icon: DocumentIcon,
    description: 'Your knowledge library',
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: ChartBarIcon,
    description: 'Track your usage & costs',
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Cog6ToothIcon,
    description: 'Configure your experience',
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gray-800/90 backdrop-blur-sm rounded-lg border border-gray-700 text-gray-300 hover:text-white"
      >
        {isMobileOpen ? (
          <XMarkIcon className="w-6 h-6" />
        ) : (
          <Bars3Icon className="w-6 h-6" />
        )}
      </button>

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-screen
          w-72 bg-gray-900/95 backdrop-blur-xl border-r border-gray-800
          transform transition-transform duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-gray-800">
            <Link href="/" className="flex items-center gap-3 group">
              <D20Icon size="md" className="group-hover:scale-110 transition-transform" />
              <div>
                <h1 className="text-xl font-bold text-gradient">KimbleAI</h1>
                <p className="text-xs text-gray-400">D&D AI Assistant</p>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto scrollbar-thin">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={`
                    group flex items-center gap-3 px-4 py-3 rounded-lg
                    transition-all duration-200
                    ${
                      isActive
                        ? 'bg-gradient-to-r from-purple-600/20 to-pink-600/20 text-white border border-purple-500/50 shadow-arcane'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                    }
                  `}
                >
                  <Icon
                    className={`
                      w-5 h-5 transition-transform group-hover:scale-110
                      ${isActive ? 'text-purple-400' : ''}
                    `}
                  />
                  <div className="flex-1">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-gray-500 group-hover:text-gray-400">
                      {item.description}
                    </div>
                  </div>
                  {isActive && (
                    <div className="w-1.5 h-8 bg-gradient-arcane rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Section */}
          {session?.user && (
            <div className="p-4 border-t border-gray-800">
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-800/50">
                <div className="w-10 h-10 rounded-full bg-gradient-arcane flex items-center justify-center text-white font-bold">
                  {session.user.name?.[0] || session.user.email?.[0] || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">
                    {session.user.name || 'Adventurer'}
                  </div>
                  <div className="text-xs text-gray-400 truncate">
                    {session.user.email}
                  </div>
                </div>
              </div>

              <button
                onClick={() => signOut()}
                className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeftOnRectangleIcon className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}

          {/* Footer */}
          <div className="p-4 border-t border-gray-800">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>v5.0.0</span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
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
