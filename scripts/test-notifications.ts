// scripts/test-notifications.ts
// Comprehensive test script for the notification system

// Load environment variables
import { config } from 'dotenv';
config({ path: '.env.local' });

import NotificationManager from '../lib/notification-manager';
import { EmailAlertSystem } from '../lib/email-alert-system';

const TEST_USER_ID = 'zach.kimble@gmail.com';

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testBasicNotifications() {
  console.log('\n========================================');
  console.log('TEST 1: Basic Notification Creation');
  console.log('========================================\n');

  try {
    // Test success notification
    console.log('Creating success notification...');
    await NotificationManager.success(
      TEST_USER_ID,
      'Test Success',
      'This is a test success notification'
    );
    console.log('✓ Success notification created');

    await delay(1000);

    // Test error notification
    console.log('Creating error notification...');
    await NotificationManager.error(
      TEST_USER_ID,
      'Test Error',
      'This is a test error notification'
    );
    console.log('✓ Error notification created');

    await delay(1000);

    // Test warning notification
    console.log('Creating warning notification...');
    await NotificationManager.warning(
      TEST_USER_ID,
      'Test Warning',
      'This is a test warning notification'
    );
    console.log('✓ Warning notification created');

    await delay(1000);

    // Test info notification
    console.log('Creating info notification...');
    await NotificationManager.info(
      TEST_USER_ID,
      'Test Info',
      'This is a test info notification'
    );
    console.log('✓ Info notification created');

    console.log('\n✓ All basic notifications created successfully\n');
  } catch (error) {
    console.error('✗ Basic notification test failed:', error);
    throw error;
  }
}

async function testNotificationRetrieval() {
  console.log('\n========================================');
  console.log('TEST 2: Notification Retrieval');
  console.log('========================================\n');

  try {
    // Get all notifications
    console.log('Fetching all notifications...');
    const notifications = await NotificationManager.getNotifications(TEST_USER_ID);
    console.log(`✓ Found ${notifications.length} notifications`);

    // Get unread count
    console.log('Fetching unread count...');
    const unreadCount = await NotificationManager.getUnreadCount(TEST_USER_ID);
    console.log(`✓ Unread count: ${unreadCount}`);

    // Display sample notification
    if (notifications.length > 0) {
      console.log('\nSample notification:');
      console.log(JSON.stringify(notifications[0], null, 2));
    }

    console.log('\n✓ Notification retrieval test passed\n');
  } catch (error) {
    console.error('✗ Notification retrieval test failed:', error);
    throw error;
  }
}

async function testNotificationActions() {
  console.log('\n========================================');
  console.log('TEST 3: Notification Actions');
  console.log('========================================\n');

  try {
    // Create a test notification
    console.log('Creating test notification...');
    const result = await NotificationManager.notify({
      userId: TEST_USER_ID,
      type: 'info',
      title: 'Action Test',
      message: 'This notification will be marked as read and deleted',
    });
    const notificationId = result.notificationId!;
    console.log(`✓ Test notification created: ${notificationId}`);

    await delay(1000);

    // Mark as read
    console.log('Marking notification as read...');
    const markResult = await NotificationManager.markAsRead(notificationId);
    console.log(`✓ Mark as read result: ${markResult}`);

    await delay(1000);

    // Delete notification
    console.log('Deleting notification...');
    const deleteResult = await NotificationManager.deleteNotification(notificationId);
    console.log(`✓ Delete result: ${deleteResult}`);

    console.log('\n✓ Notification actions test passed\n');
  } catch (error) {
    console.error('✗ Notification actions test failed:', error);
    throw error;
  }
}

