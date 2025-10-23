'use client';

export function VersionIndicator() {
  // Use Vercel's git commit SHA if available, otherwise show "dev"
  const version = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'dev';

  return (
    <div
      className="fixed bottom-2 right-2 text-[10px] text-gray-500/30 font-mono pointer-events-none select-none z-50"
      title={`Build version: ${version}`}
    >
      v{version}
    </div>
  );
}
