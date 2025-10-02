'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: '📊' },
    { name: 'Projects', href: '/projects', icon: '📋' },
    { name: 'Files', href: '/files', icon: '📁' },
    { name: 'Chat', href: '/', icon: '💬' },
    { name: 'Search', href: '/search', icon: '🔍' },
    { name: 'Integrations', href: '/integrations', icon: '🔗' },
  ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname?.startsWith(href);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-gray-900 border-r border-gray-800
          transform transition-transform duration-200 ease-in-out z-50
          lg:transform-none lg:z-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-6 border-b border-gray-800">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="text-2xl">🤖</span>
              <span className="text-xl font-bold text-white">KimbleAI</span>
            </Link>
            <button
              onClick={onClose}
              className="lg:hidden text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg
                    transition-all duration-200
                    ${
                      isActive(item.href)
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }
                  `}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="font-medium">{item.name}</span>
                </Link>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="mt-8">
              <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase mb-3">
                Quick Actions
              </h3>
              <div className="space-y-1">
                <Link
                  href="/projects/new"
                  onClick={onClose}
                  className="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-all"
                >
                  <span>➕</span>
                  <span className="text-sm">New Project</span>
                </Link>
                <Link
                  href="/files/upload"
                  onClick={onClose}
                  className="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-all"
                >
                  <span>⬆️</span>
                  <span className="text-sm">Upload File</span>
                </Link>
                <Link
                  href="/"
                  onClick={onClose}
                  className="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-all"
                >
                  <span>💬</span>
                  <span className="text-sm">New Chat</span>
                </Link>
              </div>
            </div>
          </nav>

          {/* User Info */}
          <div className="p-4 border-t border-gray-800">
            <div className="flex items-center gap-3 px-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-medium">Z</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  Zach Kimble
                </p>
                <p className="text-xs text-gray-400 truncate">Admin</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
