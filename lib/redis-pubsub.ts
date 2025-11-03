import { Redis } from '@upstash/redis';

// For Redis Pub/Sub, we'll use Upstash's REST API
// Note: Upstash Redis REST API doesn't support native Pub/Sub
// For real-time updates, consider using Server-Sent Events or WebSockets
// Alternatively, use Upstash QStash for pub/sub messaging

const getRedisClient = () => {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error('Redis configuration is missing');
  }

  return new Redis({
    url,
    token,
  });
};

export const redisPubSub = getRedisClient();

// For real-time updates, we'll use a polling mechanism or Server-Sent Events
// Here's a helper to publish paste events (which can be used with QStash or similar)
export async function publishPasteEvent(event: 'created' | 'deleted', pasteId: string) {
  // This is a placeholder - in production, you'd use QStash or similar
  // For now, we'll just store the event in Redis with a short TTL
  const key = `paste_event:${pasteId}`;
  await redisPubSub.setex(key, 10, JSON.stringify({ event, pasteId, timestamp: Date.now() }));
}
