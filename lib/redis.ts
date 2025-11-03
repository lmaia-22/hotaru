import { Redis } from '@upstash/redis';

// For local development, we'll use a mock Redis client
// For production, use Upstash Redis
const getRedisClient = () => {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    const missing = [];
    if (!url) missing.push('UPSTASH_REDIS_REST_URL');
    if (!token) missing.push('UPSTASH_REDIS_REST_TOKEN');
    
    throw new Error(
      `Redis configuration is missing. Please set the following environment variables in your .env.local file:\n` +
      `  - ${missing.join('\n  - ')}\n\n` +
      `To get these values:\n` +
      `1. Go to https://console.upstash.com\n` +
      `2. Create a Redis database (or use an existing one)\n` +
      `3. Copy the REST URL and REST Token\n` +
      `4. Add them to your .env.local file`
    );
  }

  // If using local Redis, we need to use ioredis or similar
  // For now, we'll assume Upstash is being used
  return new Redis({
    url,
    token,
  });
};

// Use lazy initialization to prevent errors during module load
let redisClient: Redis | null = null;

export const redis = new Proxy({} as Redis, {
  get(_target, prop) {
    if (!redisClient) {
      try {
        redisClient = getRedisClient();
      } catch (error) {
        // Return a mock object that throws helpful errors
        if (prop === 'then') {
          return undefined; // Prevent Promise unwrapping
        }
        throw error;
      }
    }
    const value = (redisClient as any)[prop];
    if (typeof value === 'function') {
      return value.bind(redisClient);
    }
    return value;
  },
});

export const PASTE_TTL = 7200; // 2 hours in seconds
export const RATE_LIMIT_WINDOW = 3600; // 1 hour in seconds
export const RATE_LIMIT_MAX = 30; // 30 pastes per hour
