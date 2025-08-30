import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePerformanceOptimization } from '../../../hooks/usePerformanceOptimization';
import { fetchProducts, fetchReportData } from '../services/reportService';
import {
  ChartSeriesData,
  DayTotals,
  Product,
  Production,
  ProductionItem,
  ProductTotals,
  SortOption,
  Totals,
  Unit,
} from '../types';
import { getTodayStr, ONE_DAY_MS, toISODate } from '../utils';

export const useReportData = () => {
  const { isAppActive } = usePerformanceOptimization();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [productions, setProductions] = useState<Production[]>([]);
  const [items, setItems] = useState<ProductionItem[]>([]);

  const [dateRange, setDateRange] = useState<{ from: string; to: string }>(() => {
    const now = Date.now();
    return {
      from: toISODate(new Date(now - 30 * ONE_DAY_MS)),
      to: getTodayStr(),
    };
  });
  const [productFilters, setProductFilters] = useState<string[]>([]);
  const [unitFilter, setUnitFilter] = useState<Unit | 'ALL'>('ALL');
  const [sortTotalsBy, setSortTotalsBy] = useState<SortOption>('produced');

  const loadData = useCallback(async () => {
    if (!isAppActive()) return;
    setLoading(true);
    setError(null);
    try {
      const [report, prods] = await Promise.all([
        fetchReportData(dateRange.from, dateRange.to),
        fetchProducts(),
      ]);
      setProductions(report.productions);
      setItems(report.items);
      setProducts(prods);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [dateRange, isAppActive]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const productsById = useMemo(() => Object.fromEntries(products.map(p => [p.id, p])), [products]);
  const hasProductFilter = productFilters.length > 0;

  const effectiveProductIds = useMemo(() => {
    if (!hasProductFilter || unitFilter === 'ALL') return productFilters;
    return productFilters.filter(id => productsById[id]?.unit === unitFilter);
  }, [hasProductFilter, productFilters, unitFilter, productsById]);

  const dailyTotals: DayTotals[] = useMemo(() => {
    if (!productions.length) return [];
    const map = new Map<string, DayTotals>();
    productions.forEach(p =>
      map.set(p.prod_date, {
        date: p.prod_date,
        abate: p.abate,
        produced: 0,
        meta: 0,
        diff: 0,
      })
    );

    if (hasProductFilter) {
      const picked = new Set(effectiveProductIds);
      items.forEach(it => {
        if (picked.has(it.product_id)) {
          const prod = productions.find(p => p.id === it.production_id);
          if (prod) {
            const day = map.get(prod.prod_date);
            if (day) {
              day.produced += it.produced;
              day.meta += it.meta;
              day.diff += it.diff;
            }
          }
        }
      });
    }
    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [productions, items, hasProductFilter, effectiveProductIds]);

  const totals: Totals | null = useMemo(() => {
    if (!hasProductFilter) return null;
    return dailyTotals.reduce(
      (acc, d) => ({
        abate: acc.abate + d.abate,
        produced: acc.produced + d.produced,
        meta: acc.meta + d.meta,
        diff: acc.diff + d.diff,
      }),
      { abate: 0, produced: 0, meta: 0, diff: 0 }
    );
  }, [dailyTotals, hasProductFilter]);

  const productTotals: ProductTotals[] = useMemo(() => {
    if (!items.length) return [];
    const map = new Map<string, ProductTotals>();
    items.forEach(it => {
      const p = productsById[it.product_id];
      if (!p) return;
      let entry = map.get(it.product_id);
      if (!entry) {
        entry = {
          product_id: it.product_id,
          name: p.name,
          unit: p.unit,
          produced: 0,
          meta: 0,
          diff: 0,
        };
        map.set(it.product_id, entry);
      }
      entry.produced += it.produced;
      entry.meta += it.meta;
      entry.diff += it.diff;
    });
    const unsorted = Array.from(map.values());
    if (sortTotalsBy === 'name') return unsorted.sort((a, b) => a.name.localeCompare(b.name));
    if (sortTotalsBy === 'produced') return unsorted.sort((a, b) => b.produced - a.produced);
    if (sortTotalsBy === 'compliance') {
      const getCompliance = (p: ProductTotals) => (p.meta > 0 ? p.produced / p.meta : 0);
      return unsorted.sort((a, b) => getCompliance(b) - getCompliance(a));
    }
    return unsorted;
  }, [items, productsById, sortTotalsBy]);

  // --- CORREÇÃO: LÓGICA DO GRÁFICO ADICIONADA ---
  const chartUnit: Unit | 'Misto' = useMemo(() => {
    if (!hasProductFilter) return 'UN';
    const uniqueUnits = new Set(
      effectiveProductIds.map(id => productsById[id]?.unit).filter(Boolean)
    );
    return uniqueUnits.size === 1 ? Array.from(uniqueUnits)[0] : 'Misto';
  }, [hasProductFilter, effectiveProductIds, productsById]);

  const chartSeries: ChartSeriesData[] = useMemo(() => {
    if (!hasProductFilter || !dailyTotals.length) return [];
    return dailyTotals
      .map(day => ({
        label: day.date,
        produced: day.produced,
        meta: day.meta,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [hasProductFilter, dailyTotals]);
  // --- FIM DA CORREÇÃO ---

  return {
    loading,
    error,
    products,
    dailyTotals,
    productTotals,
    totals,
    hasProductFilter,
    dateRange,
    setDateRange,
    productFilters,
    setProductFilters,
    unitFilter,
    setUnitFilter,
    sortTotalsBy,
    setSortTotalsBy,
    chartSeries, // Retornando os dados do gráfico
    chartUnit, // Retornando a unidade do gráfico
    onRefresh: loadData,
  };
};
