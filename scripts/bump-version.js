#!/usr/bin/env node

/**
 * Version Bump Script
 *
 * Usage:
 *   node scripts/bump-version.js patch   - Increment patch version (1.0.0 -> 1.0.1)
 *   node scripts/bump-version.js minor   - Increment minor version (1.0.0 -> 1.1.0)
 *   node scripts/bump-version.js major   - Increment major version (1.0.0 -> 2.0.0)
 *
 * When to use each:
 *   - PATCH (1.0.x): Bug fixes, small tweaks, documentation updates
 *   - MINOR (1.x.0): New features, improvements, non-breaking changes
 *   - MAJOR (x.0.0): Breaking changes, major redesigns, architecture changes
 */

const fs = require('fs');
const path = require('path');

const versionFile = path.join(__dirname, '..', 'version.json');
const versionData = JSON.parse(fs.readFileSync(versionFile, 'utf8'));

const type = process.argv[2] || 'patch';

if (!['major', 'minor', 'patch'].includes(type)) {
  console.error('Invalid version type. Use: major, minor, or patch');
  process.exit(1);
}

const [major, minor, patch] = versionData.version.split('.').map(Number);

let newVersion;
switch (type) {
  case 'major':
    newVersion = `${major + 1}.0.0`;
    break;
  case 'minor':
    newVersion = `${major}.${minor + 1}.0`;
    break;
  case 'patch':
    newVersion = `${major}.${minor}.${patch + 1}`;
    break;
}

versionData.version = newVersion;
versionData.lastUpdated = new Date().toISOString();

fs.writeFileSync(versionFile, JSON.stringify(versionData, null, 2) + '\n');

console.log(`✓ Version bumped: ${versionData.version.split('.').join('.')} -> ${newVersion}`);
console.log(`  Next steps:`);
console.log(`  1. git add version.json`);
console.log(`  2. git commit -m "chore: Bump version to ${newVersion}"`);
console.log(`  3. git push origin master`);
console.log(`  4. vercel --prod --yes`);
