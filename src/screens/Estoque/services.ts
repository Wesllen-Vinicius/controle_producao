// src/screens/Estoque/services.ts
import { supabase } from "../../services/supabase";
import { Balance, InventoryFilters, Product, Transaction } from "./types";
import { endOfDayString } from "./utils";

const PAGE_SIZE = 40;

export const fetchProducts = async (): Promise<Product[]> => {
  const { data, error } = await supabase
    .from("products")
    .select("id,name,unit")
    .order("name");
  if (error) throw error;
  return (data as Product[]) || [];
};

export const fetchBalances = async (
  products: Product[]
): Promise<Balance[]> => {
  const { data, error } = await supabase
    .from("inventory_balances")
    .select("product_id,saldo,updated_at");
  if (error) throw error;

  const list = (data as any[]) || [];
  const productsById = new Map(products.map((p) => [p.id, p]));
  return list.map((b) => ({
    ...b,
    name: productsById.get(b.product_id)?.name,
    unit: productsById.get(b.product_id)?.unit,
  }));
};

export const fetchTransactionsPage = async (
  filters: InventoryFilters,
  cursor: number
): Promise<{ page: Transaction[]; hasMore: boolean }> => {
  const fromIdx = cursor;
  const toIdx = fromIdx + PAGE_SIZE - 1;

  let query = supabase
    .from("inventory_transactions")
    .select(
      "id,product_id,quantity,unit,tx_type,created_at,source_production_id,metadata"
    )
    .order("created_at", { ascending: false })
    .range(fromIdx, toIdx);

  if (filters.productId) {
    query = query.eq("product_id", filters.productId);
  }
  if (filters.transactionType) {
    if (filters.transactionType === "venda") {
      query = query.in("tx_type", ["venda", "saida"]);
    } else {
      query = query.eq("tx_type", filters.transactionType);
    }
  }
  if (filters.fromDate) {
    query = query.gte("created_at", `${filters.fromDate} 00:00:00`);
  }
  if (filters.toDate) {
    query = query.lte("created_at", endOfDayString(filters.toDate));
  }

  const { data, error } = await query;
  if (error) throw error;

  const page = (data as Transaction[]) || [];
  return { page, hasMore: page.length === PAGE_SIZE };
};

type AddTransactionPayload = {
  product_id: string;
  quantity: number;
  unit: string;
  tx_type: Transaction["tx_type"];
  created_by: string;
  metadata?: Transaction["metadata"];
};

export const addTransaction = async (
  payload: AddTransactionPayload
): Promise<void> => {
  const { error } = await supabase
    .from("inventory_transactions")
    .insert(payload);
  if (error) {
    if (error.message.includes("duplicate"))
      throw new Error("Transação duplicada detectada.");
    if (error.message.includes("permission"))
      throw new Error("Sem permissão para registrar movimentações.");
    throw error;
  }
};
