// screens/ProducaoScreen.tsx
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Animated,
  LayoutAnimation,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import Screen from '../components/Screen';
import Card from '../components/ui/Card';
import Chip from '../components/ui/Chip';
import Button from '../components/ui/Button';
import { InputNumber } from '../components/ui/Input';
import EmptyState from '../components/ui/EmptyState';
import SkeletonList from '../components/SkeletonList';
import { supabase } from '../services/supabase';
import { useAuth } from '../state/AuthProvider';
import { useToast } from '../state/ToastProvider';
import { useHaptics } from '../hooks/useHaptics';
import { useTheme } from '../state/ThemeProvider';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useDebouncedCallback } from '../hooks/useDebouncedCallback';
import { usePerformanceOptimization, useThrottle } from '../hooks/usePerformanceOptimization';
import FAB from '../components/ui/FAB';
import BottomSheet from '../components/ui/BottomSheet';
import DateField from '../components/DateField';

/* ===== Tipos e Helpers ===== */
type Unit = 'UN' | 'KG' | 'L' | 'CX' | 'MT' | 'PC' | string;
type Product = { id: string; name: string; unit: Unit; meta_por_animal: number };
type Production = { id: string; prod_date: string; abate: number };
type SummaryItem = { production_id: string; product_id: string; product_name: string; unit: Unit; produced: number; meta: number; diff: number; media: number; };

const ONE_DAY = 86400000;
const todayStr = () => new Date().toISOString().slice(0, 10);
const tomorrow = () => new Date(Date.now() + ONE_DAY);
const parseISODate = (s?: string) => {
    if (!s) return new Date();
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
};
const labelForYMD = (ymd: string) => {
    const d = parseISODate(ymd);
    const now = new Date();
    const a = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const b = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const diff = Math.round((a - b) / ONE_DAY);
    if (diff === 0) return 'Hoje';
    if (diff === -1) return 'Ontem';
    return d.toLocaleDateString();
};

/* ===== Componentes Internos ===== */
function useStyles() {
  const { colors, spacing, typography } = useTheme();
  return useMemo(() => StyleSheet.create({
    hint: { color: colors.muted, fontWeight: '700' },
    sectionHeader: { paddingVertical: 6, paddingHorizontal: spacing.sm, alignSelf: 'flex-start', backgroundColor: colors.surfaceAlt, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
    timeline: { borderLeftWidth: 2, borderLeftColor: colors.line, paddingLeft: spacing.md },
    bullet: { position: 'absolute', left: -6, top: 14, width: 10, height: 10, borderRadius: 10 },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line, opacity: 0.8 },
    accentBox: { borderWidth: 2, borderRadius: 14, padding: spacing.md },
  }), [colors, spacing, typography]);
}

function ProgressBar({ progress }: { progress: number }) {
  const { colors, radius } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;
  const pct = Math.max(0, Math.min(1, progress));
  useEffect(() => {
    Animated.spring(anim, { toValue: pct, stiffness: 140, damping: 18, mass: 0.7, useNativeDriver: true }).start();
  }, [pct, anim]);
  return (
    <View style={{ height: 6, backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, overflow: 'hidden' }}>
      <Animated.View style={{ height: '100%', width: '100%', backgroundColor: colors.primary, transform: [{ scaleX: anim }], alignSelf: 'flex-start' }} />
    </View>
  );
}

