# Fix Google "Untrusted App" Warning

## Problem

When logging in with Google, you see a scary warning screen requiring 8+ clicks:
- "Google hasn't verified this app"
- "This app wants access to your Drive, Gmail, Calendar"
- Multiple confirmation steps

## Why This Happens

Your app requests **sensitive scopes** (Drive, Gmail, Calendar) but isn't verified by Google. This triggers extra security warnings.

---

## Solution 1: Make App "Internal" (RECOMMENDED for Private Use)

**Best if**: Only you and specific users (like Rebecca) will use kimbleai.com

### Steps:

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/

2. **Select Your Project**
   - Top dropdown → Select your kimbleai project

3. **Navigate to OAuth Consent Screen**
   - Left menu → "APIs & Services" → "OAuth consent screen"

4. **Change to Internal**
   - Under "User Type", select **"Internal"**
   - Click "Save"

### Result:
- ✅ **No warning screen for workspace users**
- ✅ **Clean, simple login**
- ✅ **Immediate effect** (works right away)
- ❌ **Only works for Google Workspace accounts** (not @gmail.com)

---

## Solution 2: Add Test Users (For @gmail.com Accounts)

**Best if**: Using personal Gmail accounts (@gmail.com)

### Steps:

1. **Go to OAuth Consent Screen**
   - https://console.cloud.google.com/apis/credentials/consent

2. **Click "Add Users"**
   - Under "Test users" section
   - Click "+ ADD USERS"

3. **Add Email Addresses**
   ```
   zach.kimble@gmail.com
   becky.aza.kimble@gmail.com
   ```

4. **Save**

### Result:
- ✅ **Test users bypass warning screen**
- ✅ **Works with @gmail.com accounts**
- ✅ **Immediate effect**
- ⚠️ **Limited to 100 test users**

---

## Solution 3: Submit for Google Verification (For Public Use)

**Best if**: Making kimbleai.com available to the public

### Steps:

1. **Go to OAuth Consent Screen**
   - https://console.cloud.google.com/apis/credentials/consent

2. **Complete All Required Fields**
   - App name
   - User support email
   - App logo (120x120 px)
   - App domain
   - Authorized domains
   - Privacy policy URL
   - Terms of service URL

3. **Submit for Verification**
   - Click "Submit for Verification"
   - Fill out questionnaire
   - Provide demo account
   - Wait 1-2 weeks

### Result:
- ✅ **No warnings for anyone**
- ✅ **Professional, verified app**
- ❌ **Takes 1-2 weeks**
- ❌ **Requires documentation**

---

## Comparison

| Solution | Time | Effort | Who Can Use | Limitations |
|----------|------|--------|-------------|-------------|
| **Internal** | Instant | 1 minute | Workspace users only | Not for @gmail.com |
| **Test Users** | Instant | 2 minutes | Anyone (up to 100) | Manual user management |
| **Verification** | 1-2 weeks | Hours | Anyone | Requires documentation |

---

## Recommended Approach

**For you (Zach and Rebecca)**:

1. ✅ **Use Test Users** (Solution 2)
   - Fastest solution
   - Works with your @gmail.com accounts
   - Takes 2 minutes

### Quick Setup:

```
1. Visit: https://console.cloud.google.com/apis/credentials/consent
2. Scroll to "Test users"
3. Click "+ ADD USERS"
4. Enter:
   - zach.kimble@gmail.com
   - becky.aza.kimble@gmail.com
5. Save
6. Done!
```

**Next login**: No warning screen, just 1-2 clicks!

---

## After Fixing

Once you've added yourself as a test user:

1. **Log out** of kimbleai.com completely
2. **Clear browser cache** (or use incognito)
3. **Log in again**
4. **See**: Clean consent screen, 1-2 clicks total

---

## What We Kept

The app still requests full access to:
- ✅ **Google Drive** (read/write files)
- ✅ **Gmail** (read emails)
- ✅ **Calendar** (read/write events)
- ✅ **Profile** (name, email, picture)

These scopes are **necessary** for kimbleai.com features.

---

## Session Fix (Already Done)

✅ **Fixed**: Sessions now last 30 days instead of expiring quickly

You won't get logged out constantly anymore!

---

## Questions?

### "Why can't we just remove the scopes?"

Because you need them for:
- **Drive**: File storage, document access
- **Gmail**: Email integration
- **Calendar**: Event management

Removing them would break features.

### "Will this affect functionality?"

No! The scopes (and functionality) remain the same. We're just telling Google who's allowed to use the app without warnings.

### "Do I have to do this again?"

No! Once you:
- Add test users, OR
- Change to Internal, OR
- Get verified

...the fix is permanent.

---

## Next Steps

1. **Add yourself as a test user** (2 minutes)
2. **Wait for kimbleai.com deployment** (~7 minutes from now)
3. **Log out and log back in**
4. **Enjoy smooth login!** 🎉
