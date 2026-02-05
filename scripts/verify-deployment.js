#!/usr/bin/env node
/**
 * Deployment Verification Script
 *
 * Checks that the deployed application is healthy and functioning correctly.
 * Run after every deployment: npm run verify:deployed
 */

const https = require('https');

const PRODUCTION_URL = 'https://www.kimbleai.com';
const CHECKS = [
  { name: 'Version API', path: '/api/version', validate: (data) => data.version && data.commit },
  { name: 'Health API', path: '/api/health', validate: (data) => data.status === 'ok' || data.healthy === true },
];

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function log(color, symbol, message) {
  console.log(`${colors[color]}${symbol}${colors.reset} ${message}`);
}

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: null, error: 'Invalid JSON' });
        }
      });
    }).on('error', reject);
  });
}

async function runChecks() {
  console.log(`\n${colors.bold}${colors.blue}═══════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bold}  KimbleAI Deployment Verification${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════${colors.reset}\n`);
  console.log(`Target: ${PRODUCTION_URL}\n`);

  let allPassed = true;
  let versionInfo = null;

  for (const check of CHECKS) {
    try {
      const url = `${PRODUCTION_URL}${check.path}`;
      const result = await fetchJSON(url);

      if (result.status === 200 && result.data && check.validate(result.data)) {
        log('green', '✓', `${check.name}: OK`);
        if (check.name === 'Version API') {
          versionInfo = result.data;
        }
      } else {
        log('red', '✗', `${check.name}: FAILED (status: ${result.status})`);
        allPassed = false;
      }
    } catch (error) {
      log('red', '✗', `${check.name}: ERROR - ${error.message}`);
      allPassed = false;
    }
  }

  console.log('');

  if (versionInfo) {
    console.log(`${colors.bold}Deployed Version:${colors.reset}`);
    console.log(`  Version: v${versionInfo.version}`);
    console.log(`  Commit:  ${versionInfo.commit}`);
    console.log(`  Updated: ${versionInfo.lastUpdated || 'N/A'}`);
    console.log('');
  }

  console.log(`${colors.blue}═══════════════════════════════════════${colors.reset}`);

  if (allPassed) {
    log('green', '✓', `${colors.bold}All checks passed!${colors.reset}`);
    console.log(`${colors.blue}═══════════════════════════════════════${colors.reset}\n`);
    process.exit(0);
  } else {
    log('red', '✗', `${colors.bold}Some checks failed!${colors.reset}`);
    console.log(`${colors.blue}═══════════════════════════════════════${colors.reset}\n`);
    process.exit(1);
  }
}

runChecks().catch(err => {
  log('red', '✗', `Verification failed: ${err.message}`);
  process.exit(1);
});
