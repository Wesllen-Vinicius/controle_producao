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
  InteractionManager,
  LayoutAnimation,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import Screen from '../components/Screen';

// UI kit
import Card from '../components/ui/Card';
import Chip from '../components/ui/Chip';
import Button from '../components/ui/Button';
import Input, { InputNumber } from '../components/ui/Input';
import EmptyState from '../components/ui/EmptyState';
import SkeletonList from '../components/SkeletonList';

import { supabase } from '../services/supabase';
import { useAuth } from '../state/AuthProvider';
import { useToast } from '../state/ToastProvider';
import { useHaptics } from '../hooks/useHaptics';
import { useTheme } from '../state/ThemeProvider';

import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useDebouncedCallback } from '../hooks/useDebouncedCallback';

/* ===== tipos ===== */
type Unit = 'UN' | 'KG' | 'L' | 'CX' | 'MT' | 'PC' | string;
type Product = { id: string; name: string; unit: Unit; meta_por_animal: number };
type Production = { id: string; prod_date: string; abate: number };
type SummaryItem = {
  production_id: string;
  product_id: string;
  product_name: string;
  unit: Unit;
  produced: number;
  meta: number;
  diff: number;
  media: number;
};

/* ===== helpers ===== */
const ONE_DAY = 86400000;
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const tomorrow = () => new Date(Date.now() + ONE_DAY);
const parseISODate = (s?: string) => {
  if (!s) return new Date();
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/* ===== estilos utilitários ===== */
function useStyles() {
  const { colors, spacing } = useTheme();
  return useMemo(
    () =>
      StyleSheet.create({
        prodTitle: { fontWeight: '800', color: colors.text },
        unit: { color: colors.muted, fontWeight: '700' },
        row: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
        hint: { color: colors.muted, fontWeight: '700' },
        sectionHeader: {
          paddingVertical: 6,
          paddingHorizontal: spacing.sm,
          alignSelf: 'flex-start',
          backgroundColor: colors.surfaceAlt,
          borderRadius: 999,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.line,
        },
        timeline: { borderLeftWidth: 2, borderLeftColor: colors.line, paddingLeft: spacing.md },
        bullet: { position: 'absolute', left: -6, top: 14, width: 10, height: 10, borderRadius: 10 },
        divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line, opacity: 0.8 },
        accentBox: {
          borderWidth: 2,
          borderRadius: 14,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.md,
        },
      }),
    [colors, spacing],
  );
}