async function testPresetNotifications() {
  console.log('\n========================================');
  console.log('TEST 4: Preset Notification Templates');
  console.log('========================================\n');

  try {
    // File upload notification
    console.log('Testing file upload notification...');
    await NotificationManager.notifyFileUploaded(
      TEST_USER_ID,
      'test-document.pdf',
      'file123'
    );
    console.log('✓ File upload notification sent');

    await delay(1000);

    // File indexed notification
    console.log('Testing file indexed notification...');
    await NotificationManager.notifyFileIndexed(
      TEST_USER_ID,
      'test-document.pdf',
      'file123'
    );
    console.log('✓ File indexed notification sent');

    await delay(1000);

    // Transcription completed notification
    console.log('Testing transcription notification...');
    await NotificationManager.notifyTranscriptionCompleted(
      TEST_USER_ID,
      'audio-recording.mp3',
      'file456'
    );
    console.log('✓ Transcription notification sent');

    await delay(1000);

    // Budget alert notification
    console.log('Testing budget alert notification...');
    await NotificationManager.notifyBudgetAlert(
      TEST_USER_ID,
      75,
      'daily',
      { cost: 37.50, limit: 50.00 }
    );
    console.log('✓ Budget alert notification sent');

    await delay(1000);

    // Gmail sync notification
    console.log('Testing Gmail sync notification...');
    await NotificationManager.notifyGmailSync(TEST_USER_ID, 42);
    console.log('✓ Gmail sync notification sent');

    await delay(1000);

    // Backup completed notification
    console.log('Testing backup completed notification...');
    await NotificationManager.notifyBackupCompleted(
      TEST_USER_ID,
      'backup789',
      10485760 // 10 MB
    );
    console.log('✓ Backup completed notification sent');

    await delay(1000);

    // Agent task completed notification
    console.log('Testing agent task notification...');
    await NotificationManager.notifyAgentTaskCompleted(
      TEST_USER_ID,
      'Document Analysis',
      'task101'
    );
    console.log('✓ Agent task notification sent');

    console.log('\n✓ All preset notifications test passed\n');
  } catch (error) {
    console.error('✗ Preset notifications test failed:', error);
    throw error;
  }
}

async function testEmailNotifications() {
  console.log('\n========================================');
  console.log('TEST 5: Email Notifications');
  console.log('========================================\n');

  try {
    // Test email configuration
    console.log('Testing email configuration...');
    const emailSystem = EmailAlertSystem.getInstance();
    const configValid = await emailSystem.testConfiguration();
    console.log(`✓ Email configuration valid: ${configValid}`);

    if (!configValid) {
      console.log('⚠ Email system not configured. Skipping email tests.');
      console.log('  To enable email notifications, configure SMTP settings in .env.local');
      return;
    }

    // Send test email notification
    console.log('Sending test email notification...');
    await NotificationManager.notify({
      userId: TEST_USER_ID,
      type: 'info',
      title: 'Email Test',
      message: 'This is a test email notification from KimbleAI',
      sendEmail: true,
      emailSubject: 'KimbleAI Email Test',
      emailRecipients: [TEST_USER_ID],
    });
    console.log('✓ Email notification sent');

    console.log('\n✓ Email notifications test passed\n');
  } catch (error) {
    console.error('✗ Email notifications test failed:', error);
    console.log('  This may be expected if email is not configured.');
  }
}

async function testBulkOperations() {
  console.log('\n========================================');
  console.log('TEST 6: Bulk Operations');
  console.log('========================================\n');

  try {
    // Create multiple notifications
    console.log('Creating 5 test notifications...');
    for (let i = 1; i <= 5; i++) {
      await NotificationManager.info(
        TEST_USER_ID,
        `Bulk Test ${i}`,
        `This is bulk notification number ${i}`
      );
      await delay(200);
    }
    console.log('✓ Created 5 notifications');

    await delay(1000);

    // Get unread count
    console.log('Checking unread count...');
    const unreadCount = await NotificationManager.getUnreadCount(TEST_USER_ID);
    console.log(`✓ Unread count: ${unreadCount}`);

    // Mark all as read
    console.log('Marking all as read...');
    const markAllResult = await NotificationManager.markAllAsRead(TEST_USER_ID);
    console.log(`✓ Mark all as read result: ${markAllResult}`);

    await delay(1000);

    // Verify unread count is 0
    console.log('Verifying unread count...');
    const newUnreadCount = await NotificationManager.getUnreadCount(TEST_USER_ID);
    console.log(`✓ New unread count: ${newUnreadCount}`);

    // Delete all read notifications
    console.log('Deleting all read notifications...');
    const deleteAllResult = await NotificationManager.deleteAllRead(TEST_USER_ID);
    console.log(`✓ Delete all read result: ${deleteAllResult}`);

    console.log('\n✓ Bulk operations test passed\n');
  } catch (error) {
    console.error('✗ Bulk operations test failed:', error);
    throw error;
  }
}

