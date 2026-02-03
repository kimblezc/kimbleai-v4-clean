/**
 * NextAuth Configuration
 *
 * Handles authentication with Google OAuth
 */

import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { userQueries } from '../db/queries';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          // Request offline access for refresh tokens
          access_type: 'offline',
          prompt: 'consent',
          // Request necessary Google API scopes
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/drive.readonly',
            'https://www.googleapis.com/auth/calendar.readonly',
            'https://www.googleapis.com/auth/calendar.events',
          ].join(' '),
        },
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email) {
        return false;
      }

      try {
        // Check if user exists
        let dbUser = await userQueries.getByEmail(user.email);

        if (!dbUser) {
          // Create new user
          dbUser = await userQueries.create({
            id: user.id,
            email: user.email,
            name: user.name || undefined,
            googleTokens: account ? {
              access_token: account.access_token,
              refresh_token: account.refresh_token,
              expires_at: account.expires_at,
            } : undefined,
          });
        } else {
          // Update existing user
          await userQueries.update(dbUser.id, {
            name: user.name || undefined,
            google_tokens: account ? {
              access_token: account.access_token,
              refresh_token: account.refresh_token,
              expires_at: account.expires_at,
            } : undefined,
            last_login_at: new Date().toISOString(),
          });
        }

        return true;
      } catch (error) {
        console.error('[Auth] Sign in error:', error);
        return false;
      }
    },

    async jwt({ token, user, account }) {
      // Initial sign in
      if (user) {
        token.userId = user.id;
      }

      // Store Google tokens in JWT
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }

      return token;
    },

    async session({ session, token }) {
      // Add user ID and Google tokens to session
      if (session.user) {
        session.user.id = token.userId as string;
      }

      session.accessToken = token.accessToken as string;
      session.refreshToken = token.refreshToken as string;
      session.expiresAt = token.expiresAt as number;

      return session;
    },
  },

  // Use NextAuth default signin pages since custom pages don't exist
  // pages: {
  //   signIn: '/auth/signin',
  //   error: '/auth/error',
  // },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  secret: process.env.NEXTAUTH_SECRET,
};
