import { redis, RATE_LIMIT_WINDOW, RATE_LIMIT_MAX } from './redis';

export async function checkRateLimit(userId: string): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: number;
}> {
  const key = `rate_limit:${userId}`;
  const now = Date.now();

  // Get current count
  const count = await redis.get<number>(key);

  if (count === null || count < RATE_LIMIT_MAX) {
    // Increment count
    const newCount = (count || 0) + 1;
    await redis.setex(key, RATE_LIMIT_WINDOW, newCount);

    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX - newCount,
      resetAt: now + RATE_LIMIT_WINDOW * 1000,
    };
  }

  // Get TTL to know when it resets
  const ttl = await redis.ttl(key);
  const resetAt = now + (ttl > 0 ? ttl : RATE_LIMIT_WINDOW) * 1000;

  return {
    allowed: false,
    remaining: 0,
    resetAt,
  };
}
