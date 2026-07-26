import Redis from 'ioredis';

let redis: Redis | null = null;

if (process.env.REDIS_URL) {
  const REDIS_URL = process.env.REDIS_URL;
  const isAzure = REDIS_URL.includes('azure.net') || REDIS_URL.startsWith('rediss://');

  redis = new Redis(REDIS_URL, {
    tls: isAzure ? { rejectUnauthorized: false } : undefined,
    maxRetriesPerRequest: 3,
    enableAutoPipelining: false,
    retryStrategy(times) {
      if (times > 5) return null; // stop retrying after 5 attempts
      return Math.min(times * 50, 3000);
    },
    reconnectOnError(err) {
      return err.message.includes('MOVED') || err.message.includes('ASK');
    },
  });

  redis.on('error', (err) => {
    console.error('Redis Client Error:', err.message);
  });

  redis.on('connect', () => {
    console.log('Successfully connected to Redis');
  });
} else {
  console.warn('⚠ REDIS_URL not set — token blacklisting & distributed locks disabled. Using in-memory fallbacks.');
}

export { redis };

/**
 * Blacklists a JWT token by storing it in Redis until it expires.
 * @param token The JWT token to blacklist
 * @param expiresInMs Time in milliseconds until the token expires naturally
 */
export async function blacklistToken(token: string, expiresInMs: number): Promise<void> {
  if (!redis) return;
  const key = `bl_${token}`;
  // Store the token with an expiration (PX = milliseconds)
  await redis.set(key, 'true', 'PX', expiresInMs);
}

/**
 * Checks if a JWT token has been blacklisted.
 * @param token The JWT token to check
 * @returns true if blacklisted, false otherwise
 */
export async function isTokenBlacklisted(token: string): Promise<boolean> {
  if (!redis) return false;
  const key = `bl_${token}`;
  const result = await redis.get(key);
  return result === 'true';
}
