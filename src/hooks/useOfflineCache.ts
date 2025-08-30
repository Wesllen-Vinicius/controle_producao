import { useCallback, useEffect, useState } from 'react';
import { useOfflineService } from '../services/offlineService';

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  staleWhileRevalidate?: boolean; // Return stale data while fetching fresh data
  revalidateOnMount?: boolean; // Always fetch fresh data on mount
}

/**
 * Hook para cache inteligente com suporte offline
 * Combina cache local com fetch remoto de forma transparente
 */
export function useOfflineCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
) {
  const {
    ttl = 30 * 60 * 1000, // 30 minutos default
    staleWhileRevalidate = true,
    revalidateOnMount = false,
  } = options;

  const offlineService = useOfflineService();

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [isStale, setIsStale] = useState(false);

  const fetchAndCache = useCallback(
    async (forceRefresh = false) => {
      if (!forceRefresh && !offlineService.getNetworkStatus()) {
        // Se offline, tenta usar dados em cache
        const cachedData = await offlineService.getCachedData<T>(key);
        if (cachedData) {
          setData(cachedData);
          setIsStale(true);
          setError(null);
        } else if (!data) {
          setError(new Error('No cached data available offline'));
        }
        setIsLoading(false);
        return cachedData;
      }

      setIsValidating(true);
      setError(null);

      try {
        const freshData = await fetcher();

        // Cache os dados
        await offlineService.cacheData(key, freshData, ttl);

        setData(freshData);
        setIsStale(false);
        setError(null);

        return freshData;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Fetch failed');

        // Se falhou, tenta usar cache
        const cachedData = await offlineService.getCachedData<T>(key);
        if (cachedData) {
          setData(cachedData);
          setIsStale(true);
          // Não define erro se temos dados em cache
        } else {
          setError(error);
        }

        return cachedData;
      } finally {
        setIsLoading(false);
        setIsValidating(false);
      }
    },
    [key, fetcher, ttl, offlineService, data]
  );

  // Função para revalidar manualmente
  const mutate = useCallback(
    async (newData?: T | Promise<T>) => {
      if (newData !== undefined) {
        // Se dados fornecidos, usar eles
        const resolvedData = await Promise.resolve(newData);
        setData(resolvedData);
        await offlineService.cacheData(key, resolvedData, ttl);
        setIsStale(false);
        return resolvedData;
      } else {
        // Senão, fetch fresh data
        return await fetchAndCache(true);
      }
    },
    [fetchAndCache, key, offlineService, ttl]
  );

  // Efeito inicial para carregar dados
  useEffect(() => {
    let cancelled = false;

    const loadInitialData = async () => {
      // Primeiro, tenta carregar do cache
      const cachedData = await offlineService.getCachedData<T>(key);

      if (cachedData && !cancelled) {
        setData(cachedData);
        setIsStale(!revalidateOnMount);
        setIsLoading(false);

        // Se staleWhileRevalidate, fetch fresh data em background
        if (staleWhileRevalidate || revalidateOnMount) {
          fetchAndCache();
        }
      } else if (!cancelled) {
        // Sem cache, fetch fresh data
        await fetchAndCache();
      }
    };

    loadInitialData();

    return () => {
      cancelled = true;
    };
  }, [key, fetchAndCache, revalidateOnMount, staleWhileRevalidate, offlineService]);

  return {
    data,
    error,
    isLoading,
    isValidating,
    isStale,
    mutate,
    revalidate: () => fetchAndCache(true),
  };
}

/**
 * Hook especializado para listas com cache
 */
export function useOfflineCachedList<T>(
  key: string,
  fetcher: () => Promise<T[]>,
  options: CacheOptions = {}
) {
  const cache = useOfflineCache(key, fetcher, options);

  const addItem = useCallback(
    async (item: T) => {
      const currentData = cache.data ?? [];
      const newData = [...currentData, item];
      await cache.mutate(newData);
      return newData;
    },
    [cache]
  );

  const updateItem = useCallback(
    async (index: number, item: T) => {
      const currentData = cache.data ?? [];
      const newData = [...currentData];
      newData[index] = item;
      await cache.mutate(newData);
      return newData;
    },
    [cache]
  );

  const removeItem = useCallback(
    async (index: number) => {
      const currentData = cache.data ?? [];
      const newData = currentData.filter((_, i) => i !== index);
      await cache.mutate(newData);
      return newData;
    },
    [cache]
  );

  return {
    ...cache,
    items: cache.data ?? [],
    addItem,
    updateItem,
    removeItem,
  };
}

/**
 * Hook para cache de dados do usuário/sessão
 */
export function useOfflineUserCache<T>(
  userId: string,
  dataKey: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
) {
  const cacheKey = `user_${userId}_${dataKey}`;
  return useOfflineCache(cacheKey, fetcher, {
    ttl: 60 * 60 * 1000, // 1 hora para dados do usuário
    ...options,
  });
}

/**
 * Hook para cache de dados críticos (produtos, configurações)
 */
export function useOfflineCriticalCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
) {
  return useOfflineCache(key, fetcher, {
    ttl: 24 * 60 * 60 * 1000, // 24 horas para dados críticos
    staleWhileRevalidate: true,
    revalidateOnMount: false, // Usar cache para dados críticos
    ...options,
  });
}
