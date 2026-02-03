/**
 * Session Fix Page
 *
 * Automatically signs user out and redirects to signin
 * This clears old JWT tokens with numeric Google IDs
 */

'use client';

import { useEffect } from 'react';
import { signOut } from 'next-auth/react';

export default function FixSessionPage() {
  useEffect(() => {
    // Automatically sign out to clear old token
    signOut({ callbackUrl: '/api/auth/signin' });
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-blue-950/20 to-gray-900">
      <div className="text-center">
        <div className="inline-block animate-spin-slow mb-4">
          <svg className="w-12 h-12 text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Fixing Your Session...</h1>
        <p className="text-gray-400">Signing you out to clear old token</p>
        <p className="text-sm text-gray-500 mt-2">You'll be redirected to sign in again</p>
      </div>
    </div>
  );
}
