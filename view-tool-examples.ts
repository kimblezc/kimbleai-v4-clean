import { getAllToolExamples } from './lib/tool-definitions-with-examples';

const examples = getAllToolExamples();

console.log('=== TOOL EXAMPLES ===\n');

Object.entries(examples).forEach(([toolName, toolExamples]) => {
  console.log(`\n📋 ${toolName}`);
  console.log('─'.repeat(60));

  toolExamples.forEach((example, i) => {
    console.log(`\nExample ${i + 1}: ${example.description}`);
    if (example.context) {
      console.log(`Context: ${example.context}`);
    }
    console.log('Input:', JSON.stringify(example.input, null, 2));
  });
  console.log('\n');
});