/* ===== barras / métricas leves ===== */
function ProgressBar({ progress }: { progress: number }) {
  const { colors, radius } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;
  const pct = Math.max(0, Math.min(1, progress));

  useEffect(() => {
    Animated.spring(anim, {
      toValue: pct,
      stiffness: 140,
      damping: 18,
      mass: 0.7,
      useNativeDriver: true,
    }).start();
  }, [pct, anim]);

  return (
    <View
      style={{
        height: 6,
        backgroundColor: colors.surfaceAlt,
        borderRadius: radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.line,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={{
          height: '100%',
          width: '100%',
          backgroundColor: colors.primary,
          transform: [{ scaleX: anim }],
          alignSelf: 'flex-start',
        }}
      />
    </View>
  );
}

const Stat = memo(function Stat({
  label,
  value,
  status,
  hint,
}: {
  label: string;
  value: string | number;
  status?: 'danger' | 'success' | 'default';
  hint?: string;
}) {
  const { colors, spacing, radius, typography } = useTheme();
  const color = status === 'danger' ? '#DC2626' : status === 'success' ? '#22C55E' : colors.text;

  return (
    <View
      style={{
        flex: 1,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.line,
        minHeight: 56,
        justifyContent: 'center',
      }}
    >
      <Text style={[typography.label, { color: colors.muted, marginBottom: 2 }]}>{label}</Text>
      <Text style={{ fontWeight: '900', color, fontSize: 18, lineHeight: 22 }}>{value}</Text>
      {!!hint && <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>{hint}</Text>}
    </View>
  );
});

/* ===== DateField ===== */
const DateField = memo(function DateField({
  label,
  value,
  onChange,
  placeholder = 'YYYY-MM-DD',
  minimumDate,
  maximumDate,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
}) {
  const { colors, radius, spacing, typography } = useTheme();
  const [show, setShow] = useState(false);

  const onChangePicker = useCallback(
    (_: DateTimePickerEvent, selectedDate?: Date) => {
      if (Platform.OS === 'android') setShow(false);
      if (selectedDate) onChange(toISODate(selectedDate));
    },
    [onChange],
  );

  const display = Platform.OS === 'ios' ? 'inline' : 'calendar';

  return (
    <View style={{ gap: 6 }}>
      {!!label && <Text style={[typography.label, { marginBottom: 0 }]}>{label}</Text>}
      <Pressable
        onPress={() => setShow(true)}
        style={{
          backgroundColor: colors.surfaceAlt,
          borderRadius: radius.lg,
          borderColor: colors.line,
          borderWidth: 1,
          height: 52,
          paddingHorizontal: spacing.md,
          alignItems: 'center',
          flexDirection: 'row',
        }}
      >
        <MaterialCommunityIcons name="calendar-blank" size={18} color={colors.muted} />
        <Text style={{ color: value ? colors.text : colors.muted, marginLeft: 8, fontWeight: '600' }}>
          {value || placeholder}
        </Text>
      </Pressable>

      {show && (
        <DateTimePicker
          mode="date"
          value={parseISODate(value || todayStr())}
          display={display as any}
          onChange={onChangePicker}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}
    </View>
  );
});

/* =============================================================================
   HEADER
============================================================================= */
type UIHeaderProps = {
  prodDate: string;
  setProdDate: (v: string) => void;
  abateStr: string;
  setAbateStr: (v: string) => void;
  products: Product[] | null;
  selected: string[];
  toggleProduct: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  fillMetas: () => void;
  zeroAll: () => void;
  from: string;
  to: string;
  clampDates: (f?: string, t?: string) => void;
  quickRange: (k: '7d' | '30d' | 'month') => void;
  filtersDirty: boolean;
  fetchHistory: () => Promise<void>;
};

const UIHeader = memo(function UIHeader({
  prodDate,
  setProdDate,
  abateStr,
  setAbateStr,
  products,
  selected,
  toggleProduct,
  selectAll,
  clearSelection,
  fillMetas,
  zeroAll,
  from,
  to,
  clampDates,
  quickRange,
  filtersDirty,
  fetchHistory,
}: UIHeaderProps) {
  const { colors, spacing, typography } = useTheme();
  const styles = useStyles();

  return (
    <View style={{ gap: spacing.md, paddingHorizontal: spacing.md, paddingTop: spacing.md }}>
      <Card padding="md" variant="filled" elevationLevel={0} style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <DateField label="Data" value={prodDate} onChange={setProdDate} maximumDate={tomorrow()} />
          </View>
          <Button title="Hoje" variant="tonal" onPress={() => setProdDate(todayStr())} />
        </View>

        <View style={[styles.accentBox, { borderColor: colors.primary, backgroundColor: colors.surfaceAlt, gap: 8 }]}>
          <Text style={[typography.label, { color: colors.muted }]}>Abate (animais)</Text>
          <InputNumber
            label=""
            mode="integer"
            value={abateStr}
            onChangeText={setAbateStr}
            placeholder="Ex.: 25"
            selectTextOnFocus
            returnKeyType="done"
            // @ts-ignore
            keyboardType="number-pad"
          />
          <Text style={{ color: colors.muted }}>
            Defina aqui o total de animais para calcular metas e médias dos produtos.
          </Text>
        </View>
      </Card>

      <Card padding="md" variant="tonal" elevationLevel={0} style={{ gap: spacing.sm }}>
        <Text style={typography.h2}>Produtos</Text>
        <Text style={styles.hint}>Toque nas opções para selecionar/deselecionar</Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <Chip label="Selecionar todos" onPress={selectAll} />
          <Chip label="Limpar" onPress={clearSelection} />
          {(products || []).map((p) => (
            <Chip
              key={p.id}
              label={`${p.name} (${p.unit})`}
              active={selected.includes(p.id)}
              onPress={() => toggleProduct(p.id)}
            />
          ))}
        </View>

        {!!selected.length && (
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
            <Button title="Preencher metas" variant="tonal" onPress={fillMetas} />
            <Button title="Zerar" variant="text" onPress={zeroAll} />
          </View>
        )}
      </Card>

      <Card padding="md" variant="tonal" elevationLevel={0} style={{ gap: spacing.sm }}>
        <Text style={typography.h2}>Histórico</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <DateField label="De" value={from} onChange={(v) => clampDates(v, undefined)} maximumDate={tomorrow()} />
          </View>
          <View style={{ flex: 1 }}>
            <DateField
              label="Até"
              value={to}
              onChange={(v) => clampDates(undefined, v)}
              maximumDate={tomorrow()}
              minimumDate={from ? parseISODate(from) : undefined}
            />
          </View>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' }}>
          <Text style={[typography.label, { color: colors.muted }]}>Rápido:</Text>
          <Chip label="7 dias" onPress={() => quickRange('7d')} />
          <Chip label="30 dias" onPress={() => quickRange('30d')} />
          <Chip label="Este mês" onPress={() => quickRange('month')} />
          <Chip
            label="Limpar"
            onPress={() => {
              const now = Date.now();
              clampDates(toISODate(new Date(now - 30 * ONE_DAY)), todayStr());
            }}
          />
        </View>
        <Button title={filtersDirty ? 'Aplicar (filtros alterados)' : 'Aplicar'} small onPress={fetchHistory} />
      </Card>
    </View>
  );
});

/* ===== componente principal ===== */
type Renderable =
  | { type: 'product'; id: string; product: Product }
  | { type: 'cta'; id: 'cta' }
  | { type: 'h-header'; id: string; title: string; subtitle: string; ymd: string }
  | { type: 'h-row'; id: string; item: Production };

export default function ProducaoScreen() {
  const styles = useStyles();
  const { session } = useAuth();
  const { showToast } = useToast();
  const h = useHaptics();
  const { colors, spacing, typography } = useTheme();

  // form
  const [prodDate, setProdDate] = useState<string>(todayStr());
  const [abateStr, setAbateStr] = useState<string>('');
  const abate = useMemo(() => parseInt(abateStr || '0', 10) || 0, [abateStr]);

  // data base
  const [products, setProducts] = useState<Product[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [produced, setProduced] = useState<Record<string, string>>({});

  // histórico
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [history, setHistory] = useState<Production[] | null>(null);
  const [itemsCache, setItemsCache] = useState<Record<string, SummaryItem[] | undefined>>({});
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filtersDirty, setFiltersDirty] = useState(false);

  useEffect(() => {
    if (!from && !to) {
      const now = Date.now();
      setFrom(toISODate(new Date(now - 30 * ONE_DAY)));
      setTo(todayStr());
    }
  }, [from, to]);

  const clampDates = useCallback(
    (nextFrom?: string, nextTo?: string) => {
      let f = nextFrom ?? from;
      let t = nextTo ?? to;
      const today = todayStr();
      if (f && t && parseISODate(f) > parseISODate(t)) {
        if (nextFrom) t = f; else f = t;
      }
      if (t && parseISODate(t) > parseISODate(today)) t = today;
      if (f && parseISODate(f) > parseISODate(today)) f = today;
      setFrom(f);
      setTo(t);
      setFiltersDirty(true);
    },
    [from, to],
  );

  /* === consultas === */
  const fetchProducts = useCallback(async () => {
    const { data, error } = await supabase.from('products').select('id,name,unit,meta_por_animal').order('name');
    if (error) return Alert.alert('Erro', error.message);
    const list = (data as Product[]) || [];
    setProducts(list);
    setSelected((prev) => (prev.length ? prev.filter((id) => list.some((p) => p.id === id)) : []));
  }, []);

  const fetchHistory = useCallback(async () => {
    setHistory(null);
    let q = supabase.from('productions').select('id,prod_date,abate').order('prod_date', { ascending: false }).limit(180);
    if (from) q = q.gte('prod_date', from);
    if (to) q = q.lte('prod_date', to);
    const { data, error } = await q;
    if (error) return Alert.alert('Erro', error.message);
    setHistory((data as Production[]) || []);
    setFiltersDirty(false);
  }, [from, to]);

  useEffect(() => {
    let cancelled = false;
    InteractionManager.runAfterInteractions(async () => {
      if (cancelled) return;
      await Promise.all([fetchProducts(), fetchHistory()]);
    });
    return () => { cancelled = true; };
  }, [fetchProducts, fetchHistory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchProducts(), fetchHistory()]);
    setRefreshing(false);
  }, [fetchProducts, fetchHistory]);

  /* === seleção / helpers === */
  const meta = useCallback((p: Product) => abate * (p.meta_por_animal || 0), [abate]);
  const prodNum = useCallback((p: Product) => parseFloat(produced[p.id] || '0') || 0, [produced]);
  const diff = useCallback((p: Product) => meta(p) - prodNum(p), [meta, prodNum]);
  const media = useCallback((p: Product) => (abate > 0 ? prodNum(p) / abate : 0), [abate, prodNum]);

  const toggleProduct = useCallback((id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
    setSelected((curr) => (curr.includes(id) ? curr.filter((x) => x !== id) : [...curr, id]));
  }, []);

  const selectAll = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
    setSelected((products || []).map((p) => p.id));
  }, [products]);

  const clearSelection = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelected([]);
  }, []);

  const fillMetas = useCallback(() => {
    if (!abate) return Alert.alert('Atenção', 'Defina o abate para calcular as metas.');
    const next = { ...produced };
    for (const p of products || [])
      if (selected.includes(p.id)) next[p.id] = String((abate * (p.meta_por_animal || 0)).toFixed(3));
    setProduced(next);
  }, [abate, produced, products, selected]);

  const zeroAll = useCallback(() => {
    const next = { ...produced };
    for (const p of products || []) if (selected.includes(p.id)) next[p.id] = '';
    setProduced(next);
  }, [produced, products, selected]);

  /* === salvar === */
  const save = useCallback(async () => {
    if (!session) return Alert.alert('Login necessário');
    if (!prodDate || !abate) {
      h.warning();
      return Alert.alert('Informe data e abate');
    }
    if (!selected.length) {
      h.warning();
      return Alert.alert('Selecione ao menos um produto');
    }

    setSaving(true);
    try {
      const { data: prod, error } = await supabase
        .from('productions')
        .insert({ author_id: session.user.id, prod_date: prodDate, abate })
        .select('id')
        .single();
      if (error) throw error;
      const production_id = (prod as any).id as string;

      const items = selected.map((id) => {
        const p = (products || []).find((x) => x.id === id)!;
        return { production_id, product_id: id, produced: prodNum(p) };
      });
      if (items.length) {
        const { error: e2 } = await supabase.from('production_items').insert(items);
        if (e2) throw e2;
      }

      setProdDate(todayStr());
      setAbateStr('');
      setProduced({});
      clearSelection();
      await fetchHistory();

      h.success();
      showToast?.({ type: 'success', message: 'Produção registrada.' });
    } catch (e: any) {
      h.error();
      Alert.alert('Erro', e.message ?? 'Falha ao salvar');
    } finally {
      setSaving(false);
    }
  }, [abate, clearSelection, fetchHistory, prodDate, prodNum, products, selected, session, showToast, h]);

  // >>> Carregamento lazy dos itens do dia (fix re-render com FlashList.extraData)
  const loadItems = useCallback(async (prodId: string) => {
    setItemsCache((prev) => {
      if (prev[prodId] === undefined) {
        // marca como "pendente" sem criar array (permite mostrar Skeleton)
        return { ...prev, [prodId]: prev[prodId] };
      }
      return prev;
    });
    const { data, error } = await supabase
      .from('v_production_item_summary')
      .select('production_id,product_id,product_name,unit,produced,meta,diff,media')
      .eq('production_id', prodId);
    if (!error) {
      setItemsCache((s) => ({ ...s, [prodId]: (data as SummaryItem[]) || [] }));
    }
  }, []);

  /* === quick ranges === */
  const quickRange = useCallback((k: '7d' | '30d' | 'month') => {
    const now = new Date();
    let f = new Date();
    if (k === '7d') f.setDate(now.getDate() - 7);
    if (k === '30d') f.setDate(now.getDate() - 30);
    if (k === 'month') f = new Date(now.getFullYear(), now.getMonth(), 1);
    clampDates(toISODate(f), toISODate(now));
  }, [clampDates]);

  /* ===== dados virtualizados ===== */
  const selectedProducts = useMemo(() => (products || []).filter((p) => selected.includes(p.id)), [products, selected]);
  const productItems: Renderable[] = useMemo(
    () => selectedProducts.map((p) => ({ type: 'product', id: `p-${p.id}`, product: p } as const)),
    [selectedProducts],
  );
  const ctaItem: Renderable[] = useMemo(
    () => (selectedProducts.length ? [{ type: 'cta', id: 'cta' }] : []),
    [selectedProducts.length],
  );

  const historyItems: Renderable[] = useMemo(() => {
    if (!history || history.length === 0) return [];
    const byDay = new Map<string, Production[]>();
    for (const p of history) {
      if (!byDay.has(p.prod_date)) byDay.set(p.prod_date, []);
      byDay.get(p.prod_date)!.push(p);
    }
    const entries = Array.from(byDay.entries()).sort(([a], [b]) => (a < b ? 1 : -1));
    const out: Renderable[] = [];
    for (const [ymd, list] of entries) {
      const title =
        ymd === todayStr()
          ? 'Hoje'
          : toISODate(parseISODate(ymd)) === toISODate(new Date(Date.now() - ONE_DAY))
          ? 'Ontem'
          : new Date(ymd).toLocaleDateString();
      out.push({ type: 'h-header', id: `hdr-${ymd}`, ymd, title, subtitle: new Date(ymd).toLocaleDateString() });
      for (const row of list) out.push({ type: 'h-row', id: row.id, item: row });
    }
    return out;
  }, [history]);

  const data: Renderable[] = useMemo(() => [...productItems, ...ctaItem, ...historyItems], [productItems, ctaItem, historyItems]);
  const getItemType = useCallback((it: Renderable) => it.type, []);
  const keyExtractor = useCallback((it: Renderable) => it.id, []);
  const setProducedImmediate = useCallback((id: string, text: string) => {
    setProduced((s) => (s[id] === text ? s : { ...s, [id]: text }));
  }, []);

  const headerEl = useMemo(
    () => (
      <UIHeader
        prodDate={prodDate}
        setProdDate={setProdDate}
        abateStr={abateStr}
        setAbateStr={setAbateStr}
        products={products}
        selected={selected}
        toggleProduct={toggleProduct}
        selectAll={selectAll}
        clearSelection={clearSelection}
        fillMetas={fillMetas}
        zeroAll={zeroAll}
        from={from}
        to={to}
        clampDates={clampDates}
        quickRange={quickRange}
        filtersDirty={filtersDirty}
        fetchHistory={fetchHistory}
      />
    ),
    [
      prodDate,
      abateStr,
      products,
      selected,
      toggleProduct,
      selectAll,
      clearSelection,
      fillMetas,
      zeroAll,
      from,
      to,
      clampDates,
      quickRange,
      filtersDirty,
      fetchHistory,
    ],
  );

  const perfProps: any = { estimatedItemSize: 200 };

  /* ===== Renderers ===== */
  const renderItem: ListRenderItem<Renderable> = useCallback(
    ({ item }) => {
      switch (item.type) {
        case 'product':
          return (
            <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
              <ProductCard
                product={item.product}
                selected={selected.includes(item.product.id)}
                toggleProduct={toggleProduct}
                abate={abate}
                value={produced[item.product.id] ?? ''}
                onChangeTextDebounced={(text) => setProducedImmediate(item.product.id, text)}
                meta={meta}
                media={media}
                diff={diff}
              />
            </View>
          );
        case 'cta':
          return (
            <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
              <Card padding="md" variant="filled" elevationLevel={1} style={{ gap: spacing.sm }}>
                <Text style={{ color: colors.muted, fontWeight: '700' }}>
                  {selectedProducts.length} produto(s) selecionado(s)
                </Text>
                <Button title="Salvar" loading={saving} onPress={save} full />
              </Card>
            </View>
          );
        case 'h-header':
          return (
            <View style={{ paddingHorizontal: spacing.md, marginTop: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <View style={styles.sectionHeader}>
                  <Text style={{ fontWeight: '800', color: colors.text }}>{item.title}</Text>
                </View>
                <Text style={{ color: colors.muted, fontWeight: '700' }}>{item.subtitle}</Text>
              </View>
            </View>
          );
        case 'h-row':
          return (
            <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
              <HistoryRow
                item={item.item}
                colors={colors}
                spacing={spacing}
                typography={typography}
                loadItems={loadItems}
                cache={itemsCache}
              />
            </View>
          );
        default:
          return null;
      }
    },
    [
      spacing.md,
      spacing.sm,
      selected,
      selectedProducts.length,
      toggleProduct,
      abate,
      produced,
      setProducedImmediate,
      meta,
      media,
      diff,
      styles.sectionHeader,
      colors,
      typography,
      loadItems,
      itemsCache,
      save,
      saving,
    ],
  );

  return (
    <Screen padded={false} scroll={false}>
      <FlashList
        {...perfProps}
        data={data}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        getItemType={getItemType}
        ListHeaderComponent={headerEl}
        keyboardShouldPersistTaps="always"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
            progressViewOffset={Platform.OS === 'android' ? 56 : 0}
          />
        }
        bounces
        overScrollMode="always"
        decelerationRate="fast"
        removeClippedSubviews={Platform.OS === 'android'}
        showsVerticalScrollIndicator={false}
        // >>> FlashList aceita apenas padding e backgroundColor aqui (sem "gap")
        contentContainerStyle={{ paddingBottom: spacing.lg, backgroundColor: 'transparent' }}
        // >>> Força re-render quando cache/multiplos estados externos mudam (FIX PRINCIPAL)
        extraData={{ cache: itemsCache, produced, selected, saving, filtersDirty }}
        ListEmptyComponent={
          history === null ? (
            <View style={{ paddingHorizontal: spacing.md }}>
              <SkeletonList rows={3} />
            </View>
          ) : (
            <EmptyState title="Sem lançamentos" />
          )
        }
      />
    </Screen>
  );
}

