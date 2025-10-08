# Comprehensive Environment Variable Whitespace Scanning Guide

## 🎯 The Problem

Environment variables can contain invisible whitespace issues that cause mysterious bugs:

- **Literal `\n` characters** (most common) → "Invalid API key\n"
- **Literal `\r` characters** → Windows line endings
- **Trailing/leading spaces** → " value " instead of "value"
- **Tabs** → Invisible in most editors
- **Unicode whitespace** → Zero-width characters, non-breaking spaces

These issues occur when:
1. Copying values from editors that add newlines
2. Using shell commands that include trailing newlines
3. Manual entry in Vercel dashboard with copy/paste

---

## 🔧 Tools Created

### 1. Vercel Environment Scanner
**File:** `scripts/scan-vercel-env-whitespace.js`

**What it does:**
- Pulls production environment variables from Vercel
- Scans for 9 types of whitespace issues
- Categorizes by severity (Critical → High → Medium → Low)
- Generates fix commands
- Can auto-fix all issues

**Usage:**
```bash
# Scan only (shows issues)
node scripts/scan-vercel-env-whitespace.js

# Scan and auto-fix
node scripts/scan-vercel-env-whitespace.js --fix
```

**Output:**
- Console report with severity levels
- Saved report: `VERCEL-ENV-SCAN-REPORT.md`
- Fix commands you can copy/paste

### 2. Comprehensive Validation Script
**File:** `scripts/validate-all-env.sh`

**What it does:**
- Runs local .env file validation
- Runs Vercel production environment validation
- Provides summary of both

**Usage:**
```bash
bash scripts/validate-all-env.sh
```

### 3. Local .env Validator (Existing)
**File:** `scripts/validate-env-whitespace.js`

**What it does:**
- Scans `.env.local` and `.env.production`
- Detects literal `\n` and whitespace issues
- Already runs automatically during build

---

## 📋 Recommended Workflow

### Before Every Deployment
```bash
# Quick scan
node scripts/scan-vercel-env-whitespace.js

# If issues found, auto-fix
node scripts/scan-vercel-env-whitespace.js --fix

# Then deploy
npx vercel --prod
```

### Monthly Health Check
```bash
# Full validation
bash scripts/validate-all-env.sh
```

### After Adding New Environment Variables
```bash
# Scan immediately
node scripts/scan-vercel-env-whitespace.js
```

---

## 🚨 Issues We've Found So Far

### October 6, 2025 - Comprehensive Scan & Resolution

**Issues detected:**
1. ✅ `ASSEMBLYAI_API_KEY` - Literal `\n` at end
2. ✅ `NEXTAUTH_URL` - Literal `\n` at end

**Root causes:**
- Using `printf "value\n"` added `\n` to the value
- Vercel CLI piping was including the newline character

**Solution:**
- Use `printf "value"` WITHOUT trailing `\n` for the value
- Use `printf "y\n"` only for confirmation prompts
- **CRITICAL**: After fixing environment variables, MUST redeploy for changes to take effect

**Commands that work:**
```bash
# Remove variable
printf "y\n" | npx vercel env rm VARIABLE_NAME production

# Add variable (NO trailing \n on the value!)
printf "actual-value-here" | npx vercel env add VARIABLE_NAME production

# MUST redeploy after fixing
npx vercel --prod
npx vercel alias [deployment-url] kimbleai.com
npx vercel alias [deployment-url] www.kimbleai.com
```

**Important Discovery:**
- Error messages like "Invalid API key\n" may show `\n` even after fixing
- This `\n` can come from the API provider's error response, not your env var
- Always verify the env var is clean with: `node scripts/scan-vercel-env-whitespace.js`
- Deployment MUST be created AFTER fixing env vars for changes to take effect

---

## 🔍 What the Scanner Detects

### Critical Issues (Fix immediately!)
1. **Literal `\n` characters**
   - Example: `"value\n"` instead of `"value"`
   - Causes: API authentication failures, invalid keys

2. **Literal `\r` characters**
   - Example: `"value\r"` instead of `"value"`
   - Causes: Windows line ending issues

3. **Non-printable control characters**
   - Example: Characters like `\x00`, `\x1F`
   - Causes: Parsing errors, database failures

