// screens/EstoqueScreen.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  ScrollView,
} from 'react-native';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import Screen from '../components/Screen';

import Card from '../components/ui/Card';
import Chip from '../components/ui/Chip';
import Button from '../components/ui/Button';
import Input, { InputNumber } from '../components/ui/Input';
import EmptyState from '../components/ui/EmptyState';
import SkeletonList from '../components/SkeletonList';
import ExpandableCard from '../components/ExpandableCard';

import { supabase } from '../services/supabase';
import { useAuth } from '../state/AuthProvider';
import { useToast } from '../state/ToastProvider';
import { useHaptics } from '../hooks/useHaptics';
import { useTheme } from '../state/ThemeProvider';

import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

/* ===== tipos ===== */
type Unit = 'UN' | 'KG' | string;
type Product = { id: string; name: string; unit: Unit };
type Balance = {
  product_id: string;
  saldo: number;
  updated_at: string;
  name?: string | null;
  unit?: string | null;
};
type Tx = {
  id: string;
  product_id: string;
  quantity: number;
  unit: string;
  tx_type: 'entrada' | 'saida' | 'ajuste' | 'transferencia' | 'venda';
  created_at: string;
  source_production_id: string | null;
  metadata?: any | null;
};

/* Renderables para FlashList (flatten) */
type Renderable =
  | { type: 'hdr'; id: string; title: string; subtitle: string }
  | { type: 'tx'; id: string; tx: Tx };

type DayGroup = { ymd: string; title: string; subtitle: string; items: Tx[] };

/* ===== helpers de data ===== */
const ONE_DAY = 86400000;
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const parseISODate = (s?: string) => {
  if (!s) return new Date();
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const endOfDayString = (ymd: string) => `${ymd} 23:59:59`;
const labelForYMD = (ymd: string) => {
  const d = parseISODate(ymd);
  const now = new Date();
  const a = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diff = Math.round((a - b) / ONE_DAY);
  if (diff === 0) return 'Hoje';
  if (diff === -1) return 'Ontem';
  return new Date(ymd).toLocaleDateString();
};

/* ===== helpers de exibição ===== */
const isUN = (u?: string | null) => String(u ?? '').toUpperCase() === 'UN';
const formatQty = (unit: Unit | string | null | undefined, n: number) =>
  n.toLocaleString('pt-BR', {
    minimumFractionDigits: isUN(unit) ? 0 : 3,
    maximumFractionDigits: isUN(unit) ? 0 : 3,
  });
const timeAgo = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso).getTime();
  const now = Date.now();
  const s = Math.max(1, Math.floor((now - d) / 1000));
  if (s < 60) return `${s}s atrás`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  const dd = Math.floor(h / 24);
  return `${dd}d atrás`;
};

