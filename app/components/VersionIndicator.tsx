'use client';

import versionData from '@/version.json';

export function VersionIndicator() {
  return (
    <div
      className="fixed bottom-2 right-2 text-[10px] text-gray-500/30 font-mono pointer-events-none select-none z-50"
      title={`Version ${versionData.version} - Last updated: ${versionData.lastUpdated}`}
    >
      v{versionData.version}
    </div>
  );
}
