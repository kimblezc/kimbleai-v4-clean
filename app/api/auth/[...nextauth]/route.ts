import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// SECURITY: Email whitelist - ONLY these emails can access the application
const AUTHORIZED_EMAILS = [
  'zach.kimble@gmail.com',
  'becky.aza.kimble@gmail.com'
];

// Security logging function
async function logAuthAttempt(
  email: string | null | undefined,
  success: boolean,
  reason?: string
) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    email: email || 'UNKNOWN',
    success,
    reason: reason || (success ? 'Authorized email' : 'Unauthorized email'),
    ip: 'server-side', // Will be enhanced with actual IP in middleware
  };

  // Log to console with clear formatting
  console.log('='.repeat(80));
  console.log('🔐 AUTHENTICATION ATTEMPT');
  console.log(`⏰ Time: ${timestamp}`);
  console.log(`📧 Email: ${logEntry.email}`);
  console.log(`${success ? '✅ SUCCESS' : '❌ DENIED'}: ${logEntry.reason}`);
  console.log('='.repeat(80));

  // Store in Supabase for audit trail
  try {
    await supabase.from('auth_logs').insert({
      timestamp,
      email: logEntry.email,
      success,
      reason: logEntry.reason,
      event_type: 'signin_attempt'
    });
  } catch (error) {
    console.error('Failed to log auth attempt to database:', error);
  }

  return logEntry;
}

const handler = NextAuth({
  debug: true,
  logger: {
    error(code, metadata) {
      console.error('NextAuth Error:', code, metadata);
    },
    warn(code) {
      console.warn('NextAuth Warning:', code);
    },
    debug(code, metadata) {
      console.log('NextAuth Debug:', code, metadata);
    }
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/drive.readonly',
            'https://www.googleapis.com/auth/drive.file',
            'https://www.googleapis.com/auth/calendar.readonly',
            'https://www.googleapis.com/auth/calendar.events'
          ].join(' '),
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    })
  ],
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // CRITICAL SECURITY: Validate email against whitelist
      const email = user.email?.toLowerCase();

      if (!email) {
        await logAuthAttempt(email, false, 'No email provided');
        return false;
      }

      // Check if email is in authorized list
      const isAuthorized = AUTHORIZED_EMAILS.some(
        authorizedEmail => authorizedEmail.toLowerCase() === email
      );

      if (!isAuthorized) {
        await logAuthAttempt(email, false, 'Email not in authorized whitelist');
        return '/auth/error?error=AccessDenied';
      }

      // Additional security: Verify account provider is Google
      if (account?.provider !== 'google') {
        await logAuthAttempt(email, false, 'Invalid OAuth provider');
        return false;
      }

      // Success - log authorized access
      await logAuthAttempt(email, true);

      return true;
    },
    async jwt({ token, account, profile, user }) {
      // Re-validate email on every token generation
      if (token.email) {
        const email = token.email.toLowerCase();
        const isAuthorized = AUTHORIZED_EMAILS.some(
          authorizedEmail => authorizedEmail.toLowerCase() === email
        );

        if (!isAuthorized) {
          console.error('🚨 SECURITY ALERT: Unauthorized token detected for:', email);
          throw new Error('Unauthorized access attempt detected');
        }
      }

      // Initial sign in - store tokens
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.idToken = account.id_token;
        token.expiresAt = account.expires_at;

        // Store tokens in Supabase with enhanced security
        if (token.email) {
          const userId = token.email === 'zach.kimble@gmail.com' ? 'zach' : 'rebecca';

          await supabase.from('user_tokens').upsert({
            user_id: userId,
            email: token.email,
            access_token: account.access_token,
            refresh_token: account.refresh_token,
            id_token: account.id_token,
            expires_at: account.expires_at,
            scope: account.scope,
            updated_at: new Date().toISOString(),
            last_verified: new Date().toISOString()
          });

          console.log(`✅ Token stored securely for user: ${userId}`);
        }
      }

      // Check if token needs refresh (expires in less than 5 minutes)
      const now = Date.now() / 1000;
      const expiresAt = token.expiresAt as number;

      if (expiresAt && now > expiresAt - 300 && token.refreshToken) {
        console.log('🔄 Refreshing expired Google token...');

        try {
          const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: process.env.GOOGLE_CLIENT_ID!,
              client_secret: process.env.GOOGLE_CLIENT_SECRET!,
              grant_type: 'refresh_token',
              refresh_token: token.refreshToken as string
            })
          });

          if (refreshResponse.ok) {
            const refreshedTokens = await refreshResponse.json();

            token.accessToken = refreshedTokens.access_token;
            token.expiresAt = Math.floor(Date.now() / 1000) + refreshedTokens.expires_in;

            // Update in Supabase
            if (token.email) {
              const userId = token.email === 'zach.kimble@gmail.com' ? 'zach' : 'rebecca';

              await supabase.from('user_tokens').update({
                access_token: refreshedTokens.access_token,
                expires_at: token.expiresAt,
                updated_at: new Date().toISOString()
              }).eq('user_id', userId);

              console.log(`✅ Token refreshed for user: ${userId}`);
            }
          } else {
            console.error('❌ Token refresh failed');
          }
        } catch (error) {
          console.error('❌ Error refreshing token:', error);
        }
      }

      return token;
    },
    async session({ session, token }) {
      // CRITICAL: Validate session email on every request
      if (session.user?.email) {
        const email = session.user.email.toLowerCase();
        const isAuthorized = AUTHORIZED_EMAILS.some(
          authorizedEmail => authorizedEmail.toLowerCase() === email
        );

        if (!isAuthorized) {
          console.error('🚨 SECURITY ALERT: Unauthorized session detected for:', email);
          throw new Error('Unauthorized session');
        }
      }

      // Add token data to session
      session.accessToken = token.accessToken;
      if (session.user) {
        (session.user as any).id = token.email === 'zach.kimble@gmail.com' ? 'zach' : 'rebecca';
      }

      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  }
});

export { handler as GET, handler as POST };