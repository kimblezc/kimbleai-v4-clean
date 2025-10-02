#!/usr/bin/env node
/**
 * Environment Variable Whitespace Scanner
 *
 * Scans all .env files for hidden characters (newlines, carriage returns, tabs, spaces)
 * that can cause hours of debugging when used in API keys and credentials.
 *
 * Usage: node scripts/scan-env-whitespace.js
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const MAGENTA = '\x1b[35m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

// Hidden character mappings
const HIDDEN_CHARS = {
  '\n': { name: 'LINE FEED (\\n)', code: 0x0A, color: RED },
  '\r': { name: 'CARRIAGE RETURN (\\r)', code: 0x0D, color: RED },
  '\t': { name: 'TAB (\\t)', code: 0x09, color: YELLOW },
  '\v': { name: 'VERTICAL TAB (\\v)', code: 0x0B, color: YELLOW },
  '\f': { name: 'FORM FEED (\\f)', code: 0x0C, color: YELLOW },
  '\u00A0': { name: 'NON-BREAKING SPACE', code: 0xA0, color: YELLOW },
  '\u2028': { name: 'LINE SEPARATOR', code: 0x2028, color: RED },
  '\u2029': { name: 'PARAGRAPH SEPARATOR', code: 0x2029, color: RED },
};

// Files to scan
const ENV_FILES = [
  '.env',
  '.env.local',
  '.env.production',
  '.env.development',
  '.env.vercel-check',
  '.env.test',
];

/**
 * Detect hidden characters in a string
 */
function detectHiddenCharacters(value) {
  const issues = [];

  // Check for leading/trailing spaces
  if (value.startsWith(' ')) {
    issues.push({
      position: 'start',
      char: ' ',
      name: 'LEADING SPACE',
      code: 0x20,
      color: YELLOW,
      index: 0
    });
  }

  if (value.endsWith(' ')) {
    issues.push({
      position: 'end',
      char: ' ',
      name: 'TRAILING SPACE',
      code: 0x20,
      color: YELLOW,
      index: value.length - 1
    });
  }

  // Check for hidden characters
  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    if (HIDDEN_CHARS[char]) {
      issues.push({
        position: i === 0 ? 'start' : i === value.length - 1 ? 'end' : 'middle',
        char: char,
        name: HIDDEN_CHARS[char].name,
        code: HIDDEN_CHARS[char].code,
        color: HIDDEN_CHARS[char].color,
        index: i
      });
    }
  }

  return issues;
}

/**
 * Generate hex dump of a value
 */
function hexDump(value, maxLength = 80) {
  const truncated = value.length > maxLength ? value.substring(0, maxLength) + '...' : value;
  const hex = Array.from(truncated)
    .map(c => {
      const code = c.charCodeAt(0);
      const hexStr = code.toString(16).toUpperCase().padStart(2, '0');
      // Highlight hidden characters
      if (HIDDEN_CHARS[c] || code === 0x20) {
        return `${RED}${hexStr}${RESET}`;
      }
      return hexStr;
    })
    .join(' ');
  return hex;
}

/**
 * Mask sensitive values for display
 */
function maskValue(value, varName) {
  // Don't mask URLs
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }

  // Mask API keys and secrets
  if (varName.toLowerCase().includes('key') ||
      varName.toLowerCase().includes('secret') ||
      varName.toLowerCase().includes('token')) {
    if (value.length <= 8) {
      return '***';
    }
    return `${value.substring(0, 6)}...${value.substring(value.length - 4)}`;
  }

  return value;
}

/**
 * Parse an .env file and extract variables
 */
function parseEnvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const variables = [];

  lines.forEach((line, lineNumber) => {
    // Skip comments and empty lines
    if (line.trim().startsWith('#') || line.trim() === '') {
      return;
    }

    // Match KEY=value or KEY="value"
    const match = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*"?(.+?)"?\s*$/);
    if (match) {
      const [, varName, rawValue] = match;

      // Remove surrounding quotes if present
      let value = rawValue;
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      variables.push({
        name: varName,
        value: value,
        lineNumber: lineNumber + 1,
        rawLine: line
      });
    }
  });

  return variables;
}

/**
 * Scan a single environment file
 */
