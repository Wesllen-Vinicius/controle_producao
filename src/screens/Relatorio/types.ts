export type Unit = 'UN' | 'KG' | 'L' | 'CX' | 'PC' | string;

export type Product = {
  id: string;
  name: string;
  unit: Unit;
};

export type Production = {
  id: string;
  prod_date: string;
  abate: number;
};

export type ProductionItem = {
  id: string;
  production_id: string;
  product_id: string;
  produced: number;
  meta: number;
  diff: number;
  avg: number;
};

export type DayTotals = {
  date: string;
  abate: number;
  produced: number;
  meta: number;
  diff: number;
};

export type ProductTotals = {
  product_id: string;
  name: string;
  unit: string;
  produced: number;
  meta: number;
  diff: number;
};

export type ChartSeriesData = {
  label: string;
  produced: number;
  meta: number;
};

export type Totals = {
  abate: number;
  produced: number;
  meta: number;
  diff: number;
};

export type SortOption = 'produced' | 'compliance' | 'name';
export type ExportFormat = 'csv' | 'json' | 'pdf';
