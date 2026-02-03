/**
 * Version Footer Component
 *
 * Displays version and commit information on every page
 */

'use client';

export default function VersionFooter() {
  const version = process.env.NEXT_PUBLIC_APP_VERSION || '11.1.1';
  const commit = 'f266cd8'; // This would be dynamically set from version.json in production

  return (
    <div className="fixed bottom-2 right-2 z-50">
      <div className="text-xs text-gray-500 dark:text-gray-600 font-mono bg-gray-900/50 px-2 py-1 rounded">
        v{version} @ {commit}
      </div>
    </div>
  );
}