/* ===== DateField ===== */
const DateField = React.memo(function DateField({
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

  const onChangePicker = (_: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShow(false);
    if (selectedDate) onChange(toISODate(selectedDate));
  };

  const display = Platform.OS === 'ios' ? 'inline' : 'calendar';

  return (
    <View style={{ gap: 6 }}>
      {!!label && <Text style={[typography.label]}>{label}</Text>}
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

/* ===== “Rows” de saldo com delta do dia ===== */
const BalanceRow = React.memo(function BalanceRow({
  name,
  unit,
  value,
  max,
  updatedAt,
  todayDelta,
  onPress,
}: {
  name: string;
  unit?: string | null;
  value: number;
  max: number;
  updatedAt?: string | null;
  todayDelta?: number;
  onPress?: () => void;
}) {
  const { colors, radius, typography } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pct = max <= 0 ? 0 : Math.max(0, Math.min(1, Math.abs(value) / max));
    Animated.spring(anim, {
      toValue: pct,
      useNativeDriver: true,
      stiffness: 160,
      damping: 18,
      mass: 0.8,
    }).start();
  }, [value, max, anim]);

  const qtyStr = formatQty(unit as Unit, value);
  const neg = value < 0;

  const hasDelta = typeof todayDelta === 'number' && !Number.isNaN(todayDelta);
  const up = (todayDelta ?? 0) > 0;
  const down = (todayDelta ?? 0) < 0;
  const deltaColor = up ? '#22C55E' : down ? '#DC2626' : colors.muted;
  const deltaText = hasDelta ? `${up ? '↑' : down ? '↓' : '•'} ${formatQty(unit as Unit, Math.abs(todayDelta!))}` : '';

  return (
    <Pressable onPress={onPress}>
      <Card variant="tonal" elevationLevel={0} padding="md" contentStyle={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <Text style={[typography.label]} numberOfLines={1}>
            {unit ? `${name} (${unit})` : name}
          </Text>
          <View style={{ flex: 1 }} />
          {!!updatedAt && <Text style={{ color: '#ffffff99', fontSize: 11 }}>{timeAgo(updatedAt)}</Text>}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
          <Text style={{ fontWeight: '900', fontSize: 22, color: neg ? '#DC2626' : colors.text }}>
            {qtyStr}
          </Text>
          {hasDelta && (
            <Text style={{ marginLeft: 8, fontSize: 12, fontWeight: '700', color: deltaColor }}>
              {deltaText} hoje
            </Text>
          )}
        </View>

        <View
          style={{
            height: 10,
            backgroundColor: colors.surface,
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
              backgroundColor: neg ? '#DC2626' : colors.primary,
              transform: [{ scaleX: anim }],
              alignSelf: 'flex-start',
            } as any}
          />
        </View>

        <View style={{ flexDirection: 'row' }}>
          <View style={{ flex: 1 }} />
          <Text style={{ color: '#ffffff99', fontWeight: '700', fontSize: 12 }}>
            ref máx {formatQty(unit as Unit, max)}
          </Text>
        </View>
      </Card>
    </Pressable>
  );
});

const PAGE_SIZE = 40;

/* ===== estilos ===== */
function useStyles() {
  const { colors, spacing } = useTheme();
  return useMemo(
    () =>
      StyleSheet.create({
        rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
        sectionPill: {
          paddingVertical: 6,
          paddingHorizontal: spacing.sm,
          alignSelf: 'flex-start',
          backgroundColor: colors.surfaceAlt,
          borderRadius: 999,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.line,
        },
        timeline: { borderLeftWidth: 2, borderLeftColor: colors.line, paddingLeft: spacing.md },
        bullet: { position: 'absolute', left: -6, top: 12, width: 10, height: 10, borderRadius: 10 },
        headerBlock: { gap: spacing.md, paddingHorizontal: spacing.md, paddingTop: spacing.md },
      }),
    [colors, spacing],
  );
}

/* ===== item UI: header de dia ===== */
const DayHeader = React.memo(function DayHeader({ title, subtitle }: { title: string; subtitle: string }) {
  const { colors, spacing } = useTheme();
  const styles = useStyles();
  return (
    <View style={{ paddingHorizontal: spacing.md, marginTop: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View style={styles.sectionPill}>
          <Text style={{ fontWeight: '800', color: colors.text }}>{title}</Text>
        </View>
        <Text style={{ color: colors.muted, fontWeight: '700' }}>{subtitle}</Text>
      </View>
    </View>
  );
});

/* ===== item UI: transação ===== */
const TxRow = React.memo(function TxRow({
  tx,
  products,
}: {
  tx: Tx;
  products: Product[] | null;
}) {
  const { colors, spacing, typography } = useTheme();
  const styles = useStyles();

  const prod = (products || []).find((p) => p.id === tx.product_id);
  const when = new Date(tx.created_at);
  const timeStr = when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const { c, icon, sign } = (() => {
    switch (tx.tx_type) {
      case 'entrada':        return { c: '#22C55E', icon: 'tray-arrow-down' as const, sign: '+' };
      case 'saida':
      case 'venda':          return { c: '#DC2626', icon: 'tray-arrow-up' as const,   sign: '−' };
      case 'ajuste':         return { c: '#F59E0B', icon: 'tune' as const,            sign: '±' };
      case 'transferencia':  return { c: '#3B82F6', icon: 'swap-horizontal' as const, sign: '↔' };
      default:               return { c: colors.muted, icon: 'dots-horizontal' as const, sign: '' };
    }
  })();

  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn  = () => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, stiffness: 220, damping: 16, mass: 0.8 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, stiffness: 220, damping: 16, mass: 0.8 }).start();

  return (
    <View style={[styles.timeline, { paddingRight: spacing.md }]}>
      <View style={[styles.bullet, { backgroundColor: c }]} />
      <Animated.View style={{ transform: [{ scale }] }}>
        <Card variant="filled" elevationLevel={0} padding="md">
          <Pressable onPressIn={onPressIn} onPressOut={onPressOut} android_ripple={{ color: colors.line }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <MaterialCommunityIcons name={icon} size={18} color={c} />
              <Text style={[typography.h2, { fontSize: 16 }]} numberOfLines={1}>
                {tx.tx_type === 'entrada' ? 'CARREGAMENTO' : tx.tx_type.toUpperCase()}
              </Text>
              <View style={{ flex: 1 }} />
              <Text style={{ fontWeight: '900', color: c }}>
                {sign}
                {formatQty(tx.unit as Unit, tx.quantity)}
              </Text>
            </View>

            <Text style={{ color: colors.muted, marginTop: 2 }}>
              {prod?.name ?? 'Produto'} • {timeStr}
              {tx.metadata?.customer ? ` • Cliente: ${tx.metadata.customer}` : ''}
            </Text>
            {!!tx.source_production_id && (
              <Text style={{ color: colors.muted, marginTop: 2 }}>Origem: Produção</Text>
            )}
          </Pressable>
        </Card>
      </Animated.View>
    </View>
  );
});

export default function EstoqueScreen() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const h = useHaptics();
  const { colors, spacing, typography } = useTheme();
  const styles = useStyles();

  const [products, setProducts] = useState<Product[] | null>(null);
  const [balances, setBalances] = useState<Balance[] | null>(null);
  const [txs, setTxs] = useState<Tx[] | null>(null);

  // filtros
  const [selProd, setSelProd] = useState<string | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [filterType, setFilterType] = useState<Tx['tx_type'] | undefined>();

  // painel inline de movimentação
  const [mvProd, setMvProd] = useState<string | null>(null);
  const [mvType, setMvType] = useState<Tx['tx_type']>('saida');
  const [mvQty, setMvQty] = useState<string>('');
  const [mvCustomer, setMvCustomer] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // paginação e refresh
  const [refreshing, setRefreshing] = useState(false);
  const [loadingPage, setLoadingPage] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // helpers
  const prodsById = useMemo(() => {
    const map = new Map<string, Product>();
    (products || []).forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);
  const mvProdUnit: Unit | null = mvProd ? prodsById.get(mvProd)?.unit ?? null : null;
  const mvIsInteger = isUN(mvProdUnit || '');

  // datas padrão (últimos 30 dias)
  useEffect(() => {
    if (!from && !to) {
      const now = Date.now();
      setFrom(toISODate(new Date(now - 30 * ONE_DAY)));
      setTo(todayStr());
    }
  }, [from, to]);

  // coerência entre datas
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
    },
    [from, to],
  );

  /* ===== loads ===== */
  const loadProducts = useCallback(async () => {
    const { data, error } = await supabase.from('products').select('id,name,unit').order('name');
    if (error) return Alert.alert('Erro', error.message);
    const list = (data as Product[]) || [];
    setProducts(list);
    setSelProd((prev) => (prev && list.some((p) => p.id === prev) ? prev : null));
    setMvProd((prev) => (prev && list.some((p) => p.id === prev) ? prev : null));
    if (!mvProd && list[0]) setMvProd(list[0].id);
  }, [mvProd]);

  const loadBalances = useCallback(async () => {
    const { data, error } = await supabase.from('inventory_balances').select('product_id,saldo,updated_at');
    if (error) return Alert.alert('Erro', error.message);
    const list = (data as any[]) || [];
    const byId = new Map((products || []).map((p) => [p.id, p]));
    const enriched: Balance[] = list.map((b) => ({
      product_id: b.product_id,
      saldo: b.saldo,
      updated_at: b.updated_at,
      name: byId.get(b.product_id)?.name ?? null,
      unit: byId.get(b.product_id)?.unit ?? null,
    }));
    setBalances(enriched);
  }, [products]);

  const dedupeTx = (list: Tx[]) => {
    const m = new Map<string, Tx>();
    for (const t of list) m.set(`${t.id}-${t.created_at}`, t);
    return Array.from(m.values());
  };

  const fetchTxPage = useCallback(
    async (reset = false) => {
      if (loadingPage || !from || !to) return;
      if (!reset && !hasMore) return;
      setLoadingPage(true);

      const fromIdx = reset ? 0 : cursor;
      const toIdx = fromIdx + PAGE_SIZE - 1;

      let q = supabase
        .from('inventory_transactions')
        .select('id,product_id,quantity,unit,tx_type,created_at,source_production_id,metadata')
        .order('created_at', { ascending: false })
        .range(fromIdx, toIdx);

      if (selProd) q = q.eq('product_id', selProd);
      if (filterType) q = filterType === 'venda' ? q.in('tx_type', ['venda', 'saida'] as any) : q.eq('tx_type', filterType);
      if (from) q = q.gte('created_at', `${from} 00:00:00`);
      if (to) q = q.lte('created_at', endOfDayString(to));

      const { data, error } = await q;
      if (error) {
        Alert.alert('Erro', error.message);
        setLoadingPage(false);
        return;
      }

      const page = (data as Tx[]) || [];
      if (reset) {
        setTxs(dedupeTx(page));
        setCursor(page.length);
        setHasMore(page.length === PAGE_SIZE);
      } else {
        setTxs((prev) => dedupeTx([...(prev || []), ...page]));
        setCursor((prev) => prev + page.length);
        if (page.length < PAGE_SIZE) setHasMore(false);
      }

      setLoadingPage(false);
    },
    [cursor, filterType, from, to, selProd, loadingPage, hasMore],
  );

  // primeira carga
  useEffect(() => { loadProducts(); }, [loadProducts]);
  useEffect(() => { if (products) loadBalances(); }, [products, loadBalances]);
  useEffect(() => { if (from && to) fetchTxPage(true); }, [fetchTxPage, from, to]);

  const applyFilters = useCallback(() => {
    setCursor(0);
    setHasMore(true);
    fetchTxPage(true);
  }, [fetchTxPage]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadProducts(), loadBalances(), fetchTxPage(true)]);
    setRefreshing(false);
  }, [loadProducts, loadBalances, fetchTxPage]);

  /* ===== delta do dia por produto (para os saldos) ===== */
  const todayYmd = todayStr();
  const deltaHojeByProd = useMemo(() => {
    const m = new Map<string, number>();
    (txs || []).forEach((t) => {
      if (t.created_at.slice(0, 10) !== todayYmd) return;
      const sign =
        t.tx_type === 'entrada' ? 1 :
        (t.tx_type === 'saida' || t.tx_type === 'venda') ? -1 : 0;
      m.set(t.product_id, (m.get(t.product_id) || 0) + sign * t.quantity);
    });
    return m;
  }, [txs, todayYmd]);

  /* ===== header da lista (saldos, movimentar, filtros) ===== */
  const maxSaldo = useMemo(() => Math.max(1, ...(balances || []).map((b) => Math.abs(b.saldo))), [balances]);

  const Header = useMemo(() => {
    return (
      <View style={styles.headerBlock}>
        {/* Saldos */}
        {balances === null ? (
          <SkeletonList rows={2} height={70} />
        ) : balances.length === 0 ? (
          <EmptyState title="Sem saldos ainda" />
        ) : (
          <View style={{ gap: spacing.sm }}>
            {(balances || []).map((b) => (
              <BalanceRow
                key={b.product_id}
                name={b.name ?? 'Produto'}
                unit={b.unit ?? undefined}
                value={b.saldo}
                max={maxSaldo}
                updatedAt={b.updated_at}
                todayDelta={deltaHojeByProd.get(b.product_id) ?? 0}
                onPress={() => setSelProd(b.product_id)}
              />
            ))}
          </View>
        )}

        {/* Painel inline de movimentação */}
        <ExpandableCard
          title="Registrar movimentação"
          subtitle="Informe os dados abaixo"
          defaultOpen={false}
          variant="filled"
          elevationLevel={0}
        >
          <MovePanel
            products={products}
            mvProd={mvProd}
            setMvProd={(id) => setMvProd(id)}
            mvType={mvType}
            setMvType={setMvType}
            mvCustomer={mvCustomer}
            setMvCustomer={setMvCustomer}
            mvQty={mvQty}
            setMvQty={setMvQty}
            mvProdUnit={mvProdUnit}
            mvIsInteger={mvIsInteger}
            balances={balances}
            colors={colors}
            spacing={spacing}
            typography={typography}
            addTx={addTx}
            saving={saving}
          />
        </ExpandableCard>

        {/* Filtros */}
        <Card padding="md" variant="tonal" elevationLevel={0} style={{ gap: spacing.md }}>
          <Text style={typography.h2}>Filtros</Text>

          <View>
            <Text style={[typography.label, { marginBottom: 6, color: colors.muted }]}>Produto</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
              <Chip label="Todos" active={!selProd} onPress={() => (setSelProd(null), h.tap())} />
              {(products || []).map((p) => (
                <Chip key={p.id} label={p.name} active={selProd === p.id} onPress={() => (setSelProd(p.id), h.tap())} />
              ))}
            </ScrollView>
          </View>

          <View>
            <Text style={[typography.label, { marginBottom: 6, color: colors.muted }]}>Tipo</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
              <Chip label="Todos" active={!filterType} onPress={() => (setFilterType(undefined), h.tap())} />
              {(['entrada', 'saida', 'ajuste', 'transferencia', 'venda'] as const).map((t) => (
                <Chip key={t} label={t} active={filterType === t} onPress={() => (setFilterType(t), h.tap())} />
              ))}
            </ScrollView>
          </View>

          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <DateField label="De" value={from} onChange={(v) => clampDates(v, undefined)} maximumDate={new Date()} />
            </View>
            <View style={{ flex: 1 }}>
              <DateField
                label="Até"
                value={to}
                onChange={(v) => clampDates(undefined, v)}
                maximumDate={new Date()}
                minimumDate={from ? parseISODate(from) : undefined}
              />
            </View>
          </View>

          <View style={{ gap: spacing.sm }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, alignItems: 'center' }}>
              <Text style={[typography.label, { color: colors.muted }]}>Rápido:</Text>
              <Chip label="7 dias" onPress={() => quickRange('7d')} />
              <Chip label="30 dias" onPress={() => quickRange('30d')} />
              <Chip label="Este mês" onPress={() => quickRange('month')} />
              <Chip
                label="Limpar"
                onPress={() => {
                  const now = Date.now();
                  clampDates(toISODate(new Date(now - 30 * ONE_DAY)), todayStr());
                  setFilterType(undefined);
                  setSelProd(null);
                }}
              />
            </ScrollView>
            <Button title="Aplicar" small onPress={applyFilters} />
          </View>
        </Card>

        <Text style={typography.h2}>Movimentos</Text>
      </View>
    );
    // deps mínimos (evita re-render) — deltas e balances já reconstroem o header quando mudam
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balances, maxSaldo, deltaHojeByProd, products, mvProd, mvType, mvCustomer, mvQty, mvProdUnit, mvIsInteger, saving, colors, spacing, typography, selProd, filterType, from, to]);

  /* ===== agrupamento em Renderables ===== */
  const renderables: Renderable[] = useMemo(() => {
    if (!txs || txs.length === 0) return [];
    const byDay = new Map<string, Tx[]>();
    for (const t of txs) {
      const ymd = t.created_at.slice(0, 10);
      if (!byDay.has(ymd)) byDay.set(ymd, []);
      byDay.get(ymd)!.push(t);
    }
    const groups: DayGroup[] = Array.from(byDay.entries())
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([ymd, list]) => ({
        ymd,
        title: labelForYMD(ymd),
        subtitle: new Date(ymd).toLocaleDateString(),
        items: list,
      }));

    const out: Renderable[] = [];
    for (const g of groups) {
      out.push({ type: 'hdr', id: `hdr-${g.ymd}`, title: g.title, subtitle: g.subtitle });
      for (const it of g.items) out.push({ type: 'tx', id: it.id, tx: it });
    }
    return out;
  }, [txs]);

  /* ===== render ===== */
  const keyExtractor = useCallback((it: Renderable) => it.id, []);
  const getItemType = useCallback((it: Renderable) => it.type, []);
  const renderItem: ListRenderItem<Renderable> = useCallback(
    ({ item }) => {
      if (item.type === 'hdr') {
        return <DayHeader title={item.title} subtitle={item.subtitle} />;
      }
      return (
        <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
          <TxRow tx={item.tx} products={products} />
        </View>
      );
    },
    [products, spacing.md, spacing.sm],
  );

  // evita chamadas múltiplas no fim (causa “piscar”)
  const endGuard = useRef(false);
  const onEndReached = useCallback(() => {
    if (!hasMore || loadingPage || endGuard.current) return;
    endGuard.current = true;
    fetchTxPage(false).finally(() => {
      setTimeout(() => { endGuard.current = false; }, 250);
    });
  }, [hasMore, loadingPage, fetchTxPage]);

  const ListFooter = useMemo(() => {
    if (loadingPage && hasMore) {
      return (
        <View style={{ paddingVertical: spacing.md, alignItems: 'center' }}>
          <ActivityIndicator />
        </View>
      );
    }
    if (!hasMore && (txs?.length ?? 0) > 0) {
      return (
        <View style={{ paddingVertical: spacing.md, alignItems: 'center' }}>
          <Text style={{ opacity: 0.6 }}>Sem mais movimentações</Text>
        </View>
      );
    }
    // footer inerte para espaçar — evita usar contentContainerStyle
    return <View style={{ height: spacing.lg }} />;
  }, [loadingPage, hasMore, txs?.length, spacing.md, spacing.lg]);

  const perfProps: any = { estimatedItemSize: 120 };

  /* ===== JSX ===== */
  return (
    <Screen padded={false} scroll={false}>
      <FlashList
        {...perfProps}
        data={renderables}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        getItemType={getItemType}
        ListHeaderComponent={Header}
        ListFooterComponent={ListFooter}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
            progressViewOffset={Platform.OS === 'android' ? 56 : 0}
          />
        }
        onEndReachedThreshold={0.01}
        onEndReached={hasMore ? onEndReached : undefined}
        onMomentumScrollBegin={() => { endGuard.current = false; }}
        bounces
        overScrollMode="always"
        decelerationRate="fast"
        removeClippedSubviews={Platform.OS === 'android'}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );

  /* ===== ações ===== */
  async function addTx() {
    const balanceById = new Map<string, number>();
    (balances || []).forEach((b) => balanceById.set(b.product_id, b.saldo));
    const mvSaldoAtual = mvProd ? (balanceById.get(mvProd) ?? 0) : 0;
    const mvQtyNum = parseFloat(mvQty || '0') || 0;
    const delta =
      mvType === 'entrada' ? mvQtyNum :
      (mvType === 'saida' || mvType === 'venda') ? -mvQtyNum : 0;
    const mvSaldoPrevisto = mvSaldoAtual + delta;

    if ((mvType === 'saida' || mvType === 'venda') && mvSaldoPrevisto < 0) {
      h.warning();
      return Alert.alert('Saldo insuficiente', 'A quantidade informada é maior que o saldo disponível.');
    }

    if (!session) return Alert.alert('Login necessário');
    if (!mvProd) { h.warning(); return Alert.alert('Selecione um produto'); }
    if (!mvQtyNum) { h.warning(); return Alert.alert('Informe a quantidade'); }

    const unit = prodsById.get(mvProd)?.unit || 'UN';
    const txTypeToPersist: Tx['tx_type'] = mvType === 'venda' ? 'saida' : mvType;

    setSaving(true);

    const optimistic: Tx = {
      id: 'tmp-' + Date.now(),
      product_id: mvProd,
      quantity: mvQtyNum,
      unit,
      tx_type: txTypeToPersist,
      created_at: new Date().toISOString(),
      source_production_id: null,
      metadata: mvType === 'venda' && mvCustomer.trim() ? { customer: mvCustomer.trim() } : undefined,
    };
    setTxs((prev) => (prev ? [optimistic, ...prev] : [optimistic]));

    const payload: any = {
      product_id: optimistic.product_id,
      quantity: optimistic.quantity,
      unit: optimistic.unit,
      tx_type: optimistic.tx_type,
      created_by: session.user.id,
      source_production_id: null,
    };
    if (optimistic.metadata) payload.metadata = optimistic.metadata;

    try {
      let ins = await supabase.from('inventory_transactions').insert(payload).select().single();
      if (ins.error && /metadata/i.test(ins.error.message)) {
        delete payload.metadata;
        ins = await supabase.from('inventory_transactions').insert(payload).select().single();
      }
      if (ins.error) throw ins.error;

      const real = ins.data as Tx;
      setTxs((prev) => (prev || []).map((t) => (t.id === optimistic.id ? real : t)));
      await loadBalances();

      h.success();
      showToast?.({
        type: 'success',
        message: 'Movimentação registrada.',
        onAction: async () => {
          await supabase.from('inventory_transactions').delete().eq('id', real.id);
          await loadBalances();
          await fetchTxPage(true);
        },
        actionLabel: 'Desfazer',
      });

      setMvQty('');
      setMvCustomer('');
    } catch (e: any) {
      h.error();
      setTxs((prev) => (prev || []).filter((t) => t.id !== optimistic.id));
      Alert.alert('Erro', e.message ?? 'Falha ao registrar');
    } finally {
      setSaving(false);
    }
  }

  function quickRange(k: '7d' | '30d' | 'month') {
    const now = new Date();
    let f = new Date();
    if (k === '7d') f.setDate(now.getDate() - 7);
    if (k === '30d') f.setDate(now.getDate() - 30);
    if (k === 'month') f = new Date(now.getFullYear(), now.getMonth(), 1);
    clampDates(toISODate(f), toISODate(now));
  }
}

