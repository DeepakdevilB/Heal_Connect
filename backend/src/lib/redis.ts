import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Initialize the Redis client
export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    // Retry strategy: exponential backoff, max 3 seconds
    const delay = Math.min(times * 50, 3000);
    return delay;
  },
});

redis.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redis.on('connect', () => {
  console.log('Successfully connected to Redis');
});

/**
 * Blacklists a JWT token by storing it in Redis until it expires.
 * @param token The JWT token to blacklist
 * @param expiresInMs Time in milliseconds until the token expires naturally
 */
export async function blacklistToken(token: string, expiresInMs: number): Promise<void> {
  const key = `bl_${token}`;
  // Store the token with an expiration (PX = milliseconds)
  await redis.set(key, 'true', 'PX', expiresInMs);
}

/**
 * Checks if a JWT token is currently in the Redis blacklist.
 * @param token The JWT token to check
 * @returns boolean True if blacklisted, false otherwise
 */
export async function isTokenBlacklisted(token: string): Promise<boolean> {
  const key = `bl_${token}`;
  const result = await redis.get(key);
  return result === 'true';
}
