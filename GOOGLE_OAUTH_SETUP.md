# Google OAuth Setup Instructions

## Overview
Your Google OAuth integration is now implemented! Here's what you need to do to complete the setup.

## ✅ Completed Implementation
- ✅ NextAuth.js OAuth API routes (`/api/auth/[...nextauth]/route.ts`)
- ✅ Google Drive integration API (`/api/google/drive/route.ts`)
- ✅ Gmail integration API (`/api/google/gmail/route.ts`)
- ✅ Google Auth component (`components/GoogleAuth.tsx`)
- ✅ Session provider integration
- ✅ Database schema for user tokens (`sql/create_user_tokens_table.sql`)
- ✅ Environment variable templates

## 🚀 Next Steps Required

### 1. Google Cloud Console Setup

1. **Go to Google Cloud Console**: https://console.cloud.google.com
2. **Create New Project** (or select existing):
   - Project Name: "KimbleAI Integration"
   - Note the Project ID

3. **Enable Required APIs**:
   - Navigate to "APIs & Services" → "Library"
   - Enable these APIs:
     - ✅ Google Drive API
     - ✅ Gmail API
     - ✅ Google People API

4. **Configure OAuth Consent Screen**:
   - Go to "APIs & Services" → "OAuth consent screen"
   - User Type: **External**
   - App Information:
     - App name: `KimbleAI`
     - User support email: `your-email@domain.com`
     - Developer contact: `your-email@domain.com`
   - Authorized domains: `localhost` (for development)

5. **Create OAuth Credentials**:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: **Web application**
   - Name: `KimbleAI Web Client`
   - **Authorized JavaScript origins**:
     ```
     http://localhost:3000
     https://your-vercel-domain.vercel.app
     ```
   - **Authorized redirect URIs**:
     ```
     http://localhost:3000/api/auth/callback/google
     https://your-vercel-domain.vercel.app/api/auth/callback/google
     ```

### 2. Environment Variables Setup

Update your `.env.local` file with the actual values:

```env
# Replace these placeholder values with real ones from Google Cloud Console
GOOGLE_CLIENT_ID=your_actual_google_client_id
GOOGLE_CLIENT_SECRET=your_actual_google_client_secret
NEXTAUTH_SECRET=generate_a_32_character_random_string
NEXTAUTH_URL=http://localhost:3000

# Update this with your actual Supabase service role key
SUPABASE_SERVICE_ROLE_KEY=your_actual_supabase_service_role_key
```

**To generate NEXTAUTH_SECRET**:
```bash
openssl rand -base64 32
```

### 3. Supabase Database Setup

Run this SQL in your Supabase SQL editor:

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

-- Add RLS policy for security
ALTER TABLE user_tokens ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to access their own tokens
CREATE POLICY "Users can access their own tokens" ON user_tokens
  FOR ALL
  USING (auth.uid()::text = user_id OR user_id IN ('zach', 'rebecca'));
```

### 4. Test the Integration

1. **Start Development Server**:
   ```bash
   npm run dev
   ```

2. **Test OAuth Flow**:
   - Open http://localhost:3000
   - You should see a "Connect Google Account" button in the sidebar
   - Click it to test the OAuth flow

3. **Test Google APIs**:
   ```bash
   # Test Drive search
   curl -X POST http://localhost:3000/api/google/drive \
     -H "Content-Type: application/json" \
     -d '{"query":"test","userId":"zach"}'

   # Test Gmail search
   curl -X POST http://localhost:3000/api/google/gmail \
     -H "Content-Type: application/json" \
     -d '{"query":"meeting","userId":"zach"}'
   ```

## 🔧 Features Implemented

### OAuth Authentication
- **NextAuth.js** integration with Google provider
- **Secure token storage** in Supabase
- **Automatic token refresh** handling
- **User-specific** token isolation

### Google Drive Integration
- **Search Google Drive** documents
- **Extract text content** from Google Docs
- **Generate embeddings** for search
- **Store in knowledge base** automatically

### Gmail Integration
- **Search Gmail messages** by query
- **Extract email content** (subject, from, body)
- **Generate embeddings** for search
- **Store in knowledge base** automatically

### Security Features
- **Row Level Security (RLS)** on user tokens
- **Scope limitation** to read-only access
- **User isolation** per Google account
- **Secure credential storage**

## 🛠️ Troubleshooting

### Common Issues:

1. **"Access blocked" error**
   - Ensure domain is added to authorized domains
   - Check redirect URIs match exactly

2. **"Invalid scope" error**
   - Verify APIs are enabled in Google Console
   - Check scope strings in NextAuth config

3. **"Token expired" error**
   - Tokens will auto-refresh via NextAuth
   - Re-authenticate if refresh fails

4. **Database connection issues**
   - Verify SUPABASE_SERVICE_ROLE_KEY is correct
   - Check if user_tokens table exists
   - Verify RLS policies are set up

## 📊 Usage Flow

1. **User Authentication**: User clicks "Connect Google Account"
2. **OAuth Consent**: Google prompts for Drive/Gmail permissions
3. **Token Storage**: Access/refresh tokens stored in Supabase
4. **API Usage**: Apps can now search Drive/Gmail via `/api/google/*`
5. **Knowledge Base**: Results automatically indexed for chat context

## 🔄 Next Steps

After setup:
1. Test with real Google accounts
2. Monitor API usage in Google Console
3. Implement incremental sync for large datasets
4. Add caching layer for repeated searches
5. Monitor costs (OpenAI embeddings + Google API calls)

## 📋 API Endpoints

- `POST /api/google/drive` - Search Google Drive
- `POST /api/google/gmail` - Search Gmail
- `GET/POST /api/auth/[...nextauth]` - OAuth authentication

The integration is complete and ready for testing!