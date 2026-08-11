import { Queue, Worker, Job } from 'bullmq';
import { redis } from '../lib/redis';
import { prisma } from '../lib/prisma';
import { sendNotificationToPractitioner, sendNotificationToUser } from './notification.service';

export const sessionReminderQueue = new Queue('session-reminders', {
  connection: redis as any
});

if (redis) {
  const worker = new Worker('session-reminders', async (job: Job) => {
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

    const title = type === '24h' ? 'Session Tomorrow' : 'Session Starting Soon';
    const body = type === '24h' 
      ? `Your session with ${session.practitioner.name} is in 24 hours.`
      : `Your session with ${session.practitioner.name} starts in 30 minutes.`;

    // Notify user
    await sendNotificationToUser(session.userId, {
      type: `SESSION_REMINDER_${type.toUpperCase()}`,
      title,
      body,
      entityId: session.id
    });

    // Notify practitioner
    const pracBody = type === '24h'
      ? `Your session with ${session.user.name || 'a client'} is in 24 hours.`
      : `Your session with ${session.user.name || 'a client'} starts in 30 minutes.`;

    await sendNotificationToPractitioner(session.practitionerId, {
      type: `SESSION_REMINDER_${type.toUpperCase()}`,
      title,
      body: pracBody,
      entityId: session.id
    });
  }, { connection: redis as any });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed with error ${err.message}`);
  });
} else {
  console.warn('⚠ Redis is not available. Session reminders via BullMQ are disabled.');
}

/**
 * Schedule session reminders 24h and 30m before the start time
 */
export async function scheduleSessionReminders(sessionId: string, scheduledStartTime: Date) {
  if (!redis) return;

  const now = new Date().getTime();
  const startTimeMs = new Date(scheduledStartTime).getTime();

  const twentyFourHoursBefore = startTimeMs - (24 * 60 * 60 * 1000);
  const thirtyMinutesBefore = startTimeMs - (30 * 60 * 1000);

  // If 24h before is still in the future, schedule it
  if (twentyFourHoursBefore > now) {
    const delay = twentyFourHoursBefore - now;
    await sessionReminderQueue.add('reminder-24h', { sessionId, type: '24h' }, { delay, jobId: `24h-${sessionId}` });
  }

  // If 30m before is still in the future, schedule it
  if (thirtyMinutesBefore > now) {
    const delay = thirtyMinutesBefore - now;
    await sessionReminderQueue.add('reminder-30m', { sessionId, type: '30m' }, { delay, jobId: `30m-${sessionId}` });
  }
}

/**
 * Remove scheduled reminders if session is cancelled/rescheduled
 */
export async function removeScheduledReminders(sessionId: string) {
  if (!redis) return;
  // BullMQ allows removing jobs by ID if they haven't started processing
  try {
    const job24h = await sessionReminderQueue.getJob(`24h-${sessionId}`);
    if (job24h) await job24h.remove();

    const job30m = await sessionReminderQueue.getJob(`30m-${sessionId}`);
    if (job30m) await job30m.remove();
  } catch (err) {
    console.error('Error removing scheduled jobs', err);
  }
}
