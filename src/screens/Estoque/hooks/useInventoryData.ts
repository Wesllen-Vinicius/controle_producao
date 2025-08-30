// src/screens/Estoque/hooks/useInventoryData.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useHaptics } from '../../../hooks/useHaptics';
import { notificationService } from '../../../services/notificationService';
import { useAuth } from '../../../state/AuthProvider';
import { useToast } from '../../../state/ToastProvider';
import * as InventoryService from '../services';
import {
  Balance,
  InventoryFilters,
  InventoryStats,
  Product,
  Renderable,
  Transaction,
  TransactionType,
} from '../types';
import { formatQuantity, isUnitType, labelForYMD, toISODate, todayStr } from '../utils';

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

  // Debounced filters para evitar re-fetches excessivos
  const debouncedFilters = useDebouncedValue(filters, 500);

  // Form States
  const [formOpen, setFormOpen] = useState(false);
  const [mvProd, setMvProd] = useState<string | null>(null);
  const [mvType, setMvType] = useState<TransactionType>('saida');
  const [mvQty, setMvQty] = useState('');
  const [mvCustomer, setMvCustomer] = useState('');
  const [mvObservation, setMvObservation] = useState('');
  const [mvJustification, setMvJustification] = useState('');
  const [saving, setSaving] = useState(false);

  // Error States for inline feedback
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Derived data for performance
  const productsById = useMemo(() => new Map((products ?? []).map(p => [p.id, p])), [products]);
  const balanceById = useMemo(
    () => new Map((balances ?? []).map(b => [b.product_id, b.saldo])),
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
      const fetchedBalances = await InventoryService.fetchBalances(fetchedProducts);
      setBalances(fetchedBalances);
    } catch (error: unknown) {
      Alert.alert('Erro ao carregar dados', (error as Error).message);
    }
  }, [mvProd]);

  const fetchTxPage = useCallback(
    async (_info?: { distanceFromEnd: number }) => {
      if (loadingPage || !hasMore) return;
      setLoadingPage(true);

      try {
        const { page, hasMore: newHasMore } = await InventoryService.fetchTransactionsPage(
          debouncedFilters,
          cursor
        );
        setTransactions(prev => [...(prev ?? []), ...page]);
        setCursor(cursor + page.length);
        setHasMore(newHasMore);
      } catch (error: unknown) {
        Alert.alert('Erro ao carregar histórico', (error as Error).message);
      } finally {
        setLoadingPage(false);
      }
    },
    [loadingPage, hasMore, cursor, debouncedFilters]
  );

  useEffect(() => {
    setLoading(true);
    loadPrimaryData().finally(() => setLoading(false));
  }, [loadPrimaryData]);

  const lastAppliedFiltersRef = useRef<InventoryFilters | null>(null);
  const resetAndFetchRef = useRef<((filters: InventoryFilters) => Promise<void>) | null>(null);

  resetAndFetchRef.current = async (newFilters: InventoryFilters) => {
    if (
      lastAppliedFiltersRef.current &&
      JSON.stringify(lastAppliedFiltersRef.current) === JSON.stringify(newFilters)
    ) {
      return;
    }

    lastAppliedFiltersRef.current = newFilters;
    setCursor(0);
    setHasMore(true);
    setTransactions(null);

    if (loadingPage) return;
    setLoadingPage(true);

    try {
      const { page, hasMore: newHasMore } = await InventoryService.fetchTransactionsPage(
        newFilters,
        0
      );
      setTransactions(page);
      setCursor(page.length);
      setHasMore(newHasMore);
    } catch (error: unknown) {
      Alert.alert('Erro ao carregar histórico', (error as Error).message);
    } finally {
      setLoadingPage(false);
    }
  };

  useEffect(() => {
    if (debouncedFilters && resetAndFetchRef.current) {
      resetAndFetchRef.current(debouncedFilters);
    }
  }, [debouncedFilters]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    lastAppliedFiltersRef.current = null; // Force refresh
    await loadPrimaryData();
    if (resetAndFetchRef.current) {
      await resetAndFetchRef.current(filters);
    }
    setRefreshing(false);
  }, [loadPrimaryData, filters]);

  // Validação em tempo real
  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!mvProd) {
      newErrors.product = 'Selecione um produto';
    }

    if (mvType === 'ajuste' && profile?.role !== 'admin') {
      newErrors.type = 'Apenas administradores podem fazer ajustes';
    }

    const mvQtyNum = parseFloat((mvQty || '0').replace(',', '.')) || 0;
    if (mvQtyNum <= 0) {
      newErrors.quantity = 'Informe uma quantidade válida';
    } else if (mvQtyNum > 999999) {
      newErrors.quantity = 'Quantidade muito alta (máximo 999.999)';
    }

    if (mvType === 'ajuste' && !mvObservation.trim()) {
      newErrors.observation = 'Informe o motivo do ajuste';
    }

    if (mvType === 'saida' && !mvJustification.trim()) {
      newErrors.justification = 'Informe a justificativa da saída';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [mvProd, mvType, mvQty, mvObservation, mvJustification, profile?.role]);

  useEffect(() => {
    if (formOpen) {
      validateForm();
    }
  }, [formOpen, validateForm]);

  const addTx = useCallback(async () => {
    const mvQtyNum = parseFloat((mvQty || '0').replace(',', '.')) || 0;

    if (!session?.user?.id) {
      setErrors({ general: 'É necessário estar logado para registrar movimentações' });
      return;
    }

    if (!validateForm()) {
      return;
    }

    if (!mvProd) {
      setErrors({ general: 'Produto inválido ou não selecionado.' });
      return;
    }

    const product = productsById.get(mvProd);
    if (!product) {
      setErrors({ general: 'Produto não encontrado' });
      return;
    }

    const proceedWithTx = async () => {
      setSaving(true);
      try {
        let actualQuantity = mvQtyNum;
        if (mvType === 'ajuste') {
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
            mvType === 'venda' && mvCustomer.trim()
              ? { customer: mvCustomer.trim().substring(0, 100) }
              : mvType === 'ajuste' && mvObservation.trim()
                ? { observation: mvObservation.trim().substring(0, 200) }
                : mvType === 'saida' && mvJustification.trim()
                  ? { justification: mvJustification.trim().substring(0, 200) }
                  : null,
        });

        lastAppliedFiltersRef.current = null;
        await loadPrimaryData();
        if (resetAndFetchRef.current) {
          await resetAndFetchRef.current(filters);
        }

        if (mvType !== 'transferencia') {
          await notificationService.notifyInventoryMovement({
            type: mvType,
            product: product.name,
            quantity: actualQuantity,
            unit: product.unit,
          });
        }

        const newBalance = balanceById.get(mvProd) ?? 0;
        const updatedBalance =
          newBalance +
          (mvType === 'entrada'
            ? actualQuantity
            : mvType === 'ajuste'
              ? actualQuantity - newBalance
              : -actualQuantity);

        if (updatedBalance < 0) {
          await notificationService.notifyNegativeStock({
            product: product.name,
            currentStock: updatedBalance,
            unit: product.unit,
          });
        } else if (updatedBalance <= 10 && updatedBalance > 0) {
          await notificationService.notifyLowStock({
            product: product.name,
            currentStock: updatedBalance,
            unit: product.unit,
            threshold: 10,
          });
        }

        h.success();
        showToast({
          type: 'success',
          message: `${mvType.charAt(0).toUpperCase() + mvType.slice(1)} registrada!`,
        });
        setFormOpen(false);
        setMvQty('');
        setMvCustomer('');
        setMvObservation('');
        setMvJustification('');
        setErrors({});
      } catch (e: unknown) {
        h.error();
        Alert.alert('Erro', (e as Error).message);
      } finally {
        setSaving(false);
      }
    };

    if (mvType === 'saida' || mvType === 'venda') {
      const saldoAtual = balanceById.get(mvProd) ?? 0;
      if (saldoAtual < mvQtyNum) {
        Alert.alert(
          'Saldo insuficiente',
          `Saldo atual: ${formatQuantity(product.unit, saldoAtual)}\nQuantidade solicitada: ${formatQuantity(
            product.unit,
            mvQtyNum
          )}`,
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Continuar', onPress: proceedWithTx },
          ]
        );
        return;
      }
    }
    await proceedWithTx();
    // CORREÇÃO: 'profile' removido das dependências pois já é uma dependência indireta de 'validateForm'.
  }, [
    session,
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
    filters,
    validateForm,
  ]);

  const inventoryStats = useMemo((): InventoryStats => {
    const balancesData = balances ?? [];
    const totalProducts = balancesData.length;
    const negativeStock = balancesData.filter(b => b.saldo < 0).length;
    const maxSaldo = Math.max(0, ...balancesData.map(b => Math.abs(b.saldo)));
    const lowStock =
      balancesData.filter(b => {
        if (b.saldo <= 0) return false;
        const lowThreshold = isUnitType(b.unit) ? 10 : Math.max(2, maxSaldo * 0.05);
        return b.saldo <= lowThreshold;
      }).length ?? 0;
    return { totalProducts, negativeStock, lowStock };
  }, [balances]);

  const renderables = useMemo((): Renderable[] => {
    if (!transactions) return [];
    const groups = new Map<string, Transaction[]>();
    transactions.forEach(t => {
      const ymd = t.created_at.slice(0, 10);
      if (!groups.has(ymd)) groups.set(ymd, []);
      const group = groups.get(ymd);
      if (group) {
        group.push(t);
      }
    });
    const out: Renderable[] = [];
    Array.from(groups.entries())
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .forEach(([ymd, items]) => {
        out.push({
          type: 'hdr',
          id: `hdr-${ymd}`,
          title: labelForYMD(ymd),
          subtitle: new Date(ymd).toLocaleDateString(),
        });
        items
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .forEach(tx => {
            out.push({ type: 'tx', id: tx.id, tx });
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
    errors,
    validateForm,
    setErrors,
  };
}
