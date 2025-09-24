# Google Integration Implementation Plan
**KimbleAI V4 - Gmail & Drive Access**

## Overview
This document provides step-by-step instructions to add Gmail and Google Drive integration to KimbleAI.

## Phase 1: Google Cloud Console Setup

### 1. Create Google Cloud Project
1. Go to https://console.cloud.google.com
2. Click "Select a project" → "New Project"
3. Name: "KimbleAI Integration"
4. Note the Project ID

### 2. Enable Required APIs
In the Google Cloud Console:
1. Go to "APIs & Services" → "Library"
2. Search and enable:
   - Google Drive API
   - Gmail API
   - Google People API (for user info)

### 3. Configure OAuth 2.0
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Configure consent screen first:
   - User Type: External
   - App name: KimbleAI
   - User support email: your email
   - Authorized domains: kimbleai-v4-clean.vercel.app
   - Developer contact: your email

4. Create OAuth 2.0 Client ID:
   - Application type: Web application
   - Name: KimbleAI Web Client
   - Authorized JavaScript origins:
     - http://localhost:3000
     - https://kimbleai-v4-clean.vercel.app
   - Authorized redirect URIs:
     - http://localhost:3000/api/auth/callback/google
     - https://kimbleai-v4-clean.vercel.app/api/auth/callback/google

5. Save the Client ID and Client Secret

## Phase 2: NextAuth.js Implementation

### Install Dependencies
```bash
npm install next-auth @auth/prisma-adapter
npm install @googleapis/drive @googleapis/gmail
npm install --save-dev @types/next-auth
```

### Environment Variables
Add to `.env.local`:
```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
NEXTAUTH_URL=https://kimbleai-v4-clean.vercel.app
NEXTAUTH_SECRET=generate_random_32_char_string
```

## Phase 3: Implementation Files

### 1. Create Authentication API Route
**File: `app/api/auth/[...nextauth]/route.ts`**
```typescript
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
          scope: 'openid email profile https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/gmail.readonly',
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    })
  ],
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
        
        await supabase.from('user_tokens').upsert({
          user_id: userId,
          email: session.user.email,
          access_token: token.accessToken,
          refresh_token: token.refreshToken,
          updated_at: new Date().toISOString()
        });
      }
      
      return session;
    }
  }
});

export { handler as GET, handler as POST };
```

### 2. Create Google Drive Search API
**File: `app/api/google/drive/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text.substring(0, 8000),
        dimensions: 1536
      })
    });
    
    if (!response.ok) return null;
    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Embedding error:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { query, userId = 'zach' } = await request.json();
    
    // Get user's Google token
    const { data: tokenData } = await supabase
      .from('user_tokens')
      .select('access_token')
      .eq('user_id', userId)
      .single();
    
    if (!tokenData?.access_token) {
      return NextResponse.json({ 
        error: 'User not authenticated with Google' 
      }, { status: 401 });
    }
    
    // Initialize Google Drive client
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: tokenData.access_token
    });
    
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    
    // Search Google Drive
    const response = await drive.files.list({
      q: `fullText contains '${query}'`,
      fields: 'files(id, name, mimeType, modifiedTime)',
      pageSize: 10
    });
    
    const files = response.data.files || [];
    
    // Get user data
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('name', userId === 'rebecca' ? 'Rebecca' : 'Zach')
      .single();
    
    // Index each file in knowledge base
    for (const file of files) {
      try {
        // Get file content (for Google Docs)
        if (file.mimeType === 'application/vnd.google-apps.document') {
          const content = await drive.files.export({
            fileId: file.id!,
            mimeType: 'text/plain'
          });
          
          const text = content.data as string;
          const embedding = await generateEmbedding(text);
          
          // Store in knowledge base
          await supabase.from('knowledge_base').upsert({
            user_id: userData?.id,
            source_type: 'drive',
            source_id: file.id,
            category: 'document',
            title: file.name,
            content: text.substring(0, 2000),
            embedding: embedding,
            importance: 0.7,
            tags: ['google-drive'],
            metadata: {
              fileId: file.id,
              mimeType: file.mimeType,
              modifiedTime: file.modifiedTime
            }
          });
        }
      } catch (err) {
        console.error(`Error indexing file ${file.name}:`, err);
      }
    }
    
    return NextResponse.json({
      success: true,
      filesFound: files.length,
      files: files.map(f => ({
        id: f.id,
        name: f.name,
        type: f.mimeType
      }))
    });
    
  } catch (error: any) {
    console.error('Google Drive search error:', error);
    return NextResponse.json({
      error: 'Failed to search Google Drive',
      details: error.message
    }, { status: 500 });
  }
}
```