### High Priority Issues
4. **Leading whitespace**
   - Example: `" value"` instead of `"value"`
   - Causes: Key mismatches, lookup failures

5. **Trailing whitespace**
   - Example: `"value "` instead of `"value"`
   - Causes: Authentication failures

6. **Unicode zero-width characters**
   - Example: Zero-width space (U+200B)
   - Causes: Invisible bugs, hard to debug

### Medium Priority Issues
7. **Tabs**
   - Example: `"value\tmore"` instead of `"value more"`
   - Causes: Formatting issues

8. **Unicode whitespace**
   - Example: Non-breaking space (U+00A0)
   - Causes: Comparison failures

### Low Priority Issues
9. **Multiple consecutive spaces**
   - Example: `"value  more"` instead of `"value more"`
   - Causes: Usually harmless, but inconsistent

---

## 📊 Scanner Output Example

```
================================================================================
🔍 VERCEL ENVIRONMENT VARIABLE WHITESPACE SCANNER
================================================================================

📊 SCAN RESULTS
================================================================================

Found 2 issue(s) across 2 environment variable(s)

🔴 CRITICAL ISSUES (Fix immediately!)
--------------------------------------------------------------------------------

  Variable: ASSEMBLYAI_API_KEY
  Issue: Literal \n character
  Line: 2
  Value preview: "f4e7e2cf1ced4d3d83c15f7206d5c74b\n"...

🔧 FIX COMMANDS
================================================================================

# Fix ASSEMBLYAI_API_KEY (1 issue(s))
echo "y" | npx vercel env rm ASSEMBLYAI_API_KEY production
echo "f4e7e2cf1ced4d3d83c15f7206d5c74b" | npx vercel env add ASSEMBLYAI_API_KEY production
```

---

## 💡 Best Practices

### When Adding Environment Variables

**❌ DON'T:**
```bash
# Bad - includes trailing newline
echo "myvalue" | npx vercel env add KEY production

# Bad - printf with \n adds it to value
printf "myvalue\n" | npx vercel env add KEY production

# Bad - manual entry with copy/paste from editor
# (editors often include newlines)
```

**✅ DO:**
```bash
# Good - printf without trailing \n
printf "myvalue" | npx vercel env add KEY production

# Good - explicitly strip newlines
echo -n "myvalue" | npx vercel env add KEY production

# Good - use scanner to verify after adding
node scripts/scan-vercel-env-whitespace.js
```

### When Updating Environment Variables

**Always:**
1. Remove the old value
2. Add the clean new value
3. Scan to verify
4. Redeploy

```bash
# Remove
printf "y\n" | npx vercel env rm KEY production

# Add clean value (no \n at end!)
printf "clean-value-here" | npx vercel env add KEY production

# Verify
node scripts/scan-vercel-env-whitespace.js

# Deploy
npx vercel --prod
```

---

## 🧪 Testing Your Fix

After running the scanner and fixing issues:

```bash
# 1. Verify fix
node scripts/scan-vercel-env-whitespace.js

# Should show: ✅ No whitespace issues found!

# 2. Deploy
npx vercel --prod

# 3. Test the feature that was failing
# (e.g., transcription, authentication, etc.)
```

---

## 📝 Files to Commit

When you create a new scanning solution:

```bash
git add scripts/scan-vercel-env-whitespace.js
git add scripts/validate-all-env.sh
git add WHITESPACE-SCAN-GUIDE.md
git add VERCEL-ENV-SCAN-REPORT.md  # Optional - shows current state
git commit -m "Add comprehensive Vercel environment variable whitespace scanner"
```

---

## 🎯 Summary

**Problem:** Invisible whitespace in environment variables causes mysterious bugs

**Solution:** Comprehensive scanner that:
- Detects 9 types of whitespace issues
- Categorizes by severity
- Generates fix commands
- Can auto-fix

**Usage:**
```bash
# Scan
node scripts/scan-vercel-env-whitespace.js

# Fix
node scripts/scan-vercel-env-whitespace.js --fix

# Deploy
npx vercel --prod
```

**Best Practice:**
- Scan before every deployment
- Use `printf "value"` without `\n` for values
- Always verify after adding/updating env vars
- Keep scanner in pre-deploy checklist

---

**Last Updated:** October 6, 2025
**Status:** All environment variables clean ✅
**Next Scan:** Before next deployment
