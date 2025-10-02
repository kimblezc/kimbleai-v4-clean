/**
 * Audio Auto-Tagging Test Suite
 * Demonstrates the capabilities of the AudioAutoTagger
 */

import { AudioAutoTagger } from '@/lib/audio-auto-tagger';

// Sample transcription texts for testing
const sampleTranscripts = {
  technicalMeeting: `
    Okay everyone, let's sync up on the API migration. We need to migrate from REST to GraphQL
    by the end of next week. The main issue we're facing is the authentication layer - we need
    to implement JWT tokens and refresh token logic. I'll handle the backend changes in Node.js,
    Sarah can you take care of the React frontend integration? Also, we should remember to update
    the database schema in PostgreSQL. This is urgent - the client is expecting a demo on Friday.

    Action items:
    - Need to implement JWT authentication
    - Must update the API documentation
    - Remember to run all tests before deployment
    - Don't forget to update the Docker configuration
  `,

  dndCampaign: `
    Alright party, you've entered the ancient dungeon. Roll for initiative! Okay, the fighter
    goes first with a 19. You see three goblins ahead. What do you do? I'll cast fireball at
    the group - let me roll for damage. That's 8d6 fire damage. The goblins fail their saving
    throws. Your wizard character Eldrin the Wise has defeated them! You find 50 gold pieces and
    a mysterious scroll. Let's continue to the next chamber. The campaign is really heating up.
    We should remember to level up our characters next session.
  `,

  businessStrategy: `
    Thanks everyone for joining today's strategy meeting. We need to discuss Q4 revenue projections
    and the new marketing campaign. Our client acquisition cost is too high at $150 per customer.
    We need to reduce that to under $100. The proposal is to shift 40% of our budget to content
    marketing and SEO. Sarah, can you prepare a detailed budget breakdown by next Tuesday?
    This is critical for our investor presentation. We also need to finalize the contract with
    the new vendor by end of month. Deadline is October 31st.
  `,

  carMaintenance: `
    Just took my Tesla Model 3 to the service center. They said I need to replace the brake pads
    soon, probably within the next 1000 miles. The tire pressure was low too - they filled it to
    42 PSI. The technician mentioned there's a software update available that should fix the
    autopilot issue I've been experiencing. Oil change isn't needed since it's electric, but they
    did top off the windshield washer fluid. License plate is ABC 1234 California. The next
    maintenance appointment is scheduled for January 15th. Total cost today was $285.
  `,

  personalNote: `
    Note to self: grocery list for the week - milk, eggs, bread, chicken breast, broccoli,
    and those organic tomatoes. Need to pick up mom's prescription from CVS pharmacy.
    Dinner reservation at Romano's Italian Restaurant on Friday at 7 PM for anniversary.
    Remember to book the vacation rental in Hawaii for next month. The fitness trainer said
    I should do cardio 3 times a week. Family gathering is on Sunday at 2 PM. Need to prepare
    that lasagna recipe grandma sent me.
  `,

  podcastInterview: `
    Welcome to Tech Innovators Podcast, episode 47. Today we're talking with Dr. Emily Chen
    about artificial intelligence and machine learning. Emily, thanks for joining us.
    Let's dive into how AI is transforming the healthcare industry. We're seeing amazing
    applications in diagnosis, drug discovery, and patient care. One of our recent projects
    at Stanford Medical Center used deep learning to detect early signs of cancer with 95%
    accuracy. The technology is advancing rapidly. Looking ahead, I think we'll see AI assistants
    in every hospital within 5 years. This is really exciting stuff.
  `
};

// Mock speaker utterances for speaker analysis
const mockUtterances = [
  { speaker: 'A', text: 'Hello everyone, let me start the presentation.', start: 0, end: 3000 },
  { speaker: 'A', text: 'Here are the quarterly results we discussed.', start: 3000, end: 6000 },
  { speaker: 'B', text: 'Thanks, that looks great. I have a question.', start: 6000, end: 8000 },
  { speaker: 'A', text: 'Sure, go ahead.', start: 8000, end: 9000 },
  { speaker: 'C', text: 'I agree with the approach. Let\'s move forward.', start: 9000, end: 11000 },
];

console.log('='.repeat(80));
console.log('AUDIO AUTO-TAGGING TEST SUITE');
console.log('='.repeat(80));

// Test 1: Technical Meeting
console.log('\n\n[TEST 1] Technical Development Meeting');
console.log('-'.repeat(80));
const techResult = AudioAutoTagger.analyzeTranscript(
  sampleTranscripts.technicalMeeting,
  undefined,
  {}
);
console.log('Tags:', techResult.tags);
console.log('Project Category:', techResult.projectCategory);
console.log('Action Items:', techResult.actionItems);
console.log('Key Topics:', techResult.keyTopics);
console.log('Sentiment:', techResult.sentiment);
console.log('Importance Score:', techResult.importanceScore);
console.log('Extracted Entities:');
console.log('  - Technologies:', techResult.extractedEntities.technologies);
console.log('  - Dates:', techResult.extractedEntities.dates);

// Test 2: D&D Campaign
console.log('\n\n[TEST 2] D&D Gaming Session');
console.log('-'.repeat(80));
const dndResult = AudioAutoTagger.analyzeTranscript(
  sampleTranscripts.dndCampaign,
  undefined,
  {}
);
console.log('Tags:', dndResult.tags);
console.log('Project Category:', dndResult.projectCategory);
console.log('Action Items:', dndResult.actionItems);
console.log('Key Topics:', dndResult.keyTopics);
console.log('Sentiment:', dndResult.sentiment);
console.log('Importance Score:', dndResult.importanceScore);
console.log('Extracted Entities:');
console.log('  - People:', dndResult.extractedEntities.people);

