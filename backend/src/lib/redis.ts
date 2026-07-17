import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const isAzure = REDIS_URL.includes('azure.net') || REDIS_URL.startsWith('rediss://');

// Initialize the Redis client with cluster-mode support (handles Azure Cache MOVED errors)
export const redis = new Redis(REDIS_URL, {
  tls: isAzure ? { rejectUnauthorized: false } : undefined,
  maxRetriesPerRequest: 3,
  enableAutoPipelining: false,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 3000);
    return delay;
  },
  reconnectOnError(err) {
    // Reconnect on MOVED/ASK so cluster redirects are handled
    return err.message.includes('MOVED') || err.message.includes('ASK');
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
 * Checks if a JWT token has been blacklisted.
 * @param token The JWT token to check
 * @returns true if blacklisted, false otherwise
 */
export async function isTokenBlacklisted(token: string): Promise<boolean> {
  const key = `bl_${token}`;
  const result = await redis.get(key);
  return result === 'true';
}
