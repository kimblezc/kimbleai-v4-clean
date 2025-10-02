# KimbleAI Security Checklist

## 🚨 CRITICAL - DO IMMEDIATELY

- [ ] **ROTATE ALL API KEYS** - All keys in `.env.local` are compromised
  - [ ] OpenAI API Key
  - [ ] Supabase Service Role Key
  - [ ] Google OAuth Client Secret
  - [ ] NextAuth Secret
  - [ ] AssemblyAI API Key
  - [ ] Zapier Webhook Secret

- [ ] **Verify `.env.local` is in `.gitignore`**
  - [ ] Check: `git check-ignore .env.local` should return the file
  - [ ] If not: Add it immediately and commit

- [ ] **Scan git history for committed secrets**
  ```bash
  git log --all --full-history -- .env.local
  # If found, use BFG Repo Cleaner or git-filter-repo to remove
  ```

- [ ] **Move secrets to secure storage**
  - Option 1: Vercel Environment Variables (recommended for Vercel deployments)
  - Option 2: AWS Secrets Manager
  - Option 3: HashiCorp Vault
  - Option 4: Azure Key Vault

---

## 🔴 HIGH PRIORITY (This Week)

### Authentication & Authorization
- [ ] Implement proper session-based authentication
  - Replace userId parameter with NextAuth session validation
  - Update all API routes to use `getServerSession()`

- [ ] Apply rate limiting to all API routes
  ```typescript
  import { withSecurity } from '@/lib/security-middleware';

  export async function POST(request: NextRequest) {
    return withSecurity(request, handler, {
      requireAuth: true,
      rateLimit: { windowMs: 60000, maxRequests: 60 }
    });
  }
  ```

- [ ] Test rate limiting works correctly
  - Script to send 65 requests and verify 429 response

### Infrastructure
- [ ] Enable HTTPS enforcement in production
- [ ] Add security headers to Next.js config
  - X-Frame-Options: DENY
  - X-Content-Type-Options: nosniff
  - Referrer-Policy: strict-origin-when-cross-origin

- [ ] Implement CSRF protection for state-changing endpoints

### Monitoring
- [ ] Set up Sentry or error monitoring
- [ ] Create security alerts for:
  - Failed auth attempts (>3 in 5 min)
  - Rate limit violations (>5 per hour)
  - Large file uploads (>50MB)

---

## 🟡 MEDIUM PRIORITY (This Month)

### Code Security
- [ ] Add input validation to remaining routes
- [ ] Implement CSP (Content Security Policy) headers
- [ ] Add Zapier webhook signature verification
- [ ] Implement session expiration and refresh token rotation
- [ ] Add brute-force protection on authentication

### Data Protection
- [ ] Implement data deletion on user request (GDPR)
- [ ] Add data export functionality
- [ ] Create audit trail for sensitive operations
- [ ] Review and minimize Google OAuth scopes

### Testing
- [ ] Conduct penetration testing
- [ ] Set up automated security scanning in CI/CD
- [ ] Create security test suite

---

## 🟢 ONGOING / BEST PRACTICES

### Development Practices
- [ ] Never commit secrets to git
- [ ] Always validate and sanitize user input
- [ ] Use parameterized queries (already done with Supabase)
- [ ] Log security events
- [ ] Review dependencies for vulnerabilities monthly

### Code Review Checklist
When reviewing code, always check:
- [ ] User input is validated
- [ ] SQL injection prevention (use .eq(), not string concat)
- [ ] Rate limiting applied to expensive operations
- [ ] Authentication verified before data access
- [ ] Files validated before processing
- [ ] Errors don't expose sensitive info

### Deployment Checklist
Before every deployment:
- [ ] Secrets are in environment variables, not code
- [ ] Rate limiting is enabled
- [ ] Security headers are configured
- [ ] HTTPS is enforced
- [ ] Monitoring is active

---

## 📊 Security Metrics to Track

### Weekly
- [ ] Failed authentication attempts
- [ ] Rate limit violations
- [ ] API error rates
- [ ] Unusual traffic patterns

### Monthly
- [ ] Security dependency updates
- [ ] Access log review
- [ ] API key rotation (if compromised)
- [ ] Security training for team

### Quarterly
- [ ] Full security audit
- [ ] Penetration testing
- [ ] Review OAuth scopes
- [ ] Update incident response plan

---

## 🔧 Quick Security Wins

### 1. Add Security Headers (5 minutes)
```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};
```

### 2. HTTPS Enforcement (5 minutes)
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  if (
    request.nextUrl.protocol !== 'https:' &&
    process.env.NODE_ENV === 'production'
  ) {
    return NextResponse.redirect(
      `https://${request.nextUrl.host}${request.nextUrl.pathname}`
    );
  }
}
```

### 3. Rate Limit a Route (2 minutes)
```typescript
import { withSecurity } from '@/lib/security-middleware';

export async function POST(request: NextRequest) {
  return withSecurity(
    request,
    async (req, userId, userData) => {
      // Your logic here
    },
    { rateLimit: { windowMs: 60000, maxRequests: 30 } }
  );
}
```

---

## 📞 Emergency Contacts

### Security Incident Response
1. **Identify** the threat and scope
2. **Disable** compromised credentials immediately
3. **Notify** affected users (GDPR: within 72 hours)
4. **Document** everything
5. **Review** and improve

### Key Contacts
- Security Lead: _________________
- Database Admin: _________________
- Vercel Support: https://vercel.com/support
- Supabase Support: https://supabase.com/support
- Legal/Compliance: _________________

---

## ✅ Fixes Already Implemented

- [x] SQL injection in Google Drive search queries
- [x] SQL injection in project file sync
- [x] Unauthorized message deletion vulnerability
- [x] File upload validation (path traversal, type validation)
- [x] Rate limiting framework created
- [x] Security middleware with helpers
- [x] Input sanitization helpers
- [x] Security event logging

---

## 📚 Resources

- **OWASP Top 10**: https://owasp.org/Top10/
- **NextAuth.js Security**: https://next-auth.js.org/security
- **Supabase Security**: https://supabase.com/docs/guides/auth
- **Vercel Security**: https://vercel.com/docs/security

---

**Last Updated:** October 1, 2025
**Next Review:** December 1, 2025
