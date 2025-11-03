# KimbleAI v4 - Security Checklist

**Last Updated:** October 27, 2025
**Purpose:** Security audit and hardening checklist for production deployment

---

## Pre-Deployment Security Review

- [ ] All sensitive data in environment variables (not in code)
- [ ] `.env.local` and `.env.production` not committed to git
- [ ] `.gitignore` includes all sensitive files
- [ ] API keys rotated from development
- [ ] Strong database password set
- [ ] NEXTAUTH_SECRET generated securely

---

## 1. Authentication & Authorization

### 1.1 NextAuth Configuration
- [ ] NEXTAUTH_SECRET is random and secure (32+ characters)
- [ ] NEXTAUTH_URL matches production domain
- [ ] Session strategy configured correctly
- [ ] JWT signing algorithm is secure
- [ ] Session expiry set appropriately (default: 30 days)

**Verify:**
```typescript
// In app/api/auth/[...nextauth]/route.ts
export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET, // ✓ Required in production
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  // ...
};
```

### 1.2 Google OAuth Security
- [ ] OAuth Client ID and Secret secure
- [ ] Redirect URIs exactly match production URLs
- [ ] OAuth consent screen configured
- [ ] Test users limited to actual users
- [ ] Minimal scopes requested (Gmail, Drive, Calendar only)
- [ ] No wildcard redirect URIs

**Review Google Console:**
- Authorized JavaScript origins: `https://your-app.vercel.app`
- Authorized redirect URIs: `https://your-app.vercel.app/api/auth/callback/google`
- Scopes: gmail.readonly, gmail.send, drive, calendar

### 1.3 Session Management
- [ ] Secure session cookies (httpOnly, secure, sameSite)
- [ ] Session invalidation on sign out
- [ ] No session data in localStorage
- [ ] Session hijacking protection

**Test:**
1. Sign in
2. Check cookies in DevTools (should be httpOnly, secure)
3. Sign out
4. Verify session cleared

---

## 2. API Key Management

### 2.1 Environment Variables
- [ ] All API keys in Vercel environment variables
- [ ] No API keys in client-side code
- [ ] No API keys in git history
- [ ] Service role key never exposed to client

**Audit:** Run this to check for exposed keys:
```bash
git log -p | grep -E "(sk-|API_KEY|SECRET)" | head -20
```

Should return nothing sensitive.

### 2.2 API Key Rotation
- [ ] Development keys different from production
- [ ] Old keys revoked
- [ ] Key rotation schedule established

**Keys to rotate:**
- OPENAI_API_KEY
- ANTHROPIC_API_KEY
- ASSEMBLYAI_API_KEY
- SUPABASE_SERVICE_ROLE_KEY
- NEXTAUTH_SECRET
- GOOGLE_CLIENT_SECRET

### 2.3 API Key Usage Limits
- [ ] OpenAI usage limits set ($100/month recommended)
- [ ] Anthropic usage limits set
- [ ] Budget alerts configured
- [ ] Rate limiting in place

---

## 3. Database Security

### 3.1 Row-Level Security (RLS)
- [ ] RLS enabled on ALL tables
- [ ] Policies prevent cross-user data access
- [ ] No policies with blanket USING (true)
- [ ] Service role bypasses RLS (expected)

**Verify RLS enabled:**
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false;
```

Should return NO rows (or only system tables).

**Test RLS policies:**
```sql
-- Set session as user_zach
SET LOCAL role = 'authenticator';
SET LOCAL request.jwt.claim.sub = 'user_zach';

-- Try to access Rebecca's data (should be empty)
SELECT * FROM conversations WHERE user_id = 'user_rebecca';
-- Expected: 0 rows

-- Access own data (should work)
SELECT * FROM conversations WHERE user_id = 'user_zach';
-- Expected: Returns data
```

### 3.2 Database Credentials
- [ ] Strong database password (20+ characters, random)
- [ ] Service role key never in client code
- [ ] Connection string not exposed
- [ ] No direct database access from client

**Verify:**
```bash
# Search codebase for service role key exposure
grep -r "SUPABASE_SERVICE_ROLE_KEY" app/ components/
# Should only appear in server-side files (api/*, lib/*)
```

### 3.3 SQL Injection Prevention
- [ ] All queries use parameterized queries
- [ ] No raw SQL with user input
- [ ] Supabase client methods used (not raw SQL)
- [ ] Input validation on all API endpoints

**Review API routes:**
```typescript
// ✓ GOOD: Parameterized query
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId);

// ✗ BAD: String concatenation (vulnerable)
const query = `SELECT * FROM users WHERE id = '${userId}'`;
```

---

## 4. API Route Security

### 4.1 Authentication Checks
- [ ] All protected routes verify authentication
- [ ] User ID extracted from session (not from request body)
- [ ] No trust of client-provided user IDs

**Standard pattern:**
```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id; // ✓ Trust session, not request body
  // ... proceed with authenticated logic
}
```

### 4.2 Input Validation
- [ ] All user inputs validated
- [ ] File uploads validated (type, size, content)
- [ ] JSON payloads validated (Zod schemas)
- [ ] SQL injection prevented
- [ ] XSS prevented

**Use Zod for validation:**
```typescript
import { z } from 'zod';

