/**
 * Generate detailed report of all 19 findings
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function detailedFindingsReport() {
  console.log('🔍 DETAILED FINDINGS REPORT - ALL 19 ISSUES\n');
  console.log('='.repeat(100));

  const { data: findings } = await supabase
    .from('agent_findings')
    .select('*')
    .order('severity', { ascending: true })
    .order('detected_at', { ascending: false });

  if (!findings || findings.length === 0) {
    console.log('No findings to report');
    return;
  }

  console.log(`\nTotal Findings: ${findings.length}\n`);

  findings.forEach((finding: any, idx: number) => {
    const severityEmoji = finding.severity === 'critical' ? '🔴' :
                           finding.severity === 'high' ? '🟠' :
                           finding.severity === 'medium' ? '🟡' :
                           finding.severity === 'low' ? '🟢' : 'ℹ️';

    const statusEmoji = finding.status === 'fixed' ? '✅' :
                        finding.status === 'in_progress' ? '🔄' :
                        finding.status === 'open' ? '⚠️' : '📋';

    console.log(`\n${idx + 1}. ${severityEmoji} ${statusEmoji} [${finding.severity.toUpperCase()}] ${finding.title}`);
    console.log('─'.repeat(100));

    console.log(`Type: ${finding.finding_type}`);
    console.log(`Status: ${finding.status}`);
    console.log(`Detected: ${new Date(finding.detected_at).toLocaleString()}`);

    if (finding.location) {
      console.log(`Location: ${finding.location}`);
    }

    if (finding.detection_method) {
      console.log(`Detection Method: ${finding.detection_method}`);
    }

    console.log(`\nDescription:`);
    console.log(finding.description);

    if (finding.evidence && Object.keys(finding.evidence).length > 0) {
      console.log(`\nEvidence:`);
      if (finding.evidence.files) {
        console.log(`  Files to Modify: ${finding.evidence.files.length}`);
        finding.evidence.files.forEach((file: any, fileIdx: number) => {
          console.log(`  ${fileIdx + 1}. ${file.path}`);
          console.log(`     Action: ${file.action}`);
          console.log(`     Risk: ${file.riskLevel}`);
          console.log(`     Changes: ${file.changes.slice(0, 150)}...`);
        });
      } else {
        console.log(`  ${JSON.stringify(finding.evidence, null, 2)}`);
      }
    }

    console.log('\n' + '='.repeat(100));
  });

  // Summary by category
  console.log('\n📊 SUMMARY BY CATEGORY\n');

  const categories = {
    'Code Generation': findings.filter((f: any) => f.detection_method === 'autonomous_code_generation').length,
    'Improvement Suggestions': findings.filter((f: any) => f.finding_type === 'improvement').length,
    'Performance Optimizations': findings.filter((f: any) => f.finding_type === 'optimization').length,
    'Log Analysis Insights': findings.filter((f: any) => f.detection_method === 'log_analysis').length,
    'Priority Recommendations': findings.filter((f: any) => f.finding_type === 'insight').length,
  };

  Object.entries(categories).forEach(([category, count]) => {
    if (count > 0) {
      console.log(`${category}: ${count}`);
    }
  });

  // Summary by severity
  console.log('\n📊 SUMMARY BY SEVERITY\n');

  const severities = {
    'Critical': findings.filter((f: any) => f.severity === 'critical').length,
    'High': findings.filter((f: any) => f.severity === 'high').length,
    'Medium': findings.filter((f: any) => f.severity === 'medium').length,
    'Low': findings.filter((f: any) => f.severity === 'low').length,
    'Info': findings.filter((f: any) => f.severity === 'info').length,
  };

  Object.entries(severities).forEach(([severity, count]) => {
    if (count > 0) {
      const emoji = severity === 'Critical' ? '🔴' :
                     severity === 'High' ? '🟠' :
                     severity === 'Medium' ? '🟡' :
                     severity === 'Low' ? '🟢' : 'ℹ️';
      console.log(`${emoji} ${severity}: ${count}`);
    }
  });

  console.log('\n' + '='.repeat(100));
  console.log('\n✅ DETAILED FINDINGS REPORT COMPLETE\n');
}

detailedFindingsReport().catch(console.error);
