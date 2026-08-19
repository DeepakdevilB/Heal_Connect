import { prisma } from './lib/prisma';
import { sendNotificationToUser, sendNotificationToPractitioner } from './services/notification.service';

async function runTest() {
  console.log('--- STARTING DIRECT PUSH NOTIFICATION REMINDER TEST ---');
  
  // Find a random user and practitioner
  const user = await prisma.user.findFirst();
  const prac = await prisma.practitioner.findFirst();
  
  if (!user || !prac) {
    console.log('Need at least 1 user and 1 practitioner to run this test.');
    return;
  }
  
  console.log('Faking a session that is about to start in 30 minutes...');
  
  // 1. Notify User
  console.log(`[TEST] Triggering sendNotificationToUser for ${user.name}`);
  await sendNotificationToUser(user.id, {
    type: 'SESSION_REMINDER_30M',
    title: 'Session Starting Soon',
    body: `Your session with ${prac.name} starts in 30 minutes.`,
    entityId: 'fake-session-123'
  });

  // 2. Notify Practitioner
  console.log(`[TEST] Triggering sendNotificationToPractitioner for ${prac.name}`);
  await sendNotificationToPractitioner(prac.id, {
    type: 'SESSION_REMINDER_30M',
    title: 'Session Starting Soon',
    body: `Your session with ${user.name} starts in 30 minutes.`,
    entityId: 'fake-session-123'
  });
  
  console.log('\n✅ TEST SUCCESS! Push Notifications fired successfully!');
  console.log('Look at the logs above to see the simulated push notifications!');
}

runTest().catch(console.error).finally(() => process.exit(0));
