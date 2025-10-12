# Google OAuth Setup for KimbleAI

## ✅ Current Status
- Google Client ID: Configured ✅
- Google Client Secret: Configured ✅
- NextAuth URL: https://www.kimbleai.com ✅
- Middleware: Auto-redirect to sign-in ✅

## 🔧 Required: Update Google Cloud Console

### 1. Go to Google Cloud Console
https://console.cloud.google.com/apis/credentials

### 2. Select your OAuth Client ID
Click on: `968455155458-nuerqfbgqmdarn2hal4es081d9ut152t`

### 3. Add These Authorized Redirect URIs

**CRITICAL**: Add ALL of these URLs:

```
https://www.kimbleai.com/api/auth/callback/google
https://kimbleai.com/api/auth/callback/google
https://app.kimbleai.com/api/auth/callback/google
https://ai.kimbleai.com/api/auth/callback/google
```

### 4. Add Authorized JavaScript Origins

```
https://www.kimbleai.com
https://kimbleai.com
https://app.kimbleai.com
https://ai.kimbleai.com
```

## 🧪 Test Authentication

### 1. Visit Production Site
https://www.kimbleai.com

### 2. Expected Flow
- → Automatically redirects to /auth/signin
- → Shows clean, minimalist sign-in page
- → Click "Sign in with Google" button
- → Google OAuth consent screen appears
- → After approval, redirects back to app
- → Shows "Google ✅" in status bar

### 3. Authorized Emails
Only these emails can sign in:
- zach.kimble@gmail.com ✅
- becky.aza.kimble@gmail.com ✅

## 🔍 Troubleshooting

### Error: "redirect_uri_mismatch"
**Fix**: Add the redirect URI to Google Cloud Console (step 3 above)

### Error: "Access Denied"
**Fix**: Make sure you're signing in with an authorized email

### Site doesn't redirect to sign-in
**Fix**: Clear browser cache and cookies, try incognito mode

## 📝 Current OAuth Scopes

Your app requests these Google permissions:
- ✅ Email & Profile (basic info)
- ✅ Gmail Read (view emails)
- ✅ Gmail Send (send emails)
- ✅ Drive Read (view files)
- ✅ Drive File (create/edit files in app folder)
- ✅ Calendar Read (view events)
- ✅ Calendar Events (create/edit events)

## ✨ Minimalist Sign-In Experience

The sign-in page is already clean and minimalist:
- Dark theme
- Single "Sign in with Google" button
- Clear security messaging
- Auto-redirect for unauthenticated users

No additional setup needed on your end - just add the redirect URIs in Google Cloud Console!
