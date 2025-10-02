# KimbleAI Authentication - Quick Reference

## Current Status

### Authorized Users
- ✅ zach.kimble@gmail.com (Zach)
- ✅ becky.aza.kimble@gmail.com (Rebecca)

### Security Level
**MAXIMUM** - Multi-layer authentication with strict whitelisting

---

## Quick Commands

### Run Security Tests
```bash
npm test -- tests/auth-security.test.ts
```

### Check Auth Logs (Supabase)
```sql
SELECT * FROM auth_logs
WHERE timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;
```

### Check Active Sessions
```sql
SELECT * FROM user_tokens
ORDER BY updated_at DESC;
```

---

## Adding a New User

**IMPORTANT:** This requires code changes in 3 files!

### Step 1: Update All Files

#### File 1: `app/api/auth/[...nextauth]/route.ts`
```typescript
const AUTHORIZED_EMAILS = [
  'zach.kimble@gmail.com',
  'becky.aza.kimble@gmail.com',
  'new.user@example.com', // ADD HERE
];
```

#### File 2: `middleware.ts`
```typescript
const AUTHORIZED_EMAILS = [
  'zach.kimble@gmail.com',
  'becky.aza.kimble@gmail.com',
  'new.user@example.com', // ADD HERE
];
```

#### File 3: `lib/auth.ts`
```typescript
export const AUTHORIZED_EMAILS = [
  'zach.kimble@gmail.com',
  'becky.aza.kimble@gmail.com',
  'new.user@example.com', // ADD HERE
] as const;
```

### Step 2: Update User ID Mapping (if needed)

In `lib/auth.ts`, update `getUserIdFromEmail()`:
```typescript
export function getUserIdFromEmail(email: string): 'zach' | 'rebecca' | 'newuser' | null {
  const normalizedEmail = email.toLowerCase().trim();

  if (normalizedEmail === 'zach.kimble@gmail.com') return 'zach';
  if (normalizedEmail === 'becky.aza.kimble@gmail.com') return 'rebecca';
  if (normalizedEmail === 'new.user@example.com') return 'newuser';

  return null;
}
```

### Step 3: Test
```bash
# Run tests
npm test -- tests/auth-security.test.ts

# Test locally
npm run dev
# Try signing in with new email
```

### Step 4: Deploy
```bash
# Deploy to production
vercel --prod
```

---

## Removing a User

Follow the same process but REMOVE the email from all 3 files.

---

## Common Issues

### Issue: "Access Denied" for authorized user

**Check:**
1. Email matches exactly (case-insensitive, but check for typos)
2. All 3 files have the email
3. Google OAuth is configured correctly
4. User is using the correct Google account

**Debug:**
```bash
# Check auth logs
grep "AUTHENTICATION ATTEMPT" logs/

# Check environment
echo $GOOGLE_CLIENT_ID
echo $NEXTAUTH_URL
```

### Issue: Unauthorized user can sign in

**CRITICAL SECURITY ISSUE!**

1. Check all 3 whitelist files immediately
2. Verify middleware is running
3. Check auth logs for the unauthorized email
4. Rotate NEXTAUTH_SECRET
5. Redeploy immediately

### Issue: Session expires too quickly

**Fix:**
In `app/api/auth/[...nextauth]/route.ts`:
```typescript
session: {
  strategy: 'jwt',
  maxAge: 30 * 24 * 60 * 60, // 30 days (adjust as needed)
},
```

---

## Security Checklist

### Daily
- [ ] No unauthorized sign-in attempts in logs
- [ ] No suspicious API activity

### Weekly
- [ ] Review auth_logs in Supabase
- [ ] Check for failed authentication attempts
- [ ] Verify only 2 users in user_tokens table

### Monthly
- [ ] Run full security test suite
- [ ] Review and rotate NEXTAUTH_SECRET
- [ ] Check Google OAuth credentials
- [ ] Update dependencies

---

## File Locations

### Core Security Files
```
app/api/auth/[...nextauth]/route.ts  # NextAuth configuration
middleware.ts                         # Route protection
lib/auth.ts                          # Helper functions
```

### Auth Pages
```
app/auth/signin/page.tsx             # Sign-in page
app/auth/error/page.tsx              # Error page
```

### Tests
```
tests/auth-security.test.ts          # Security tests (26 tests)
```

### Documentation
```
SECURITY.md                          # Full security documentation
docs/AUTH_QUICK_REFERENCE.md        # This file
```

---

## Environment Variables

### Required
```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
NEXTAUTH_URL=https://www.kimbleai.com
NEXTAUTH_SECRET=your-strong-secret
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Generate New Secret
```bash
openssl rand -base64 32
```

---

## Rate Limits

### Login Attempts
- **Limit:** 5 attempts per IP
- **Window:** 15 minutes
- **Reset:** Automatic after window expires

### API Requests
- **Limit:** 100 requests per user
- **Window:** 1 minute
- **Reset:** Automatic after window expires

---

## Support

### Security Issues
**Email:** zach.kimble@gmail.com
**Subject:** [SECURITY] Issue Description

### Access Requests
This is a **private application**. Access is limited to Zach and Rebecca only.

---

**Last Updated:** January 20, 2025
**Version:** v4.0.0