const schema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
});

const body = await request.json();
const validated = schema.parse(body); // Throws if invalid
```

### 4.3 Rate Limiting
- [ ] Rate limiting on expensive endpoints
- [ ] Prevent brute force attacks
- [ ] Limit file upload size/frequency

**Recommended limits:**
- Chat API: 60 requests/minute per user
- File upload: 10 uploads/minute per user
- Auth endpoints: 5 attempts/minute per IP

### 4.4 CORS Configuration
- [ ] CORS only allows specific origins
- [ ] No wildcard (`*`) in production
- [ ] Credentials properly handled

**Review `vercel.json`:**
```json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "https://your-app.vercel.app" // ✓ Specific domain
        }
      ]
    }
  ]
}
```

---

## 5. File Upload Security

### 5.1 File Validation
- [ ] File type validation (MIME type + extension)
- [ ] File size limits enforced
- [ ] Malicious files rejected
- [ ] No executable files allowed

**Validation:**
```typescript
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

if (!ALLOWED_MIME_TYPES.includes(file.type)) {
  return Response.json({ error: 'Invalid file type' }, { status: 400 });
}

if (file.size > MAX_FILE_SIZE) {
  return Response.json({ error: 'File too large' }, { status: 400 });
}
```

### 5.2 File Storage Security
- [ ] Files stored in Supabase Storage (not local filesystem)
- [ ] Private buckets for sensitive files
- [ ] Public URLs only for thumbnails
- [ ] Signed URLs for private file access
- [ ] File access controlled by user ID

**Bucket configuration:**
- `audio-files`: Private
- `documents`: Private
- `gmail-attachments`: Private
- `thumbnails`: Public (read-only)

### 5.3 File Processing
- [ ] Files processed in isolated environment
- [ ] No code execution from uploaded files
- [ ] PDF parsing sandboxed
- [ ] Image processing safe

---

## 6. Data Protection

### 6.1 Encryption
- [ ] HTTPS enforced (automatic on Vercel)
- [ ] Database connections encrypted (Supabase default)
- [ ] API keys encrypted at rest
- [ ] Sensitive data not logged

**Verify HTTPS:**
```json
// In vercel.json (optional, Vercel does this by default)
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=63072000; includeSubDomains; preload"
        }
      ]
    }
  ]
}
```

### 6.2 Personal Data Handling
- [ ] User emails stored securely
- [ ] OAuth tokens encrypted
- [ ] No PII in logs
- [ ] Data deletion on user request

**OAuth token storage:**
```sql
-- Tokens encrypted in user_tokens table
SELECT user_id, expires_at FROM user_tokens; -- ✓ OK
SELECT user_id, access_token FROM user_tokens; -- ✗ Avoid logging tokens
```

### 6.3 Data Backup Security
- [ ] Backups encrypted
- [ ] Backup access restricted
- [ ] Backup retention policy
- [ ] Test restore process

---

## 7. Frontend Security

### 7.1 XSS Prevention
- [ ] React escapes all user content (default)
- [ ] No `dangerouslySetInnerHTML` without sanitization
- [ ] Markdown rendered safely
- [ ] User-generated HTML sanitized

**Safe markdown rendering:**
```typescript
import ReactMarkdown from 'react-markdown';
import { remark } from 'remark';
import rehypeSanitize from 'rehype-sanitize';

<ReactMarkdown rehypePlugins={[rehypeSanitize]}>
  {userContent}
</ReactMarkdown>
```

### 7.2 CSRF Protection
- [ ] NextAuth handles CSRF (automatic)
- [ ] Form submissions use POST
- [ ] API routes check HTTP method
- [ ] No state-changing GET requests

### 7.3 Content Security Policy
- [ ] CSP headers configured
- [ ] Inline scripts limited
- [ ] External resources whitelisted

**Add to `next.config.js`:**
```javascript
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https:;
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`;
```

---

## 8. Third-Party Integrations

### 8.1 OpenAI API
- [ ] API key secure
- [ ] Usage limits set
- [ ] No sensitive data in prompts
- [ ] Responses not logged with PII

### 8.2 Anthropic API
- [ ] API key secure
- [ ] Budget limits configured
- [ ] Content filtering enabled

### 8.3 Google APIs
- [ ] Minimal scopes requested
- [ ] Token refresh handled securely
- [ ] Tokens not logged
- [ ] API quotas monitored

### 8.4 AssemblyAI
- [ ] API key secure
- [ ] Uploaded audio deleted after processing
- [ ] No sensitive content in audio files

---

## 9. Error Handling & Logging

### 9.1 Error Messages
- [ ] No sensitive data in error messages
- [ ] Stack traces not exposed to users
- [ ] Generic errors for auth failures
- [ ] Detailed errors only in logs

**Good error handling:**
```typescript
try {
  // ... operation
} catch (error) {
  console.error('Database error:', error); // ✓ Log detailed error
  return Response.json(
    { error: 'An error occurred' }, // ✓ Generic message to user
    { status: 500 }
  );
}
```

