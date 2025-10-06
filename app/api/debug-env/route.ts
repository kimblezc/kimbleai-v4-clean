import { NextResponse } from 'next/server';

export async function GET() {
  const assemblyKey = process.env.ASSEMBLYAI_API_KEY || '';

  return NextResponse.json({
    hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
    hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    nextAuthUrl: process.env.NEXTAUTH_URL,
    clientIdLength: process.env.GOOGLE_CLIENT_ID?.length || 0,
    secretLength: process.env.GOOGLE_CLIENT_SECRET?.length || 0,
    // AssemblyAI key diagnostics
    assemblyKeyLength: assemblyKey.length,
    assemblyKeyPreview: assemblyKey ? assemblyKey.substring(0, 8) + '...' + assemblyKey.substring(assemblyKey.length - 4) : 'MISSING',
    assemblyHasLeadingSpace: assemblyKey !== assemblyKey.trimStart(),
    assemblyHasTrailingSpace: assemblyKey !== assemblyKey.trimEnd(),
    assemblyHasLiteralBackslashN: assemblyKey.includes('\\n'),
    assemblyHasActualNewline: assemblyKey.includes('\n'),
    assemblyCharCodes: [...assemblyKey].map(c => c.charCodeAt(0)),
    timestamp: new Date().toISOString()
  });
}