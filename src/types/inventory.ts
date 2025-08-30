// Tipos base para inventário e estoque
export type Unit = 'UN' | 'KG' | 'L' | 'CX' | 'PC' | 'MT' | string;

export type TransactionType = 'entrada' | 'saida' | 'ajuste' | 'transferencia' | 'venda';

export interface Product {
  readonly id: string;
  name: string;
  unit: Unit;
  meta_por_animal: number;
  created_at?: string;
  updated_at?: string;
}

export interface Balance {
  readonly product_id: string;
  saldo: number;
  updated_at: string;
  name?: string | null;
  unit?: string | null;
}

export interface Transaction {
  readonly id: string;
  readonly product_id: string;
  quantity: number;
  unit: Unit;
  tx_type: TransactionType;
  created_at: string;
  created_by?: string;
  source_production_id?: string | null;
  metadata?: TransactionMetadata | null;
}

export interface TransactionMetadata {
  customer?: string;
  notes?: string;
  batch?: string;
  location?: string;
  [key: string]: unknown;
}

// Tipos para renderização
export type RenderableItem =
  | { type: 'header'; id: string; title: string; subtitle: string }
  | { type: 'transaction'; id: string; transaction: Transaction };

// Tipos para filtros
export interface InventoryFilters {
  productId?: string | null;
  transactionType?: TransactionType | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  searchTerm?: string | null;
}

// Tipos para paginação
export interface PaginationState {
  page: number;
  pageSize: number;
  cursor: number;
  hasMore: boolean;
  loading: boolean;
}

// Tipos para estatísticas
export interface InventoryStats {
  totalProducts: number;
  totalTransactions: number;
  totalValue: number;
  lowStockItems: number;
  lastUpdate: string;
}

// Tipos para formulários
export interface TransactionFormData {
  productId: string;
  transactionType: TransactionType;
  quantity: string;
  customer?: string;
  notes?: string;
}

export interface ProductFormData {
  name: string;
  unit: Unit;
  metaPerAnimal: string;
}

// Tipos para validação
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Tipos para cache
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// Tipos para configuração
export interface InventoryConfig {
  pageSize: number;
  cacheTTL: number;
  maxCacheSize: number;
  autoRefreshInterval: number;
  allowNegativeStock: boolean;
  maxQuantity: number;
}
