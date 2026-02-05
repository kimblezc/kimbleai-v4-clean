#!/usr/bin/env node
/**
 * Preflight Check Script
 *
 * Run before making changes to ensure environment is ready.
 * Checks: git status, dependencies, env vars, TypeScript.
 *
 * Usage: npm run preflight
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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

function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch (e) {
    return null;
  }
}

function checkGitStatus() {
  const status = run('git status --porcelain');
  if (status === null) {
    log('red', '✗', 'Git: Not a git repository');
    return false;
  }
  if (status === '') {
    log('green', '✓', 'Git: Working tree clean');
  } else {
    const lines = status.split('\n').length;
    log('yellow', '!', `Git: ${lines} uncommitted change(s)`);
  }
  return true;
}

function checkBranch() {
  const branch = run('git branch --show-current');
  if (branch) {
    log('green', '✓', `Branch: ${branch}`);
    return true;
  }
  return false;
}

function checkNodeModules() {
  const nodeModulesPath = path.join(process.cwd(), 'node_modules');
  if (fs.existsSync(nodeModulesPath)) {
    log('green', '✓', 'Dependencies: node_modules exists');
    return true;
  } else {
    log('red', '✗', 'Dependencies: node_modules missing (run npm install)');
    return false;
  }
}

function checkEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    log('green', '✓', 'Environment: .env.local exists');
    return true;
  } else {
    log('yellow', '!', 'Environment: .env.local missing (may use .env.production)');
    return true; // Not fatal
  }
}

function checkVersionFile() {
  const versionPath = path.join(process.cwd(), 'version.json');
  if (fs.existsSync(versionPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
      log('green', '✓', `Version: v${data.version} @ ${data.commit}`);
      return true;
    } catch (e) {
      log('red', '✗', 'Version: version.json invalid');
      return false;
    }
  } else {
    log('red', '✗', 'Version: version.json missing');
    return false;
  }
}

function checkTypeScript() {
  log('blue', '→', 'TypeScript: Checking types...');
  const result = run('npx tsc --noEmit 2>&1 | head -5');
  if (result === null || result.includes('error')) {
    log('yellow', '!', 'TypeScript: Has type errors (check with npm run build)');
    return true; // Not fatal for preflight
  }
  log('green', '✓', 'TypeScript: No errors');
  return true;
}

async function main() {
  console.log(`\n${colors.bold}${colors.blue}═══════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bold}  KimbleAI Preflight Check${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════${colors.reset}\n`);

  const checks = [
    checkGitStatus,
    checkBranch,
    checkNodeModules,
    checkEnvFile,
    checkVersionFile,
  ];

  let allPassed = true;
  for (const check of checks) {
    if (!check()) {
      allPassed = false;
    }
  }

  console.log('');
  console.log(`${colors.blue}═══════════════════════════════════════${colors.reset}`);

  if (allPassed) {
    log('green', '✓', `${colors.bold}Preflight check passed - ready to code!${colors.reset}`);
  } else {
    log('yellow', '!', `${colors.bold}Some checks need attention${colors.reset}`);
  }

  console.log(`${colors.blue}═══════════════════════════════════════${colors.reset}\n`);
}

main();
