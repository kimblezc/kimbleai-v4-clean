'use client';

import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Suspense } from 'react';

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams?.get('error');

  const getErrorDetails = (errorType: string | null) => {
    switch (errorType) {
      case 'AccessDenied':
        return {
          title: 'Access Denied',
          message: 'Your email address is not authorized to access KimbleAI.',
          details: 'Only the following email addresses are permitted: zach.kimble@gmail.com and becky.aza.kimble@gmail.com',
          canRetry: true
        };
      case 'Configuration':
        return {
          title: 'Configuration Error',
          message: 'There is a problem with the server configuration.',
          details: 'Please contact the administrator.',
          canRetry: false
        };
      case 'Verification':
        return {
          title: 'Verification Error',
          message: 'The verification link is invalid or has expired.',
          details: 'Please request a new verification link.',
          canRetry: true
        };
      default:
        return {
          title: 'Authentication Error',
          message: 'An error occurred during authentication.',
          details: 'Please try signing in again.',
          canRetry: true
        };
    }
  };

  const errorDetails = getErrorDetails(error);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0f0f0f',
      color: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      <div style={{
        maxWidth: '500px',
        width: '100%',
        padding: '40px',
        backgroundColor: '#171717',
        borderRadius: '12px',
        border: '1px solid #333',
        textAlign: 'center'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          margin: '0 auto 24px',
          backgroundColor: '#2a1a1a',
          border: '2px solid #ef4444',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '40px'
        }}>
          🔒
        </div>

        <h1 style={{
          fontSize: '24px',
          fontWeight: '700',
          marginBottom: '12px',
          color: '#ef4444'
        }}>
          {errorDetails.title}
        </h1>

        <p style={{
          fontSize: '16px',
          color: '#ccc',
          marginBottom: '8px'
        }}>
          {errorDetails.message}
        </p>

        <p style={{
          fontSize: '14px',
          color: '#888',
          marginBottom: '32px',
          lineHeight: '1.6'
        }}>
          {errorDetails.details}
        </p>

        {error === 'AccessDenied' && (
          <div style={{
            padding: '16px',
            backgroundColor: '#1a1a1a',
            border: '1px solid #444',
            borderRadius: '8px',
            marginBottom: '24px',
            fontSize: '13px',
            color: '#aaa',
            lineHeight: '1.6',
            textAlign: 'left'
          }}>
            <div style={{ marginBottom: '12px', fontWeight: '600', color: '#fff' }}>
              Security Notice
            </div>
            <div>
              This authentication attempt has been logged for security purposes.
              KimbleAI is a private application with strict access controls.
            </div>
            <div style={{ marginTop: '12px', fontSize: '12px', color: '#666' }}>
              If you believe you should have access, please contact the administrator at zach.kimble@gmail.com
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          {errorDetails.canRetry && (
            <button
              onClick={() => signIn('google')}
              style={{
                padding: '12px 24px',
                backgroundColor: '#4a9eff',
                border: 'none',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#3a8eef';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#4a9eff';
              }}
            >
              Try Again
            </button>
          )}

          <button
            onClick={() => window.location.href = '/'}
            style={{
              padding: '12px 24px',
              backgroundColor: '#2a2a2a',
              border: '1px solid #444',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#333';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#2a2a2a';
            }}
          >
            Go Home
          </button>
        </div>

        <div style={{
          marginTop: '32px',
          padding: '12px',
          backgroundColor: '#0a0a0a',
          border: '1px solid #333',
          borderRadius: '8px',
          fontSize: '11px',
          color: '#666',
          lineHeight: '1.5'
        }}>
          Error Code: {error || 'UNKNOWN'} | Timestamp: {new Date().toISOString()}
        </div>
      </div>
    </div>
  );
}

export default function AuthError() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f0f0f', color: '#ffffff' }}>Loading...</div>}>
      <ErrorContent />
    </Suspense>
  );
}
