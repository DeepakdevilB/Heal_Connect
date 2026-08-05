import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';
import { getIO } from '../lib/socket';

const BILLING_INTERVAL_MS = 10000; // Check every 10 seconds
const BILLING_CYCLE_MS = 60000; // Bill every 60 seconds
const GRACE_PERIOD_MS = 60000; // 60 seconds grace period before termination

// Backoff state for DB connection errors
let _consecutiveDbErrors = 0;
const MAX_BACKOFF_MS = 5 * 60 * 1000; // 5 minutes max backoff

/**
 * Background worker to handle per-minute billing for active sessions.
 * Designed to be safely run on multiple instances using Redis locks.
 */
export function startBillingEngine() {
  console.log('Starting Per-Minute Billing Engine...');

  setInterval(async () => {
    // Exponential backoff when DB is unreachable — avoids log flooding
    if (_consecutiveDbErrors > 0) {
      const backoff = Math.min(1000 * Math.pow(2, _consecutiveDbErrors - 1), MAX_BACKOFF_MS);
      const elapsed = Date.now() % BILLING_INTERVAL_MS;
      if (elapsed < backoff % BILLING_INTERVAL_MS) return;
    }

    try {
      // 0. Clean up stale INITIATED/ACCEPTED sessions that were never properly started
      const nowTs = new Date();
      const twoMinutesAgo = new Date(nowTs.getTime() - 2 * 60 * 1000);
      const fiveMinutesAgo = new Date(nowTs.getTime() - 5 * 60 * 1000);

      const staleSessions = await prisma.session.findMany({
        where: {
          OR: [
            { status: 'INITIATED', createdAt: { lt: twoMinutesAgo } },
            { status: 'ACCEPTED', createdAt: { lt: fiveMinutesAgo } },
          ],
        },
      });

      for (const stale of staleSessions) {
        console.log(`[BillingEngine] Cleaning up stale ${stale.status} session ${stale.id}`);
        await prisma.session.update({
          where: { id: stale.id },
          data: { status: 'CANCELLED', endTime: nowTs },
        });
        import('../lib/socket').then(({ emitConsultationEvent }) => {
          emitConsultationEvent('session_terminated', stale.id,
            { sessionId: stale.id, reason: 'timed_out' },
            { userId: stale.userId, practitionerId: stale.practitionerId }
          );
        }).catch(() => {});
      }

      // 1. Fetch all ACTIVE sessions
      const activeSessions = await prisma.session.findMany({
        where: { status: 'ACTIVE' },
        include: {
          user: { include: { wallet: true } },
          practitioner: true,
        },
      });

      _consecutiveDbErrors = 0; // reset on success
      for (const session of activeSessions) {
        const lockKey = `lock:billing:${session.id}`;
        
        // 2. Try to acquire a distributed lock
        let lockAcquired = true;
        if (redis) {
          const res = await redis.set(lockKey, 'locked', 'EX', 5, 'NX');
          lockAcquired = res !== null;
        }

        if (!lockAcquired) {
          continue; // Another server instance is already processing this session right now
        }

        try {
          if (!session.startTime) {
            // Check if the session is abandoned (older than 5 minutes)
            const sessionAge = Date.now() - new Date(session.createdAt).getTime();
            if (sessionAge > 5 * 60 * 1000) {
              console.log(`Cleaning up abandoned session ${session.id}...`);
              await prisma.session.update({
                where: { id: session.id },
                data: { status: 'COMPLETED', endTime: new Date() },
              });
              // Emit so clients can clean up
              import('../lib/socket').then(({ emitConsultationEvent }) => {
                emitConsultationEvent('session_terminated', session.id, { sessionId: session.id, reason: 'abandoned' }, {
                  userId: session.userId,
                  practitionerId: session.practitionerId
                });
              });
            }
            continue; // Skip billing for unstarted sessions
          }
          await processSessionBilling(session);
        } catch (sessionErr) {
          console.error(`Error billing session ${session.id}:`, sessionErr);
        }
      }
    } catch (err: any) {
      // P1001 = DB not reachable (Neon suspended, network issue, etc.)
      if (err?.code === 'P1001') {
        _consecutiveDbErrors++;
        const waitMin = Math.round(Math.min(1000 * Math.pow(2, _consecutiveDbErrors - 1), MAX_BACKOFF_MS) / 1000);
        if (_consecutiveDbErrors === 1) {
          console.warn(`Billing engine: DB unreachable (Neon may be waking up). Will retry in ~${waitMin}s.`);
        }
      } else {
        _consecutiveDbErrors = 0;
        console.error('Billing engine cycle error:', err);
      }
    }
  }, BILLING_INTERVAL_MS);
}

