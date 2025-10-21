#!/usr/bin/env node
/**
 * Production Environment Variable Validation Script
 *
 * Validates environment variables for:
 * 1. Actual whitespace characters (\n, \r, \t, trailing spaces)
 * 2. Literal string representations of whitespace ("\\n", "\\r", etc.)
 * 3. API key format validation
 * 4. Required variable presence
 *
 * This script should run:
 * - Before every deployment (npm run prebuild)
 * - In CI/CD pipeline
 * - Manually when debugging environment issues
 *
 * Usage: node scripts/validate-env-whitespace.js
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

/**
 * Detect actual whitespace characters (invisible bytes)
 */
function detectActualWhitespace(value) {
  const issues = [];

  // Check for newlines
  if (value.includes('\n')) {
    issues.push({
      type: 'actual_whitespace',
      severity: 'critical',
      variable: '',
      message: 'Contains actual newline character (0x0A)',
      value: value,
      fix: value.replace(/\n/g, '')
    });
  }

  // Check for carriage returns
  if (value.includes('\r')) {
    issues.push({
      type: 'actual_whitespace',
      severity: 'critical',
      variable: '',
      message: 'Contains actual carriage return (0x0D)',
      value: value,
      fix: value.replace(/\r/g, '')
    });
  }

  // Check for tabs
  if (value.includes('\t')) {
    issues.push({
      type: 'actual_whitespace',
      severity: 'warning',
      variable: '',
      message: 'Contains tab character (0x09)',
      value: value,
      fix: value.replace(/\t/g, '')
    });
  }

  // Check for leading/trailing spaces
  if (value !== value.trim()) {
    issues.push({
      type: 'actual_whitespace',
      severity: 'warning',
      variable: '',
      message: 'Contains leading or trailing spaces',
      value: value,
      fix: value.trim()
    });
  }

  return issues;
}

/**
 * Detect literal string representations of whitespace
 * These are dangerous because they look like escape sequences but are literal characters
 */
function detectLiteralWhitespace(value) {
  const issues = [];

  // Check for literal \n
  if (value.includes('\\n')) {
    issues.push({
      type: 'literal_whitespace',
      severity: 'critical',
      variable: '',
      message: 'Contains literal "\\n" string (backslash-n)',
      value: value,
      fix: value.replace(/\\n/g, '')
    });
  }

  // Check for literal \r
  if (value.includes('\\r')) {
    issues.push({
      type: 'literal_whitespace',
      severity: 'critical',
      variable: '',
      message: 'Contains literal "\\r" string (backslash-r)',
      value: value,
      fix: value.replace(/\\r/g, '')
    });
  }

  // Check for literal \t
  if (value.includes('\\t')) {
    issues.push({
      type: 'literal_whitespace',
      severity: 'warning',
      variable: '',
      message: 'Contains literal "\\t" string (backslash-t)',
      value: value,
      fix: value.replace(/\\t/g, '')
    });
  }

  return issues;
}

/**
 * Validate API key format
 */
function validateApiKeyFormat(varName, value, isProductionFile = true) {
  const issues = [];

  // AssemblyAI - 32 hex characters
  if (varName === 'ASSEMBLYAI_API_KEY') {
    if (!/^[a-f0-9]{32}$/.test(value)) {
      issues.push({
        type: 'format',
        severity: 'critical',
        variable: varName,
        message: 'Invalid AssemblyAI API key format (must be 32 hex characters)',
        value: value
      });
    }
  }

  // OpenAI - starts with sk-
  if (varName === 'OPENAI_API_KEY') {
    if (!/^sk-/.test(value)) {
      issues.push({
        type: 'format',
        severity: 'critical',
        variable: varName,
        message: 'Invalid OpenAI API key format (must start with "sk-")',
        value: value
      });
    }
  }

  // Supabase URL
  if (varName === 'NEXT_PUBLIC_SUPABASE_URL') {
    if (!/^https:\/\/.+\.supabase\.co$/.test(value)) {
      issues.push({
        type: 'format',
        severity: 'critical',
        variable: varName,
        message: 'Invalid Supabase URL format (must be https://[project].supabase.co)',
        value: value
      });
    }
  }

  // Supabase keys - JWT format
  if (varName === 'NEXT_PUBLIC_SUPABASE_ANON_KEY' || varName === 'SUPABASE_SERVICE_ROLE_KEY') {
    if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)) {
      issues.push({
        type: 'format',
        severity: 'critical',
        variable: varName,
        message: 'Invalid Supabase key format (must be JWT: header.payload.signature)',
        value: value
      });
    }
  }

  // Google Client ID
  if (varName === 'GOOGLE_CLIENT_ID') {
    if (!/\.apps\.googleusercontent\.com$/.test(value)) {
      issues.push({
        type: 'format',
        severity: 'critical',
        variable: varName,
        message: 'Invalid Google Client ID format (must end with .apps.googleusercontent.com)',
        value: value
      });
    }
  }

  // NEXTAUTH_URL - only check HTTPS for production files
  if (varName === 'NEXTAUTH_URL' && isProductionFile) {
    if (!/^https:\/\//.test(value)) {
      issues.push({
        type: 'format',
        severity: 'critical',
        variable: varName,
        message: 'NEXTAUTH_URL must use HTTPS in production',
        value: value
      });
    }
  }

  // Zapier Webhooks
  if (varName === 'ZAPIER_WEBHOOK_URL' || varName === 'ZAPIER_MEMORY_WEBHOOK_URL') {
    if (!/^https:\/\/hooks\.zapier\.com\//.test(value)) {
      issues.push({
        type: 'format',
        severity: 'warning',
        variable: varName,
        message: 'Invalid Zapier webhook URL format',
        value: value
      });
    }
  }

  return issues;
}

