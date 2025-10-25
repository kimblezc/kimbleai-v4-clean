/**
 * Test Security Audit Agent
 *
 * Run this script to test the security audit agent locally
 */

import { SecurityAuditAgent } from '../lib/security-audit-agent';

async function runSecurityAudit() {
  console.log('🔒 Starting Security Audit Test...\n');

  try {
    const agent = SecurityAuditAgent.getInstance();
    const result = await agent.run();

    console.log('\n' + '='.repeat(80));
    console.log('📊 SECURITY AUDIT RESULTS');
    console.log('='.repeat(80));
    console.log(`Security Score: ${result.securityScore}/100`);
    console.log(`Execution Time: ${result.executionTime}ms`);
    console.log('');
    console.log(`Total Findings: ${result.findings.length}`);
    console.log(`  🔴 Critical: ${result.criticalCount}`);
    console.log(`  🟠 High: ${result.highCount}`);
    console.log(`  🟡 Medium: ${result.mediumCount}`);
    console.log(`  🟢 Low: ${result.lowCount}`);
    console.log('');

    if (result.findings.length > 0) {
      console.log('📝 DETAILED FINDINGS:\n');

      // Group by severity
      const critical = result.findings.filter(f => f.severity === 'critical');
      const high = result.findings.filter(f => f.severity === 'high');
      const medium = result.findings.filter(f => f.severity === 'medium');
      const low = result.findings.filter(f => f.severity === 'low');

      if (critical.length > 0) {
        console.log('🔴 CRITICAL ISSUES:');
        critical.forEach((finding, index) => {
          console.log(`\n${index + 1}. ${finding.title}`);
          console.log(`   Type: ${finding.type}`);
          console.log(`   Description: ${finding.description}`);
          if (finding.suggestedAction) {
            console.log(`   Action: ${finding.suggestedAction}`);
          }
          if (finding.cve) {
            console.log(`   CVE: ${finding.cve}`);
          }
        });
        console.log('');
      }

      if (high.length > 0) {
        console.log('\n🟠 HIGH PRIORITY ISSUES:');
        high.forEach((finding, index) => {
          console.log(`\n${index + 1}. ${finding.title}`);
          console.log(`   Type: ${finding.type}`);
          console.log(`   Description: ${finding.description}`);
          if (finding.suggestedAction) {
            console.log(`   Action: ${finding.suggestedAction}`);
          }
        });
        console.log('');
      }

      if (medium.length > 0) {
        console.log('\n🟡 MEDIUM PRIORITY ISSUES:');
        medium.forEach((finding, index) => {
          console.log(`\n${index + 1}. ${finding.title}`);
          console.log(`   Type: ${finding.type}`);
          console.log(`   Description: ${finding.description}`);
        });
        console.log('');
      }

      if (low.length > 0) {
        console.log('\n🟢 LOW PRIORITY ISSUES:');
        low.forEach((finding, index) => {
          console.log(`\n${index + 1}. ${finding.title}`);
          console.log(`   Type: ${finding.type}`);
          console.log(`   Description: ${finding.description}`);
        });
        console.log('');
      }
    } else {
      console.log('✅ No security issues found! Your application is secure.\n');
    }

    console.log('='.repeat(80));
    console.log(`\n✅ Security Audit Completed Successfully`);
    console.log(`Security Score: ${result.securityScore}/100\n`);

    // Summary
    if (result.securityScore < 50) {
      console.log('❌ CRITICAL: Security score is very low. Immediate action required!');
    } else if (result.securityScore < 70) {
      console.log('⚠️  WARNING: Security score needs improvement.');
    } else if (result.securityScore < 90) {
      console.log('✓ GOOD: Security is acceptable but can be improved.');
    } else {
      console.log('✓ EXCELLENT: Security configuration is strong!');
    }

    return result;
  } catch (error: any) {
    console.error('\n❌ Security Audit Failed:');
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runSecurityAudit();
