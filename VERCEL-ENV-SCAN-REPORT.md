# Vercel Environment Variable Scan Report
**Date:** 2025-10-06T04:47:42.546Z
**Issues Found:** 2
**Variables Affected:** 2

## Summary

- 🔴 Critical: 2
- 🟡 High: 0
- 🟠 Medium: 0
- 🔵 Low: 0

## Critical Issues

- **ASSEMBLYAI_API_KEY**: Literal \n character
  - Value: `"f4e7e2cf1ced4d3d83c15f7206d5c74b\n"...`
- **NEXTAUTH_URL**: Literal \n character
  - Value: `"https://www.kimbleai.com\n"...`

## High Priority Issues



## Medium Priority Issues



## Low Priority Issues



## Fix Commands

```bash
echo "y" | npx vercel env rm ASSEMBLYAI_API_KEY production
echo "f4e7e2cf1ced4d3d83c15f7206d5c74b" | npx vercel env add ASSEMBLYAI_API_KEY production

echo "y" | npx vercel env rm NEXTAUTH_URL production
echo "https://www.kimbleai.com" | npx vercel env add NEXTAUTH_URL production
```

## Next Steps

1. Review the issues above
2. Run fix commands OR use `node scripts/scan-vercel-env-whitespace.js --fix`
3. Redeploy: `npx vercel --prod`
