import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';
import { getIO } from '../lib/socket';

const BILLING_INTERVAL_MS = 10000; // Check every 10 seconds
const BILLING_CYCLE_MS = 60000; // Bill every 60 seconds
const GRACE_PERIOD_MS = 60000; // 60 seconds grace period before termination

/**
 * Background worker to handle per-minute billing for active sessions.
 * Designed to be safely run on multiple instances using Redis locks.
 */
export function startBillingEngine() {
  console.log('Starting Per-Minute Billing Engine...');

  setInterval(async () => {
    try {
      // 1. Fetch all ACTIVE sessions
      const activeSessions = await prisma.session.findMany({
        where: { status: 'ACTIVE' },
        include: {
          user: { include: { wallet: true } },
          practitioner: true,
        },
      });

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
          await processSessionBilling(session);
        } catch (sessionErr) {
          console.error(`Error billing session ${session.id}:`, sessionErr);
        }
      }
    } catch (err) {
      console.error('Billing engine cycle error:', err);
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
    // Sufficient balance -> Atomically debit wallet and update session cost
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
  try { getIO()?.to(`room:${sessionId}`).emit('session_terminated', { sessionId, reason: 'insufficient_balance' }); } catch {}
}
