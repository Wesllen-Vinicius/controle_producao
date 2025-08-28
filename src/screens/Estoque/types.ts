// src/screens/Estoque/types.ts
export type Unit = "UN" | "KG" | string;

export type Product = {
  id: string;
  name: string;
  unit: Unit;
};

export type Balance = {
  product_id: string;
  saldo: number;
  updated_at: string;
  // Enriched properties
  name?: string | null;
  unit?: string | null;
};

export type TransactionType =
  | "entrada"
  | "saida"
  | "ajuste"
  | "transferencia"
  | "venda";

export type Transaction = {
  id: string;
  product_id: string;
  quantity: number;
  unit: Unit;
  tx_type: TransactionType;
  created_at: string;
  source_production_id: string | null;
  metadata?: {
    customer?: string;
    observation?: string;
    justification?: string;
  } | null;
};

export type Renderable =
  | { type: "hdr"; id: string; title: string; subtitle: string }
  | { type: "tx"; id: string; tx: Transaction };

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
