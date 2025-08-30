import {
  ApiError,
  Balance,
  CreateTransactionRequest,
  InventoryFilters,
  PaginatedResponse,
  Product,
  Transaction,
} from '../types';
import { supabase } from './supabase';

// Interface para tipar os itens do cache de forma segura
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Interface para o retorno da função de estatísticas
interface InventoryStats {
  totalProducts: number;
  totalTransactions: number;
  totalValue: number;
  lowStockItems: number;
  lastUpdate: string;
}

class InventoryService {
  private static instance: InventoryService;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos
  // Corrigido: 'any' substituído por uma interface tipada com 'unknown'
  private cache = new Map<string, CacheEntry<unknown>>();

  private constructor() {}

  static getInstance(): InventoryService {
    if (!InventoryService.instance) {
      InventoryService.instance = new InventoryService();
    }
    return InventoryService.instance;
  }

  // Corrigido: 'any' substituído por 'unknown'
  private getCacheKey(method: string, params?: unknown): string {
    // Corrigido: || -> ??
    return `${method}-${JSON.stringify(params ?? {})}`;
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  // Corrigido: 'any' substituído por 'unknown'
  private setCache(key: string, data: unknown): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  // Corrigido: 'any' substituído por 'unknown' com verificação de tipo interna
  private handleError(error: unknown): never {
    const err = error as { message?: string; code?: string; details?: string; hint?: string };

    const apiError: ApiError = {
      // Corrigido: || -> ??
      message: err.message ?? 'Erro desconhecido',
      code: err.code,
      details: err.details,
      hint: err.hint,
    };

    if (err.message?.includes('network')) {
      apiError.message = 'Erro de conexão. Verifique sua internet.';
    } else if (err.message?.includes('permission')) {
      apiError.message = 'Acesso negado. Verifique suas permissões.';
    }

    throw apiError;
  }

  // Produtos
  async getProducts(useCache = true): Promise<Product[]> {
    const cacheKey = this.getCacheKey('products');

    if (useCache) {
      const cached = this.getFromCache<Product[]>(cacheKey);
      if (cached) return cached;
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .select('id,name,unit,meta_por_animal,created_at,updated_at')
        .order('name');

      if (error) this.handleError(error);

      const products = (data as Product[]) ?? [];

      const validProducts = products.filter(p => p.id && p.name?.trim() && p.unit?.trim());

      this.setCache(cacheKey, validProducts);
      return validProducts;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getProductById(id: string): Promise<Product | null> {
    if (!id?.trim()) return null;

    try {
      const { data, error } = await supabase.from('products').select('*').eq('id', id).single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        this.handleError(error);
      }

      return data as Product;
    } catch (error) {
      this.handleError(error);
    }
  }

  // Saldos
  async getBalances(useCache = true): Promise<Balance[]> {
    const cacheKey = this.getCacheKey('balances');

    if (useCache) {
      const cached = this.getFromCache<Balance[]>(cacheKey);
      if (cached) return cached;
    }

    try {
      const { data, error } = await supabase
        .from('inventory_balances')
        .select('product_id,saldo,updated_at');

      if (error) this.handleError(error);

      const balances = (data as Balance[]) ?? [];
      this.setCache(cacheKey, balances);
      return balances;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getEnrichedBalances(): Promise<Balance[]> {
    try {
      const [products, balances] = await Promise.all([this.getProducts(), this.getBalances()]);

      const productsById = new Map(products.map(p => [p.id, p]));

      return balances.map(balance => ({
        ...balance,
        // Corrigido: || -> ??
        name: productsById.get(balance.product_id)?.name ?? null,
        unit: productsById.get(balance.product_id)?.unit ?? null,
      }));
    } catch (error) {
      this.handleError(error);
    }
  }

  // Transações
  async getTransactions(
    filters: InventoryFilters = {},
    page = 0,
    pageSize = 50
  ): Promise<PaginatedResponse<Transaction>> {
    try {
      const fromIdx = page * pageSize;
      const toIdx = fromIdx + pageSize - 1;

      let query = supabase
        .from('inventory_transactions')
        .select(
          'id,product_id,quantity,unit,tx_type,created_at,created_by,source_production_id,metadata',
          { count: 'exact' } // Adicionado para obter a contagem total
        )
        .order('created_at', { ascending: false })
        .range(fromIdx, toIdx);

      // Aplicar filtros
      if (filters.productId) {
        query = query.eq('product_id', filters.productId);
      }
      if (filters.transactionType) {
        if (filters.transactionType === 'venda') {
          query = query.in('tx_type', ['venda', 'saida']);
        } else {
          query = query.eq('tx_type', filters.transactionType);
        }
      }
      if (filters.dateFrom) {
        query = query.gte('created_at', `${filters.dateFrom} 00:00:00`);
      }
      if (filters.dateTo) {
        query = query.lte('created_at', `${filters.dateTo} 23:59:59`);
      }

      const { data, error, count } = await query;

      if (error) this.handleError(error);

      const transactions = (data as Transaction[]) ?? [];

      return {
        data: transactions,
        pagination: {
          page,
          pageSize,
          // Corrigido: || -> ??
          total: count ?? 0,
          totalPages: Math.ceil((count ?? 0) / pageSize),
          hasMore: transactions.length === pageSize,
        },
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  async createTransaction(request: CreateTransactionRequest): Promise<Transaction> {
    try {
      if (!request) {
        throw new Error('Dados da transação são obrigatórios.');
      }

      if (!request.product_id?.trim()) {
        throw new Error('ID do produto é obrigatório');
      }
      if (!request.quantity || request.quantity <= 0) {
        throw new Error('Quantidade deve ser maior que zero');
      }
      if (request.quantity > 999999) {
        throw new Error('Quantidade muito alta');
      }

      const sanitizedRequest = {
        ...request,
        quantity: Math.round(request.quantity * 1000) / 1000,
        metadata: request.metadata
          ? {
              ...request.metadata,
              // CORREÇÃO: Usamos um ternário para garantir que o spread seja sempre em um objeto ou nulo.
              // Isso evita o erro quando 'customer' é uma string vazia ou outro valor "falsy".
              ...(typeof request.metadata.customer === 'string' && request.metadata.customer
                ? { customer: request.metadata.customer.substring(0, 100) }
                : null),
            }
          : null,
      };

      const { data, error } = await supabase
        .from('inventory_transactions')
        .insert(sanitizedRequest)
        .select()
        .single();

      if (error) this.handleError(error);

      this.invalidateCache('balances');
      this.invalidateCache('transactions');

      return data as Transaction;
    } catch (error) {
      this.handleError(error);
    }
  }
  // Estatísticas
  // Corrigido: 'any' trocado por uma interface específica 'InventoryStats'
  async getInventoryStats(): Promise<InventoryStats> {
    try {
      const [products, balances, transactions] = await Promise.all([
        this.getProducts(),
        this.getBalances(),
        supabase.from('inventory_transactions').select('id', { count: 'exact', head: true }),
      ]);

      const totalValue = balances.reduce((sum, balance) => sum + Math.abs(balance.saldo), 0);
      const lowStockItems = balances.filter(balance => balance.saldo <= 0).length;

      return {
        totalProducts: products.length,
        // Corrigido: || -> ??
        totalTransactions: transactions.count ?? 0,
        totalValue,
        lowStockItems,
        lastUpdate: new Date().toISOString(),
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  // Cache management
  invalidateCache(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const inventoryService = InventoryService.getInstance();
export default inventoryService;
