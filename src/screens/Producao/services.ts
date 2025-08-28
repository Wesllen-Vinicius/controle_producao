// src/screens/Producao/services.ts
import { supabase } from "../../services/supabase";
import { Product, Production, ProductionFilters, SummaryItem } from "./types";

const HISTORY_DEFAULT_LIMIT = 180;

export const fetchProducts = async (): Promise<Product[]> => {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, unit, meta_por_animal")
    .order("name");
  if (error) throw error;
  return (data as Product[]) || [];
};

export const fetchHistory = async (
  filters: ProductionFilters
): Promise<Production[]> => {
  let query = supabase
    .from("productions")
    .select("id, prod_date, abate")
    .order("prod_date", { ascending: false });

  if (filters.fromDate) {
    query = query.gte("prod_date", filters.fromDate);
  }
  if (filters.toDate) {
    query = query.lte("prod_date", filters.toDate);
  }

  if (!filters.fromDate && !filters.toDate) {
    query = query.limit(HISTORY_DEFAULT_LIMIT);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as Production[]) || [];
};

export const fetchSummaryItems = async (
  productionId: string
): Promise<SummaryItem[]> => {
  const { data, error } = await supabase
    .from("v_production_item_summary")
    .select("*")
    .eq("production_id", productionId);
  if (error) throw error;
  return (data as SummaryItem[]) || [];
};

type SavePayload = {
  author_id: string;
  prod_date: string;
  abate: number;
  items: Array<{ product_id: string; produced: number }>;
};

export const saveProduction = async (payload: SavePayload) => {
  const { error } = await supabase.rpc("create_production_with_items", {
    author_id_in: payload.author_id,
    prod_date_in: payload.prod_date,
    abate_in: payload.abate,
    items: payload.items,
  });

  if (error) {
    if (error.message.includes("duplicate key")) {
      throw new Error("Já existe um registro para esta data.");
    }
    throw error;
  }
};