const Stat = memo(function Stat({ label, value, status, hint, icon }: any) {
  const { colors, spacing, radius, typography } = useTheme();
  const color = status === 'danger' ? colors.danger : status === 'success' ? colors.success : colors.text;
  const bgColor = status === 'danger' ? colors.danger + '15' : status === 'success' ? colors.success + '15' : colors.surfaceAlt;

  return (
    <View style={{
      flex: 1,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      backgroundColor: bgColor,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: status ? color + '30' : colors.line,
      minHeight: 72,
      justifyContent: 'center',
      gap: spacing.xs
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={[typography.label, { color: colors.muted, fontSize: 11, fontWeight: '600' }]}>{label}</Text>
        {icon && (
          <MaterialCommunityIcons name={icon} size={16} color={colors.muted} />
        )}
      </View>
      <Text style={{
        fontWeight: '900',
        color,
        fontSize: 20,
        lineHeight: 24,
        letterSpacing: -0.5
      }}>
        {value}
      </Text>
      {!!hint && (
        <Text style={{
          color: colors.muted,
          fontSize: 10,
          fontWeight: '500',
          marginTop: 2
        }}>
          {hint}
        </Text>
      )}
    </View>
  );
});

const ProductionForm = memo(({ prodDate, setProdDate, abateStr, setAbateStr, products, selected, toggleProduct, selectAll, clearSelection }: any) => {
  const { colors, spacing, typography } = useTheme();

  const handleDateToday = useCallback(() => {
    setProdDate(todayStr());
  }, [setProdDate]);

  const renderProductChip = useCallback((p: Product) => (
    <Chip
      key={p.id}
      label={p.name}
      active={selected.includes(p.id)}
      onPress={() => toggleProduct(p.id)}
    />
  ), [selected, toggleProduct]);

  return (
    <View style={{ gap: spacing.lg }}>
      {/* Date Input */}
      <View>
        <Text style={[typography.label, { marginBottom: spacing.sm, color: colors.text, fontWeight: '600' }]}>Data da Produção</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <DateField
              label=""
              value={prodDate}
              onChange={setProdDate}
              maximumDate={tomorrow()}
            />
          </View>
          <Button
            title="Hoje"
            variant="tonal"
            onPress={handleDateToday}
          />
        </View>
      </View>

      {/* Animals Input */}
      <View>
        <Text style={[typography.label, { marginBottom: spacing.sm, color: colors.text, fontWeight: '600' }]}>Animais Abatidos</Text>
        <InputNumber
          label=""
          mode="integer"
          value={abateStr}
          onChangeText={setAbateStr}
          placeholder="0"
          keyboardType="number-pad"
          maxLength={5}
        />
      </View>

      {/* Product Selection */}
      <View>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: spacing.sm
        }}>
          <Text style={[typography.label, { color: colors.text, fontWeight: '600' }]}>Produtos ({selected.length})</Text>
          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
            <Button title="Todos" variant="text" small onPress={selectAll} />
            <Button title="Limpar" variant="text" small onPress={clearSelection} />
          </View>
        </View>

        <View style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: spacing.sm
        }}>
          {(products || []).map(renderProductChip)}
        </View>
      </View>
    </View>
  );
});