// In-memory fallback if Redis is disabled
const memoryState = new Map<string, string>();

async function processSessionBilling(session: any) {
  const stateKey = `billing:state:${session.id}`;
  const now = Date.now();

  // Fetch session billing state
  let stateStr = null;
  if (redis) {
    stateStr = await redis.get(stateKey);
  } else {
    stateStr = memoryState.get(stateKey) || null;
  }

  let state = stateStr ? JSON.parse(stateStr) : null;

  // Initialize state if it doesn't exist
  if (!state) {
    state = {
      lastBilledAt: session.startTime ? new Date(session.startTime).getTime() : now,
      gracePeriodStartedAt: null,
    };
  }

  const timeSinceLastBill = now - state.lastBilledAt;

  // If 60 seconds haven't passed yet, do nothing
  if (timeSinceLastBill < BILLING_CYCLE_MS) {
    return;
  }

  // Time to bill!
  const wallet = session.user.wallet;
  const ratePerMinute = session.practitioner.perMinuteRate;

  if (!wallet) {
    console.error(`User ${session.userId} has no wallet. Terminating session ${session.id}.`);
    await terminateSession(session.id);
    return;
  }

  if (wallet.balance >= ratePerMinute) {
    // Sufficient balance — compute a cycle index to create an idempotency key.
    // Tasks 8/9: Two engine instances that both pass the Redis lock check within
    // the same 60-second billing window would both see timeSinceLastBill >= 60s.
    // The cycleKey ensures only one of them can write the deduction for this cycle.
    const cycleIndex = Math.floor((state.lastBilledAt) / BILLING_CYCLE_MS);
    const cycleKey = `billing:cycle:${session.id}:${cycleIndex}`;

    let cycleAlreadyBilled = false;
    if (redis) {
      // NX = only set if not exists; EX = expire after 90s (> billing interval)
      const res = await redis.set(cycleKey, 'billed', 'EX', 90, 'NX');
      cycleAlreadyBilled = res === null; // null means key already existed
    }

    if (cycleAlreadyBilled) {
      console.log(`Billing cycle ${cycleIndex} already processed for session ${session.id} — skipping (idempotency)`);
      return;
    }

    // Atomically debit wallet and update session cost
    await prisma.$transaction([
      prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: ratePerMinute } },
      }),
      prisma.session.update({
        where: { id: session.id },
        data: { totalCost: { increment: ratePerMinute } },
      }),
    ]);

    console.log(`Billed ₹${ratePerMinute} for session ${session.id}. Remaining balance: ₹${wallet.balance - ratePerMinute}`);
    
    // Update state
    state.lastBilledAt = now;
    state.gracePeriodStartedAt = null; // Reset grace period if they recharged mid-session
    
    if (redis) {
      await redis.set(stateKey, JSON.stringify(state), 'EX', 86400); // Expire state after 24h
    } else {
      memoryState.set(stateKey, JSON.stringify(state));
    }
  } else {
    // Insufficient balance -> Handle Grace Period
    if (!state.gracePeriodStartedAt) {
      console.log(`Insufficient balance for session ${session.id}. Starting 60s grace period.`);
      state.gracePeriodStartedAt = now;
      if (redis) {
        await redis.set(stateKey, JSON.stringify(state), 'EX', 86400);
      } else {
        memoryState.set(stateKey, JSON.stringify(state));
      }
      
      // Emit low balance warning to session room
      try { getIO()?.to(`room:${session.id}`).emit('low_balance', { sessionId: session.id }); } catch {}
    } else {
      const timeInGrace = now - state.gracePeriodStartedAt;
      if (timeInGrace >= GRACE_PERIOD_MS) {
        console.log(`Grace period expired for session ${session.id}. Terminating.`);
        await terminateSession(session.id);
        if (redis) {
          await redis.del(stateKey); // Clean up state
        } else {
          memoryState.delete(stateKey);
        }
      }
    }
  }
}

async function terminateSession(sessionId: string) {
  await prisma.session.update({
    where: { id: sessionId },
    data: {
      status: 'COMPLETED',
      endTime: new Date(),
    },
  });
  // Emit session terminated event to disconnect clients
  try {
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (session) {
      import('../lib/socket').then(({ emitConsultationEvent }) => {
        emitConsultationEvent('session_terminated', sessionId, { sessionId, reason: 'insufficient_balance' }, {
          userId: session.userId,
          practitionerId: session.practitionerId
        });
      });
    }
  } catch {}
}
