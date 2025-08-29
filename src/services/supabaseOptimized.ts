import { supabase } from './supabase';
import { retryService } from './retryService';
import { useInventoryCache } from '../hooks/useInventoryCache';

// Wrapper otimizado para operações Supabase com cache e retry
export class OptimizedSupabaseService {
  private static instance: OptimizedSupabaseService;
  private cache = new Map<string, any>();

  static getInstance(): OptimizedSupabaseService {
    if (!OptimizedSupabaseService.instance) {
      OptimizedSupabaseService.instance = new OptimizedSupabaseService();
    }
    return OptimizedSupabaseService.instance;
  }

  // Cache key generator
  private generateCacheKey(table: string, query: any): string {
    return `${table}_${JSON.stringify(query)}`;
  }

  // Generic query with cache and retry
  async query<T>(
    table: string,
    queryBuilder: (client: typeof supabase) => any,
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
      forceRefresh = false
    } = options;

    const cacheKey = this.generateCacheKey(table, queryBuilder.toString());

    // Check cache first
    if (useCache && !forceRefresh) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < cacheTTL) {
        return cached.data;
      }
    }

    // Execute with retry
    const result = await retryService.supabaseOperation(async () => {
      const { data, error } = await queryBuilder(supabase);
      
      if (error) {
        throw error;
      }
      
      return data;
    }, operationName);

    // Cache result
    if (useCache) {
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });
    }

    return result || [];
  }

  // Optimized products query with relationship loading
  async getProducts(options: {
    includeBalance?: boolean;
    forceRefresh?: boolean;
  } = {}) {
    const { includeBalance = false, forceRefresh = false } = options;

    return this.query(
      'products',
      (client) => {
        let query = client
          .from('products')
          .select('id,name,unit,meta_por_animal')
          .order('name');

        if (includeBalance) {
          query = query.select(`
            id,name,unit,meta_por_animal,
            balance:inventory_balances(saldo,updated_at)
          `);
        }

        return query;
      },
      {
        useCache: true,
        cacheTTL: 600000, // 10 minutes for products
        operationName: 'getProducts',
        forceRefresh
      }
    );
  }

  // Optimized transactions query with pagination
  async getTransactions(options: {
    productId?: string;
    transactionType?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
    offset?: number;
    forceRefresh?: boolean;
  } = {}) {
    const {
      productId,
      transactionType,
      fromDate,
      toDate,
      limit = 50,
      offset = 0,
      forceRefresh = false
    } = options;

    return this.query(
      'inventory_transactions',
      (client) => {
        let query = client
          .from('inventory_transactions')
          .select(`
            id,
            product_id,
            tx_type,
            quantity,
            customer,
            observation,
            justification,
            created_at,
            products:product_id(name,unit)
          `)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        // Apply filters
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
        cacheTTL: 60000, // 1 minute for transactions
        operationName: 'getTransactions',
        forceRefresh
      }
    );
  }

  // Optimized production query
  async getProductions(options: {
    productFilters?: string[];
    fromDate?: string;
    toDate?: string;
    limit?: number;
    forceRefresh?: boolean;
  } = {}) {
    const {
      productFilters = [],
      fromDate,
      toDate,
      limit = 50,
      forceRefresh = false
    } = options;

    return this.query(
      'productions',
      (client) => {
        let query = client
          .from('productions')
          .select(`
            id,
            production_date,
            abate,
            created_at,
            production_items(
              product_id,
              quantity_produced,
              products:product_id(name,unit)
            )
          `)
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
        cacheTTL: 120000, // 2 minutes for productions
        operationName: 'getProductions',
        forceRefresh
      }
    );
  }

  // Batch operations with transaction support
  async batchInsert<T>(
    table: string,
    records: T[],
    operationName?: string
  ): Promise<T[]> {
    return retryService.supabaseOperation(async () => {
      const { data, error } = await supabase
        .from(table)
        .insert(records)
        .select();

      if (error) {
        throw error;
      }

      // Invalidate related cache
      this.invalidateCache(table);
      
      return data;
    }, operationName || `batchInsert_${table}`);
  }

  // Update with optimistic updates
  async optimisticUpdate<T>(
    table: string,
    id: string | number,
    updates: Partial<T>,
    operationName?: string
  ): Promise<T> {
    return retryService.supabaseOperation(async () => {
      const { data, error } = await supabase
        .from(table)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update cache if exists
      this.updateCache(table, id, data);
      
      return data;
    }, operationName || `update_${table}`);
  }

  // Cache management
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

  private updateCache(table: string, id: string | number, data: any): void {
    // Update specific cache entries that might contain this record
    for (const [key, cached] of this.cache.entries()) {
      if (key.includes(table)) {
        // Simple cache invalidation for now
        // Could be more sophisticated with specific record updates
        this.cache.delete(key);
      }
    }
  }

  // Get cache statistics
  getCacheStats() {
    const now = Date.now();
    let activeEntries = 0;
    let expiredEntries = 0;

    for (const cached of this.cache.values()) {
      if (now - cached.timestamp < 300000) { // 5 min default
        activeEntries++;
      } else {
        expiredEntries++;
      }
    }

    return {
      total: this.cache.size,
      active: activeEntries,
      expired: expiredEntries
    };
  }

  // Cleanup expired cache entries
  cleanupCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > 600000) { // 10 minutes
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }
}

export const optimizedSupabase = OptimizedSupabaseService.getInstance();
export default optimizedSupabase;