const ProductInputCard = memo(({ product, value, onChangeText, meta, abate }: any) => {
    const { colors, spacing, elevation } = useTheme();
    const [localValue, setLocalValue] = useState(value);
    const debouncedChange = useDebouncedCallback(onChangeText, 250);

    useEffect(() => { setLocalValue(value); }, [value]);

    const handleChange = (text: string) => {
        setLocalValue(text);
        debouncedChange(text);
    };

    const isUN = String(product.unit).toUpperCase() === 'UN';
    const prod = parseFloat(localValue || '0') || 0;
    const m = meta(product);
    const progress = m > 0 ? Math.max(0, Math.min(1, prod / m)) : 0;
    const mediaAnimal = abate > 0 ? prod / abate : 0;
    const diferenca = prod - m;
    const fmt = (n: number) => (isUN ? Math.round(n).toString() : n.toFixed(1));

    return (
        <View style={{
            backgroundColor: colors.surface,
            padding: spacing.md,
            borderRadius: 12,
            borderLeftWidth: 4,
            borderLeftColor: progress >= 0.8 ? colors.success : progress >= 0.5 ? '#FF8C00' : colors.danger,
            ...elevation.e2,
            marginHorizontal: 2,
        }}>
            <View style={{ marginBottom: spacing.md }}>
                <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: colors.text,
                    marginBottom: 4
                }}>
                    {product.name}
                </Text>
                <Text style={{
                    fontSize: 12,
                    color: colors.muted,
                    lineHeight: 16
                }}>
                    Meta Total: {fmt(m)} {product.unit} ({product.meta_por_animal} {product.unit} por animal)
                </Text>
            </View>

            <InputNumber
                label=""
                mode={isUN ? 'integer' : 'decimal'}
                decimals={isUN ? 0 : 2}
                value={localValue}
                onChangeText={handleChange}
                placeholder="0"
                keyboardType="numeric"
            />

            <View style={{ marginTop: spacing.md }}>
                <View style={{
                    backgroundColor: colors.surfaceAlt,
                    borderRadius: 6,
                    overflow: 'hidden',
                    height: 6,
                    marginBottom: spacing.sm
                }}>
                    <View style={{
                        height: '100%',
                        width: `${Math.min(100, progress * 100)}%`,
                        backgroundColor: progress >= 0.8 ? colors.success : progress >= 0.5 ? '#FF8C00' : colors.danger,
                    }} />
                </View>

                <View style={{ gap: spacing.xs }}>
                    <View style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <Text style={{
                            fontSize: 11,
                            color: colors.muted
                        }}>
                            Produzido: {fmt(prod)} / {fmt(m)} {product.unit}
                        </Text>
                        <Text style={{
                            fontSize: 11,
                            fontWeight: '600',
                            color: progress >= 0.8 ? colors.success : progress >= 0.5 ? '#FF8C00' : colors.danger
                        }}>
                            {Math.round(progress * 100)}% da meta
                        </Text>
                    </View>

                    <View style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <Text style={{
                            fontSize: 11,
                            color: colors.muted
                        }}>
                            Média por animal: {fmt(mediaAnimal)} {product.unit}
                        </Text>
                        <Text style={{
                            fontSize: 11,
                            color: diferenca >= 0 ? colors.success : colors.danger,
                            fontWeight: '500'
                        }}>
                            {diferenca >= 0 ? 'Acima' : 'Abaixo'}: {Math.abs(diferenca)} {product.unit}
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );
});