/**
 * Parse environment file
 */
function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

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
      let [, varName, rawValue] = match;

      // Remove surrounding quotes if present
      if ((rawValue.startsWith('"') && rawValue.endsWith('"')) ||
          (rawValue.startsWith("'") && rawValue.endsWith("'"))) {
        rawValue = rawValue.slice(1, -1);
      }

      variables.push({
        name: varName,
        value: rawValue,
        lineNumber: lineNumber + 1
      });
    }
  });

  return variables;
}

/**
 * Validate a single environment variable
 */
function validateVariable(variable, isProductionFile = true) {
  const { name, value } = variable;
  const allIssues = [];

  // Check for actual whitespace
  const actualWhitespaceIssues = detectActualWhitespace(value);
  actualWhitespaceIssues.forEach(issue => {
    issue.variable = name;
    allIssues.push(issue);
  });

  // Check for literal whitespace strings
  const literalWhitespaceIssues = detectLiteralWhitespace(value);
  literalWhitespaceIssues.forEach(issue => {
    issue.variable = name;
    allIssues.push(issue);
  });

  // Validate format
  const formatIssues = validateApiKeyFormat(name, value, isProductionFile);
  formatIssues.forEach(issue => allIssues.push(issue));

  return allIssues;
}

/**
 * Mask sensitive values
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
 * Print validation results
 */
function printResults(issues) {
  const critical = issues.filter(i => i.severity === 'critical');
  const warnings = issues.filter(i => i.severity === 'warning');

  console.log(`\n${BOLD}${BLUE}=== Validation Results ===${RESET}\n`);

  if (critical.length > 0) {
    console.log(`${BOLD}${RED}🚨 CRITICAL ISSUES (${critical.length})${RESET}\n`);
    critical.forEach(issue => {
      console.log(`${RED}Variable: ${issue.variable}${RESET}`);
      console.log(`${RED}Issue: ${issue.message}${RESET}`);
      if (issue.value) {
        console.log(`${RED}Current: ${maskValue(issue.value, issue.variable)}${RESET}`);
      }
      if (issue.fix) {
        console.log(`${GREEN}Fixed: ${maskValue(issue.fix, issue.variable)}${RESET}`);
      }
      console.log('');
    });
  }

  if (warnings.length > 0) {
    console.log(`${BOLD}${YELLOW}⚠  WARNINGS (${warnings.length})${RESET}\n`);
    warnings.forEach(issue => {
      console.log(`${YELLOW}Variable: ${issue.variable}${RESET}`);
      console.log(`${YELLOW}Issue: ${issue.message}${RESET}`);
      console.log('');
    });
  }

  if (critical.length === 0 && warnings.length === 0) {
    console.log(`${GREEN}✅ All environment variables are valid${RESET}\n`);
  }
}

/**
 * Main function
 */
async function main() {
  console.log(`${BOLD}${MAGENTA}`);
  console.log('╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║       Environment Variable Validation v2.0                        ║');
  console.log('║       Detects whitespace, literal \\n, and format issues          ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝');
  console.log(`${RESET}\n`);

  const envFiles = [
    '.env.local',
    '.env.production',
    '.env.production-actual'
  ];

  let allIssues = [];

  for (const fileName of envFiles) {
    const filePath = path.join(process.cwd(), fileName);

    if (!fs.existsSync(filePath)) {
      console.log(`${YELLOW}Skipping ${fileName} (not found)${RESET}`);
      continue;
    }

    console.log(`${BOLD}${CYAN}Validating: ${fileName}${RESET}`);

    const variables = parseEnvFile(filePath);
    console.log(`Found ${variables.length} variables\n`);

    variables.forEach(variable => {
      // .env.local is for local development, skip production-specific validations
      const isProductionFile = fileName !== '.env.local';
      const issues = validateVariable(variable, isProductionFile);
      allIssues = allIssues.concat(issues);
    });
  }

  printResults(allIssues);

  const criticalCount = allIssues.filter(i => i.severity === 'critical').length;

  if (criticalCount > 0) {
    console.log(`${BOLD}${RED}❌ VALIDATION FAILED${RESET}`);
    console.log(`${RED}Found ${criticalCount} critical issue(s) that MUST be fixed before deployment${RESET}\n`);

    console.log(`${BOLD}How to fix in Vercel:${RESET}`);
    console.log(`1. Remove the problematic variable:`);
    console.log(`   ${CYAN}vercel env rm VARIABLE_NAME production${RESET}`);
    console.log(`2. Re-add using interactive mode (safest):`);
    console.log(`   ${CYAN}vercel env add VARIABLE_NAME production${RESET}`);
    console.log(`   (paste the value when prompted)`);
    console.log(`3. OR use echo -n to prevent newlines:`);
    console.log(`   ${CYAN}echo -n "your_value" | vercel env add VARIABLE_NAME production${RESET}\n`);

    process.exit(1);
  } else {
    console.log(`${GREEN}✅ Validation passed - safe to deploy${RESET}\n`);
    process.exit(0);
  }
}

// Run validation
main().catch(error => {
  console.error(`${RED}Error during validation: ${error.message}${RESET}`);
  process.exit(1);
});
