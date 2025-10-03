# OAuth Redirect URI Fix Instructions

## Problem
Google OAuth is showing `redirect_uri_mismatch` error because:
- NEXTAUTH_URL is set to: `https://www.kimbleai.com`
- Actual deployment is on: `https://kimbleai-v4-clean-gjad3vigq-kimblezcs-projects.vercel.app`

## Solution Options

### Option 1: Add Vercel URL to Google OAuth (Quick Fix)

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/apis/credentials
   - Select your project

2. **Edit OAuth 2.0 Client:**
   - Click on your OAuth client ID: `968455155458-nuerqfbgqmdarn2hal4es081d9ut152t.apps.googleusercontent.com`

3. **Add Authorized Redirect URIs:**
   Add these URLs:
   ```
   https://kimbleai-v4-clean-gjad3vigq-kimblezcs-projects.vercel.app/api/auth/callback/google
   https://www.kimbleai.com/api/auth/callback/google
   https://kimbleai.com/api/auth/callback/google
   https://app.kimbleai.com/api/auth/callback/google
   https://ai.kimbleai.com/api/auth/callback/google
   ```

4. **Save Changes**

### Option 2: Configure Custom Domain (Proper Fix)

#### Step 1: Add Custom Domain to Vercel

Run these commands:
```bash
# Add www.kimbleai.com
npx vercel domains add www.kimbleai.com

# Or add kimbleai.com
npx vercel domains add kimbleai.com

# Or add app.kimbleai.com
npx vercel domains add app.kimbleai.com
```

#### Step 2: Update DNS Records

Add these records in your domain registrar (where kimbleai.com is registered):

**For www.kimbleai.com:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

**For kimbleai.com (apex domain):**
```
Type: A
Name: @
Value: 76.76.21.21

Type: AAAA
Name: @
Value: 2606:4700:4700::1111
```

**For app.kimbleai.com:**
```
Type: CNAME
Name: app
Value: cname.vercel-dns.com
```

#### Step 3: Wait for DNS Propagation
- DNS changes can take 1-48 hours
- Check status: `npx vercel domains inspect kimbleai.com`

### Option 3: Update NEXTAUTH_URL (Temporary)

Update the environment variable to match current deployment:

```bash
# Remove old NEXTAUTH_URL
npx vercel env rm NEXTAUTH_URL production

# Add new NEXTAUTH_URL with Vercel domain
npx vercel env add NEXTAUTH_URL production
# When prompted, enter: https://kimbleai-v4-clean-gjad3vigq-kimblezcs-projects.vercel.app

# Redeploy to apply changes
npx vercel --prod
```

## Recommended Approach

**Use Option 1 + Option 2 together:**

1. **Immediately:** Add Vercel URL to Google OAuth (Option 1)
   - This will fix the login error right now
   - Takes 1 minute

2. **Then:** Configure custom domain properly (Option 2)
   - This is the proper long-term solution
   - Takes time for DNS propagation

3. **Finally:** Once custom domain works, clean up
   - Remove Vercel URL from Google OAuth
   - Keep only kimbleai.com URLs

## Quick Fix Now (Do This First)

1. Open: https://console.cloud.google.com/apis/credentials
2. Click your OAuth client
3. Add this redirect URI:
   ```
   https://kimbleai-v4-clean-gjad3vigq-kimblezcs-projects.vercel.app/api/auth/callback/google
   ```
4. Click Save
5. Try signing in again - should work immediately!

## Verification

After making changes, test:
```bash
# Test the auth endpoint
curl https://kimbleai-v4-clean-gjad3vigq-kimblezcs-projects.vercel.app/api/auth/providers

# Should return:
# {"google":{"id":"google","name":"Google","type":"oauth",...}}
```

## Current Configuration

**Google OAuth Client ID:**
```
968455155458-nuerqfbgqmdarn2hal4es081d9ut152t.apps.googleusercontent.com
```

**Current NEXTAUTH_URL (in Vercel):**
```
https://www.kimbleai.com
```

**Actual Deployment URL:**
```
https://kimbleai-v4-clean-gjad3vigq-kimblezcs-projects.vercel.app
```

**Custom Domains (SSL pending):**
- app.kimbleai.com
- ai.kimbleai.com

---

## Need Help?

If you need me to make these changes via command line, I can:
1. Update the Vercel environment variable
2. Add custom domains
3. Check domain status

Just let me know which option you'd like to pursue!
