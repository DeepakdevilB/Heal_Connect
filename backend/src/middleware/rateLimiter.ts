import rateLimit, { type Store } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../lib/redis';
import { Request } from 'express';

const IS_DEV = process.env.NODE_ENV !== 'production';

const extractIp = (req: Request): string => {
  const ip = req.ip || req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress || 'unknown';
  const match = ip.match(/^(\d+\.\d+\.\d+\.\d+):\d+$/);
  return match?.[1] ?? ip;
};

class FailSafeStore implements Store {
  private redisStore?: RedisStore;
  private localStore: any;

  constructor(prefix: string) {
    // Fall back to built-in in-memory store
    this.localStore = new (rateLimit as any).MemoryStore();

    if (redis) {
      this.redisStore = new RedisStore({
        prefix,
        sendCommand: async (...args: string[]) => {
          if (!redis || redis.status !== 'ready') {
            throw new Error('Redis connection is closed or not ready.');
          }
          return (redis as any).call(...args);
        },
      });
    }
  }

  async increment(key: string): Promise<any> {
    if (this.redisStore && redis && redis.status === 'ready') {
      try {
        return await this.redisStore.increment(key);
      } catch (err: any) {
        console.warn(`RedisStore increment error for key ${key}, falling back to MemoryStore:`, err.message);
      }
    }
    return this.localStore.increment(key);
  }

  async decrement(key: string): Promise<void> {
    if (this.redisStore && redis && redis.status === 'ready') {
      try {
        return await this.redisStore.decrement(key);
      } catch (err: any) {
        console.warn(`RedisStore decrement error for key ${key}:`, err.message);
      }
    }
    return this.localStore.decrement(key);
  }

  async resetKey(key: string): Promise<void> {
    if (this.redisStore && redis && redis.status === 'ready') {
      try {
        return await this.redisStore.resetKey(key);
      } catch (err: any) {
        console.warn(`RedisStore resetKey error for key ${key}:`, err.message);
      }
    }
    return this.localStore.resetKey(key);
  }
}

function makeStore(prefix: string): Store {
  return new FailSafeStore(prefix);
}

function limiter(windowMs: number, max: number, prefix: string) {
  const store = makeStore(prefix);
  return rateLimit({
    store,
    keyGenerator: extractIp,
    validate: { xForwardedForHeader: false, default: false },
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later.' },
  });
}

// General API — 100 req / 15 min
export const generalLimiter = limiter(15 * 60 * 1000, 100, 'rl_gen:');

// Auth routes — 10 req / 15 min (relaxed in dev)
export const authLimiter = limiter(15 * 60 * 1000, IS_DEV ? 200 : 10, 'rl_auth:');

// Email / OTP routes — 5 req / hour (relaxed in dev)
export const emailLimiter = limiter(60 * 60 * 1000, IS_DEV ? 50 : 5, 'rl_email:');
