// CORREÇÃO 1: Importamos apenas o que é exportado.
import { useOfflineService } from './offlineService';
import { supabase } from './supabase';

// CORREÇÃO 2: Criamos um tipo para o serviço usando o ReturnType do hook.
type OfflineService = ReturnType<typeof useOfflineService>;

/**
 * Serviço específico para operações de estoque offline
 * Integra o sistema de cache offline com as operações de inventário
 */

export interface InventoryTransaction {
  id?: string;
  product_id: string;
  tx_type: 'entrada' | 'saida' | 'ajuste' | 'venda' | 'transferencia';
  quantity: number;
  unit: string;
  notes?: string;
  customer?: string;
  justification?: string;
  created_at?: string;
  user_id?: string;
}

export interface Product {
  id: string;
  name: string;
  unit: string;
  max_stock?: number;
  min_stock?: number;
  created_at: string;
  updated_at: string;
}

export interface Balance {
  product_id: string;
  name: string;
  unit: string;
  value: number;
  max: number;
  updated_at: string;
  today_delta: number;
}

interface BalanceRpcResult {
  product_id: string;
  current_stock: number;
  last_updated: string;
  today_delta: number;
}

class InventoryOfflineService {
  private static instance: InventoryOfflineService;

  private constructor() {}

  static getInstance(): InventoryOfflineService {
    if (!InventoryOfflineService.instance) {
      InventoryOfflineService.instance = new InventoryOfflineService();
    }
    return InventoryOfflineService.instance;
  }

  /**
   * Busca produtos com cache offline
   */
  async getProducts(offlineService: OfflineService, forceRefresh = false): Promise<Product[]> {
    const cacheKey = 'products_list';

    if (forceRefresh) {
      const { data, error } = await supabase.from('products').select('*').order('name');

      if (error) throw error;

      await offlineService.cacheData(cacheKey, data, 24 * 60 * 60 * 1000); // 24h
      return data;
    }

    const cached = await offlineService.getCachedData<Product[]>(cacheKey);

    if (cached && offlineService.getNetworkStatus()) {
      this.getProducts(offlineService, true).catch(() => {});
      return cached;
    } else if (cached) {
      return cached;
    }

    if (offlineService.getNetworkStatus()) {
      return await this.getProducts(offlineService, true);
    }

    throw new Error('Sem conexão e sem dados em cache');
  }

  /**
   * Busca saldos com cache offline
   */
  async getBalances(offlineService: OfflineService, products: Product[]): Promise<Balance[]> {
    const cacheKey = 'inventory_balances';

    if (!offlineService.getNetworkStatus()) {
      const cached = await offlineService.getCachedData<Balance[]>(cacheKey);
      if (cached) {
        return cached;
      }
      throw new Error('Sem conexão e sem dados de saldo em cache');
    }

    try {
      const { data, error } = await supabase.rpc('get_current_balances');
      if (error) throw error;

      const balances: Balance[] = products.map(product => {
        const balance = data.find((b: BalanceRpcResult) => b.product_id === product.id);
        return {
          product_id: product.id,
          name: product.name,
          unit: product.unit,
          value: balance?.current_stock ?? 0,
          max: product.max_stock ?? 1000,
          updated_at: balance?.last_updated ?? new Date().toISOString(),
          today_delta: balance?.today_delta ?? 0,
        };
      });

      await offlineService.cacheData(cacheKey, balances, 5 * 60 * 1000);
      return balances;
    } catch (error) {
      const cached = await offlineService.getCachedData<Balance[]>(cacheKey);
      if (cached) {
        return cached;
      }
      throw error;
    }
  }

  /**
   * Adiciona transação com suporte offline
   */
  async addTransaction(
    offlineService: OfflineService,
    transaction: Omit<InventoryTransaction, 'id' | 'created_at'>
  ): Promise<void> {
    const transactionData = {
      ...transaction,
      created_at: new Date().toISOString(),
    };

    if (offlineService.getNetworkStatus()) {
      try {
        const { error } = await supabase.from('inventory_transactions').insert(transactionData);
        if (error) throw error;
        await offlineService.clearAllOfflineData();
        return;
      } catch {
        // CORRIGIDO: Variável de erro removida, pois não é utilizada.
        // eslint-disable-next-line no-console
        console.warn('Failed to add transaction online, queuing for offline sync');
      }
    }

    await offlineService.addPendingAction('INSERT', 'inventory_transactions', transactionData);
    await this.updateLocalBalanceCache(offlineService, transaction);
  }

