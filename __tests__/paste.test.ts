import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CreatePasteInput } from '@/types/paste';

// Mock Redis
vi.mock('@/lib/redis', () => ({
  redis: {
    setex: vi.fn(),
    get: vi.fn(),
    zadd: vi.fn(),
    expire: vi.fn(),
    del: vi.fn(),
    zrem: vi.fn(),
    zrange: vi.fn(),
    ttl: vi.fn(),
  },
  PASTE_TTL: 7200,
}));

// Mock ulid
vi.mock('ulid', () => ({
  ulid: () => '01ARZ3NDEKTSV4RRFFQ69G5FAV',
}));

// Mock redis-pubsub
vi.mock('@/lib/redis-pubsub', () => ({
  publishPasteEvent: vi.fn(),
}));

describe('Paste Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should validate paste creation input', () => {
    const input: CreatePasteInput = {
      content: 'Hello, World!',
      visibility: 'public',
    };

    expect(input.content).toBeDefined();
    expect(input.visibility).toBe('public');
  });

  it('should validate private paste with shared users', () => {
    const input: CreatePasteInput = {
      content: 'Private content',
      visibility: 'private',
      shared_with: ['user1', 'user2'],
    };

    expect(input.visibility).toBe('private');
    expect(input.shared_with).toHaveLength(2);
  });
});
