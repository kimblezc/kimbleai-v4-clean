'use client';

import React from 'react';
import Link from 'next/link';

export function DashboardHeader() {
  return (
    <div className="relative">
      {/* Back to Home */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-8"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Chat
      </Link>

      {/* Header Content */}
      <div className="text-center mb-12">
        {/* Archie Icon */}
        <div className="inline-block mb-6 relative">
          <div className="text-8xl filter drop-shadow-2xl">
            🦉
          </div>
          <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-4 border-black animate-pulse" />
        </div>

        {/* Title */}
        <h1 className="text-5xl font-bold mb-4">
          <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Archie Dashboard
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          Your AI assistant managing transcriptions, device sync, drive intelligence, and more
        </p>

        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 mt-6 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-full">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-green-400">All Systems Operational</span>
        </div>
      </div>
    </div>
  );
}
