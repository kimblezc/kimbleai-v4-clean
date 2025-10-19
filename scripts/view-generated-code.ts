/**
 * View the actual code changes Archie generated
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function viewGeneratedCode() {
  console.log('💻 ARCHIE GENERATED CODE CHANGES\n');
  console.log('='.repeat(80));

  const { data: codeChanges } = await supabase
    .from('agent_findings')
    .select('*')
    .eq('detection_method', 'autonomous_code_generation')
    .order('detected_at', { ascending: false });

  codeChanges?.forEach((finding: any, idx: number) => {
    console.log(`\n${idx + 1}. ${finding.title}`);
    console.log('─'.repeat(80));
    console.log(`Task: ${finding.title.replace('Archie Generated Code Changes: ', '')}`);
    console.log(`Detected: ${new Date(finding.detected_at).toLocaleString()}`);
    console.log(`Status: ${finding.status}`);

    if (finding.evidence?.files) {
      console.log(`\nFiles to Modify: ${finding.evidence.files.length}`);

      finding.evidence.files.forEach((file: any, fileIdx: number) => {
        console.log(`\n  ${fileIdx + 1}. ${file.path}`);
        console.log(`     Action: ${file.action}`);
        console.log(`     Risk Level: ${file.riskLevel}`);
        console.log(`     Reasoning: ${file.reasoning}`);
        console.log(`     Changes: ${file.changes.slice(0, 200)}...`);
      });

      if (finding.evidence.testingNotes) {
        console.log(`\n  Testing Notes:`);
        console.log(`  ${finding.evidence.testingNotes}`);
      }
    }

    console.log('\n' + '='.repeat(80));
  });

  console.log(`\n✅ Reviewed ${codeChanges?.length || 0} code generation findings`);
}

viewGeneratedCode().catch(console.error);
