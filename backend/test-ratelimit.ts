import { redis } from './src/lib/redis';
import RedisStore from 'rate-limit-redis';

const store = new RedisStore({
  prefix: 'test:',
  sendCommand: (...args: string[]) => {
    console.log('Sending command:', args);
    return (redis as any).call(...args);
  },
});

async function run() {
  try {
    await store.increment('127.0.0.1');
    console.log('Incremented successfully');
  } catch (e) {
    console.error('Error:', e);
  } finally {
    process.exit(0);
  }
}
run();