/* ===== ProductCard ===== */
const ProductCard = memo(function ProductCard({
  product: p,
  selected,
  toggleProduct,
  abate,
  value,
  onChangeTextDebounced,
  meta,
  media,
  diff,
}: {
  product: Product;
  selected: boolean;
  toggleProduct: (id: string) => void;
  abate: number;
  value: string;
  onChangeTextDebounced: (text: string) => void;
  meta: (p: Product) => number;
  media: (p: Product) => number;
  diff: (p: Product) => number;
}) {
  const { colors, spacing } = useTheme();
  const styles = useStyles();

  const [local, setLocal] = useState<string>(value ?? '');
  useEffect(() => { setLocal(value ?? ''); }, [value, p.id]);

  const debouncedEmit = useDebouncedCallback(onChangeTextDebounced, 180, [p.id]);

  const isUN = String(p.unit).toUpperCase() === 'UN';
  const dec = isUN ? 0 : 3;

  const m = meta(p);
  const prod = parseFloat(local || '0') || 0;
  const d = m - prod;
  const med = abate > 0 ? prod / (abate || 1) : 0;
  const progress = m > 0 ? Math.max(0, Math.min(1, prod / m)) : 0;
  const fmt = (n: number) => (isUN ? Math.round(n).toString() : n.toFixed(dec));

  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, stiffness: 220, damping: 16, mass: 0.8 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, stiffness: 220, damping: 16, mass: 0.8 }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Card padding="md" variant="filled" elevationLevel={0} style={{ gap: spacing.md }}>
        <Pressable onPress={() => toggleProduct(p.id)} onPressIn={onPressIn} onPressOut={onPressOut} hitSlop={8} android_ripple={{ color: colors.line }} style={{ paddingVertical: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontWeight: '900', fontSize: 16, color: colors.text }}>
              {p.name} <Text style={{ color: colors.muted }}>({p.unit})</Text>
            </Text>
            <MaterialCommunityIcons
              name={selected ? 'check-circle' : 'checkbox-blank-circle-outline'}
              size={20}
              color={selected ? colors.primary : colors.muted}
            />
          </View>
        </Pressable>

        <View style={styles.divider} />

        <View style={{ gap: 8 }}>
          <Text style={{ color: colors.muted, fontWeight: '700' }}>Produção do dia</Text>
          <InputNumber
            label=""
            mode={isUN ? 'integer' : 'decimal'}
            decimals={3}
            suffix={String(p.unit).toUpperCase()}
            value={local}
            onChangeText={(t) => { setLocal(t); debouncedEmit(t); }}
            placeholder={isUN ? 'Ex.: 12' : 'Ex.: 34.500'}
          />
        </View>

        <View style={styles.divider} />

        <View style={{ gap: 8 }}>
          <Text style={{ color: colors.muted, fontWeight: '700' }}>Progresso</Text>
          <ProgressBar progress={progress} />
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Stat label="Meta" value={fmt(m)} hint={`Por animal: ${p.meta_por_animal}`} />
          <Stat label="Dif." value={fmt(d)} status={d > 0 ? 'danger' : 'success'} />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Stat label="Média" value={med.toFixed(2)} />
          <Stat label="Progresso" value={`${Math.round(progress * 100)}%`} />
        </View>
      </Card>
    </Animated.View>
  );
});

