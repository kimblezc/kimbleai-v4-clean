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
          // FIXED: Removed sensitive scopes (drive, gmail, calendar) to eliminate Google "untrusted app" warnings
          // Only request basic profile info - no verification required
          scope: 'openid email profile',
          access_type: 'offline',
          prompt: 'consent'
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
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;

      // Store tokens in Supabase for the user
      if (session.user?.email) {
        const userId = session.user.email === 'rebecca@kimbleai.com' ? 'rebecca' : 'zach';

        try {
          await supabase.from('user_tokens').upsert({
            user_id: userId,
            email: session.user.email,
            access_token: token.accessToken,
            refresh_token: token.refreshToken,
            updated_at: new Date().toISOString()
          });
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