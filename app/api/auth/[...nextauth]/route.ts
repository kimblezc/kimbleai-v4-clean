import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          // Full Google integration: Drive, Gmail, Calendar access
          // Test users configured in Google Cloud Console (zach.kimble@gmail.com, becky.aza.kimble@gmail.com)
          // Publishing status: Testing (eliminates "unverified app" warning for test users)
          scope: 'openid email profile https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar',
          access_type: 'offline',
          prompt: 'consent', // Force consent screen to re-grant permissions and get fresh tokens
        }
      }
    })
  ],
  session: {
    // FIXED: Session stays active for 30 days instead of expiring quickly
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // Refresh session every 24 hours
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        // Store expiration time (expires_at is Unix timestamp in seconds, convert to milliseconds)
        token.expiresAt = account.expires_at ? account.expires_at * 1000 : Date.now() + 3600000;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;

      // Store tokens in Supabase for the user
      if (session.user?.email) {
        const userId = session.user.email === 'becky.aza.kimble@gmail.com' ? 'rebecca' : 'zach';

        try {
          await supabase.from('user_tokens').upsert({
            user_id: userId,
            email: session.user.email,
            access_token: token.accessToken,
            refresh_token: token.refreshToken,
            expires_at: token.expiresAt, // Store as Unix timestamp (milliseconds)
            updated_at: new Date().toISOString()
          });

          console.log('[NextAuth] Stored tokens for', userId, '- expires at:', new Date(token.expiresAt as number).toISOString());
        } catch (error) {
          console.error('Error storing user tokens:', error);
        }
      }

      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };