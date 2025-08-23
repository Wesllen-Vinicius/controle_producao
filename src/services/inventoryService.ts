import { supabase } from './supabase';
import { 
  Product, 
  Balance, 
  Transaction, 
  InventoryFilters, 
  PaginatedResponse,
  CreateTransactionRequest,
  ApiError 
} from '../types';

class InventoryService {
  private static instance: InventoryService;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos
  private cache = new Map<string, { data: any; timestamp: number }>();

  private constructor() {}

  static getInstance(): InventoryService {
    if (!InventoryService.instance) {
      InventoryService.instance = new InventoryService();
    }
    return InventoryService.instance;
  }

  private getCacheKey(method: string, params?: any): string {
    return `${method}-${JSON.stringify(params || {})}`;
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private handleError(error: any): never {
    const apiError: ApiError = {
      message: error.message || 'Erro desconhecido',
      code: error.code,
      details: error.details,
      hint: error.hint
    };

    if (error.message?.includes('network')) {
      apiError.message = 'Erro de conexão. Verifique sua internet.';
    } else if (error.message?.includes('permission')) {
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

      const products = (data as Product[]) || [];
      
      // Validar dados
      const validProducts = products.filter(p => 
        p.id && p.name?.trim() && p.unit?.trim()
      );

      this.setCache(cacheKey, validProducts);
      return validProducts;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getProductById(id: string): Promise<Product | null> {
    if (!id?.trim()) return null;

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

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

      const balances = (data as Balance[]) || [];
      this.setCache(cacheKey, balances);
      return balances;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getEnrichedBalances(): Promise<Balance[]> {
    try {
      const [products, balances] = await Promise.all([
        this.getProducts(),
        this.getBalances()
      ]);

      const productsById = new Map(products.map(p => [p.id, p]));

      return balances.map(balance => ({
        ...balance,
        name: productsById.get(balance.product_id)?.name || null,
        unit: productsById.get(balance.product_id)?.unit || null
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
        .select('id,product_id,quantity,unit,tx_type,created_at,created_by,source_production_id,metadata')
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

      const transactions = (data as Transaction[]) || [];

      return {
        data: transactions,
        pagination: {
          page,
          pageSize,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / pageSize),
          hasMore: transactions.length === pageSize
        }
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  async createTransaction(request: CreateTransactionRequest): Promise<Transaction> {
    try {
      // Validar dados
      if (!request.product_id?.trim()) {
        throw new Error('ID do produto é obrigatório');
      }

      if (!request.quantity || request.quantity <= 0) {
        throw new Error('Quantidade deve ser maior que zero');
      }

      if (request.quantity > 999999) {
        throw new Error('Quantidade muito alta');
      }

      // Sanitizar dados
      const sanitizedRequest = {
        ...request,
        quantity: Math.round(request.quantity * 1000) / 1000, // 3 casas decimais
        metadata: request.metadata ? {
          ...request.metadata,
          ...(request.metadata.customer && {
            customer: request.metadata.customer.substring(0, 100)
          })
        } : null
      };

      const { data, error } = await supabase
        .from('inventory_transactions')
        .insert(sanitizedRequest)
        .select()
        .single();

      if (error) this.handleError(error);

      // Invalidar cache relacionado
      this.invalidateCache('balances');
      this.invalidateCache('transactions');

      return data as Transaction;
    } catch (error) {
      this.handleError(error);
    }
  }

  // Estatísticas
  async getInventoryStats(): Promise<any> {
    try {
      const [products, balances, transactions] = await Promise.all([
        this.getProducts(),
        this.getBalances(),
        supabase.from('inventory_transactions').select('id').limit(1)
      ]);

      const totalValue = balances.reduce((sum, balance) => sum + Math.abs(balance.saldo), 0);
      const lowStockItems = balances.filter(balance => balance.saldo <= 0).length;

      return {
        totalProducts: products.length,
        totalTransactions: transactions.count || 0,
        totalValue,
        lowStockItems,
        lastUpdate: new Date().toISOString()
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