### 3. Create Gmail Search API
**File: `app/api/google/gmail/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text.substring(0, 8000),
        dimensions: 1536
      })
    });
    
    if (!response.ok) return null;
    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Embedding error:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { query, userId = 'zach', maxResults = 10 } = await request.json();
    
    // Get user's Google token
    const { data: tokenData } = await supabase
      .from('user_tokens')
      .select('access_token')
      .eq('user_id', userId)
      .single();
    
    if (!tokenData?.access_token) {
      return NextResponse.json({ 
        error: 'User not authenticated with Google' 
      }, { status: 401 });
    }
    
    // Initialize Gmail client
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: tokenData.access_token
    });
    
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    // Search Gmail
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: maxResults
    });
    
    const messages = response.data.messages || [];
    
    // Get user data
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('name', userId === 'rebecca' ? 'Rebecca' : 'Zach')
      .single();
    
    // Process each message
    const processedMessages = [];
    for (const message of messages) {
      try {
        const fullMessage = await gmail.users.messages.get({
          userId: 'me',
          id: message.id!
        });
        
        // Extract message content
        const headers = fullMessage.data.payload?.headers || [];
        const subject = headers.find(h => h.name === 'Subject')?.value || 'No subject';
        const from = headers.find(h => h.name === 'From')?.value || 'Unknown';
        const date = headers.find(h => h.name === 'Date')?.value || '';
        
        // Get message body
        let body = '';
        const parts = fullMessage.data.payload?.parts || [];
        for (const part of parts) {
          if (part.mimeType === 'text/plain' && part.body?.data) {
            body = Buffer.from(part.body.data, 'base64').toString('utf-8');
            break;
          }
        }
        
        if (!body && fullMessage.data.payload?.body?.data) {
          body = Buffer.from(fullMessage.data.payload.body.data, 'base64').toString('utf-8');
        }
        
        // Generate embedding
        const content = `Subject: ${subject}\nFrom: ${from}\n\n${body}`;
        const embedding = await generateEmbedding(content);
        
        // Store in knowledge base
        await supabase.from('knowledge_base').upsert({
          user_id: userData?.id,
          source_type: 'email',
          source_id: message.id,
          category: 'email',
          title: subject,
          content: content.substring(0, 2000),
          embedding: embedding,
          importance: 0.6,
          tags: ['gmail', from.split('@')[1]?.split('>')[0] || 'email'],
          metadata: {
            messageId: message.id,
            from: from,
            date: date,
            threadId: message.threadId
          }
        });
        
        processedMessages.push({
          id: message.id,
          subject: subject,
          from: from,
          date: date,
          preview: body.substring(0, 100)
        });
        
      } catch (err) {
        console.error(`Error processing message ${message.id}:`, err);
      }
    }
    
    return NextResponse.json({
      success: true,
      messagesFound: processedMessages.length,
      messages: processedMessages
    });
    
  } catch (error: any) {
    console.error('Gmail search error:', error);
    return NextResponse.json({
      error: 'Failed to search Gmail',
      details: error.message
    }, { status: 500 });
  }
}
```