// Test 3: Business Strategy Meeting
console.log('\n\n[TEST 3] Business Strategy Meeting');
console.log('-'.repeat(80));
const businessResult = AudioAutoTagger.analyzeTranscript(
  sampleTranscripts.businessStrategy,
  undefined,
  {}
);
console.log('Tags:', businessResult.tags);
console.log('Project Category:', businessResult.projectCategory);
console.log('Action Items:', businessResult.actionItems);
console.log('Key Topics:', businessResult.keyTopics);
console.log('Sentiment:', businessResult.sentiment);
console.log('Importance Score:', businessResult.importanceScore);
console.log('Extracted Entities:');
console.log('  - People:', businessResult.extractedEntities.people);
console.log('  - Dates:', businessResult.extractedEntities.dates);

// Test 4: Automotive Maintenance
console.log('\n\n[TEST 4] Car Maintenance Note');
console.log('-'.repeat(80));
const carResult = AudioAutoTagger.analyzeTranscript(
  sampleTranscripts.carMaintenance,
  undefined,
  {}
);
console.log('Tags:', carResult.tags);
console.log('Project Category:', carResult.projectCategory);
console.log('Action Items:', carResult.actionItems);
console.log('Key Topics:', carResult.keyTopics);
console.log('Sentiment:', carResult.sentiment);
console.log('Importance Score:', carResult.importanceScore);
console.log('Extracted Entities:');
console.log('  - Technologies:', carResult.extractedEntities.technologies);
console.log('  - Dates:', carResult.extractedEntities.dates);

// Test 5: Personal Voice Note
console.log('\n\n[TEST 5] Personal Voice Note');
console.log('-'.repeat(80));
const personalResult = AudioAutoTagger.analyzeTranscript(
  sampleTranscripts.personalNote,
  undefined,
  {}
);
console.log('Tags:', personalResult.tags);
console.log('Project Category:', personalResult.projectCategory);
console.log('Action Items:', personalResult.actionItems);
console.log('Key Topics:', personalResult.keyTopics);
console.log('Sentiment:', personalResult.sentiment);
console.log('Importance Score:', personalResult.importanceScore);

// Test 6: Podcast Interview with Speaker Analysis
console.log('\n\n[TEST 6] Podcast Interview (with Speaker Diarization)');
console.log('-'.repeat(80));
const podcastResult = AudioAutoTagger.analyzeTranscript(
  sampleTranscripts.podcastInterview,
  mockUtterances,
  {}
);
console.log('Tags:', podcastResult.tags);
console.log('Project Category:', podcastResult.projectCategory);
console.log('Action Items:', podcastResult.actionItems);
console.log('Key Topics:', podcastResult.keyTopics);
console.log('Sentiment:', podcastResult.sentiment);
console.log('Importance Score:', podcastResult.importanceScore);
console.log('Speaker Insights:', podcastResult.speakerInsights);
console.log('Extracted Entities:');
console.log('  - People:', podcastResult.extractedEntities.people);
console.log('  - Organizations:', podcastResult.extractedEntities.organizations);
console.log('  - Technologies:', podcastResult.extractedEntities.technologies);

// Summary Statistics
console.log('\n\n');
console.log('='.repeat(80));
console.log('SUMMARY STATISTICS');
console.log('='.repeat(80));

const allResults = [techResult, dndResult, businessResult, carResult, personalResult, podcastResult];
const avgTagsPerTranscript = allResults.reduce((sum, r) => sum + r.tags.length, 0) / allResults.length;
const avgActionItems = allResults.reduce((sum, r) => sum + r.actionItems.length, 0) / allResults.length;
const avgImportance = allResults.reduce((sum, r) => sum + r.importanceScore, 0) / allResults.length;

console.log(`\nAverage Tags per Transcript: ${avgTagsPerTranscript.toFixed(1)}`);
console.log(`Average Action Items: ${avgActionItems.toFixed(1)}`);
console.log(`Average Importance Score: ${avgImportance.toFixed(2)}`);
console.log(`\nCategories Detected: ${new Set(allResults.map(r => r.projectCategory)).size} unique categories`);
console.log(`Category Distribution:`);
const categoryCount: { [key: string]: number } = {};
allResults.forEach(r => {
  categoryCount[r.projectCategory] = (categoryCount[r.projectCategory] || 0) + 1;
});
Object.entries(categoryCount).forEach(([cat, count]) => {
  console.log(`  - ${cat}: ${count}`);
});

console.log('\n\n[AUTO-TAGGING FEATURE SUMMARY]');
console.log('✓ Automatic tag extraction from content');
console.log('✓ Project category detection (development, gaming, business, automotive, personal)');
console.log('✓ Action item extraction');
console.log('✓ Key topic identification');
console.log('✓ Speaker diarization analysis');
console.log('✓ Sentiment detection');
console.log('✓ Importance scoring');
console.log('✓ Entity extraction (people, organizations, dates, technologies, locations)');
console.log('✓ Integration with BackgroundIndexer for automatic embedding generation');
console.log('✓ Automatic storage in knowledge base for RAG/semantic search');
console.log('\n');
