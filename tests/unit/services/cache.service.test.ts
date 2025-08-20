import { describe, test, expect, beforeEach } from 'bun:test';
import { cacheService } from '../../../src/services/common/cache.service';

describe('cacheService - no-op behavior without Redis', () => {
  beforeEach(() => {
    cacheService.resetStats();
    delete (process as any).env.REDIS_URL;
  });

  test('basic operations are no-ops', async () => {
    const key = 'unit:test:key';
    const setOk = await cacheService.set(key, { a: 1 }, { ttl: 1 });
    expect(setOk).toBe(false);

    const got = await cacheService.get(key);
    expect(got).toBeNull();

    const exists = await cacheService.exists(key);
    expect(exists).toBe(false);

    const ttl = await cacheService.ttl(key);
    expect(ttl).toBe(-2);

    const removed = await cacheService.delete(key);
    expect(removed).toBe(false);
  });

  test('getOrSet computes and returns value', async () => {
    const value = await cacheService.getOrSet('unit:test:key2', async () => 'computed', { ttl: 1 });
    expect(value).toBe('computed');
    const stats = cacheService.getStats();
    expect(typeof stats.total).toBe('number');
  });
});


