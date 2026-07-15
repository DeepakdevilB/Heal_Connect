import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../lib/redis';
import { Request } from 'express';

const extractIp = (req: Request): string => {
  const ip = req.ip || req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress || 'unknown';
  // Strip port if it's an IPv4 address with port (e.g., 223.233.66.130:11279)
  const match = ip.match(/^(\d+\.\d+\.\d+\.\d+):\d+$/);
  if (match && match[1]) {
    return match[1];
  }
  return ip;
};

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

// Auth routes — 100 requests per 15 min (increased for testing)
export const authLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redis.call(args[0]!, ...args.slice(1)) as any,
    prefix: 'rl_auth:', // MUST have unique prefix!
  }),
  keyGenerator: extractIp,
  validate: { xForwardedForHeader: false, default: false },
  windowMs: 15 * 60 * 1000,
  max: 100, // Temporarily increased to 100 to allow heavy local testing
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts, please try again in 15 minutes.' },
});

// Email verification — 5 requests per hour
export const emailLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redis.call(args[0]!, ...args.slice(1)) as any,
    prefix: 'rl_email:',
  }),
  keyGenerator: extractIp,
  validate: { xForwardedForHeader: false, default: false },
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many email requests, please try again in an hour.' },
});