### 9.2 Logging Security
- [ ] No API keys in logs
- [ ] No passwords in logs
- [ ] No OAuth tokens in logs
- [ ] User IDs logged (not emails directly)

**Log sanitization:**
```typescript
const sanitizeForLogging = (data: any) => {
  const { password, token, apiKey, ...safe } = data;
  return safe;
};

console.log('User data:', sanitizeForLogging(userData));
```

---

## 10. Monitoring & Alerts

### 10.1 Security Monitoring
- [ ] Failed login attempts monitored
- [ ] Unusual API usage detected
- [ ] Budget alerts configured
- [ ] Error spike alerts

**Monitor:**
```sql
-- Failed auth attempts (last 24 hours)
SELECT COUNT(*), ip_address
FROM auth_logs
WHERE success = false
  AND created_at >= NOW() - INTERVAL '24 hours'
GROUP BY ip_address
HAVING COUNT(*) > 5
ORDER BY COUNT(*) DESC;
```

### 10.2 Incident Response
- [ ] Incident response plan documented
- [ ] Emergency contacts listed
- [ ] Rollback procedure tested
- [ ] Backup restore tested

---

## 11. Compliance & Best Practices

### 11.1 Data Privacy
- [ ] Privacy policy created
- [ ] Terms of service created
- [ ] User consent obtained (OAuth)
- [ ] Data retention policy
- [ ] User data export/deletion capability

### 11.2 GDPR Compliance (if applicable)
- [ ] Right to access data
- [ ] Right to deletion
- [ ] Data portability
- [ ] Consent management

### 11.3 Security Headers
- [ ] Strict-Transport-Security
- [ ] X-Content-Type-Options: nosniff
- [ ] X-Frame-Options: DENY
- [ ] Referrer-Policy: no-referrer

**Add to `vercel.json`:**
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "no-referrer" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
      ]
    }
  ]
}
```

---

## 12. Dependency Security

### 12.1 Package Audit
- [ ] Run `npm audit` before deployment
- [ ] No high/critical vulnerabilities
- [ ] Dependencies up to date
- [ ] Unused dependencies removed

**Run audit:**
```bash
npm audit
npm audit fix  # Fix automatically if possible
```

### 12.2 Supply Chain Security
- [ ] package-lock.json committed
- [ ] No suspicious dependencies
- [ ] Regular dependency updates

---

## 13. Testing Security

### 13.1 Penetration Testing
- [ ] Test authentication bypass
- [ ] Test authorization bypass (access other user's data)
- [ ] Test SQL injection
- [ ] Test XSS
- [ ] Test CSRF
- [ ] Test file upload vulnerabilities

### 13.2 Security Test Cases
- [ ] Try accessing `/api/conversations` without auth → 401
- [ ] Try accessing another user's conversation → 403 or 404
- [ ] Try uploading malicious file → Rejected
- [ ] Try SQL injection in search → No effect
- [ ] Try XSS in message content → Escaped

---

## 14. Production Hardening

### 14.1 Environment Configuration
- [ ] DEBUG=false in production
- [ ] LOG_LEVEL=warn or error
- [ ] Source maps disabled (or not accessible)
- [ ] Development tools disabled

### 14.2 Vercel Configuration
- [ ] Function timeout set appropriately
- [ ] Memory limits configured
- [ ] No preview deployment URLs publicly shared
- [ ] Production branch protected

---

## Security Incident Response Plan

### If Security Breach Detected:

1. **Immediate Actions:**
   - [ ] Disable affected API keys
   - [ ] Rotate all secrets
   - [ ] Review access logs
   - [ ] Identify scope of breach

2. **Investigation:**
   - [ ] Review Vercel logs
   - [ ] Check database audit logs
   - [ ] Identify entry point
   - [ ] Document findings

3. **Remediation:**
   - [ ] Patch vulnerability
   - [ ] Deploy fix
   - [ ] Verify fix works
   - [ ] Monitor for recurrence

4. **Notification:**
   - [ ] Notify affected users (if applicable)
   - [ ] Update security documentation
   - [ ] Report to relevant authorities (if required)

---

## Security Review Checklist

### Before Deployment
- [ ] All items in this checklist reviewed
- [ ] Penetration testing completed
- [ ] Dependency audit passed
- [ ] RLS policies verified
- [ ] API keys rotated

### After Deployment
- [ ] Monitor auth logs for anomalies
- [ ] Review first 24 hours of access logs
- [ ] Verify all cron jobs ran securely
- [ ] Test data access controls

### Monthly Review
- [ ] Run npm audit
- [ ] Review access logs
- [ ] Check for failed auth attempts
- [ ] Rotate long-lived secrets

---

## Support & Resources

- **OWASP Top 10:** https://owasp.org/www-project-top-ten/
- **Next.js Security:** https://nextjs.org/docs/advanced-features/security-headers
- **Vercel Security:** https://vercel.com/docs/security
- **Supabase Security:** https://supabase.com/docs/guides/platform/security
- **Project Issues:** zach.kimble@gmail.com

---

**End of Security Checklist**
