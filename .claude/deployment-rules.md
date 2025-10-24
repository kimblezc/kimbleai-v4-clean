# Deployment & Caching Rules

## Critical: Always Configure These on New Projects

### 1. Vercel Auto-Deployment Configuration

**File**: `vercel.json`

Add these sections to enable automatic deployments on git push:

```json
{
  "github": {
    "enabled": true,
    "silent": false,
    "autoAlias": true,
    "autoJobCancelation": true
  },
  "git": {
    "deploymentEnabled": {
      "master": true
    }
  }
}
```

**What this does**:
- Git push to master automatically triggers Vercel deployment
- No need for manual `vercel --prod` commands
- Deployment happens within 1-2 minutes of push

### 2. Cache-Control Headers Configuration

**File**: `vercel.json`

Add these headers to prevent stale cache issues:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        }
      ]
    },
    {
      "source": "/_next/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-store, no-cache, must-revalidate"
        }
      ]
    }
  ]
}
```

**What each does**:
- `/(.*)`  - Pages/HTML: Always check for updates on refresh
- `/_next/static/(*)` - Next.js assets: Cache forever (hashed filenames)
- `/static/(*)` - Public assets: Cache forever (hashed filenames)
- `/api/(*)` - API routes: Never cache dynamic data

### 3. Next.js Build-Time Git Hash

**File**: `next.config.js`

Ensure git commit hash is available at runtime:

```javascript
const { execSync } = require('child_process');

function getGitCommitHash() {
  try {
    return execSync('git log -1 --format=%h').toString().trim();
  } catch (error) {
    return 'unknown';
  }
}

module.exports = {
  env: {
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA || 'dev',
    NEXT_PUBLIC_GIT_COMMIT_HASH: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || getGitCommitHash(),
  }
}
```

**What this does**:
- Users can verify which code version is deployed
- Helps debug cache issues
- Display in UI: `v1.6.0 @ 79823ac`

## Deployment Workflow

With these rules configured:

```bash
# 1. Make changes
git add .
git commit -m "feat: add new feature"

# 2. Push (triggers auto-deploy)
git push

# 3. Wait 1-2 minutes for Vercel build

# 4. Hard refresh browser
# Windows: Ctrl + Shift + R
# Mac: Cmd + Shift + R

# 5. ✅ See latest version immediately
```

## Troubleshooting

### Deployment Not Triggering
- Check GitHub integration in Vercel dashboard
- Verify `vercel.json` has github.enabled: true
- Check repository permissions

### Still Seeing Old Version After Deploy
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Try incognito window
- Check actual deployment URL directly (bypasses CDN)
- Verify Cache-Control headers in Network tab

### Cache Headers Not Working
- Check vercel.json syntax is valid JSON
- Ensure headers array is at root level
- Headers must match source paths exactly

## Why These Rules Matter

**Without auto-deployment**:
- Must manually run `vercel --prod` every time
- Easy to forget
- Slows down development

**Without cache headers**:
- Users see stale content for hours/days
- Hard to debug which version is deployed
- CDN caches pages indefinitely

**With both configured**:
- Push code → auto-deploy → users see updates within minutes
- Predictable, reliable deployment pipeline
- No manual intervention needed

## Complete vercel.json Template

```json
{
  "github": {
    "enabled": true,
    "silent": false,
    "autoAlias": true,
    "autoJobCancelation": true
  },
  "git": {
    "deploymentEnabled": {
      "master": true
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        }
      ]
    },
    {
      "source": "/_next/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-store, no-cache, must-revalidate"
        }
      ]
    }
  ]
}
```

## Date Created
2025-10-24

## Last Updated
2025-10-24

## Related Issues Fixed
- Projects sidebar inconsistency (bdd5fb9)
- Search bar alignment (2ba0536)
- Auto-deployment not working (79823ac)
- Cache preventing users from seeing updates (79823ac)
