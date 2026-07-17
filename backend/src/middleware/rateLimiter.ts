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

function makeStore(prefix: string): Store | undefined {
  if (!redis) return undefined; // fall back to in-memory
  return new RedisStore({
    prefix,
    sendCommand: (...args: string[]) => (redis as any).call(...args),
  });
}

function limiter(windowMs: number, max: number, prefix: string) {
  const store = makeStore(prefix);
  return rateLimit({
    ...(store ? { store } : {}),
    keyGenerator: extractIp,
    validate: { xForwardedForHeader: false, default: false },
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    passOnStoreError: true, // IMPORTANT: Prevent 500 errors if Redis is down
    message: { success: false, message: 'Too many requests, please try again later.' },
  });
}

// General API — 100 req / 15 min
export const generalLimiter = limiter(15 * 60 * 1000, 100, 'rl_gen:');

// Auth routes — 10 req / 15 min (relaxed in dev)
export const authLimiter = limiter(15 * 60 * 1000, IS_DEV ? 200 : 100, 'rl_auth:');

// Email / OTP routes — 5 req / hour (relaxed in dev)
export const emailLimiter = limiter(60 * 60 * 1000, IS_DEV ? 50 : 5, 'rl_email:');