const HistoryRow = memo(function HistoryRow({ item, colors, spacing, typography, loadItems, cache }: any) {
    const [open, setOpen] = useState(false);
    const rot = useRef(new Animated.Value(0)).current;
    const rotate = rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

    useEffect(() => {
        Animated.spring(rot, { toValue: open ? 1 : 0, useNativeDriver: true, tension: 150, friction: 8 }).start();
    }, [open, rot]);

    useEffect(() => {
        if (open && cache[item.id] === undefined) {
            loadItems(item.id);
        }
    }, [open, cache, item.id, loadItems]);

    const onToggle = useCallback(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setOpen((v) => !v);
    }, []);

    const list = cache[item.id];

    return (
        <View style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            shadowColor: colors.shadow || '#000',
            shadowOpacity: 0.08,
            shadowRadius: 2,
            shadowOffset: { width: 0, height: 1 },
            elevation: 1,
            overflow: 'hidden'
        }}>
            <Pressable
                onPress={onToggle}
                style={{
                    paddingHorizontal: spacing.lg,
                    paddingVertical: spacing.md,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}
                android_ripple={{ color: colors.line }}
            >
                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 2 }}>
                        {labelForYMD(item.prod_date)}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 13 }}>
                        {item.abate} animais
                    </Text>
                </View>
                <Animated.View style={{ transform: [{ rotate }] }}>
                    <MaterialCommunityIcons name="chevron-down" size={20} color={colors.muted} />
                </Animated.View>
            </Pressable>

            {open && (
                <View style={{
                    paddingHorizontal: spacing.lg,
                    paddingBottom: spacing.lg,
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: colors.line,
                    backgroundColor: colors.background
                }}>
                    {list === undefined ? (
                        <SkeletonList rows={2} height={30} />
                    ) : list.length === 0 ? (
                        <Text style={{ color: colors.muted, textAlign: 'center', paddingVertical: spacing.lg }}>
                            Sem produtos registrados
                        </Text>
                    ) : (
                        <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
                            {list.map((pi: SummaryItem) => {
                                const progress = pi.meta > 0 ? Math.max(0, Math.min(1, pi.produced / pi.meta)) : 0;
                                const isUN = String(pi.unit).toUpperCase() === 'UN';
                                const fmt = (n: number) => isUN ? Math.round(n).toString() : n.toFixed(1);

                                const progressColor = progress >= 0.8 ? colors.success : progress >= 0.5 ? '#FF8C00' : colors.danger;

                                return (
                                    <View
                                        key={`${item.id}-${pi.product_id}`}
                                        style={{
                                            backgroundColor: colors.surface,
                                            padding: spacing.md,
                                            borderRadius: 12,
                                            borderLeftWidth: 4,
                                            borderLeftColor: progressColor
                                        }}
                                    >
                                        <View style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            marginBottom: spacing.sm
                                        }}>
                                            <Text style={{ fontWeight: '600', color: colors.text, fontSize: 15 }}>
                                                {pi.product_name}
                                            </Text>
                                            <Text style={{
                                                fontSize: 14,
                                                fontWeight: '700',
                                                color: progressColor
                                            }}>
                                                {Math.round(progress * 100)}%
                                            </Text>
                                        </View>

                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                            <View>
                                                <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '600' }}>PRODUZIDO</Text>
                                                <Text style={{ color: colors.success, fontSize: 14, fontWeight: '700' }}>
                                                    {fmt(pi.produced)} {pi.unit}
                                                </Text>
                                            </View>
                                            <View style={{ alignItems: 'center' }}>
                                                <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '600' }}>META</Text>
                                                <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>
                                                    {fmt(pi.meta)} {pi.unit}
                                                </Text>
                                            </View>
                                            <View style={{ alignItems: 'flex-end' }}>
                                                <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '600' }}>MÉDIA/ANIMAL</Text>
                                                <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '700' }}>
                                                    {fmt(pi.media)} {pi.unit}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </View>
            )}
        </View>
    );
});

/* ===== Componente Principal da Tela ===== */
type Renderable =
  | { type: 'h-header'; id: string; title: string; subtitle: string; }
  | { type: 'h-row'; id: string; item: Production };