function scanFile(filePath) {
  console.log(`\n${BOLD}${BLUE}=== Scanning: ${filePath} ===${RESET}\n`);

  if (!fs.existsSync(filePath)) {
    console.log(`${YELLOW}⚠  File does not exist${RESET}\n`);
    return { scanned: 0, issues: 0, critical: 0 };
  }

  const variables = parseEnvFile(filePath);
  let issueCount = 0;
  let criticalCount = 0;

  if (variables.length === 0) {
    console.log(`${YELLOW}⚠  No variables found${RESET}\n`);
    return { scanned: 0, issues: 0, critical: 0 };
  }

  variables.forEach(variable => {
    const { name, value, lineNumber, rawLine } = variable;
    const issues = detectHiddenCharacters(value);

    if (issues.length > 0) {
      issueCount++;

      // Determine if this is critical (newline or carriage return in API key)
      const isCritical = issues.some(issue =>
        (issue.code === 0x0A || issue.code === 0x0D) &&
        (name.includes('KEY') || name.includes('SECRET') || name.includes('TOKEN'))
      );

      if (isCritical) {
        criticalCount++;
        console.log(`${BOLD}${RED}🚨 CRITICAL ISSUE${RESET}`);
      } else {
        console.log(`${BOLD}${YELLOW}⚠  WARNING${RESET}`);
      }

      console.log(`${CYAN}Variable:${RESET} ${name} (line ${lineNumber})`);
      console.log(`${CYAN}Value:${RESET} ${maskValue(value, name)}`);
      console.log(`${CYAN}Length:${RESET} ${value.length} characters`);

      // Show issues
      console.log(`${CYAN}Issues:${RESET}`);
      issues.forEach(issue => {
        console.log(`  ${issue.color}• ${issue.name} at position ${issue.index} (${issue.position})${RESET}`);
        console.log(`    Byte: 0x${issue.code.toString(16).toUpperCase().padStart(2, '0')}`);
      });

      // Show hex dump
      console.log(`${CYAN}Hex dump:${RESET}`);
      console.log(`  ${hexDump(value)}`);

      // Show fix
      const fixedValue = value.trim();
      if (fixedValue !== value) {
        console.log(`${GREEN}Fixed value:${RESET} ${maskValue(fixedValue, name)}`);
        console.log(`${GREEN}New length:${RESET} ${fixedValue.length} characters`);
      }

      console.log('');
    }
  });

  if (issueCount === 0) {
    console.log(`${GREEN}✅ No whitespace issues found in ${variables.length} variables${RESET}\n`);
  } else {
    console.log(`${YELLOW}Found ${issueCount} variable(s) with whitespace issues (${criticalCount} critical)${RESET}\n`);
  }

  return {
    scanned: variables.length,
    issues: issueCount,
    critical: criticalCount
  };
}

/**
 * Main function
 */
function main() {
  console.log(`${BOLD}${MAGENTA}`);
  console.log('╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║       Environment Variable Whitespace Scanner v1.0                ║');
  console.log('║       Detecting hidden \\n, \\r, \\t and other whitespace           ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝');
  console.log(`${RESET}`);

  const rootDir = process.cwd();
  let totalScanned = 0;
  let totalIssues = 0;
  let totalCritical = 0;

  ENV_FILES.forEach(fileName => {
    const filePath = path.join(rootDir, fileName);
    const result = scanFile(filePath);
    totalScanned += result.scanned;
    totalIssues += result.issues;
    totalCritical += result.critical;
  });

  // Summary
  console.log(`${BOLD}${BLUE}=== Summary ===${RESET}\n`);
  console.log(`Total variables scanned: ${totalScanned}`);
  console.log(`Variables with issues: ${totalIssues}`);
  console.log(`Critical issues: ${totalCritical}\n`);

  if (totalCritical > 0) {
    console.log(`${BOLD}${RED}❌ CRITICAL ISSUES DETECTED${RESET}`);
    console.log(`${RED}Hidden newlines/carriage returns found in API keys or secrets.${RESET}`);
    console.log(`${RED}This WILL cause API authentication failures!${RESET}\n`);

    console.log(`${BOLD}How to fix:${RESET}`);
    console.log(`1. Edit the .env file and remove trailing characters from affected variables`);
    console.log(`2. For Vercel, remove and re-add the variable:`);
    console.log(`   ${CYAN}vercel env rm VARIABLE_NAME${RESET}`);
    console.log(`   ${CYAN}echo -n "your_value_here" | vercel env add VARIABLE_NAME${RESET}`);
    console.log(`3. Or use interactive mode (safest):`);
    console.log(`   ${CYAN}vercel env add VARIABLE_NAME${RESET}`);
    console.log(`   (then paste value when prompted)\n`);

    process.exit(1);
  } else if (totalIssues > 0) {
    console.log(`${BOLD}${YELLOW}⚠  NON-CRITICAL ISSUES DETECTED${RESET}`);
    console.log(`${YELLOW}Found whitespace issues that should be cleaned up.${RESET}\n`);
    process.exit(1);
  } else {
    console.log(`${BOLD}${GREEN}✅ ALL CLEAR${RESET}`);
    console.log(`${GREEN}No whitespace issues detected in environment variables.${RESET}\n`);
    process.exit(0);
  }
}

// Run the scanner
main();
