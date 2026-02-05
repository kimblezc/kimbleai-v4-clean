/**
 * Version Footer Component
 *
 * Displays version and commit information on every page
 * Fetches from /api/version endpoint
 */

'use client';

import { useEffect, useState } from 'react';

export default function VersionFooter() {
  const [version, setVersion] = useState(process.env.NEXT_PUBLIC_APP_VERSION || '11.4.0');
  const [commit, setCommit] = useState<string | null>(null);

  useEffect(() => {
    // Fetch version info from API
    fetch('/api/version', {
      cache: 'no-store', // Prevent caching
      headers: {
        'Cache-Control': 'no-cache'
      }
    })
      .then(res => res.json())
      .then(data => {
        console.log('[VersionFooter] Fetched version data:', data);
        setVersion(data.version);
        setCommit(data.commit);
      })
      .catch(err => {
        console.error('[VersionFooter] Failed to fetch version:', err);
        setCommit('error');
      });
  }, []);

  return (
    <div className="fixed bottom-2 right-2 z-50">
      <div className="text-xs text-neutral-500 font-mono bg-neutral-900/80 px-2 py-1 rounded border border-neutral-800">
        v{version}{commit ? ` @ ${commit}` : ''}
      </div>
    </div>
  );
}
