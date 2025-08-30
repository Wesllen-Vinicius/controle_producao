import { retryService } from './retryService';
import { supabase } from './supabase';

// Adicionada interface para tipar os itens do cache
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Wrapper otimizado para operações Supabase com cache e retry
export class OptimizedSupabaseService {
  private static instance: OptimizedSupabaseService;
  private cache = new Map<string, CacheEntry<unknown[]>>();

  static getInstance(): OptimizedSupabaseService {
    if (!OptimizedSupabaseService.instance) {
      OptimizedSupabaseService.instance = new OptimizedSupabaseService();
    }
    return OptimizedSupabaseService.instance;
  }

  private generateCacheKey(table: string, query: unknown): string {
    return `${table}_${JSON.stringify(query)}`;
  }

  async query<T>(
    table: string,
    queryBuilder: (client: typeof supabase) => unknown,
    options: {
      useCache?: boolean;
      cacheTTL?: number;
      operationName?: string;
      forceRefresh?: boolean;
    } = {}
  ): Promise<T[]> {
    const {
      useCache = true,
      cacheTTL = 300000, // 5 minutes
      operationName = `query_${table}`,
      forceRefresh = false,
    } = options;

    const cacheKey = this.generateCacheKey(table, queryBuilder.toString());

    if (useCache && !forceRefresh) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < cacheTTL) {
        return cached.data as T[];
      }
    }

    const result = await retryService.supabaseOperation(async () => {
      const { data, error } = await (queryBuilder(supabase) as PromiseLike<{
        data: T[] | null;
        error: Error | null;
      }>);

      if (error) {
        throw error;
      }
      return data;
    }, operationName);

    if (useCache && result) {
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });
    }

    return result ?? [];
  }

  async getProducts(
    options: {
      includeBalance?: boolean;
      forceRefresh?: boolean;
    } = {}
  ) {
    const { includeBalance = false, forceRefresh = false } = options;

    return this.query(
      'products',
      client => {
        if (includeBalance) {
          return client
            .from('products')
            .select(
              `
              id,name,unit,meta_por_animal,
              balance:inventory_balances(saldo,updated_at)
            `
            )
            .order('name');
        }
        return client.from('products').select('id,name,unit,meta_por_animal').order('name');
      },
      {
        useCache: true,
        cacheTTL: 600000,
        operationName: 'getProducts',
        forceRefresh,
      }
    );
  }

  async getTransactions(
    options: {
      productId?: string;
      transactionType?: string;
      fromDate?: string;
      toDate?: string;
      limit?: number;
      offset?: number;
      forceRefresh?: boolean;
    } = {}
  ) {
    const {
      productId,
      transactionType,
      fromDate,
      toDate,
      limit = 50,
      offset = 0,
      forceRefresh = false,
    } = options;

    return this.query(
      'inventory_transactions',
      client => {
        let query = client
          .from('inventory_transactions')
          .select(
            `
            id, product_id, tx_type, quantity, customer, observation,
            justification, created_at, products:product_id(name,unit)
          `
          )
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (productId) {
          query = query.eq('product_id', productId);
        }
        if (transactionType) {
          query = query.eq('tx_type', transactionType);
        }
        if (fromDate) {
          query = query.gte('created_at', fromDate);
        }
        if (toDate) {
          query = query.lte('created_at', toDate);
        }

        return query;
      },
      {
        useCache: true,
        cacheTTL: 60000,
        operationName: 'getTransactions',
        forceRefresh,
      }
    );
  }

  async getProductions(
    options: {
      productFilters?: string[];
      fromDate?: string;
      toDate?: string;
      limit?: number;
      forceRefresh?: boolean;
    } = {}
  ) {
    const { fromDate, toDate, limit = 50, forceRefresh = false } = options;

    return this.query(
      'productions',
      client => {
        let query = client
          .from('productions')
          .select(
            `
            id, production_date, abate, created_at,
            production_items( product_id, quantity_produced, products:product_id(name,unit) )
          `
          )
          .order('production_date', { ascending: false });

        if (limit > 0) {
          query = query.limit(limit);
        }
        if (fromDate) {
          query = query.gte('production_date', fromDate);
        }
        if (toDate) {
          query = query.lte('production_date', toDate);
        }
        return query;
      },
      {
        useCache: true,
        cacheTTL: 120000,
        operationName: 'getProductions',
        forceRefresh,
      }
    );
  }

  async batchInsert<T>(table: string, records: T[], operationName?: string): Promise<T[]> {
    return retryService.supabaseOperation(
      async () => {
        const { data, error } = await supabase
          .from(table)
          // CORRIGIDO: Trocado 'as any' por uma asserção mais segura.
          .insert(records as Record<string, unknown>[])
          .select();

        if (error) {
          throw error;
        }

        this.invalidateCache(table);
        return data as T[];
      },
      operationName ?? `batchInsert_${table}`
    );
  }

  async optimisticUpdate<T>(
    table: string,
    id: string | number,
    updates: Partial<T>,
    operationName?: string
  ): Promise<T> {
    return retryService.supabaseOperation(
      async () => {
        const { data, error } = await supabase
          .from(table)
          .update(updates as Record<string, unknown>)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          throw error;
        }

        this.updateCache(table, id, data);
        return data as T;
      },
      operationName ?? `update_${table}`
    );
  }

  invalidateCache(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  private updateCache(table: string, _id: string | number, _data: unknown): void {
    for (const key of this.cache.keys()) {
      if (key.includes(table)) {
        this.cache.delete(key);
      }
    }
  }

  getCacheStats() {
    const now = Date.now();
    let activeEntries = 0;
    let expiredEntries = 0;

    for (const cached of this.cache.values()) {
      if (now - cached.timestamp < 300000) {
        activeEntries++;
      } else {
        expiredEntries++;
      }
    }

    return {
      total: this.cache.size,
      active: activeEntries,
      expired: expiredEntries,
    };
  }

  cleanupCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > 600000) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }
}

export const optimizedSupabase = OptimizedSupabaseService.getInstance();
export default optimizedSupabase;
