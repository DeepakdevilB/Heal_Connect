import rateLimit from 'express-rate-limit';
import { Request } from 'express';

const extractIp = (req: Request): string => {
  const xff = req.headers['x-forwarded-for'];
  if (xff) {
    const ips = Array.isArray(xff) ? xff[0] : xff.toString();
    return ips.split(',')[0].trim();
  }
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const match = ip.match(/^(\d+\.\d+\.\d+\.\d+):\d+$/);
  if (match && match[1]) return match[1];
  return ip;
};

const IS_DEV = process.env.NODE_ENV !== 'production';

const base = {
  keyGenerator: extractIp,
  validate: { xForwardedForHeader: false, default: false },
  standardHeaders: true,
  legacyHeaders: false,
};

// General API rate limiter — 100 requests per 15 min
export const generalLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

// Auth routes — 10 requests per 15 min (100 in dev)
export const authLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  max: IS_DEV ? 100 : 10,
  message: { success: false, message: 'Too many auth attempts, please try again in 15 minutes.' },
});

// Email verification — 5 requests per hour (50 in dev)
export const emailLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  max: IS_DEV ? 50 : 5,
  message: { success: false, message: 'Too many email requests, please try again in an hour.' },
});
