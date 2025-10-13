import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

const AUTHORIZED_EMAILS = [
  'zach.kimble@gmail.com',
  'becky.aza.kimble@gmail.com'
];

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      const email = user.email?.toLowerCase();

      // Log sign-in attempt for security
      console.log('🔐 Sign-in attempt:', {
        email: email,
        timestamp: new Date().toISOString(),
        provider: account?.provider
      });

      if (!email) {
        console.error('❌ Sign-in rejected: No email provided');
        return false;
      }

      const isAuthorized = AUTHORIZED_EMAILS.some(
        authorizedEmail => authorizedEmail.toLowerCase() === email
      );

      if (!isAuthorized) {
        console.error('❌ Sign-in rejected: Email not authorized:', email);
        return '/auth/error?error=AccessDenied';
      }

      console.log('✅ Sign-in successful:', email);
      return true;
    },
    async jwt({ token, user, account }) {
      // Initial sign in
      if (user) {
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client
      if (token && session.user) {
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
