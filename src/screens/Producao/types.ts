// src/screens/Producao/types.ts
export type Unit = 'UN' | 'KG' | 'L' | 'CX' | 'MT' | 'PC' | string;

export type Product = {
  id: string;
  name: string;
  unit: Unit;
  meta_por_animal: number;
};

export type Production = {
  id: string;
  prod_date: string;
  abate: number;
};

export type SummaryItem = {
  production_id: string;
  product_id: string;
  product_name: string;
  unit: Unit;
  produced: number;
  meta: number;
  diff: number;
  media: number;
};

export type Renderable =
  | { type: 'h-header'; id: string; title: string }
  | { type: 'h-row'; id: string; item: Production };

export type ProductionStats = {
  total: number;
  thisMonth: number;
  avgAnimals: number;
  byUnit: Record<string, { produced: number; meta: number; loss: number; efficiency: number }>;
};

export type ProductionFilters = {
  fromDate: string;
  toDate: string;
  productIds: string[];
};
