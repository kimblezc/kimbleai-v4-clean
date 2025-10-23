'use client';

import versionData from '@/version.json';

// Git commit hash is injected at build time via next.config.js
const GIT_COMMIT_HASH = process.env.NEXT_PUBLIC_GIT_COMMIT_HASH || 'dev';

export function VersionIndicator() {
  return (
    <div
      className="fixed bottom-16 md:bottom-2 right-2 px-2 py-1 rounded text-[10px] font-mono pointer-events-none select-none z-[9999] bg-gray-900/80 backdrop-blur-sm border border-gray-700/50"
      title={`Version ${versionData.version} (${GIT_COMMIT_HASH}) - Last updated: ${versionData.lastUpdated}`}
    >
      <span className="text-gray-300">
        v{versionData.version} <span className="text-gray-500">({GIT_COMMIT_HASH})</span>
      </span>
    </div>
  );
}
