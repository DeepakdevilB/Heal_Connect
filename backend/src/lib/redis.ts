import Redis, { Cluster } from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

function createClient(): Redis | Cluster {
  // Azure Redis Cluster URLs come as rediss://host:port
  // Detect cluster mode via env flag or URL pattern
  if (process.env.REDIS_CLUSTER === 'true') {
    const url = new URL(REDIS_URL);
    return new Cluster(
      [{ host: url.hostname, port: Number(url.port) || 6380 }],
      {
        dnsLookup: (address, callback) => callback(null, address),
        redisOptions: {
          tls: REDIS_URL.startsWith('rediss://') ? {} : undefined,
          password: url.password || undefined,
          maxRetriesPerRequest: 3,
        },
        enableAutoPipelining: false,
      }
    );
  }

  return new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableAutoPipelining: false,
    tls: REDIS_URL.startsWith('rediss://') ? {} : undefined,
    retryStrategy(times) {
      return Math.min(times * 50, 3000);
    },
  });
}

export const redis = createClient();

redis.on('error', (err: Error) => console.error('Redis error:', err.message));
redis.on('connect', () => console.log('Successfully connected to Redis'));

export async function blacklistToken(token: string, expiresInMs: number): Promise<void> {
  await redis.set(`bl_${token}`, 'true', 'PX', expiresInMs);
}

export async function isTokenBlacklisted(token: string): Promise<boolean> {
  const result = await redis.get(`bl_${token}`);
  return result === 'true';
}
