# Version Guide

The version number appears in the bottom right corner of www.kimbleai.com when you're signed in. Use this to confirm your changes have been deployed.

## Current Version
Check `version.json` or look at the bottom right corner of the site.

## How to Update the Version

### Quick Method (Recommended)
```bash
# For small fixes and tweaks (1.0.0 -> 1.0.1)
node scripts/bump-version.js patch
git add version.json && git commit -m "chore: Bump version to $(node -p "require('./version.json').version")" && git push origin master && vercel --prod --yes

# For new features (1.0.0 -> 1.1.0)
node scripts/bump-version.js minor
git add version.json && git commit -m "chore: Bump version to $(node -p "require('./version.json').version")" && git push origin master && vercel --prod --yes

# For major changes (1.0.0 -> 2.0.0)
node scripts/bump-version.js major
git add version.json && git commit -m "chore: Bump version to $(node -p "require('./version.json').version")" && git push origin master && vercel --prod --yes
```

### What Each Version Type Means

**PATCH (1.0.X)** - Small fixes and tweaks
- Bug fixes
- Typo corrections
- Small UI adjustments
- Documentation updates
- No new features

**MINOR (1.X.0)** - New features and improvements
- New features added
- Improvements to existing features
- New API endpoints
- Backwards compatible changes
- Most deployments will be MINOR

**MAJOR (X.0.0)** - Big changes
- Breaking changes
- Complete redesigns
- Major architecture changes
- Incompatible with previous version
- Use sparingly

## Recommended Workflow

### Daily Development (Most Common)
```bash
# Make your changes...
# Test locally...

# Bump patch version for fixes
node scripts/bump-version.js patch

# Or bump minor version for new features
node scripts/bump-version.js minor

# Commit and deploy
git add version.json
git commit -m "chore: Bump version to v1.0.1"
git push origin master
vercel --prod --yes
```

### Weekly Updates
When you have multiple small changes throughout the week:
- Use MINOR version bump (1.0.0 -> 1.1.0)

### Monthly Milestones
When you've completed a major feature or milestone:
- Consider MAJOR version bump (1.0.0 -> 2.0.0) if there are breaking changes
- Otherwise use MINOR (1.9.0 -> 1.10.0)

## Examples

### Example 1: Fixed a bug in Drive export
```bash
node scripts/bump-version.js patch  # 1.0.0 -> 1.0.1
# Commit: "fix: Drive export authentication"
```

### Example 2: Added new transcription feature
```bash
node scripts/bump-version.js minor  # 1.0.1 -> 1.1.0
# Commit: "feat: Add speaker detection to transcriptions"
```

### Example 3: Rebuilt entire chat interface
```bash
node scripts/bump-version.js major  # 1.1.0 -> 2.0.0
# Commit: "feat!: Complete chat interface redesign"
```

## Checking if Changes Are Deployed

1. Visit https://www.kimbleai.com
2. Sign in
3. Look at the bottom right corner
4. Compare the version number with your local `version.json`
5. If they match, your changes are live!

## Troubleshooting

**Version not showing on site?**
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Clear browser cache
- Check if you're signed in (version only shows when authenticated)

**Version shows old number after deployment?**
- Wait 30-60 seconds for CDN propagation
- Check Vercel dashboard to confirm deployment succeeded
- Verify version.json was committed and pushed

**Forgot to bump version before deploying?**
- No problem! Just bump it now and deploy again
- The version will update on the next visit

## Manual Version Update (If Script Doesn't Work)

Edit `version.json` directly:
```json
{
  "version": "1.0.1",
  "lastUpdated": "2025-10-23T12:00:00Z",
  "changelog": "Fixed Drive export bug"
}
```

Then commit and deploy as usual.
