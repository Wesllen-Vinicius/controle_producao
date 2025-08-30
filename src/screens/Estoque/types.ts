// src/screens/Estoque/types.ts

// MELHORIA: Tipo 'Unit' mais seguro com autocomplete para unidades conhecidas.
type KnownUnit = 'UN' | 'KG' | 'L' | 'CX' | 'PC';
export type Unit = KnownUnit | (string & {});

export type Product = {
  id: string;
  name: string;
  unit: Unit;
};

export type Balance = {
  product_id: string;
  saldo: number;
  updated_at: string;
  // Propriedades enriquecidas vindas do produto correspondente
  name?: string;
  unit?: Unit;
};

export type TransactionType = 'entrada' | 'saida' | 'ajuste' | 'transferencia' | 'venda';

// MELHORIA: Estrutura da transação "achatada" para melhor ergonomia.
export type Transaction = {
  id: string;
  product_id: string;
  quantity: number;
  // 'unit' foi removido para evitar redundância (a unidade é do produto).
  delta: number;
  balance_after: number;
  tx_type: TransactionType;
  created_at: string;
  source_production_id: string | null;

  // Campos de metadados agora são de primeiro nível e opcionais.
  customer?: string | null;
  observation?: string | null;
  justification?: string | null;
};

/**
 * Representa um item em uma lista que pode ser ou um cabeçalho de data
 * ou uma entrada de transação. Ótimo para uso em FlatLists.
 */
export type Renderable =
  | { type: 'hdr'; id: string; title: string; subtitle: string }
  | { type: 'tx'; id: string; tx: Transaction };

export type InventoryFilters = {
  productId: string | null;
  transactionType?: TransactionType;
  fromDate: string;
  toDate: string;
};

export type InventoryStats = {
  totalProducts: number;
  negativeStock: number;
  lowStock: number;
};
