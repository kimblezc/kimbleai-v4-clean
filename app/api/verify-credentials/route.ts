import { NextResponse } from 'next/server';

export async function GET() {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const nextAuthUrl = process.env.NEXTAUTH_URL;
  const nextAuthSecret = process.env.NEXTAUTH_SECRET;

  return NextResponse.json({
    // Show exact values for verification (safe for Client ID and URL)
    googleClientId: googleClientId,
    nextAuthUrl: nextAuthUrl,

    // Show partial values for secrets (for verification without exposure)
    googleClientSecretPrefix: googleClientSecret?.substring(0, 15) + '...',
    googleClientSecretLength: googleClientSecret?.length || 0,
    nextAuthSecretPrefix: nextAuthSecret?.substring(0, 10) + '...',
    nextAuthSecretLength: nextAuthSecret?.length || 0,

    // Boolean checks
    hasGoogleClientId: !!googleClientId,
    hasGoogleClientSecret: !!googleClientSecret,
    hasNextAuthUrl: !!nextAuthUrl,
    hasNextAuthSecret: !!nextAuthSecret,

    // Additional verification
    clientIdFormat: googleClientId?.includes('968455155458-') ? 'CORRECT' : 'WRONG',
    secretFormat: googleClientSecret?.startsWith('GOCSPX-') ? 'CORRECT' : 'WRONG',
    urlFormat: nextAuthUrl === 'https://www.kimbleai.com' ? 'CORRECT' : 'WRONG',

    timestamp: new Date().toISOString()
  });
}