/* ===== Row do Histórico ===== */
const HistoryRow = memo(function HistoryRow({
  item,
  colors,
  spacing,
  typography,
  loadItems,
  cache,
}: {
  item: Production;
  colors: any;
  spacing: any;
  typography: any;
  loadItems: (id: string) => Promise<void>;
  cache: Record<string, SummaryItem[] | undefined>;
}) {
  const { colors: themeColors } = useTheme();
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const rot = useRef(new Animated.Value(0)).current;
  const rotate = rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  useEffect(() => {
    Animated.spring(rot, { toValue: open ? 1 : 0, useNativeDriver: true, stiffness: 240, damping: 18, mass: 0.9 }).start();
  }, [open, rot]);

  // carrega apenas ao abrir e quando cache ainda não tem dados
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

  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, stiffness: 220, damping: 16, mass: 0.8 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, stiffness: 220, damping: 16, mass: 0.8 }).start();

  return (
    <View style={[styles.timeline, { paddingRight: spacing.md }]}>
      <View style={[styles.bullet, { backgroundColor: themeColors.primary }]} />
      <Card variant="filled" elevationLevel={0} style={{ padding: 0 }}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Pressable
            onPress={onToggle}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            hitSlop={8}
            android_ripple={{ color: colors.line }}
            style={{
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={[typography.h2, { fontSize: 16 }]}>{item.prod_date}</Text>
              <Text style={{ color: colors.muted, marginTop: 2, fontSize: 12, fontWeight: '600' }}>
                Abate: {item.abate}
              </Text>
            </View>
            <Animated.View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center', transform: [{ rotate }] }}>
              <MaterialCommunityIcons name="chevron-down" size={22} color={colors.text} />
            </Animated.View>
          </Pressable>
        </Animated.View>

        {open && (
          <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: spacing.sm }}>
            {list === undefined ? (
              <SkeletonList rows={1} height={40} />
            ) : list.length === 0 ? (
              <Text style={{ color: colors.muted }}>Sem itens para esta data.</Text>
            ) : (
              list.map((pi) => {
                const progress = pi.meta > 0 ? Math.max(0, Math.min(1, pi.produced / pi.meta)) : 0;
                const isUN = String(pi.unit).toUpperCase() === 'UN';
                return (
                  <View
                    key={`${item.id}-${pi.product_id}`}
                    style={{
                      padding: spacing.sm,
                      borderRadius: 12,
                      borderWidth: StyleSheet.hairlineWidth,
                      borderColor: colors.line,
                      backgroundColor: colors.surfaceAlt,
                      gap: 8,
                    }}
                  >
                    <Text style={{ fontWeight: '800', color: colors.text }}>
                      {pi.product_name} <Text style={{ color: colors.muted }}>({pi.unit})</Text>
                    </Text>
                    <ProgressBar progress={progress} />
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                      <Stat label="Prod." value={isUN ? pi.produced : pi.produced.toFixed(3)} />
                      <Stat label="Meta" value={isUN ? pi.meta : pi.meta.toFixed(3)} />
                    </View>
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                      <Stat label="Dif." value={isUN ? pi.diff : pi.diff.toFixed(3)} status={pi.diff > 0 ? 'danger' : 'success'} />
                      <Stat label="Média" value={Number(pi.media).toFixed(2)} />
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}
      </Card>
    </View>
  );
});