### 4. Add Database Table for Tokens
**SQL for Supabase:**
```sql
-- Create table for storing user Google tokens
CREATE TABLE IF NOT EXISTS user_tokens (
  user_id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_user_tokens_user_id ON user_tokens(user_id);
```

### 5. Update Frontend Auth Component
**File: `components/GoogleAuth.tsx`**
```typescript
'use client';

import { signIn, signOut, useSession } from 'next-auth/react';

export default function GoogleAuth({ userId }: { userId: string }) {
  const { data: session, status } = useSession();
  
  if (status === 'loading') {
    return <div>Loading...</div>;
  }
  
  if (session) {
    return (
      <div style={{
        padding: '12px',
        backgroundColor: '#10a37f',
        borderRadius: '6px',
        color: 'white'
      }}>
        <div style={{ fontSize: '13px', marginBottom: '8px' }}>
          Connected as: {session.user?.email}
        </div>
        <button
          onClick={() => signOut()}
          style={{
            padding: '6px 12px',
            backgroundColor: '#ef4444',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Disconnect Google
        </button>
      </div>
    );
  }
  
  return (
    <button
      onClick={() => signIn('google')}
      style={{
        width: '100%',
        padding: '10px',
        backgroundColor: '#4285f4',
        border: 'none',
        borderRadius: '6px',
        color: 'white',
        cursor: 'pointer',
        fontSize: '13px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px'
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24">
        <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      Connect Google Account
    </button>
  );
}
```

## Phase 4: Testing Google Integration

### Test Script
**File: `TEST_GOOGLE_INTEGRATION.bat`**
```batch
@echo off
echo Testing Google Integration...

REM Test Drive search
curl -X POST https://kimbleai-v4-clean.vercel.app/api/google/drive ^
  -H "Content-Type: application/json" ^
  -d "{\"query\":\"project\",\"userId\":\"zach\"}"

REM Test Gmail search
curl -X POST https://kimbleai-v4-clean.vercel.app/api/google/gmail ^
  -H "Content-Type: application/json" ^
  -d "{\"query\":\"meeting\",\"userId\":\"zach\"}"

pause
```

## Deployment Steps

1. **Add environment variables to Vercel:**
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXTAUTH_SECRET

2. **Deploy the changes:**
   ```bash
   npm install next-auth @googleapis/drive @googleapis/gmail
   git add -A
   git commit -m "Add Google Drive and Gmail integration"
   git push origin main
   vercel --prod
   ```

3. **Test the integration:**
   - Visit your app
   - Click "Connect Google Account"
   - Authorize the requested permissions
   - Test searching Drive and Gmail

## Security Considerations

1. **Token Storage**: Tokens are stored encrypted in Supabase
2. **Scope Limitation**: Only request read-only access
3. **User Isolation**: Each user's Google data is isolated
4. **Token Refresh**: Implement token refresh logic for expired tokens
5. **Rate Limiting**: Implement rate limits on Google API calls

## Troubleshooting

### Common Issues:

1. **"Access blocked" error**
   - Add domain to authorized domains in Google Console
   - Ensure redirect URIs match exactly

2. **"Invalid scope" error**
   - Check that APIs are enabled in Google Console
   - Verify scope strings are correct

3. **"Token expired" error**
   - Implement refresh token logic
   - Re-authenticate the user

4. **"Quota exceeded" error**
   - Check Google API quotas
   - Implement caching for repeated searches

## Monitoring

Add logging for:
- Successful/failed authentications
- API call counts
- Search query patterns
- Error rates

## Cost Impact

- Google APIs: Free tier includes:
  - Drive API: 1 billion requests/day
  - Gmail API: 250 quota units/user/second
- Additional OpenAI costs for embeddings (~$0.02 per 1000 documents)

## Next Steps

After implementing:
1. Test with real Google accounts
2. Monitor API usage
3. Optimize search queries
4. Add caching layer
5. Implement incremental sync