#!/usr/bin/env node

/**
 * Comprehensive Vercel Environment Variable Whitespace Scanner
 *
 * Detects:
 * - Literal \n characters
 * - Literal \r characters
 * - Trailing spaces
 * - Leading spaces
 * - Tabs
 * - Multiple consecutive spaces
 * - Non-printable characters
 * - Unicode whitespace
 *
 * Usage:
 *   node scripts/scan-vercel-env-whitespace.js
 *
 * Auto-fix mode:
 *   node scripts/scan-vercel-env-whitespace.js --fix
 */

const fs = require('fs');
const { execSync } = require('child_process');

const AUTO_FIX = process.argv.includes('--fix');

console.log('\n' + '='.repeat(80));
console.log('🔍 VERCEL ENVIRONMENT VARIABLE WHITESPACE SCANNER');
console.log('='.repeat(80) + '\n');

// Pull current production environment variables
console.log('📥 Pulling production environment variables from Vercel...\n');

try {
  execSync('npx vercel env pull .env.vercel.scan --environment production', {
    stdio: 'inherit'
  });
} catch (error) {
  console.error('❌ Failed to pull environment variables from Vercel');
  console.error('Make sure you\'re logged in: npx vercel login');
  process.exit(1);
}

// Read the pulled env file
const envContent = fs.readFileSync('.env.vercel.scan', 'utf8');
const lines = envContent.split('\n');

const issues = [];
const warnings = [];

lines.forEach((line, index) => {
  const lineNum = index + 1;

  // Skip empty lines and comments
  if (!line.trim() || line.trim().startsWith('#')) {
    return;
  }

  // Parse key=value
  const match = line.match(/^([^=]+)=(.*)$/);
  if (!match) {
    warnings.push({
      line: lineNum,
      issue: 'Malformed line (no = sign)',
      content: line.substring(0, 50)
    });
    return;
  }

  const [, key, value] = match;

  // Skip certain known keys that legitimately have complex values
  const skipKeys = ['VERCEL_OIDC_TOKEN', 'VERCEL_GIT_COMMIT_MESSAGE'];
  if (skipKeys.includes(key.trim())) {
    return;
  }

  // Check for various whitespace issues
  const checks = [
    {
      test: /\\n/,
      name: 'Literal \\n character',
      severity: 'CRITICAL',
      fix: (v) => v.replace(/\\n/g, '')
    },
    {
      test: /\\r/,
      name: 'Literal \\r character',
      severity: 'CRITICAL',
      fix: (v) => v.replace(/\\r/g, '')
    },
    {
      test: /^\s/,
      name: 'Leading whitespace',
      severity: 'HIGH',
      fix: (v) => v.trimStart()
    },
    {
      test: /\s$/,
      name: 'Trailing whitespace',
      severity: 'HIGH',
      fix: (v) => v.trimEnd()
    },
    {
      test: /\t/,
      name: 'Tab character',
      severity: 'MEDIUM',
      fix: (v) => v.replace(/\t/g, '')
    },
    {
      test: /  +/,
      name: 'Multiple consecutive spaces',
      severity: 'LOW',
      fix: (v) => v.replace(/  +/g, ' ')
    },
    {
      test: /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/,
      name: 'Non-printable control characters',
      severity: 'CRITICAL',
      fix: (v) => v.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    },
    {
      test: /[\u200B-\u200D\uFEFF]/,
      name: 'Unicode zero-width characters',
      severity: 'HIGH',
      fix: (v) => v.replace(/[\u200B-\u200D\uFEFF]/g, '')
    },
    {
      test: /[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/,
      name: 'Unicode whitespace',
      severity: 'MEDIUM',
      fix: (v) => v.replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
    }
  ];

  // Remove quotes from value for checking (but keep them for display)
  let valueToCheck = value;
  let hasQuotes = false;
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    valueToCheck = value.slice(1, -1);
    hasQuotes = true;
  }

  checks.forEach(check => {
    if (check.test.test(valueToCheck)) {
      issues.push({
        line: lineNum,
        key: key.trim(),
        value: value.substring(0, 80), // Truncate for display
        issue: check.name,
        severity: check.severity,
        fix: check.fix,
        fullValue: value,
        hasQuotes
      });
    }
  });
});

// Clean up temp file
fs.unlinkSync('.env.vercel.scan');

// Report results
console.log('\n' + '='.repeat(80));
console.log('📊 SCAN RESULTS');
console.log('='.repeat(80) + '\n');

if (issues.length === 0 && warnings.length === 0) {
  console.log('✅ No whitespace issues found! All environment variables are clean.\n');
  process.exit(0);
}

// Group by severity
const critical = issues.filter(i => i.severity === 'CRITICAL');
const high = issues.filter(i => i.severity === 'HIGH');
const medium = issues.filter(i => i.severity === 'MEDIUM');
const low = issues.filter(i => i.severity === 'LOW');

console.log(`Found ${issues.length} issue(s) across ${new Set(issues.map(i => i.key)).size} environment variable(s)\n`);

if (critical.length > 0) {
  console.log('🔴 CRITICAL ISSUES (Fix immediately!)');
  console.log('-'.repeat(80));
  critical.forEach(issue => {
    console.log(`\n  Variable: ${issue.key}`);
    console.log(`  Issue: ${issue.issue}`);
    console.log(`  Line: ${issue.line}`);
    console.log(`  Value preview: ${issue.value.substring(0, 60)}...`);
  });
  console.log('\n');
}

