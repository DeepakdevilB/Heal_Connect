import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || '';

// ─── Redis client (optional) ──────────────────────────────────────────────────
// If REDIS_URL is not set, redis will be null and all operations become no-ops.
// When REDIS_URL starts with rediss:// (Azure Cache), TLS is enabled automatically.

let redis: Redis | null = null;

if (REDIS_URL) {
  const isTls = REDIS_URL.startsWith('rediss://');

  redis = new Redis(REDIS_URL, {
    // Azure Cache for Redis requires TLS — enable when scheme is rediss://
    tls: isTls ? { rejectUnauthorized: false } : undefined,
    maxRetriesPerRequest: 3,
    enableAutoPipelining: false,
    lazyConnect: true,
    retryStrategy(times) {
      if (times > 5) return null; // stop retrying after 5 attempts
      return Math.min(times * 200, 3000);
    },
    reconnectOnError(err) {
      // Handle Redis Cluster redirects (Azure uses single-node but safe to keep)
      return err.message.includes('MOVED') || err.message.includes('ASK');
    },
  });

  redis.on('error', (err) => {
    console.error('Redis error:', err.message);
  });

  redis.on('connect', () => {
    console.log('✓ Connected to Redis');
  });

  redis.on('ready', () => {
    console.log('✓ Redis ready');
  });
} else {
  console.warn('⚠  REDIS_URL not set — token blacklisting disabled, using in-memory rate limiting.');
}

export { redis };

/**
 * Blacklists a JWT token until it expires.
 * No-op if Redis is not configured.
 */
export async function blacklistToken(token: string, expiresInMs: number): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(`bl_${token}`, '1', 'PX', expiresInMs);
  } catch (err) {
    console.error('blacklistToken error:', err);
  }
}

/**
 * Returns true if the token has been blacklisted.
 * Returns false (safe default) if Redis is not configured.
 */
export async function isTokenBlacklisted(token: string): Promise<boolean> {
  if (!redis) return false;
  try {
    const result = await redis.get(`bl_${token}`);
    return result === '1';
  } catch (err) {
    console.error('isTokenBlacklisted error:', err);
    return false; // fail open — don't block legitimate requests
  }
}
