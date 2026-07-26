import Redis from 'ioredis';

const redis = new Redis();
redis.call('ping').then(console.log).catch(console.error).finally(() => process.exit(0));
