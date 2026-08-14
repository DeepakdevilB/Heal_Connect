import Redis from 'ioredis';

let redis: any = null;

if (process.env.REDIS_URL) {
  const REDIS_URL = process.env.REDIS_URL;
  const isAzure = REDIS_URL.includes('azure.net') || REDIS_URL.startsWith('rediss://');

  const options = {
    tls: isAzure ? { rejectUnauthorized: false } : undefined,
    maxRetriesPerRequest: null,
    enableAutoPipelining: false,
    retryStrategy(times: number) {
      if (times > 5) return null; // stop retrying after 5 attempts
      return Math.min(times * 50, 3000);
    }
  };

  // Azure Redis Enterprise uses a proxy that handles clustering internally.
  // We MUST use the standalone Redis client, otherwise ioredis tries to run CLUSTER SLOTS,
  // which causes infinite reconnect loops because internal node IPs aren't directly routable.
  redis = new Redis(REDIS_URL, options);

  redis.on('error', (err: any) => {
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