  /**
   * Busca transações com paginação e cache
   */
  async getTransactions(
    offlineService: OfflineService,
    filters: {
      product_id?: string;
      from_date?: string;
      to_date?: string;
    } = {},
    offset = 0,
    limit = 40
  ): Promise<{ transactions: InventoryTransaction[]; hasMore: boolean }> {
    const filterKey = Object.entries(filters)
      .filter(([, value]) => value)
      .map(([key, value]) => `${key}:${value}`)
      .join('|');
    const cacheKey = `transactions_${filterKey}_${offset}_${limit}`;

    if (!offlineService.getNetworkStatus()) {
      const cached = await offlineService.getCachedData<{
        transactions: InventoryTransaction[];
        hasMore: boolean;
      }>(cacheKey);
      if (cached) return cached;
      throw new Error('Sem conexão e sem histórico em cache');
    }

    try {
      let query = supabase
        .from('inventory_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (filters.product_id) query = query.eq('product_id', filters.product_id);
      if (filters.from_date) query = query.gte('created_at', filters.from_date);
      if (filters.to_date) query = query.lte('created_at', filters.to_date);

      const { data, error } = await query;
      if (error) throw error;

      const result = {
        transactions: data ?? [],
        hasMore: (data?.length ?? 0) === limit,
      };

      await offlineService.cacheData(cacheKey, result, 2 * 60 * 1000);
      return result;
    } catch (error) {
      const cached = await offlineService.getCachedData<{
        transactions: InventoryTransaction[];
        hasMore: boolean;
      }>(cacheKey);
      if (cached) return cached;
      throw error;
    }
  }

  /**
   * Atualiza cache local de saldos de forma otimista
   */
  private async updateLocalBalanceCache(
    offlineService: OfflineService,
    transaction: Omit<InventoryTransaction, 'id' | 'created_at'>
  ) {
    const cached = await offlineService.getCachedData<Balance[]>('inventory_balances');
    if (!cached) return;

    const updatedBalances = cached.map((balance: Balance) => {
      if (balance.product_id === transaction.product_id) {
        let delta = 0;
        switch (transaction.tx_type) {
          case 'entrada':
            delta = transaction.quantity;
            break;
          case 'saida':
          case 'venda':
            delta = -transaction.quantity;
            break;
          case 'ajuste':
            delta = transaction.quantity - balance.value;
            break;
        }
        return {
          ...balance,
          value: Math.max(0, balance.value + delta),
          today_delta: balance.today_delta + delta,
          updated_at: new Date().toISOString(),
        };
      }
      return balance;
    });

    await offlineService.cacheData('inventory_balances', updatedBalances, 5 * 60 * 1000);
  }

  /**
   * Limpa todos os caches relacionados ao inventário
   */
  async clearInventoryCache(offlineService: OfflineService): Promise<void> {
    await offlineService.clearAllOfflineData();
  }
}

/**
 * Hook para usar o serviço de inventário offline
 */
export function useInventoryOffline() {
  const service = InventoryOfflineService.getInstance();
  const offlineService = useOfflineService();

  return {
    getProducts: (forceRefresh?: boolean) => service.getProducts(offlineService, forceRefresh),
    getBalances: (products: Product[]) => service.getBalances(offlineService, products),
    addTransaction: (transaction: Omit<InventoryTransaction, 'id' | 'created_at'>) =>
      service.addTransaction(offlineService, transaction),
    getTransactions: (
      filters: { product_id?: string; from_date?: string; to_date?: string },
      offset?: number,
      limit?: number
    ) => service.getTransactions(offlineService, filters, offset, limit),
    clearCache: () => service.clearInventoryCache(offlineService),
  };
}
