// Tipos para o sistema de produção
export interface Production {
  readonly id: string;
  prod_date: string;
  abate: number;
  author_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProductionItem {
  readonly id: string;
  readonly production_id: string;
  readonly product_id: string;
  produced: number;
  meta: number;
  diff: number;
  avg: number;
  created_at?: string;
}

export interface ProductionSummary {
  production_id: string;
  product_id: string;
  product_name: string;
  unit: string;
  produced: number;
  meta: number;
  diff: number;
  media: number;
  compliance_percentage: number;
}

export interface ProductionFormData {
  date: string;
  abate: string;
  selectedProducts: string[];
  quantities: Record<string, string>;
}

export interface ProductionStats {
  totalProductions: number;
  totalAbate: number;
  averageCompliance: number;
  topProducts: ProductionSummary[];
  lastUpdate: string;
}

export interface ProductionFilters {
  dateFrom?: string | null;
  dateTo?: string | null;
  productIds?: string[];
  minAbate?: number;
  maxAbate?: number;
}

// Tipos para relatórios
export interface ProductionReport {
  period: {
    from: string;
    to: string;
  };
  summary: ProductionStats;
  dailyData: DailyProductionData[];
  productData: ProductProductionData[];
}

export interface DailyProductionData {
  date: string;
  abate: number;
  totalProduced: number;
  totalMeta: number;
  compliance: number;
  items: ProductionItem[];
}

export interface ProductProductionData {
  product_id: string;
  product_name: string;
  unit: string;
  total_produced: number;
  total_meta: number;
  compliance: number;
  daily_average: number;
}

// Tipos para validação de produção
export interface ProductionValidation {
  isValidDate: boolean;
  isValidAbate: boolean;
  hasSelectedProducts: boolean;
  hasValidQuantities: boolean;
  errors: string[];
}