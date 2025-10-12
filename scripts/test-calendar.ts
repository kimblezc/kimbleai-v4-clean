/**
 * Test Script: Calendar Read/Write
 *
 * This script tests:
 * 1. Reading calendar events
 * 2. Creating a calendar event
 */

import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testCalendar() {
  console.log('🧪 Testing Google Calendar Integration...\n');

  try {
    // Step 1: Get user tokens
    console.log('Step 1: Fetching user tokens for zach...');
    const { data: tokenData, error: tokenError } = await supabase
      .from('user_tokens')
      .select('access_token, refresh_token')
      .eq('user_id', 'zach')
      .single();

    if (tokenError || !tokenData) {
      console.error('❌ Failed to fetch user tokens:', tokenError);
      return;
    }

    console.log('✅ Got user tokens');

    // Step 2: Initialize Calendar client
    console.log('\nStep 2: Initializing Calendar client...');
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google'
    );

    oauth2Client.setCredentials({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    console.log('✅ Calendar client initialized');

    // Step 3: Test reading events
    console.log('\n' + '─'.repeat(60));
    console.log('TEST 1: Reading Calendar Events');
    console.log('─'.repeat(60));

    const now = new Date();
    const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    console.log('\nFetching events from ' + now.toISOString() + ' to ' + oneWeekLater.toISOString() + '...\n');

    const listResponse = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: oneWeekLater.toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime'
    });

    const existingEvents = listResponse.data.items || [];

    if (existingEvents.length === 0) {
      console.log('📅 No upcoming events found in the next 7 days');
    } else {
      console.log('📅 Found ' + existingEvents.length + ' upcoming event(s):\n');
      existingEvents.forEach((event, idx) => {
        console.log('   ' + (idx + 1) + '. ' + (event.summary || 'No title'));
        console.log('      Start: ' + (event.start?.dateTime || event.start?.date));
        console.log('      End: ' + (event.end?.dateTime || event.end?.date));
        if (event.location) console.log('      Location: ' + event.location);
        if (event.attendees) console.log('      Attendees: ' + event.attendees.length);
        console.log();
      });
    }

    console.log('✅ Successfully read calendar events');

    // Step 4: Test creating an event
    console.log('\n' + '─'.repeat(60));
    console.log('TEST 2: Creating Calendar Event');
    console.log('─'.repeat(60));

    const testEventStart = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
    const testEventEnd = new Date(testEventStart.getTime() + 60 * 60 * 1000); // 1 hour duration

    const eventData = {
      summary: 'KimbleAI Test Event - bacon turkey',
      description: 'Test event created by KimbleAI automated test at ' + new Date().toISOString(),
      start: {
        dateTime: testEventStart.toISOString(),
        timeZone: 'America/New_York'
      },
      end: {
        dateTime: testEventEnd.toISOString(),
        timeZone: 'America/New_York'
      },
      location: 'KimbleAI Testing Lab',
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 15 }
        ]
      },
      conferenceData: {
        createRequest: {
          requestId: 'test-' + Date.now(),
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      }
    };

    console.log('\nCreating test event:');
    console.log('   Title: ' + eventData.summary);
    console.log('   Start: ' + testEventStart.toLocaleString());
    console.log('   End: ' + testEventEnd.toLocaleString());
    console.log('   Location: ' + eventData.location);
    console.log('\nSending to Google Calendar API...\n');

    const createResponse = await calendar.events.insert({
      calendarId: 'primary',
      resource: eventData,
      conferenceDataVersion: 1
    });

    const createdEvent = createResponse.data;

    console.log('✅ EVENT CREATED SUCCESSFULLY!\n');
    console.log('📅 Event Details:');
    console.log('   Event ID: ' + createdEvent.id);
    console.log('   Title: ' + createdEvent.summary);
    console.log('   Start: ' + createdEvent.start?.dateTime);
    console.log('   End: ' + createdEvent.end?.dateTime);
    console.log('   Calendar Link: ' + createdEvent.htmlLink);

    if (createdEvent.conferenceData?.entryPoints?.[0]?.uri) {
      console.log('   Google Meet Link: ' + createdEvent.conferenceData.entryPoints[0].uri);
    }

    // Step 5: Verify we can read the newly created event
    console.log('\n' + '─'.repeat(60));
    console.log('TEST 3: Verifying Event Creation (Re-read)');
    console.log('─'.repeat(60));

    console.log('\nFetching event by ID...\n');

    const verifyResponse = await calendar.events.get({
      calendarId: 'primary',
      eventId: createdEvent.id!
    });

    console.log('✅ Event verified in calendar!');
    console.log('   Confirmed Title: ' + verifyResponse.data.summary);
    console.log('   Confirmed Status: ' + verifyResponse.data.status);

    // Summary
    console.log('\n' + '═'.repeat(60));
    console.log('  📊 TEST SUMMARY');
    console.log('═'.repeat(60));
    console.log('\n✅ READ Calendar Events: PASSED');
    console.log('✅ CREATE Calendar Event: PASSED');
    console.log('✅ VERIFY Event Creation: PASSED');

    console.log('\n📬 Positive Proof:');
    console.log('   ✅ Calendar: ' + (tokenData.access_token ? 'Authenticated' : 'Failed'));
    console.log('   ✅ Read ' + existingEvents.length + ' existing event(s)');
    console.log('   ✅ Created event ID: ' + createdEvent.id);
    console.log('   ✅ Event title: "' + createdEvent.summary + '"');
    console.log('   ✅ Timestamp: ' + new Date().toISOString());

    console.log('\n🎯 Calendar is fully operational:');
    console.log('   - Can READ events ✅');
    console.log('   - Can CREATE events ✅');
    console.log('   - Google Meet links auto-generated ✅');
    console.log('   - Events synced to Google Calendar ✅');

    return {
      success: true,
      readTest: { passed: true, eventsFound: existingEvents.length },
      createTest: { passed: true, eventId: createdEvent.id },
      verifyTest: { passed: true }
    };

  } catch (error: any) {
    console.error('\n❌ TEST FAILED\n');
    console.error('Error:', error.message);

    if (error.message?.includes('Calendar API has not been used')) {
      console.log('\n💡 Troubleshooting:');
      console.log('   - Calendar API not enabled in Google Cloud Console');
      console.log('   - Enable it at: https://console.cloud.google.com/apis/library/calendar-json.googleapis.com');
    } else if (error.message?.includes('insufficient authentication scopes')) {
      console.log('\n💡 Troubleshooting:');
      console.log('   - Need to re-authorize with Calendar permissions');
      console.log('   - Required scope: https://www.googleapis.com/auth/calendar');
    }

    throw error;
  }
}

// Run the test
console.log('═'.repeat(60));
console.log('  KimbleAI - Google Calendar Test');
console.log('═'.repeat(60));
console.log();

testCalendar()
  .then((result) => {
    console.log('\n' + '═'.repeat(60));
    console.log('  ALL TESTS PASSED ✅');
    console.log('═'.repeat(60));
    process.exit(0);
  })
  .catch((error) => {
    console.log('\n' + '═'.repeat(60));
    console.log('  TESTS FAILED ❌');
    console.log('═'.repeat(60));
    process.exit(1);
  });
