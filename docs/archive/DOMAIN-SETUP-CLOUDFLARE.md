# KimbleAI Domain Setup (Cloudflare DNS)

## Current Situation

**Domain:** kimbleai.com
**DNS Provider:** Cloudflare (colin.ns.cloudflare.com, karina.ns.cloudflare.com)
**Vercel Project:** kimbleai-v4-clean
**Current Deployment:** https://kimbleai-v4-clean-gjad3vigq-kimblezcs-projects.vercel.app

**Active Domains:**
- ✅ kimbleai.com (apex)
- ✅ www.kimbleai.com

---

## Step 1: Configure Cloudflare DNS Records

Since you're using Cloudflare for DNS, configure these records:

### Login to Cloudflare
1. Go to: https://dash.cloudflare.com
2. Select: kimbleai.com domain
3. Click: DNS → Records

### Add/Update These Records

#### For kimbleai.com (apex domain):
```
Type: A
Name: @
IPv4 address: 76.76.21.21
Proxy status: DNS only (gray cloud, NOT proxied)
```

#### For www.kimbleai.com:
```
Type: CNAME
Name: www
Target: cname.vercel-dns.com
Proxy status: DNS only (gray cloud, NOT proxied)
```

**IMPORTANT:** Make sure "Proxy status" is set to "DNS only" (gray cloud icon), NOT "Proxied" (orange cloud). Vercel needs direct DNS to provision SSL certificates.

---

## Step 2: Update Google OAuth Redirect URIs

1. **Go to Google Cloud Console:**
   https://console.cloud.google.com/apis/credentials

2. **Click your OAuth 2.0 Client ID:**
   `968455155458-nuerqfbgqmdarn2hal4es081d9ut152t.apps.googleusercontent.com`

3. **Under "Authorized redirect URIs", add these URLs:**
   ```
   https://kimbleai.com/api/auth/callback/google
   https://www.kimbleai.com/api/auth/callback/google
   https://kimbleai-v4-clean-gjad3vigq-kimblezcs-projects.vercel.app/api/auth/callback/google
   ```

4. **Click "Save"**

---

## Step 3: Update NEXTAUTH_URL Environment Variable

The NEXTAUTH_URL needs to match your primary domain. Update it on Vercel:

```bash
# Remove old value
npx vercel env rm NEXTAUTH_URL production

# Add new value
npx vercel env add NEXTAUTH_URL production
# When prompted, enter: https://www.kimbleai.com
# (or https://kimbleai.com if you prefer apex domain as primary)

# Redeploy to apply changes
npx vercel --prod
```

**Or do it via Vercel Dashboard:**
1. Go to: https://vercel.com/kimblezcs-projects/kimbleai-v4-clean/settings/environment-variables
2. Find NEXTAUTH_URL
3. Edit it to: `https://www.kimbleai.com`
4. Save and redeploy

---

## Step 4: Verify DNS Propagation

After updating Cloudflare DNS, check propagation:

```bash
# Check A record for apex domain
nslookup kimbleai.com

# Check CNAME for www
nslookup www.kimbleai.com

# Or use online tool
# Visit: https://dnschecker.org
# Enter: kimbleai.com and www.kimbleai.com
```

DNS propagation can take:
- 5-10 minutes (typical)
- Up to 48 hours (maximum)

---

## Step 5: Verify Vercel Domain Status

```bash
# Check domain status
npx vercel domains inspect kimbleai.com

# Should show:
# ✓ Domain is configured correctly
# ✓ SSL certificate provisioned
```

---

## Quick Fix for Immediate Access

**While waiting for DNS propagation**, you can use the Vercel URL:

1. **Add Vercel URL to Google OAuth** (do this NOW):
   ```
   https://kimbleai-v4-clean-gjad3vigq-kimblezcs-projects.vercel.app/api/auth/callback/google
   ```

2. **Update NEXTAUTH_URL temporarily**:
   ```bash
   npx vercel env add NEXTAUTH_URL production
   # Enter: https://kimbleai-v4-clean-gjad3vigq-kimblezcs-projects.vercel.app

   npx vercel --prod
   ```

3. **Access the site**:
   https://kimbleai-v4-clean-gjad3vigq-kimblezcs-projects.vercel.app

This will let you use the site immediately while DNS propagates.

---

## Troubleshooting

### SSL Certificate Not Provisioning

**Problem:** Cloudflare proxy interfering with Vercel SSL

**Solution:**
1. In Cloudflare, set proxy status to "DNS only" (gray cloud)
2. Wait 5 minutes
3. Check Vercel dashboard - SSL should provision automatically

### "redirect_uri_mismatch" Error

**Problem:** Google OAuth redirect URI doesn't match

**Solutions:**
1. Make sure Google OAuth has the correct redirect URI
2. Make sure NEXTAUTH_URL matches your domain
3. Make sure you're accessing the site using the correct URL

**Check current NEXTAUTH_URL:**
```bash
npx vercel env pull .env.vercel
cat .env.vercel | grep NEXTAUTH_URL
```

### Domain Not Resolving

**Problem:** DNS not pointing to Vercel

**Solution:**
1. Verify Cloudflare DNS records are correct
2. Make sure proxy is OFF (DNS only)
3. Wait for DNS propagation
4. Use `nslookup` to verify

---

## Final Configuration Summary

**Cloudflare DNS:**
```
Type: A    | Name: @   | Value: 76.76.21.21              | Proxy: OFF
Type: CNAME| Name: www | Value: cname.vercel-dns.com     | Proxy: OFF
```

**Google OAuth Redirect URIs:**
```
https://kimbleai.com/api/auth/callback/google
https://www.kimbleai.com/api/auth/callback/google
https://kimbleai-v4-clean-gjad3vigq-kimblezcs-projects.vercel.app/api/auth/callback/google (temporary)
```

**Vercel Environment:**
```
NEXTAUTH_URL=https://www.kimbleai.com
```

**Configuration:**
- ✅ Use ONLY kimbleai.com and www.kimbleai.com
- ⚡ Keep Cloudflare proxy OFF for these domains
- 🔒 Vercel handles SSL certificates automatically

---

## Next Steps

1. ✅ Update Cloudflare DNS records (5 minutes)
2. ✅ Add redirect URIs to Google OAuth (2 minutes)
3. ⏳ Wait for DNS propagation (5-60 minutes)
4. ✅ Update NEXTAUTH_URL on Vercel (1 minute)
5. ✅ Redeploy with `npx vercel --prod` (1 minute)
6. ✅ Test login at www.kimbleai.com

Total time: ~10-70 minutes (depending on DNS propagation)

---

**Need help with any of these steps?** Let me know!
