/**
 * Deployment Test and Verification Script
 *
 * Tests that changes are properly deployed to production and provides diagnostics
 *
 * Usage: npx tsx scripts/test-deployment.ts
 */

import { config } from 'dotenv';

config({ path: '.env.local' });

interface DeploymentCheck {
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

async function runDeploymentTests() {
  console.log('🔍 Running Deployment Tests\n');
  console.log('═══════════════════════════════════════\n');

  const checks: DeploymentCheck[] = [];
  const startTime = Date.now();

  // Check 1: Git status
  console.log('1️⃣  Checking git status...');
  try {
    const { execSync } = require('child_process');
    const status = execSync('git status --porcelain', { encoding: 'utf-8' });
    const branch = execSync('git branch --show-current', { encoding: 'utf-8' }).trim();
    const latestCommit = execSync('git log -1 --oneline', { encoding: 'utf-8' }).trim();

    checks.push({
      name: 'Git Status',
      passed: status.trim() === '',
      message: status.trim() === ''
        ? `✅ Clean working tree on branch '${branch}'`
        : `⚠️  Uncommitted changes detected`,
      details: {
        branch,
        latestCommit,
        uncommittedFiles: status.trim() || 'none'
      }
    });

    console.log(`   Branch: ${branch}`);
    console.log(`   Latest: ${latestCommit}`);
    console.log(`   Status: ${status.trim() || 'Clean'}\n`);
  } catch (error: any) {
    checks.push({
      name: 'Git Status',
      passed: false,
      message: '❌ Failed to check git status',
      details: error.message
    });
  }

  // Check 2: Package version
  console.log('2️⃣  Checking package version...');
  try {
    const packageJson = require('../package.json');
    checks.push({
      name: 'Package Version',
      passed: true,
      message: `✅ Version: ${packageJson.version}`,
      details: packageJson.version
    });
    console.log(`   Version: ${packageJson.version}\n`);
  } catch (error: any) {
    checks.push({
      name: 'Package Version',
      passed: false,
      message: '❌ Failed to read package.json',
      details: error.message
    });
  }

  // Check 3: Build test
  console.log('3️⃣  Running build test (this may take a moment)...');
  try {
    const { execSync } = require('child_process');
    const buildOutput = execSync('npm run build 2>&1', {
      encoding: 'utf-8',
      timeout: 300000 // 5 minutes
    });

    const hasErrors = buildOutput.includes('Error:') || buildOutput.includes('Failed to compile');
    const hasWarnings = buildOutput.includes('Warning:') || buildOutput.includes('⚠');

    checks.push({
      name: 'Build Test',
      passed: !hasErrors,
      message: hasErrors
        ? '❌ Build failed with errors'
        : hasWarnings
          ? '⚠️  Build succeeded with warnings'
          : '✅ Build succeeded',
      details: {
        hasErrors,
        hasWarnings,
        output: buildOutput.split('\n').slice(-20).join('\n') // Last 20 lines
      }
    });

    if (hasErrors) {
      console.log('   ❌ BUILD FAILED');
      console.log(buildOutput.split('\n').filter((l: string) => l.includes('Error')).join('\n'));
    } else if (hasWarnings) {
      console.log('   ⚠️  Build succeeded with warnings');
    } else {
      console.log('   ✅ Build succeeded');
    }
    console.log();
  } catch (error: any) {
    checks.push({
      name: 'Build Test',
      passed: false,
      message: '❌ Build process failed',
      details: error.message
    });
    console.log('   ❌ BUILD FAILED\n');
  }

  // Check 4: Production URL test
  console.log('4️⃣  Testing production URL...');
  try {
    const prodUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.kimbleai.com';
    const response = await fetch(prodUrl, {
      method: 'GET',
      headers: { 'User-Agent': 'deployment-test' }
    });

    const responseText = await response.text();
    const hasVersion = responseText.includes('6.0.3');

    checks.push({
      name: 'Production URL',
      passed: response.ok,
      message: response.ok
        ? `✅ Production accessible at ${prodUrl}`
        : `❌ Production returned ${response.status}`,
      details: {
        url: prodUrl,
        status: response.status,
        hasVersion603: hasVersion,
        contentLength: responseText.length
      }
    });

    console.log(`   URL: ${prodUrl}`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Version 6.0.3 in HTML: ${hasVersion ? '✅' : '❌'}\n`);
  } catch (error: any) {
    checks.push({
      name: 'Production URL',
      passed: false,
      message: '❌ Failed to reach production',
      details: error.message
    });
    console.log('   ❌ Cannot reach production\n');
  }

  // Check 5: /archie endpoint test
  console.log('5️⃣  Testing /archie page...');
  try {
    const archieUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'https://www.kimbleai.com') + '/archie';
    const response = await fetch(archieUrl, {
      method: 'GET',
      headers: { 'User-Agent': 'deployment-test' }
    });

    const responseText = await response.text();
    const hasCommandCenter = responseText.toLowerCase().includes('command center') ||
                             responseText.toLowerCase().includes('agent overview');

    checks.push({
      name: '/archie Page',
      passed: response.ok && hasCommandCenter,
      message: response.ok
        ? hasCommandCenter
          ? '✅ Agent Command Center detected'
          : '⚠️  Page loads but content may be old'
        : `❌ Page returned ${response.status}`,
      details: {
        url: archieUrl,
        status: response.status,
        hasCommandCenter,
        contentLength: responseText.length
      }
    });

    console.log(`   URL: ${archieUrl}`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Has Command Center: ${hasCommandCenter ? '✅' : '❌'}\n`);
  } catch (error: any) {
    checks.push({
      name: '/archie Page',
      passed: false,
      message: '❌ Failed to test /archie endpoint',
      details: error.message
    });
    console.log('   ❌ Cannot test /archie\n');
  }

  // Check 6: Vercel deployment check (if we have API access)
  console.log('6️⃣  Checking Vercel deployment status...');
  if (process.env.VERCEL_TOKEN && process.env.VERCEL_PROJECT_ID) {
    try {
      const response = await fetch(
        `https://api.vercel.com/v6/deployments?projectId=${process.env.VERCEL_PROJECT_ID}&limit=5`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.VERCEL_TOKEN}`
          }
        }
      );

      const data = await response.json();
      const latestDeployment = data.deployments?.[0];

      if (latestDeployment) {
        checks.push({
          name: 'Vercel Deployment',
          passed: latestDeployment.state === 'READY',
          message: `${latestDeployment.state === 'READY' ? '✅' : '⏳'} Latest: ${latestDeployment.state}`,
          details: {
            state: latestDeployment.state,
            url: latestDeployment.url,
            createdAt: latestDeployment.createdAt
          }
        });

        console.log(`   State: ${latestDeployment.state}`);
        console.log(`   URL: https://${latestDeployment.url}`);
        console.log(`   Created: ${new Date(latestDeployment.createdAt).toLocaleString()}\n`);
      }
    } catch (error: any) {
      checks.push({
        name: 'Vercel Deployment',
        passed: false,
        message: '⚠️  Cannot check Vercel API',
        details: error.message
      });
      console.log('   ⚠️  Cannot access Vercel API\n');
    }
  } else {
    checks.push({
      name: 'Vercel Deployment',
      passed: false,
      message: '⚠️  Vercel credentials not configured',
      details: 'Missing VERCEL_TOKEN or VERCEL_PROJECT_ID'
    });
    console.log('   ⚠️  Vercel credentials not configured\n');
  }

  // Summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  const passed = checks.filter(c => c.passed).length;
  const failed = checks.filter(c => !c.passed).length;

  console.log('═══════════════════════════════════════\n');
  console.log('📊 DEPLOYMENT TEST RESULTS\n');
  console.log(`Duration: ${duration}s`);
  console.log(`Passed: ${passed}/${checks.length}`);
  console.log(`Failed: ${failed}/${checks.length}\n`);

  checks.forEach(check => {
    console.log(`${check.passed ? '✅' : '❌'} ${check.name}: ${check.message}`);
  });

  console.log('\n═══════════════════════════════════════\n');

  // Recommendations
  if (failed > 0) {
    console.log('🔧 RECOMMENDATIONS:\n');

    const buildFailed = checks.find(c => c.name === 'Build Test' && !c.passed);
    if (buildFailed) {
      console.log('• Fix build errors before deploying');
      console.log('• Run: npm run build');
      console.log('• Check error messages above\n');
    }

    const gitDirty = checks.find(c => c.name === 'Git Status' && !c.passed);
    if (gitDirty) {
      console.log('• Commit and push changes');
      console.log('• Run: git add -A && git commit -m "message" && git push\n');
    }

    const prodFailed = checks.find(c => c.name === 'Production URL' && !c.passed);
    if (prodFailed) {
      console.log('• Production may be down or unreachable');
      console.log('• Check Vercel dashboard for deployment status\n');
    }

    const archieFailed = checks.find(c => c.name === '/archie Page' && !c.passed);
    if (archieFailed) {
      console.log('• /archie page may not be deployed yet');
      console.log('• Wait 2-5 minutes for Vercel auto-deployment');
      console.log('• Or manually redeploy from Vercel dashboard\n');
    }
  } else {
    console.log('🎉 All checks passed! Deployment is healthy.\n');
  }

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runDeploymentTests().catch(error => {
  console.error('💥 Test script crashed:', error);
  process.exit(1);
});
