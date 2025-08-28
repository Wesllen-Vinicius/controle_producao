// src/screens/Estoque/hooks/useInventoryData.ts
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import { useHaptics } from "../../../hooks/useHaptics";
import { useAuth } from "../../../state/AuthProvider";
import { useToast } from "../../../state/ToastProvider";
import * as InventoryService from "../services";
import {
  Balance,
  InventoryFilters,
  InventoryStats,
  Product,
  Renderable,
  Transaction,
} from "../types";
import {
  formatQuantity,
  isUnitType,
  labelForYMD,
  toISODate,
  todayStr,
} from "../utils";

const ONE_DAY_MS = 86400000;

export function useInventoryData() {
  const { session, profile } = useAuth();
  const { showToast } = useToast();
  const h = useHaptics();

  // Data States
  const [products, setProducts] = useState<Product[] | null>(null);
  const [balances, setBalances] = useState<Balance[] | null>(null);
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Pagination States
  const [loadingPage, setLoadingPage] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Filter States
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<InventoryFilters>({
    productId: null,
    fromDate: toISODate(new Date(Date.now() - 30 * ONE_DAY_MS)),
    toDate: todayStr(),
  });

  // Form States
  const [formOpen, setFormOpen] = useState(false);
  const [mvProd, setMvProd] = useState<string | null>(null);
  const [mvType, setMvType] = useState<Transaction["tx_type"]>("saida");
  const [mvQty, setMvQty] = useState("");
  const [mvCustomer, setMvCustomer] = useState("");
  const [mvObservation, setMvObservation] = useState("");
  const [mvJustification, setMvJustification] = useState("");
  const [saving, setSaving] = useState(false);

  // Derived data for performance
  const productsById = useMemo(
    () => new Map((products || []).map((p) => [p.id, p])),
    [products]
  );
  const balanceById = useMemo(
    () => new Map((balances || []).map((b) => [b.product_id, b.saldo])),
    [balances]
  );

  // Data fetching logic
  const loadPrimaryData = useCallback(async () => {
    try {
      const fetchedProducts = await InventoryService.fetchProducts();
      setProducts(fetchedProducts);
      if (fetchedProducts.length > 0 && !mvProd) {
        setMvProd(fetchedProducts[0].id);
      }
      const fetchedBalances = await InventoryService.fetchBalances(
        fetchedProducts
      );
      setBalances(fetchedBalances);
    } catch (error: any) {
      Alert.alert("Erro ao carregar dados", error.message);
    }
  }, [mvProd]);

  const fetchTxPage = useCallback(
    async (reset = false) => {
      if (loadingPage || (!reset && !hasMore)) return;
      setLoadingPage(true);
      const nextCursor = reset ? 0 : cursor;

      try {
        const { page, hasMore: newHasMore } =
          await InventoryService.fetchTransactionsPage(filters, nextCursor);
        setTransactions((prev) => (reset ? page : [...(prev || []), ...page]));
        setCursor(nextCursor + page.length);
        setHasMore(newHasMore);
      } catch (error: any) {
        Alert.alert("Erro ao carregar histórico", error.message);
      } finally {
        setLoadingPage(false);
      }
    },
    [loadingPage, hasMore, cursor, filters]
  );

  useEffect(() => {
    setLoading(true);
    loadPrimaryData().finally(() => setLoading(false));
  }, [loadPrimaryData]);

  useEffect(() => {
    fetchTxPage(true);
  }, [filters]); // Re-fetch when filters change

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadPrimaryData(), fetchTxPage(true)]);
    setRefreshing(false);
  }, [loadPrimaryData, fetchTxPage]);

  const addTx = useCallback(async () => {
    if (!session?.user?.id)
      return Alert.alert("Acesso negado", "É necessário estar logado.");
    if (!mvProd) return Alert.alert("Atenção", "Selecione um produto.");
    if (mvType === "ajuste" && profile?.role !== "admin")
      return Alert.alert(
        "Acesso negado",
        "Apenas administradores podem fazer ajustes."
      );

    const mvQtyNum = parseFloat((mvQty || "0").replace(",", ".")) || 0;
    if (mvQtyNum <= 0)
      return Alert.alert("Atenção", "Informe uma quantidade válida.");
    if (mvQtyNum > 999999)
      return Alert.alert("Atenção", "Quantidade muito alta.");

    if (mvType === "ajuste" && !mvObservation.trim())
      return Alert.alert("Atenção", "Informe o motivo do ajuste.");
    if (mvType === "saida" && !mvJustification.trim())
      return Alert.alert("Atenção", "Informe a justificativa da saída.");

    const product = productsById.get(mvProd);
    if (!product) return Alert.alert("Erro", "Produto não encontrado.");

    const proceedWithTx = async () => {
      setSaving(true);
      try {
        let actualQuantity = mvQtyNum;
        if (mvType === "ajuste") {
          const currentBalance = balanceById.get(mvProd) ?? 0;
          actualQuantity = mvQtyNum - currentBalance;
        }

        await InventoryService.addTransaction({
          product_id: mvProd,
          quantity: Math.round(actualQuantity * 1000) / 1000,
          unit: product.unit,
          tx_type: mvType,
          created_by: session.user.id,
          metadata:
            mvType === "venda" && mvCustomer.trim()
              ? { customer: mvCustomer.trim().substring(0, 100) }
              : mvType === "ajuste" && mvObservation.trim()
              ? { observation: mvObservation.trim().substring(0, 200) }
              : mvType === "saida" && mvJustification.trim()
              ? { justification: mvJustification.trim().substring(0, 200) }
              : null,
        });

        await Promise.all([loadPrimaryData(), fetchTxPage(true)]);
        h.success();
        showToast({
          type: "success",
          message: `${
            mvType.charAt(0).toUpperCase() + mvType.slice(1)
          } registrada!`,
        });
        setFormOpen(false);
        setMvQty("");
        setMvCustomer("");
        setMvObservation("");
        setMvJustification("");
      } catch (e: any) {
        h.error();
        Alert.alert("Erro", e.message);
      } finally {
        setSaving(false);
      }
    };

    if (mvType === "saida" || mvType === "venda") {
      const saldoAtual = balanceById.get(mvProd) ?? 0;
      if (saldoAtual < mvQtyNum) {
        Alert.alert(
          "Saldo insuficiente",
          `Saldo atual: ${formatQuantity(
            product.unit,
            saldoAtual
          )}\nQuantidade solicitada: ${formatQuantity(product.unit, mvQtyNum)}`,
          [
            { text: "Cancelar", style: "cancel" },
            { text: "Continuar", onPress: proceedWithTx },
          ]
        );
        return;
      }
    }
    await proceedWithTx();
  }, [
    session,
    profile,
    mvProd,
    mvQty,
    mvType,
    mvCustomer,
    mvObservation,
    mvJustification,
    productsById,
    balanceById,
    h,
    showToast,
    loadPrimaryData,
    fetchTxPage,
  ]);

  // UI Derived Data
  const inventoryStats = useMemo((): InventoryStats => {
    const totalProducts = balances?.length || 0;
    const negativeStock = balances?.filter((b) => b.saldo < 0).length || 0;
    const maxSaldo = Math.max(
      1,
      ...(balances || []).map((b) => Math.abs(b.saldo))
    );
    const lowStock =
      balances?.filter((b) => {
        if (b.saldo <= 0) return false;
        const lowThreshold = isUnitType(b.unit)
          ? 10
          : Math.max(2, maxSaldo * 0.05);
        return b.saldo <= lowThreshold;
      }).length || 0;
    return { totalProducts, negativeStock, lowStock };
  }, [balances]);

  const renderables = useMemo((): Renderable[] => {
    if (!transactions) return [];
    const groups = new Map<string, Transaction[]>();
    transactions.forEach((t) => {
      const ymd = t.created_at.slice(0, 10);
      if (!groups.has(ymd)) groups.set(ymd, []);
      groups.get(ymd)!.push(t);
    });
    const out: Renderable[] = [];
    Array.from(groups.entries())
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .forEach(([ymd, items]) => {
        out.push({
          type: "hdr",
          id: `hdr-${ymd}`,
          title: labelForYMD(ymd),
          subtitle: new Date(ymd).toLocaleDateString(),
        });
        items
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          )
          .forEach((tx) => {
            out.push({ type: "tx", id: tx.id, tx });
          });
      });
    return out;
  }, [transactions]);

  return {
    profile,
    loading,
    refreshing,
    onRefresh,
    balances,
    transactions,
    products,
    productsById,
    balanceById,
    inventoryStats,
    renderables,
    loadingPage,
    hasMore,
    fetchTxPage,
    filtersOpen,
    setFiltersOpen,
    filters,
    setFilters,
    formOpen,
    setFormOpen,
    mvProd,
    setMvProd,
    mvType,
    setMvType,
    mvQty,
    setMvQty,
    mvCustomer,
    setMvCustomer,
    mvObservation,
    setMvObservation,
    mvJustification,
    setMvJustification,
    saving,
    addTx,
  };
}
