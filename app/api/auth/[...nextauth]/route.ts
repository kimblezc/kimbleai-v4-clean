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
    })
  ],
  callbacks: {
    async signIn({ user }) {
      const email = user.email?.toLowerCase();
      if (!email) return false;

      const isAuthorized = AUTHORIZED_EMAILS.some(
        authorizedEmail => authorizedEmail.toLowerCase() === email
      );

      if (!isAuthorized) {
        return '/auth/error?error=AccessDenied';
      }

      return true;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
