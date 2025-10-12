import { redirect } from 'next/navigation';

export default function SignInPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string; error?: string };
}) {
  const callbackUrl = searchParams?.callbackUrl || '/';
  const error = searchParams?.error;

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
        maxWidth: '400px',
        width: '100%',
        padding: '40px',
        backgroundColor: '#171717',
        borderRadius: '12px',
        border: '1px solid #333',
        textAlign: 'center'
      }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '700',
            marginBottom: '8px',
            background: 'linear-gradient(135deg, #4a9eff 0%, #00d4aa 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            KimbleAI
          </h1>
          <p style={{
            fontSize: '14px',
            color: '#888',
            margin: 0
          }}>
            Secure Access Required
          </p>
        </div>

        {error && (
          <div style={{
            padding: '12px',
            backgroundColor: '#2a1a1a',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            marginBottom: '24px',
            fontSize: '13px',
            color: '#ef4444'
          }}>
            {error === 'AccessDenied' && 'Access denied. Your email is not authorized.'}
            {error === 'OAuthSignin' && 'Error occurred during sign in.'}
            {error === 'OAuthCallback' && 'Error occurred during authentication.'}
            {error === 'OAuthCreateAccount' && 'Could not create account.'}
            {error === 'EmailCreateAccount' && 'Could not create email account.'}
            {error === 'Callback' && 'Authentication callback error.'}
            {error === 'OAuthAccountNotLinked' && 'Account already linked to another provider.'}
            {error === 'EmailSignin' && 'Check your email for sign in link.'}
            {error === 'CredentialsSignin' && 'Invalid credentials.'}
            {error === 'SessionRequired' && 'Please sign in to continue.'}
            {!['AccessDenied', 'OAuthSignin', 'OAuthCallback', 'OAuthCreateAccount', 'EmailCreateAccount', 'Callback', 'OAuthAccountNotLinked', 'EmailSignin', 'CredentialsSignin', 'SessionRequired'].includes(error) && 'An authentication error occurred.'}
          </div>
        )}

        <div style={{ marginBottom: '24px' }}>
          <div style={{
            padding: '16px',
            backgroundColor: '#1a1a1a',
            border: '1px solid #444',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#aaa',
            lineHeight: '1.6',
            textAlign: 'left'
          }}>
            <div style={{ marginBottom: '8px', fontWeight: '600', color: '#fff' }}>
              Authorized Users Only
            </div>
            <div>
              This application is restricted to authorized email addresses.
              Only Zach and Rebecca can access KimbleAI.
            </div>
          </div>
        </div>

        <a
          href={`/api/auth/signin/google?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          style={{
            width: '100%',
            padding: '14px',
            backgroundColor: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            color: '#1f1f1f',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            transition: 'transform 0.2s, box-shadow 0.2s',
            textDecoration: 'none'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign in with Google
        </a>

        <div style={{
          marginTop: '24px',
          padding: '12px',
          backgroundColor: '#0a0a0a',
          border: '1px solid #333',
          borderRadius: '8px',
          fontSize: '11px',
          color: '#666',
          lineHeight: '1.5'
        }}>
          Secured by NextAuth.js with strict email whitelisting.
          All authentication attempts are logged and monitored.
        </div>
      </div>
    </div>
  );
}
