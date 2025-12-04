/**
 * Integration Health Checker
 * Verifies all integrations are properly configured and working
 */

console.log('🔍 KIMBLEAI INTEGRATION HEALTH CHECK\n');
console.log('═'.repeat(70));

// Check environment variables
console.log('\n📋 ENVIRONMENT VARIABLES\n');

const integrations = {
  'OpenAI (GPT-4o, GPT-4o-mini, GPT-5)': {
    env: 'OPENAI_API_KEY',
    value: process.env.OPENAI_API_KEY,
    status: !!process.env.OPENAI_API_KEY,
    cost: 'Variable ($0.005-0.075/1K tokens)'
  },
  'Google Gemini (2.5 Flash, 2.5 Pro)': {
    env: 'GOOGLE_AI_API_KEY',
    value: process.env.GOOGLE_AI_API_KEY,
    status: !!process.env.GOOGLE_AI_API_KEY,
    cost: 'FREE (1,500/50 RPD)'
  },
  'Anthropic Claude (Sonnet, Opus)': {
    env: 'ANTHROPIC_API_KEY',
    value: process.env.ANTHROPIC_API_KEY,
    status: !!process.env.ANTHROPIC_API_KEY,
    cost: 'Variable ($0.003-0.015/1K tokens)'
  },
  'DeepSeek (V3.2)': {
    env: 'DEEPSEEK_API_KEY',
    value: process.env.DEEPSEEK_API_KEY,
    status: !!process.env.DEEPSEEK_API_KEY,
    cost: 'CHEAP ($0.27-1.10/1M tokens)'
  },
  'Perplexity Sonar Pro': {
    env: 'PERPLEXITY_API_KEY',
    value: process.env.PERPLEXITY_API_KEY,
    status: !!process.env.PERPLEXITY_API_KEY,
    cost: 'CHEAP ($0.005/search)'
  },
  'ElevenLabs TTS (Turbo v2.5)': {
    env: 'ELEVENLABS_API_KEY',
    value: process.env.ELEVENLABS_API_KEY,
    status: !!process.env.ELEVENLABS_API_KEY,
    cost: 'FREE (10K chars/mo)'
  },
  'FLUX Image Generation (1.1 Pro)': {
    env: 'BFL_API_KEY',
    value: process.env.BFL_API_KEY,
    status: !!process.env.BFL_API_KEY,
    cost: 'CHEAP ($0.055/image)'
  },
  'Google OAuth (Drive, Gmail, Calendar)': {
    env: 'GOOGLE_CLIENT_ID',
    value: process.env.GOOGLE_CLIENT_ID,
    status: !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET,
    cost: 'FREE'
  },
  'AssemblyAI (Speech-to-Text)': {
    env: 'ASSEMBLYAI_API_KEY',
    value: process.env.ASSEMBLYAI_API_KEY,
    status: !!process.env.ASSEMBLYAI_API_KEY,
    cost: 'Variable ($0.37/hr audio)'
  },
  'Supabase (Database + Auth)': {
    env: 'NEXT_PUBLIC_SUPABASE_URL',
    value: process.env.NEXT_PUBLIC_SUPABASE_URL,
    status: !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    cost: 'FREE (500MB + 2M rows)'
  }
};

Object.entries(integrations).forEach(([name, config]) => {
  const status = config.status ? '✅' : '❌';
  const masked = config.value ? config.value.substring(0, 8) + '...' : 'NOT SET';
  console.log(`${status} ${name}`);
  console.log(`   ENV: ${config.env}`);
  console.log(`   VALUE: ${masked}`);
  console.log(`   COST: ${config.cost}`);
  console.log();
});

// Summary
const total = Object.keys(integrations).length;
const working = Object.values(integrations).filter(i => i.status).length;
const percentage = Math.round((working / total) * 100);

console.log('═'.repeat(70));
console.log(`\n📊 SUMMARY: ${working}/${total} integrations configured (${percentage}%)\n`);

// Model availability check
console.log('═'.repeat(70));
console.log('\n🤖 AVAILABLE AI MODELS\n');

const models = {
  'OpenAI': {
    available: !!process.env.OPENAI_API_KEY,
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-5 (chatgpt-4o-latest)'],
    default: false
  },
  'Google Gemini': {
    available: !!process.env.GOOGLE_AI_API_KEY,
    models: ['gemini-2.5-flash', 'gemini-2.5-pro'],
    default: true
  },
  'Anthropic Claude': {
    available: !!process.env.ANTHROPIC_API_KEY,
    models: ['claude-sonnet-4', 'claude-opus-4'],
    default: false
  },
  'DeepSeek': {
    available: !!process.env.DEEPSEEK_API_KEY,
    models: ['deepseek-chat'],
    default: false
  }
};

Object.entries(models).forEach(([provider, info]) => {
  const status = info.available ? '✅' : '❌';
  const badge = info.default ? '⭐ DEFAULT' : '';
  console.log(`${status} ${provider} ${badge}`);
  info.models.forEach(model => {
    console.log(`   - ${model}`);
  });
  console.log();
});

// Tool availability
console.log('═'.repeat(70));
console.log('\n🔧 AVAILABLE TOOLS (Function Calling)\n');

import { getToolsForAPI } from './lib/tool-definitions-with-examples';
import { getAdvancedToolsForAPI } from './lib/rag-tool-definitions';

const baseTools = getToolsForAPI();
const advancedTools = getAdvancedToolsForAPI();
const allTools = [...baseTools, ...advancedTools];

console.log(`📦 Total Tools: ${allTools.length}\n`);

const categories = {
  'Gmail Integration': ['get_recent_emails', 'get_emails_from_date_range', 'send_email'],
  'Google Drive': ['search_google_drive'],
  'File Management': ['search_files', 'get_uploaded_files', 'organize_files', 'get_file_details'],
  'Calendar': ['create_calendar_event', 'get_calendar_events'],
  'RAG Search': ['semantic_search', 'find_related_content'],
  'Knowledge Graph': ['find_entities', 'get_entity_relationships', 'get_knowledge_insights'],
  'AI Integrations': ['web_search_with_citations', 'bulk_document_processing', 'text_to_speech']
};

Object.entries(categories).forEach(([category, tools]) => {
  const available = tools.filter(t => allTools.some(at => at.function.name === t)).length;
  const status = available === tools.length ? '✅' : '⚠️';
  console.log(`${status} ${category}: ${available}/${tools.length} tools`);
  tools.forEach(tool => {
    const exists = allTools.some(at => at.function.name === tool);
    console.log(`   ${exists ? '✓' : '✗'} ${tool}`);
  });
  console.log();
});

console.log('═'.repeat(70));
console.log('\n💡 RECOMMENDATIONS\n');

if (!process.env.GOOGLE_AI_API_KEY) {
  console.log('⚠️  Get FREE Google Gemini API key for default models');
  console.log('   https://aistudio.google.com/app/apikey\n');
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.log('⚠️  Configure Claude API key for Sonnet/Opus models');
  console.log('   https://console.anthropic.com/\n');
}

if (!process.env.DEEPSEEK_API_KEY) {
  console.log('💰 Get DeepSeek API key for ultra-cheap bulk processing');
  console.log('   https://platform.deepseek.com/\n');
}

if (!process.env.PERPLEXITY_API_KEY) {
  console.log('🔍 Get Perplexity API key for web search with citations');
  console.log('   https://www.perplexity.ai/settings/api\n');
}

console.log('═'.repeat(70));
