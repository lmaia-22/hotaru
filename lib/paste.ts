import { ulid } from 'ulid';
import { redis, PASTE_TTL } from './redis';
import { publishPasteEvent } from './redis-pubsub';
import type { Paste, CreatePasteInput } from '@/types/paste';

const PASTE_PREFIX = 'paste:';
const USER_PASTES_KEY = 'user_pastes:';
const PUBLIC_PASTES_KEY = 'public_pastes';
const PRIVATE_PASTES_KEY = 'private_pastes:';

export async function createPaste(
  userId: string,
  input: CreatePasteInput
): Promise<Paste> {
  const pasteId = ulid();
  const now = Date.now();
  const expiresAt = now + PASTE_TTL * 1000;

  const paste: Paste = {
    paste_id: pasteId,
    user_id: userId,
    content: input.content,
    visibility: input.visibility,
    shared_with: input.shared_with || [],
    created_at: new Date(now).toISOString(),
    expires_at: new Date(expiresAt).toISOString(),
  };

  // Store paste with TTL
  await redis.setex(`${PASTE_PREFIX}${pasteId}`, PASTE_TTL, JSON.stringify(paste));

  // Add to user's paste list
  await redis.zadd(`${USER_PASTES_KEY}${userId}`, { score: now, member: pasteId });
  await redis.expire(`${USER_PASTES_KEY}${userId}`, PASTE_TTL);

  // Add to public pastes if visibility is public
  if (input.visibility === 'public') {
    await redis.zadd(PUBLIC_PASTES_KEY, { score: now, member: pasteId });
    await redis.expire(PUBLIC_PASTES_KEY, PASTE_TTL);
  } else {
    // Add to private pastes for each shared user
    if (input.shared_with && input.shared_with.length > 0) {
      await Promise.all(
        input.shared_with.map(async (sharedUserId) => {
          await redis.zadd(`${PRIVATE_PASTES_KEY}${sharedUserId}`, { score: now, member: pasteId });
          await redis.expire(`${PRIVATE_PASTES_KEY}${sharedUserId}`, PASTE_TTL);
        })
      );
    }
    // Also add to the creator's private list
    await redis.zadd(`${PRIVATE_PASTES_KEY}${userId}`, { score: now, member: pasteId });
    await redis.expire(`${PRIVATE_PASTES_KEY}${userId}`, PASTE_TTL);
  }

  // Publish event for real-time updates
  await publishPasteEvent('created', pasteId);

  return paste;
}

export async function getPaste(pasteId: string): Promise<Paste | null> {
  const data = await redis.get<string>(`${PASTE_PREFIX}${pasteId}`);
  if (!data) return null;
  return JSON.parse(data) as Paste;
}

export async function deletePaste(pasteId: string, userId: string): Promise<boolean> {
  const paste = await getPaste(pasteId);
  if (!paste || paste.user_id !== userId) {
    return false;
  }

  await redis.del(`${PASTE_PREFIX}${pasteId}`);
  await redis.zrem(`${USER_PASTES_KEY}${userId}`, pasteId);
  
  if (paste.visibility === 'public') {
    await redis.zrem(PUBLIC_PASTES_KEY, pasteId);
  } else {
    if (paste.shared_with && paste.shared_with.length > 0) {
      await Promise.all(
        paste.shared_with.map(async (sharedUserId) => {
          await redis.zrem(`${PRIVATE_PASTES_KEY}${sharedUserId}`, pasteId);
        })
      );
    }
    await redis.zrem(`${PRIVATE_PASTES_KEY}${userId}`, pasteId);
  }

  // Publish event for real-time updates
  await publishPasteEvent('deleted', pasteId);

  return true;
}

export async function getUserPastes(
  userId: string,
  limit = 50
): Promise<Paste[]> {
  const pasteIds = await redis.zrange<string[]>(
    `${USER_PASTES_KEY}${userId}`,
    0,
    limit - 1,
    { rev: true }
  );

  if (!pasteIds || pasteIds.length === 0) {
    return [];
  }

  const pastes = await Promise.all(
    pasteIds.map(async (id) => {
      if (typeof id === 'string') {
        return await getPaste(id);
      }
      return null;
    })
  );

  return pastes.filter((p): p is Paste => p !== null);
}

export async function getPublicPastes(limit = 50): Promise<Paste[]> {
  const pasteIds = await redis.zrange<string[]>(
    PUBLIC_PASTES_KEY,
    0,
    limit - 1,
    { rev: true }
  );

  if (!pasteIds || pasteIds.length === 0) {
    return [];
  }

  const pastes = await Promise.all(
    pasteIds.map(async (id) => {
      if (typeof id === 'string') {
        return await getPaste(id);
      }
      return null;
    })
  );

  return pastes.filter((p): p is Paste => p !== null);
}

export async function getPrivatePastesForUser(
  userId: string,
  limit = 50
): Promise<Paste[]> {
  const pasteIds = await redis.zrange<string[]>(
    `${PRIVATE_PASTES_KEY}${userId}`,
    0,
    limit - 1,
    { rev: true }
  );

  if (!pasteIds || pasteIds.length === 0) {
    return [];
  }

  const pastes = await Promise.all(
    pasteIds.map(async (id) => {
      if (typeof id === 'string') {
        const paste = await getPaste(id);
        // Verify user has access (either creator or in shared_with)
        if (paste && (paste.user_id === userId || paste.shared_with.includes(userId))) {
          return paste;
        }
      }
      return null;
    })
  );

  return pastes.filter((p): p is Paste => p !== null);
}

export async function getAllAccessiblePastes(
  userId: string,
  limit = 50
): Promise<Paste[]> {
  const [publicPastes, privatePastes] = await Promise.all([
    getPublicPastes(limit),
    getPrivatePastesForUser(userId, limit),
  ]);

  // Combine and deduplicate by paste_id
  const allPastes = [...publicPastes, ...privatePastes];
  const uniquePastes = new Map<string, Paste>();
  
  allPastes.forEach((paste) => {
    if (!uniquePastes.has(paste.paste_id)) {
      uniquePastes.set(paste.paste_id, paste);
    }
  });

  // Sort by created_at descending
  return Array.from(uniquePastes.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ).slice(0, limit);
}