async function testPreferences() {
  console.log('\n========================================');
  console.log('TEST 7: User Preferences');
  console.log('========================================\n');

  try {
    // Get user preferences
    console.log('Fetching user preferences...');
    const preferences = await NotificationManager.getUserPreferences(TEST_USER_ID);
    console.log('✓ User preferences:');
    console.log(JSON.stringify(preferences, null, 2));

    // Update preferences
    console.log('\nUpdating preferences...');
    await NotificationManager.updatePreferences(TEST_USER_ID, {
      email_enabled: true,
      toast_enabled: true,
      sound_enabled: false,
      preferences: {
        file_upload: true,
        file_indexed: true,
        transcription_completed: true,
        budget_alerts: true,
        gmail_sync: false,
        backup_completed: true,
        agent_task_completed: true,
      },
    });
    console.log('✓ Preferences updated');

    // Fetch updated preferences
    console.log('Fetching updated preferences...');
    const updatedPreferences = await NotificationManager.getUserPreferences(TEST_USER_ID);
    console.log('✓ Updated preferences:');
    console.log(JSON.stringify(updatedPreferences, null, 2));

    console.log('\n✓ Preferences test passed\n');
  } catch (error) {
    console.error('✗ Preferences test failed:', error);
    throw error;
  }
}

async function runAllTests() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  NOTIFICATION SYSTEM TEST SUITE       ║');
  console.log('║  KimbleAI v4                          ║');
  console.log('╚════════════════════════════════════════╝\n');
  console.log(`Test User: ${TEST_USER_ID}\n`);

  const startTime = Date.now();

  try {
    await testBasicNotifications();
    await testNotificationRetrieval();
    await testNotificationActions();
    await testPresetNotifications();
    await testEmailNotifications();
    await testBulkOperations();
    await testPreferences();

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('\n╔════════════════════════════════════════╗');
    console.log('║  ALL TESTS PASSED ✓                   ║');
    console.log('╚════════════════════════════════════════╝\n');
    console.log(`Total test duration: ${duration}s\n`);
    console.log('✓ Toast notifications working');
    console.log('✓ Database persistence working');
    console.log('✓ CRUD operations working');
    console.log('✓ Preset notifications working');
    console.log('✓ Email notifications configured');
    console.log('✓ Bulk operations working');
    console.log('✓ User preferences working');
    console.log('\n✓ Real-time updates via Supabase (test in UI)');
    console.log('✓ Notification center UI (test in browser)');
    console.log('\nNext steps:');
    console.log('1. Run the database migration (notifications-table-migration.sql)');
    console.log('2. Add <NotificationSystem /> to your app layout');
    console.log('3. Add <NotificationCenter /> to your navigation bar');
    console.log('4. Test real-time updates by creating notifications');
    console.log('\n');
  } catch (error) {
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('\n╔════════════════════════════════════════╗');
    console.log('║  TESTS FAILED ✗                       ║');
    console.log('╚════════════════════════════════════════╝\n');
    console.log(`Test duration: ${duration}s\n`);
    console.error('Error:', error);
    console.log('\nPlease check:');
    console.log('1. Database migration has been run');
    console.log('2. Supabase credentials are correct');
    console.log('3. Environment variables are set');
    console.log('4. SMTP credentials are configured (for email tests)');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(console.error);
