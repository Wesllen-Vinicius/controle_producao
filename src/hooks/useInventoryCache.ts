import { useCallback, useMemo, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheConfig {
  defaultTTL?: number;
  maxSize?: number;
}

export function useInventoryCache<T>({ defaultTTL = 300000, maxSize = 100 }: CacheConfig = {}) {
  const cache = useRef(new Map<string, CacheEntry<T>>());
  const accessOrder = useRef<string[]>([]);

  const isExpired = useCallback((entry: CacheEntry<T>): boolean => {
    return Date.now() > entry.timestamp + entry.ttl;
  }, []);

  const cleanupExpired = useCallback(() => {
    const now = Date.now();
    const toDelete: string[] = [];

    cache.current.forEach((entry, key) => {
      if (now > entry.timestamp + entry.ttl) {
        toDelete.push(key);
      }
    });

    toDelete.forEach(key => {
      cache.current.delete(key);
      const index = accessOrder.current.indexOf(key);
      if (index > -1) {
        accessOrder.current.splice(index, 1);
      }
    });
  }, []);

  const evictLRU = useCallback(() => {
    if (accessOrder.current.length > 0) {
      const oldestKey = accessOrder.current[0];
      cache.current.delete(oldestKey);
      accessOrder.current.shift();
    }
  }, []);

  const set = useCallback(
    (key: string, data: T, ttl = defaultTTL) => {
      cleanupExpired();

      // Se cache está cheio, remove o menos recentemente usado
      if (cache.current.size >= maxSize) {
        evictLRU();
      }

      cache.current.set(key, {
        data,
        timestamp: Date.now(),
        ttl,
      });

      // Atualizar ordem de acesso
      const existingIndex = accessOrder.current.indexOf(key);
      if (existingIndex > -1) {
        accessOrder.current.splice(existingIndex, 1);
      }
      accessOrder.current.push(key);
    },
    [defaultTTL, maxSize, cleanupExpired, evictLRU]
  );

  const get = useCallback(
    (key: string): T | null => {
      const entry = cache.current.get(key);

      if (!entry) return null;

      if (isExpired(entry)) {
        cache.current.delete(key);
        const index = accessOrder.current.indexOf(key);
        if (index > -1) {
          accessOrder.current.splice(index, 1);
        }
        return null;
      }

      // Atualizar ordem de acesso
      const index = accessOrder.current.indexOf(key);
      if (index > -1) {
        accessOrder.current.splice(index, 1);
        accessOrder.current.push(key);
      }

      return entry.data;
    },
    [isExpired]
  );

  const has = useCallback(
    (key: string): boolean => {
      const entry = cache.current.get(key);
      return entry ? !isExpired(entry) : false;
    },
    [isExpired]
  );

  const invalidate = useCallback((keyPattern?: string) => {
    if (!keyPattern) {
      cache.current.clear();
      accessOrder.current = [];
      return;
    }

    const toDelete: string[] = [];
    cache.current.forEach((_, key) => {
      if (key.includes(keyPattern)) {
        toDelete.push(key);
      }
    });

    toDelete.forEach(key => {
      cache.current.delete(key);
      const index = accessOrder.current.indexOf(key);
      if (index > -1) {
        accessOrder.current.splice(index, 1);
      }
    });
  }, []);

  const stats = useMemo(
    () => ({
      size: cache.current.size,
      maxSize,
      accessOrderLength: accessOrder.current.length,
    }),
    [maxSize]
  );

  return {
    get,
    set,
    has,
    invalidate,
    stats,
    cleanupExpired,
  };
}

export type InventoryCache<T> = ReturnType<typeof useInventoryCache<T>>;
