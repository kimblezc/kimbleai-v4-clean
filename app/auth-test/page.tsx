'use client';

import { signIn, signOut, useSession } from 'next-auth/react';

export default function AuthTest() {
  const { data: session, status } = useSession();

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>Auth Test Page</h1>

      <div style={{ marginBottom: '20px' }}>
        <strong>Status:</strong> {status}
      </div>

      {status === 'loading' && (
        <div>Loading authentication...</div>
      )}

      {status === 'unauthenticated' && (
        <button
          onClick={() => signIn('google')}
          style={{
            padding: '12px 20px',
            backgroundColor: '#4285f4',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          🔗 Sign in with Google
        </button>
      )}

      {status === 'authenticated' && session && (
        <div>
          <div style={{ marginBottom: '10px' }}>
            ✅ Signed in as: <strong>{session.user?.email}</strong>
          </div>
          <button
            onClick={() => signOut()}
            style={{
              padding: '8px 16px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}