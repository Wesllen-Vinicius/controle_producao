// Produtos/types/index.ts

export type Unit = 'UN' | 'KG' | 'L' | 'CX' | 'PC' | string;

export interface Product {
  id: string;
  name: string;
  unit: Unit;
  meta_por_animal: number;
}
