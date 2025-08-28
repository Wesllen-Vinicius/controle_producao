// src/screens/Producao/hooks/useProductionData.ts
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, LayoutAnimation } from "react-native";
import { useHaptics } from "../../../hooks/useHaptics";
import { usePerformanceOptimization } from "../../../hooks/usePerformanceOptimization";
import { useAuth } from "../../../state/AuthProvider";
import { useToast } from "../../../state/ToastProvider";
import * as ProductionService from "../services";
import {
  Product,
  Production,
  ProductionFilters,
  ProductionStats,
  Renderable,
  SummaryItem,
} from "../types";
import { labelForYMD, todayStr } from "../utils";

const MAX_ABATE = 10000;
const MIN_ABATE = 1;

export function useProductionData() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const h = useHaptics();
  const { isAppActive } = usePerformanceOptimization();

  // Estados de dados
  const [products, setProducts] = useState<Product[]>([]);
  const [history, setHistory] = useState<Production[]>([]);
  const [itemsCache, setItemsCache] = useState<Record<string, SummaryItem[]>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Estados do formulário
  const [formOpen, setFormOpen] = useState(false);
  const [prodDate, setProdDate] = useState<string>(todayStr());
  const [abateStr, setAbateStr] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [producedQuantities, setProducedQuantities] = useState<
    Record<string, string>
  >({});
  const [saving, setSaving] = useState(false);

  // Estados dos filtros
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ProductionFilters>({
    fromDate: "",
    toDate: todayStr(),
    productIds: [],
  });

  const abate = useMemo(() => parseInt(abateStr || "0", 10) || 0, [abateStr]);
  const prodNum = useCallback(
    (id: string) => parseFloat(producedQuantities[id] || "0") || 0,
    [producedQuantities]
  );

  // Busca de dados
  const loadInitialData = useCallback(
    async (isRefresh = false) => {
      if (!isAppActive()) return;
      if (!isRefresh) setLoading(true);
      try {
        const [fetchedProducts, fetchedHistory] = await Promise.all([
          ProductionService.fetchProducts(),
          ProductionService.fetchHistory(filters),
        ]);
        setProducts(fetchedProducts);
        setHistory(fetchedHistory);
      } catch (error: any) {
        showToast({
          type: "error",
          message: error.message || "Erro ao carregar dados.",
        });
      } finally {
        if (!isRefresh) setLoading(false);
      }
    },
    [filters, showToast, isAppActive]
  );

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadInitialData(true);
    setRefreshing(false);
  }, [loadInitialData]);

  const loadItemDetails = useCallback(
    async (prodId: string) => {
      if (itemsCache[prodId]) return;
      try {
        const items = await ProductionService.fetchSummaryItems(prodId);
        setItemsCache((s) => ({ ...s, [prodId]: items || [] }));
      } catch {
        /* falha silenciosa é aceitável aqui */
      }
    },
    [itemsCache]
  );

  // Ações do formulário
  const handleSave = useCallback(async () => {
    if (!session)
      return Alert.alert("Acesso negado", "É necessário estar logado.");
    if (!prodDate) return Alert.alert("Atenção", "Selecione uma data.");
    if (abate < MIN_ABATE || abate > MAX_ABATE)
      return Alert.alert(
        "Atenção",
        `Informe um número válido de abates (${MIN_ABATE}-${MAX_ABATE}).`
      );
    if (selectedIds.length === 0)
      return Alert.alert("Atenção", "Selecione ao menos um produto.");

    const itemsToSave = selectedIds
      .filter((id) => prodNum(id) > 0)
      .map((id) => ({ product_id: id, produced: prodNum(id) }));

    if (itemsToSave.length === 0)
      return Alert.alert(
        "Atenção",
        "Informe a quantidade para ao menos um produto."
      );

    setSaving(true);
    try {
      await ProductionService.saveProduction({
        author_id: session.user.id,
        prod_date: prodDate,
        abate: abate,
        items: itemsToSave,
      });

      setFormOpen(false);
      setProdDate(todayStr());
      setAbateStr("");
      setSelectedIds([]);
      setProducedQuantities({});
      await loadInitialData(true);
      h.success();
      showToast({ type: "success", message: "Produção registrada!" });
    } catch (e: any) {
      h.error();
      Alert.alert("Erro", e.message);
    } finally {
      setSaving(false);
    }
  }, [
    session,
    prodDate,
    abate,
    selectedIds,
    prodNum,
    h,
    showToast,
    loadInitialData,
  ]);

  const toggleProduct = useCallback((id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedIds((c) =>
      c.includes(id) ? c.filter((x) => x !== id) : [...c, id]
    );
  }, []);
  const selectAll = useCallback(
    () => setSelectedIds(products.map((p) => p.id)),
    [products]
  );
  const clearSelection = useCallback(() => setSelectedIds([]), []);

  // Dados derivados para a UI
  const historyItems = useMemo((): Renderable[] => {
    let filteredHistory = history;

    if (filters.productIds.length > 0) {
      filteredHistory = history.filter((production) => {
        const items = itemsCache[production.id];
        if (!items) return true;
        return items.some((item) =>
          filters.productIds.includes(item.product_id)
        );
      });
    }

    const byDay = new Map<string, Production[]>();
    filteredHistory.forEach((p) => {
      const ymd = p.prod_date.slice(0, 10);
      if (!byDay.has(ymd)) byDay.set(ymd, []);
      byDay.get(ymd)!.push(p);
    });

    const out: Renderable[] = [];
    Array.from(byDay.entries())
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .forEach(([ymd, list]) => {
        out.push({
          type: "h-header",
          id: `hdr-${ymd}`,
          title: labelForYMD(ymd),
        });
        list.forEach((row) =>
          out.push({ type: "h-row", id: row.id, item: row })
        );
      });
    return out;
  }, [history, filters.productIds, itemsCache]);

  const productionStats = useMemo((): ProductionStats => {
    if (!history) return { total: 0, thisMonth: 0, avgAnimals: 0, byUnit: {} };

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let thisMonthCount = 0;
    let totalAnimals = 0;
    const thisMonthProds: Production[] = [];

    history.forEach((p) => {
      totalAnimals += p.abate;
      const prodDate = new Date(p.prod_date);
      if (
        prodDate.getMonth() === currentMonth &&
        prodDate.getFullYear() === currentYear
      ) {
        thisMonthCount++;
        thisMonthProds.push(p);
      }
    });

    const avgAnimals =
      history.length > 0 ? Math.round(totalAnimals / history.length) : 0;
    const byUnit: ProductionStats["byUnit"] = {};

    thisMonthProds.forEach((prod) => {
      const items = itemsCache[prod.id];
      if (items && items.length > 0) {
        items.forEach((item) => {
          const unit = String(item.unit || "UN").toUpperCase();
          if (!byUnit[unit])
            byUnit[unit] = { produced: 0, meta: 0, loss: 0, efficiency: 0 };
          byUnit[unit].produced += item.produced;
          byUnit[unit].meta += item.meta;
        });
      }
    });

    Object.keys(byUnit).forEach((unit) => {
      const stats = byUnit[unit];
      stats.loss = Math.max(0, stats.meta - stats.produced);
      stats.efficiency =
        stats.meta > 0 ? Math.round((stats.produced / stats.meta) * 100) : 0;
    });

    return {
      total: history.length,
      thisMonth: thisMonthCount,
      avgAnimals,
      byUnit,
    };
  }, [history, itemsCache]);

  return {
    loading,
    refreshing,
    historyItems,
    itemsCache,
    products,
    productionStats,
    formOpen,
    setFormOpen,
    prodDate,
    setProdDate,
    abateStr,
    setAbateStr,
    selectedIds,
    producedQuantities,
    setProducedQuantities,
    saving,
    abate,
    showFilters,
    setShowFilters,
    filters,
    setFilters,
    onRefresh,
    handleSave,
    loadItemDetails,
    toggleProduct,
    selectAll,
    clearSelection,
    prodNum,
  };
}
