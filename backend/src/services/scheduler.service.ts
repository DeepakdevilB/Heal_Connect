import { Queue, Worker, Job } from 'bullmq';
import { redis } from '../lib/redis';
import { prisma } from '../lib/prisma';
import { sendNotificationToPractitioner, sendNotificationToUser } from './notification.service';

export let sessionReminderQueue: Queue | null = null;
let sessionReminderWorker: Worker | null = null;

if (process.env.REDIS_URL && !process.env.REDIS_URL.includes('azure.net')) {
  sessionReminderQueue = new Queue('session-reminders', {
    connection: redis as any,
    prefix: '{bull}'
  });

  sessionReminderWorker = new Worker('session-reminders', async (job: Job) => {
    const { sessionId, type } = job.data;
    
    // Fetch session details
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: true, practitioner: true }
    });

    if (!session) return;
    
    // Skip if session is cancelled, rejected, or already completed
    if (['CANCELLED', 'REJECTED', 'COMPLETED', 'ENDED'].includes(session.status)) {
      return;
    }

    // Check preferences
    const userReminder = await prisma.sessionReminder.findFirst({
      where: { sessionId, participantId: session.userId, reminderType: type === '24h' ? '24_HOURS' : '30_MINUTES' }
    });

    const pracReminder = await prisma.sessionReminder.findFirst({
      where: { sessionId, participantId: session.practitionerId, reminderType: type === '24h' ? '24_HOURS' : '30_MINUTES' }
    });

    const title = type === '24h' ? 'Session Tomorrow' : 'Session Starting Soon';
    const body = type === '24h' 
      ? `Your session with ${session.practitioner.name} is in 24 hours.`
      : `Your session with ${session.practitioner.name} starts in 30 minutes.`;

    // Notify user if enabled (or if no preference exists, default to true)
    if (!userReminder || userReminder.enabled) {
      await sendNotificationToUser(session.userId, {
        type: `SESSION_REMINDER_${type.toUpperCase()}`,
        title,
        body,
        entityId: session.id
      });
    }

    // Notify practitioner if enabled
    if (!pracReminder || pracReminder.enabled) {
      const pracBody = type === '24h'
        ? `Your session with ${session.user.name || 'a client'} is in 24 hours.`
        : `Your session with ${session.user.name || 'a client'} starts in 30 minutes.`;

      await sendNotificationToPractitioner(session.practitionerId, {
        type: `SESSION_REMINDER_${type.toUpperCase()}`,
        title,
        body: pracBody,
        entityId: session.id
      });
    }
  }, { connection: redis as any, prefix: '{bull}' });

  sessionReminderWorker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed with error ${err.message}`);
  });
} else {
  console.warn('⚠ BullMQ is disabled for Azure Redis Enterprise clusters. Reminders will not be queued.');
}

/**
 * Schedule session reminders 24h and 30m before the start time
 */
export async function scheduleSessionReminders(sessionId: string, scheduledStartTime: Date) {
  if (!sessionReminderQueue) return;

  const now = new Date().getTime();
  const startTimeMs = new Date(scheduledStartTime).getTime();

  const twentyFourHoursBefore = startTimeMs - (24 * 60 * 60 * 1000);
  const thirtyMinutesBefore = startTimeMs - (30 * 60 * 1000);

  // If 24h before is still in the future, schedule it
  if (twentyFourHoursBefore > now) {
    const delay = twentyFourHoursBefore - now;
    await sessionReminderQueue?.add('reminder-24h', { sessionId, type: '24h' }, { delay, jobId: `24h-${sessionId}` });
  }

  // If 30m before is still in the future, schedule it
  if (thirtyMinutesBefore > now) {
    const delay = thirtyMinutesBefore - now;
    await sessionReminderQueue?.add('reminder-30m', { sessionId, type: '30m' }, { delay, jobId: `30m-${sessionId}` });
  }
}

/**
 * Remove scheduled reminders if session is cancelled/rescheduled
 */
export async function removeScheduledReminders(sessionId: string) {
  if (!sessionReminderQueue) return;
  // BullMQ allows removing jobs by ID if they haven't started processing
  try {
    const job24h = await sessionReminderQueue?.getJob(`24h-${sessionId}`);
    if (job24h) await job24h.remove();

    const job30m = await sessionReminderQueue?.getJob(`30m-${sessionId}`);
    if (job30m) await job30m.remove();
  } catch (err) {
    console.error('Error removing scheduled jobs', err);
  }
}
