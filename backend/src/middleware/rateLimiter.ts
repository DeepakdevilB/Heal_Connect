import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../lib/redis';
import { Request } from 'express';

const extractIp = (req: Request): string => {
  const ip = req.ip || req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress || 'unknown';
  const match = ip.match(/^(\d+\.\d+\.\d+\.\d+):\d+$/);
  if (match && match[1]) return match[1];
  return ip;
};

const IS_DEV = process.env.NODE_ENV !== 'production';

// General API rate limiter — 100 requests per 15 min
export const generalLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redis.call(args[0]!, ...args.slice(1)) as any,
  }),
  keyGenerator: extractIp,
  validate: { xForwardedForHeader: false, default: false },
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

// Auth routes — 10 requests per 15 min (100 in development)
export const authLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redis.call(args[0]!, ...args.slice(1)) as any,
  }),
  keyGenerator: extractIp,
  validate: { xForwardedForHeader: false, default: false },
  windowMs: 15 * 60 * 1000,
  max: IS_DEV ? 100 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts, please try again in 15 minutes.' },
});

// Email verification — 5 requests per hour (50 in development)
export const emailLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redis.call(args[0]!, ...args.slice(1)) as any,
  }),
  keyGenerator: extractIp,
  validate: { xForwardedForHeader: false, default: false },
  windowMs: 60 * 60 * 1000,
  max: IS_DEV ? 50 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many email requests, please try again in an hour.' },
});
