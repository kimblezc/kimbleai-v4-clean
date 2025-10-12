import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

const AUTHORIZED_EMAILS = [
  'zach.kimble@gmail.com',
  'becky.aza.kimble@gmail.com'
];

const handler = NextAuth({
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
});

export { handler as GET, handler as POST };