if (high.length > 0) {
  console.log('🟡 HIGH PRIORITY ISSUES');
  console.log('-'.repeat(80));
  high.forEach(issue => {
    console.log(`\n  Variable: ${issue.key}`);
    console.log(`  Issue: ${issue.issue}`);
    console.log(`  Line: ${issue.line}`);
  });
  console.log('\n');
}

if (medium.length > 0) {
  console.log('🟠 MEDIUM PRIORITY ISSUES');
  console.log('-'.repeat(80));
  medium.forEach(issue => {
    console.log(`  ${issue.key}: ${issue.issue}`);
  });
  console.log('\n');
}

if (low.length > 0) {
  console.log('🔵 LOW PRIORITY ISSUES');
  console.log('-'.repeat(80));
  low.forEach(issue => {
    console.log(`  ${issue.key}: ${issue.issue}`);
  });
  console.log('\n');
}

if (warnings.length > 0) {
  console.log('⚠️  WARNINGS');
  console.log('-'.repeat(80));
  warnings.forEach(warn => {
    console.log(`  Line ${warn.line}: ${warn.issue}`);
    console.log(`  Content: ${warn.content}`);
  });
  console.log('\n');
}

// Generate fix commands
console.log('='.repeat(80));
console.log('🔧 FIX COMMANDS');
console.log('='.repeat(80) + '\n');

// Group by unique keys
const uniqueKeys = [...new Set(issues.map(i => i.key))];

if (AUTO_FIX) {
  console.log('🤖 AUTO-FIX MODE ENABLED\n');
  console.log('The following commands will be executed:\n');
}

const fixCommands = [];

uniqueKeys.forEach(key => {
  const keyIssues = issues.filter(i => i.key === key);

  // Get the original value
  let originalValue = keyIssues[0].fullValue;

  // Remove quotes if present
  if (keyIssues[0].hasQuotes) {
    originalValue = originalValue.slice(1, -1);
  }

  // Apply all fixes
  let cleanValue = originalValue;
  keyIssues.forEach(issue => {
    cleanValue = issue.fix(cleanValue);
  });

  console.log(`# Fix ${key} (${keyIssues.length} issue(s))`);
  console.log(`printf "y\\n" | npx vercel env rm ${key} production`);
  console.log(`printf "${cleanValue}" | npx vercel env add ${key} production  # NO trailing \\n!`);
  console.log('');

  fixCommands.push({
    key,
    remove: `printf "y\\n" | npx vercel env rm ${key} production`,
    add: `printf "${cleanValue}" | npx vercel env add ${key} production`
  });
});

if (AUTO_FIX) {
  console.log('Executing fixes...\n');

  fixCommands.forEach(cmd => {
    console.log(`\n🔧 Fixing ${cmd.key}...`);

    try {
      console.log('  Removing old value...');
      execSync(cmd.remove, { stdio: 'inherit' });

      console.log('  Adding clean value...');
      execSync(cmd.add, { stdio: 'inherit' });

      console.log(`  ✅ ${cmd.key} fixed!`);
    } catch (error) {
      console.error(`  ❌ Failed to fix ${cmd.key}`);
      console.error(error.message);
    }
  });

  console.log('\n' + '='.repeat(80));
  console.log('✅ AUTO-FIX COMPLETE');
  console.log('='.repeat(80) + '\n');
  console.log('⚠️  IMPORTANT: Redeploy to apply changes:');
  console.log('   npx vercel --prod\n');
} else {
  console.log('💡 To automatically fix all issues, run:');
  console.log('   node scripts/scan-vercel-env-whitespace.js --fix\n');
  console.log('⚠️  Or copy/paste the commands above to fix manually.\n');
}

// Save detailed report
const reportPath = 'VERCEL-ENV-SCAN-REPORT.md';
const report = `# Vercel Environment Variable Scan Report
**Date:** ${new Date().toISOString()}
**Issues Found:** ${issues.length}
**Variables Affected:** ${uniqueKeys.length}

## Summary

- 🔴 Critical: ${critical.length}
- 🟡 High: ${high.length}
- 🟠 Medium: ${medium.length}
- 🔵 Low: ${low.length}

## Critical Issues

${critical.map(i => `- **${i.key}**: ${i.issue}\n  - Value: \`${i.value.substring(0, 60)}...\``).join('\n')}

## High Priority Issues

${high.map(i => `- **${i.key}**: ${i.issue}`).join('\n')}

## Medium Priority Issues

${medium.map(i => `- **${i.key}**: ${i.issue}`).join('\n')}

## Low Priority Issues

${low.map(i => `- **${i.key}**: ${i.issue}`).join('\n')}

## Fix Commands

\`\`\`bash
${fixCommands.map(cmd => `${cmd.remove}\n${cmd.add}`).join('\n\n')}
\`\`\`

## Next Steps

1. Review the issues above
2. Run fix commands OR use \`node scripts/scan-vercel-env-whitespace.js --fix\`
3. Redeploy: \`npx vercel --prod\`
`;

fs.writeFileSync(reportPath, report);
console.log(`📄 Detailed report saved to: ${reportPath}\n`);

process.exit(issues.length > 0 ? 1 : 0);
