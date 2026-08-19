import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';

// Retention window agreed for chat/call-transcript content: 90 days from
// creation. This is "content-only" purge — the row stays (so session/thread
// history and billing records stay intact), only the free-text field that can
// contain special-category data (health, relationships, etc. per the GDPR
// guide's "special-category trap" section) gets overwritten.
const RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

// Run once a day — this is a retention sweep, not a real-time job, so it
// doesn't need billingEngine's 10s cadence.
const PURGE_INTERVAL_MS = 24 * 60 * 60 * 1000;

const PURGED_PLACEHOLDER = '[Removed — retention policy]';

let _consecutiveDbErrors = 0;
const MAX_BACKOFF_MS = 60 * 60 * 1000; // 1 hour max backoff

async function purgeChatMessages(cutoff: Date) {
  const candidates = await prisma.chatMessage.findMany({
    where: { createdAt: { lt: cutoff }, purgedAt: null },
    select: { id: true },
  });
  if (candidates.length === 0) return 0;

  const ids = candidates.map((c) => c.id);

  // Moderation hold: FlaggedContent rows track a chatMessageId but (by schema
  // design, see FlaggedContent model) don't carry a foreign key to ChatMessage,
  // so we look them up manually. Anything still under active moderation review
  // is exempt from purge until the flag is resolved or dismissed.
  const held = await prisma.flaggedContent.findMany({
    where: { chatMessageId: { in: ids }, status: 'PENDING' },
    select: { chatMessageId: true },
  });
  const heldIds = new Set(held.map((h) => h.chatMessageId));
  const toPurge = ids.filter((id) => !heldIds.has(id));
  if (toPurge.length === 0) return 0;

  const result = await prisma.chatMessage.updateMany({
    where: { id: { in: toPurge } },
    data: { content: PURGED_PLACEHOLDER, purgedAt: new Date() },
  });
  return result.count;
}

async function purgeCallTranscripts(cutoff: Date) {
  const candidates = await prisma.callTranscript.findMany({
    where: { createdAt: { lt: cutoff }, purgedAt: null },
    select: { id: true },
  });
  if (candidates.length === 0) return 0;

  const ids = candidates.map((c) => c.id);

  // Moderation hold via the real transcript -> flaggedContent relation.
  const held = await prisma.flaggedContent.findMany({
    where: { transcriptId: { in: ids }, status: 'PENDING' },
    select: { transcriptId: true },
  });
  const heldIds = new Set(held.map((h) => h.transcriptId));
  const toPurge = ids.filter((id) => !heldIds.has(id));
  if (toPurge.length === 0) return 0;

  const result = await prisma.callTranscript.updateMany({
    where: { id: { in: toPurge } },
    data: { transcriptText: PURGED_PLACEHOLDER, purgedAt: new Date() },
  });
  return result.count;
}

/**
 * Background worker that enforces the 90-day retention policy on chat and
 * call-transcript content. Designed to be safely run on multiple instances —
 * uses the same Redis "SET NX EX" lock pattern as billingEngine, with an
 * in-memory no-op fallback if Redis is disabled (worst case: two instances
 * both run the sweep, which is harmless since `purgedAt` makes it idempotent).
 */
export function startGdprPurgeWorker() {
  console.log('Starting GDPR retention-purge worker (90-day content purge)...');

  setInterval(async () => {
    if (_consecutiveDbErrors > 0) {
      const backoff = Math.min(1000 * Math.pow(2, _consecutiveDbErrors - 1), MAX_BACKOFF_MS);
      const elapsed = Date.now() % PURGE_INTERVAL_MS;
      if (elapsed < backoff % PURGE_INTERVAL_MS) return;
    }

    let lockAcquired = true;
    if (redis) {
      const res = await redis.set('lock:gdpr-purge', 'locked', 'EX', 3600, 'NX');
      lockAcquired = res !== null;
    }
    if (!lockAcquired) return; // another instance is already running the sweep

    try {
      const cutoff = new Date(Date.now() - RETENTION_MS);
      const chatCount = await purgeChatMessages(cutoff);
      const transcriptCount = await purgeCallTranscripts(cutoff);
      _consecutiveDbErrors = 0;

      if (chatCount > 0 || transcriptCount > 0) {
        console.log(`[GDPR Purge] Purged content: ${chatCount} chat message(s), ${transcriptCount} transcript(s) older than 90 days.`);
      }
    } catch (err) {
      _consecutiveDbErrors++;
      console.error('[GDPR Purge] Sweep failed:', err);
    }
  }, PURGE_INTERVAL_MS);
}
