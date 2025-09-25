import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
    hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    nextAuthUrl: process.env.NEXTAUTH_URL,
    clientIdLength: process.env.GOOGLE_CLIENT_ID?.length || 0,
    secretLength: process.env.GOOGLE_CLIENT_SECRET?.length || 0,
    timestamp: new Date().toISOString()
  });
}