export default function ProducaoScreen() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const h = useHaptics();
  const { colors, spacing, typography } = useTheme();
  const styles = useStyles();
  const { runAfterInteractions, isAppActive } = usePerformanceOptimization();

  const [formOpen, setFormOpen] = useState(false);
  const [prodDate, setProdDate] = useState<string>(todayStr());
  const [abateStr, setAbateStr] = useState<string>('');
  const [products, setProducts] = useState<Product[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [produced, setProduced] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<Production[] | null>(null);
  const [itemsCache, setItemsCache] = useState<Record<string, SummaryItem[] | undefined>>({});
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>(todayStr());
  const [productFilters, setProductFilters] = useState<string[]>([]);

  const abate = useMemo(() => parseInt(abateStr || '0', 10) || 0, [abateStr]);

  const fetchProducts = useCallback(async () => {
    // Só executa se o app estiver ativo para economizar bateria
    if (!isAppActive()) return;
    
    const { data } = await supabase.from('products').select('id,name,unit,meta_por_animal').order('name');
    setProducts((data as Product[]) || []);
  }, [isAppActive]);

  const fetchHistory = useCallback(async (startDate?: string, endDate?: string) => {
    let query = supabase.from('productions').select('id,prod_date,abate').order('prod_date', { ascending: false });

    if (startDate && endDate) {
      query = query.gte('prod_date', startDate).lte('prod_date', endDate);
    } else {
      query = query.limit(180);
    }

    const { data } = await query;
    setHistory((data as Production[]) || []);
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchHistory();
  }, [fetchProducts, fetchHistory]);

  // Load items for current month productions to show stats
  useEffect(() => {
    if (!history) return;

    const now = new Date();
    const thisMonth = history.filter(p => {
      const prodDate = new Date(p.prod_date);
      return prodDate.getMonth() === now.getMonth() && prodDate.getFullYear() === now.getFullYear();
    });

    // Load items for each production of this month
    thisMonth.forEach(prod => {
      if (!itemsCache[prod.id]) {
        loadItems(prod.id);
      }
    });
  }, [history, itemsCache, loadItems]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchProducts(), fetchHistory(fromDate, toDate)]);
    setRefreshing(false);
  }, [fetchProducts, fetchHistory, fromDate, toDate]);

  const meta = useCallback((p: Product) => abate * (p.meta_por_animal || 0), [abate]);
  const prodNum = useCallback((id: string) => parseFloat(produced[id] || '0') || 0, [produced]);

  const toggleProduct = useCallback((id: string) => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setSelected((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id])); }, []);
  const selectAll = useCallback(() => setSelected((products || []).map((p) => p.id)), [products]);
  const clearSelection = useCallback(() => setSelected([]), []);

  const save = useCallback(async () => {
    if (!session) {
      Alert.alert('Acesso negado', 'É necessário estar logado para registrar produção.');
      return;
    }

    if (!prodDate) {
      Alert.alert('Atenção', 'Selecione uma data para a produção.');
      return;
    }

    if (!abate || abate <= 0 || abate > 10000) {
      Alert.alert('Atenção', 'Informe um número válido de abates (1-10.000).');
      return;
    }

    if (!selected.length) {
      Alert.alert('Atenção', 'Selecione pelo menos um produto para registrar.');
      return;
    }

    const hasValidProduction = selected.some(id => prodNum(id) > 0);
    if (!hasValidProduction) {
      Alert.alert('Atenção', 'Informe a quantidade produzida para pelo menos um produto.');
      return;
    }

    setSaving(true);
    try {
      const sanitizedData = {
        author_id: session.user.id,
        prod_date: prodDate,
        abate: Math.max(1, Math.min(10000, abate))
      };

      const { data: prod, error } = await supabase
        .from('productions')
        .insert(sanitizedData)
        .select('id')
        .single();

      if (error) throw error;

      const production_id = (prod as any).id;
      const items = selected
        .filter(id => prodNum(id) > 0)
        .map(id => ({
          production_id,
          product_id: id,
          produced: Math.max(0, prodNum(id))
        }));

      if (items.length > 0) {
        const { error: e2 } = await supabase.from('production_items').insert(items);
        if (e2) throw e2;
      }

      setProdDate(todayStr());
      setAbateStr('');
      setProduced({});
      clearSelection();
      await fetchHistory();
      h.success();
      showToast({ type: 'success', message: 'Produção registrada com sucesso!' });
      setFormOpen(false);
    } catch (e: any) {
      h.error();
      const errorMessage = e?.message?.includes('duplicate')
        ? 'Já existe um registro para esta data e produtos.'
        : e?.message ?? 'Falha ao salvar a produção.';
      Alert.alert('Erro', errorMessage);
    } finally {
      setSaving(false);
    }
  }, [session, prodDate, abate, selected, prodNum, h, clearSelection, fetchHistory, showToast]);

  const loadItems = useCallback(async (prodId: string) => {
    const { data } = await supabase.from('v_production_item_summary').select('*').eq('production_id', prodId);
    setItemsCache(s => ({ ...s, [prodId]: (data as SummaryItem[]) || [] }));
  }, []);

  const historyItems: Renderable[] = useMemo(() => {
    if (!history) return [];

    // Filter by products if filters are active
    let filteredHistory = history;
    if (productFilters.length > 0) {
      filteredHistory = history.filter(production => {
        const items = itemsCache[production.id];
        if (!items) return true; // Include if not loaded yet
        return items.some(item => productFilters.includes(item.product_id));
      });
    }

    const byDay = new Map<string, Production[]>();
    filteredHistory.forEach(p => {
        const ymd = p.prod_date.slice(0, 10);
        if (!byDay.has(ymd)) byDay.set(ymd, []);
        byDay.get(ymd)!.push(p);
    });
    const out: Renderable[] = [];
    Array.from(byDay.entries()).sort(([a], [b]) => (a < b ? 1 : -1)).forEach(([ymd, list]) => {
        out.push({ type: 'h-header', id: `hdr-${ymd}`, title: labelForYMD(ymd), subtitle: new Date(ymd).toLocaleDateString() });
        list.forEach(row => out.push({ type: 'h-row', id: row.id, item: row }));
    });
    return out;
  }, [history, productFilters, itemsCache]);

  // Production stats for header - optimized
  const productionStats = useMemo(() => {
    if (!history) return {
      total: 0,
      thisMonth: 0,
      avgAnimals: 0,
      byUnit: {}
    };

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let thisMonthCount = 0;
    let totalAnimals = 0;
    const thisMonthProds: Production[] = [];

    // Single loop through history for better performance
    history.forEach(p => {
      totalAnimals += p.abate;
      const prodDate = new Date(p.prod_date);
      if (prodDate.getMonth() === currentMonth && prodDate.getFullYear() === currentYear) {
        thisMonthCount++;
        thisMonthProds.push(p);
      }
    });

    const avgAnimals = history.length > 0 ? Math.round(totalAnimals / history.length) : 0;

    // Calcular estatísticas por unidade apenas se temos dados do cache
    const byUnit: Record<string, { produced: number; meta: number; loss: number; efficiency: number }> = {};

    thisMonthProds.forEach(prod => {
      const items = itemsCache[prod.id];
      if (items && items.length > 0) {
        items.forEach(item => {
          const unit = String(item.unit || 'UN').toUpperCase();
          if (!byUnit[unit]) {
            byUnit[unit] = { produced: 0, meta: 0, loss: 0, efficiency: 0 };
          }
          byUnit[unit].produced += item.produced;
          byUnit[unit].meta += item.meta;
        });
      }
    });

    // Calcular métricas finais
    Object.keys(byUnit).forEach(unit => {
      const stats = byUnit[unit];
      stats.loss = Math.max(0, stats.meta - stats.produced);
      stats.efficiency = stats.meta > 0 ? Math.round((stats.produced / stats.meta) * 100) : 0;
      stats.produced = Math.round(stats.produced);
      stats.meta = Math.round(stats.meta);
      stats.loss = Math.round(stats.loss);
    });

    return {
      total: history.length,
      thisMonth: thisMonthCount,
      avgAnimals,
      byUnit
    };
  }, [history, itemsCache]);

  const ListHeader = useCallback(() => (
    <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md }}>
      {/* Clean Header */}
      <View style={{ marginBottom: spacing.xl }}>
        <Text style={[typography.h1, { fontSize: 28, marginBottom: spacing.xs }]}>Produção</Text>
        <Text style={{ color: colors.muted, fontSize: 15, fontWeight: '500' }}>
          {productionStats.thisMonth} registros este mês
        </Text>
      </View>

      {/* Quick Stats - Simplified */}
      <View style={{
        flexDirection: 'row',
        gap: spacing.md,
        marginBottom: spacing.xl
      }}>
        <View style={{
          flex: 1,
          backgroundColor: colors.surfaceAlt,
          padding: spacing.md,
          borderRadius: 16,
          alignItems: 'center'
        }}>
          <Text style={{
            fontSize: 24,
            fontWeight: '800',
            color: colors.text,
            marginBottom: 2
          }}>
            {productionStats.total}
          </Text>
          <Text style={{
            fontSize: 12,
            fontWeight: '600',
            color: colors.muted
          }}>
            Total
          </Text>
        </View>

        <View style={{
          flex: 1,
          backgroundColor: colors.success + '15',
          padding: spacing.md,
          borderRadius: 16,
          alignItems: 'center'
        }}>
          <Text style={{
            fontSize: 24,
            fontWeight: '800',
            color: colors.success,
            marginBottom: 2
          }}>
            {productionStats.thisMonth}
          </Text>
          <Text style={{
            fontSize: 12,
            fontWeight: '600',
            color: colors.muted
          }}>
            Este mês
          </Text>
        </View>

        <View style={{
          flex: 1,
          backgroundColor: colors.primary + '15',
          padding: spacing.md,
          borderRadius: 16,
          alignItems: 'center'
        }}>
          <Text style={{
            fontSize: 24,
            fontWeight: '800',
            color: colors.primary,
            marginBottom: 2
          }}>
            {productionStats.avgAnimals}
          </Text>
          <Text style={{
            fontSize: 12,
            fontWeight: '600',
            color: colors.muted
          }}>
            Média
          </Text>
        </View>
      </View>

      {/* Production Summary by Unit - Compact */}
      {Object.keys(productionStats.byUnit).length > 0 && (
        <View style={{ marginBottom: spacing.xl }}>
          {Object.entries(productionStats.byUnit).map(([unit, stats]) => (
            <View
              key={unit}
              style={{
                backgroundColor: colors.surface,
                padding: spacing.md,
                borderRadius: 16,
                marginBottom: spacing.sm,
                borderLeftWidth: 4,
                borderLeftColor: colors.primary,
                shadowColor: colors.shadow || '#000',
                shadowOpacity: 0.1,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 2 },
                elevation: 2
              }}
            >
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: spacing.sm
              }}>
                <Text style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: colors.text
                }}>
                  {unit}
                </Text>
                <Text style={{
                  fontSize: 20,
                  fontWeight: '800',
                  color: stats.efficiency >= 80 ? colors.success : stats.efficiency >= 60 ? '#FF8C00' : colors.danger
                }}>
                  {stats.efficiency}%
                </Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ fontSize: 12, color: colors.muted, fontWeight: '600' }}>PRODUZIDO</Text>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: colors.success }}>{stats.produced}</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: colors.muted, fontWeight: '600' }}>PERDA</Text>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: colors.danger }}>{stats.loss}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 12, color: colors.muted, fontWeight: '600' }}>META</Text>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{stats.meta}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Simple Filter Toggle */}
      <Pressable
        onPress={() => setShowFilters(!showFilters)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingVertical: spacing.sm,
          marginBottom: showFilters ? spacing.lg : spacing.md
        }}
      >
        <MaterialCommunityIcons
          name="filter-variant"
          size={20}
          color={colors.muted}
        />
        <Text style={{
          fontSize: 16,
          fontWeight: '600',
          color: colors.muted
        }}>
          Filtrar
        </Text>
        {(productFilters.length > 0 || fromDate) && (
          <View style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: colors.primary
          }} />
        )}
        <MaterialCommunityIcons
          name={showFilters ? "chevron-up" : "chevron-down"}
          size={16}
          color={colors.muted}
        />
      </Pressable>

      {showFilters && (
        <View style={{
          backgroundColor: colors.surfaceAlt,
          padding: spacing.lg,
          borderRadius: 16,
          marginBottom: spacing.lg,
          gap: spacing.md
        }}>
          {/* Date Range */}
          <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <DateField
                label=""
                value={fromDate}
                onChange={setFromDate}
                placeholder="Data inicial"
              />
            </View>
            <Text style={{ color: colors.muted, fontSize: 14 }}>até</Text>
            <View style={{ flex: 1 }}>
              <DateField
                label=""
                value={toDate}
                onChange={setToDate}
                placeholder="Data final"
              />
            </View>
          </View>

          {/* Product Chips */}
          <View style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: spacing.xs
          }}>
            <Chip
              label="Todos"
              active={productFilters.length === 0}
              onPress={() => setProductFilters([])}
              small
            />
            {(products || []).map((p) => (
              <Chip
                key={p.id}
                label={p.name}
                active={productFilters.includes(p.id)}
                onPress={() =>
                  setProductFilters(curr =>
                    curr.includes(p.id)
                      ? curr.filter(id => id !== p.id)
                      : [...curr, p.id]
                  )
                }
                small
              />
            ))}
          </View>

          {/* Actions */}
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button
              title="Aplicar"
              onPress={() => fetchHistory(fromDate, toDate)}
              style={{ flex: 1 }}
              variant="primary"
            />
            <Button
              title="Limpar"
              variant="text"
              onPress={() => {
                setFromDate('');
                setToDate(todayStr());
                setProductFilters([]);
                fetchHistory();
              }}
            />
          </View>
        </View>
      )}

      {/* Section Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.lg
      }}>
        <Text style={[typography.h2, { fontSize: 20 }]}>
          Histórico
        </Text>
        {(productFilters.length > 0 || fromDate) && (
          <View style={{
            backgroundColor: colors.primary + '20',
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs,
            borderRadius: 12
          }}>
            <Text style={{
              fontSize: 10,
              color: colors.primary,
              fontWeight: '700'
            }}>
              FILTRADO
            </Text>
          </View>
        )}
      </View>
    </View>
  ), [spacing, typography, colors, productionStats, showFilters, fromDate, toDate, productFilters, products]);

  const renderItem: ListRenderItem<Renderable> = useCallback(({ item }) => {
    if (item.type === 'h-header') {
      return (
        <View style={{
          paddingHorizontal: spacing.lg,
          marginTop: spacing.xl,
          marginBottom: spacing.md
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md
          }}>
            <Text style={{
              fontWeight: '700',
              color: colors.text,
              fontSize: 16
            }}>
              {item.title}
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.line, opacity: 0.3 }} />
          </View>
        </View>
      );
    }
    if (item.type === 'h-row') {
      return (
        <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>
          <HistoryRow item={item.item} colors={colors} spacing={spacing} typography={typography} loadItems={loadItems} cache={itemsCache} />
        </View>
      );
    }
    return null;
  }, [spacing, colors, typography, styles, loadItems, itemsCache]);

  const selectedProducts = useMemo(() => (products || []).filter((p) => selected.includes(p.id)), [products, selected]);

  return (
    <Screen padded={false} scroll={false}>
      <FlashList
        data={historyItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        getItemType={(item) => item.type}
        ListHeaderComponent={ListHeader}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} progressBackgroundColor={colors.surface} />}
        contentContainerStyle={{ paddingBottom: 80 }}
        estimatedItemSize={120}
        ListEmptyComponent={!history ? <View style={{ paddingHorizontal: spacing.md }}><SkeletonList rows={5} /></View> : <EmptyState title="Nenhum lançamento registrado" />}
        extraData={itemsCache}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={5}
        updateCellsBatchingPeriod={50}
        disableAutoLayout={false}
      />
      <FAB onPress={() => setFormOpen(true)} />
      <BottomSheet open={formOpen} onClose={() => setFormOpen(false)} title="Registrar Produção">
        <ProductionForm
          prodDate={prodDate} setProdDate={setProdDate}
          abateStr={abateStr} setAbateStr={setAbateStr}
          products={products} selected={selected}
          toggleProduct={toggleProduct} selectAll={selectAll}
          clearSelection={clearSelection}
        />

        {selectedProducts.length > 0 && (
          <View style={{
            height: 1,
            backgroundColor: colors.line,
            opacity: 0.5,
            marginVertical: spacing.lg
          }} />
        )}

        <View style={{ gap: spacing.md }}>
          {selectedProducts.map((p) => (
            <ProductInputCard
              key={p.id}
              product={p}
              abate={abate}
              value={produced[p.id] ?? ''}
              onChangeText={(text: string) => setProduced(s => ({...s, [p.id]: text}))}
              meta={meta}
            />
          ))}
        </View>

        {selectedProducts.length > 0 && (
          <View style={{ marginTop: spacing.xl }}>
            <Button
              title="Registrar Produção"
              onPress={save}
              loading={saving}
              disabled={saving || abate <= 0 || !selected.some(id => prodNum(id) > 0)}
              full
            />
          </View>
        )}
      </BottomSheet>
    </Screen>
  );
}