/* ===== Painel inline de Movimentação ===== */
function MovePanel({
  products,
  mvProd,
  setMvProd,
  mvType,
  setMvType,
  mvCustomer,
  setMvCustomer,
  mvQty,
  setMvQty,
  mvProdUnit,
  mvIsInteger,
  balances,
  colors,
  spacing,
  typography,
  addTx,
  saving,
}: {
  products: Product[] | null;
  mvProd: string | null;
  setMvProd: (id: string) => void;
  mvType: Tx['tx_type'];
  setMvType: (t: Tx['tx_type']) => void;
  mvCustomer: string;
  setMvCustomer: (s: string) => void;
  mvQty: string;
  setMvQty: (s: string) => void;
  mvProdUnit: Unit | null;
  mvIsInteger: boolean;
  balances: Balance[] | null;
  colors: any;
  spacing: any;
  typography: any;
  addTx: () => Promise<void>;
  saving: boolean;
}) {
  const balanceById = useMemo(() => {
    const m = new Map<string, number>();
    (balances || []).forEach((b) => m.set(b.product_id, b.saldo));
    return m;
  }, [balances]);

  const saldoAtual = mvProd ? (balanceById.get(mvProd) ?? 0) : 0;
  const valNum = parseFloat(mvQty || '0') || 0;
  const delta =
    mvType === 'entrada' ? valNum :
    (mvType === 'saida' || mvType === 'venda') ? -valNum : 0;
  const previsto = saldoAtual + delta;

  const step = mvIsInteger ? 1 : 0.1;
  const decs = mvIsInteger ? 0 : 3;

  const presets = mvIsInteger ? [1, 5, 10, 20, 50] : [0.1, 0.5, 1, 5, 10];

  const formValido =
    !!mvProd &&
    valNum > 0 &&
    (mvType === 'entrada' ||
      mvType === 'ajuste' ||
      mvType === 'transferencia' ||
      (mvType === 'saida' || mvType === 'venda' ? previsto >= 0 : true));

  return (
    <View style={{ gap: spacing.md }}>
      {/* Produto */}
      <View>
        <Text style={typography.h2}>Produto</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
          {(products || []).map((p) => (
            <Chip
              key={p.id}
              label={`${p.name} (${p.unit})`}
              active={mvProd === p.id}
              onPress={() => setMvProd(p.id)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Tipo */}
      <View>
        <Text style={typography.h2}>Tipo</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
          {(['entrada', 'saida', 'ajuste', 'transferencia', 'venda'] as const).map((t) => (
            <Chip key={t} label={t} active={mvType === t} onPress={() => setMvType(t)} />
          ))}
        </ScrollView>
      </View>

      {/* Cliente (venda) */}
      {mvType === 'venda' && (
        <Input
          label="Cliente (opcional)"
          value={mvCustomer}
          onChangeText={setMvCustomer}
          placeholder="Ex.: Mercado X"
          returnKeyType="done"
        />
      )}

      {/* Quantidade + stepper + presets */}
      <View style={{ gap: 8 }}>
        <Text style={typography.h2}>Quantidade</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Button
            title="−"
            small
            variant="tonal"
            onPress={() => {
              const next = Math.max(0, valNum - step);
              setMvQty(next.toFixed(decs));
            }}
          />
          <View style={{ flex: 1 }}>
            <InputNumber
              label=""
              mode={mvIsInteger ? 'integer' : 'decimal'}
              decimals={decs}
              value={mvQty}
              onChangeText={setMvQty}
              placeholder={mvIsInteger ? 'Ex.: 12' : 'Ex.: 34.500'}
              suffix={mvProdUnit ? String(mvProdUnit).toUpperCase() : undefined}
            />
          </View>
          <Button
            title="+"
            small
            variant="tonal"
            onPress={() => {
              const next = valNum + step;
              setMvQty(next.toFixed(decs));
            }}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
          {presets.map((p) => (
            <Chip
              key={p}
              label={`${p}${mvIsInteger ? '' : ''}`}
              onPress={() => setMvQty((valNum + p).toFixed(decs))}
            />
          ))}
        </ScrollView>
      </View>

      {/* Saldo atual → previsto */}
      <Card padding="md" variant="tonal" elevationLevel={0} style={{ gap: 6 }}>
        <Text style={[typography.label, { opacity: 0.8 }]}>Saldo</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontWeight: '800' }}>
            {formatQty(mvProdUnit, saldoAtual)}
          </Text>
          <MaterialCommunityIcons name="arrow-right" size={18} color={colors.muted} style={{ marginHorizontal: 8 }} />
          <Text
            style={{
              fontWeight: '800',
              color: previsto < 0 ? '#DC2626' : colors.text,
            }}
          >
            {formatQty(mvProdUnit, previsto)}
          </Text>
          <View style={{ flex: 1 }} />
          {!!mvProdUnit && (
            <Text style={{ color: colors.muted, fontSize: 12 }}>{String(mvProdUnit).toUpperCase()}</Text>
          )}
        </View>
        {(mvType === 'saida' || mvType === 'venda') && previsto < 0 && (
          <Text style={{ color: '#DC2626', fontSize: 12 }}>
            Quantidade maior que o saldo disponível.
          </Text>
        )}
      </Card>

      {/* Ações */}
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Button title="Limpar" variant="text" onPress={() => { setMvQty(''); setMvCustomer(''); }} disabled={saving} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="Registrar" onPress={addTx} loading={saving} disabled={saving || !formValido} />
        </View>
      </View>
    </View>
  );
}
