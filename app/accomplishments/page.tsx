'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Accomplishments page now redirects to /agent
 * Both pages are consolidated into Archie's Dashboard
 */
export default function AccomplishmentsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to consolidated dashboard
    router.replace('/agent');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4 animate-bounce">🦉</div>
        <p className="text-gray-400">Redirecting to Archie's Dashboard...</p>
      </div>
    </div>
  );
}
