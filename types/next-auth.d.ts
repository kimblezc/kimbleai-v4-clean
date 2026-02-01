/**
 * NextAuth Type Extensions
 *
 * Extend default NextAuth types to include custom properties
 */

import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  /**
   * Extended User type
   */
  interface User {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
  }

  /**
   * Extended Session type
   */
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
    };
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
  }
}

declare module 'next-auth/jwt' {
  /**
   * Extended JWT type
   */
  interface JWT {
    userId?: string;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
  }
}
