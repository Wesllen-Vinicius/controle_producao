// screens/AdminProductionsReportScreen.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
  RefreshControl,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import { FlashList, ListRenderItem } from '@shopify/flash-list';

import Screen from '../components/Screen';
import Card from '../components/ui/Card';
import Chip from '../components/ui/Chip';
import Button from '../components/ui/Button';
import KPI from '../components/ui/KPI';
import EmptyState from '../components/ui/EmptyState';
import BottomSheet from '../components/ui/BottomSheet';
import SkeletonList from '../components/SkeletonList';

import { supabase } from '../services/supabase';
import { useAuth } from '../state/AuthProvider';
import { useTheme } from '../state/ThemeProvider';

import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

/** ===================== Tipos ===================== */
type Unit = 'UN' | 'KG' | 'L' | 'CX' | 'PC' | string;
type Product = { id: string; name: string; unit: Unit };
type Production = { id: string; prod_date: string; abate: number };
type Item = {
  id: string;
  production_id: string;
  product_id: string;
  produced: number;
  meta: number;
  diff: number;
  avg: number;
};
type DayTotals = { date: string; abate: number; produced: number; meta: number; diff: number };

/** ===================== Datas ===================== */
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
const fmt = (n: number, dec = 2) => Number(n ?? 0).toFixed(dec);

/** ===================== DateField ===================== */
const DateField = React.memo(function DateField({
  label,
  value,
  onChange,
  placeholder = 'YYYY-MM-DD',
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const { colors, radius, spacing, typography } = useTheme();
  const [show, setShow] = useState(false);

  const onChangePicker = (_: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShow(false);
    if (date) onChange(toISODate(date));
  };

  const iosInline =
    Platform.OS === 'ios' && typeof Platform.Version === 'number' && Platform.Version >= 14;

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
          display={Platform.OS === 'ios' ? (iosInline ? 'inline' : 'spinner') : 'default'}
          onChange={onChangePicker}
        />
      )}
    </View>
  );
});

/** ===================== Mini gráfico ===================== */
function Bar({
  prodH,
  metaH,
  colorProd,
  colorMeta,
}: {
  prodH: number;
  metaH: number;
  colorProd: string;
  colorMeta: string;
}) {
  const a1 = useRef(new Animated.Value(0)).current;
  const a2 = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(a1, { toValue: prodH, useNativeDriver: false, stiffness: 160, damping: 18, mass: 0.7 }).start();
    Animated.spring(a2, { toValue: metaH, useNativeDriver: false, stiffness: 160, damping: 18, mass: 0.7 }).start();
  }, [prodH, metaH, a1, a2]);
  return (
    <View style={{ flex: 1, alignItems: 'stretch', justifyContent: 'flex-end', paddingHorizontal: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
        <Animated.View style={{ flex: 1, height: a1, backgroundColor: colorProd, borderRadius: 4, marginRight: 4 }} />
        <Animated.View style={{ flex: 1, height: a2, backgroundColor: colorMeta, borderRadius: 4, opacity: 0.7 }} />
      </View>
    </View>
  );
}

const BarsChart = React.memo(function BarsChart({
  data,
  unit,
  maxBars = 12,
}: {
  data: { label: string; produced: number; meta: number }[];
  unit: string;
  maxBars?: number;
}) {
  const { colors, spacing } = useTheme();
  const sliced = data.slice(-maxBars);
  const maxVal = Math.max(1, ...sliced.flatMap((d) => [d.produced, d.meta]));

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: colors.accent }} />
          <Text style={{ color: colors.text, fontWeight: '700' }}>Produzido</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: colors.muted }} />
          <Text style={{ color: colors.text, fontWeight: '700' }}>Meta</Text>
        </View>
      </View>

      <View style={{ height: 160, flexDirection: 'row', alignItems: 'flex-end' }}>
        {sliced.map((d, idx) => {
          const prodH = (d.produced / maxVal) * 140;
          const metaH = (d.meta / maxVal) * 140;
          return <Bar key={idx} prodH={prodH} metaH={metaH} colorProd={colors.accent} colorMeta={colors.muted} />;
        })}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
        {sliced.map((d, idx) => (
          <Text key={idx} style={{ color: colors.muted, fontSize: 10, width: 24, textAlign: 'center' }}>
            {d.label.slice(5)}
          </Text>
        ))}
      </View>

      <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'right' }}>
        Valores em {unit?.toUpperCase?.() || 'UN'}
      </Text>
    </View>
  );
});

/** ===================== Sheet wrapper ===================== */
function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <BottomSheet open={open} onClose={onClose} title={title} subtitle={subtitle || ''}>
      {children}
    </BottomSheet>
  );
}

/** ===================== Day row ===================== */
const DayRow = React.memo(function DayRow({
  item,
  hasProductFilter,
  colors,
  spacing,
  typography,
}: {
  item: DayTotals;
  hasProductFilter: boolean;
  colors: any;
  spacing: any;
  typography: any;
}) {
  const progress = item.meta > 0 ? Math.min(1, Math.max(0, item.produced / item.meta)) : 0;

  return (
    <Card padding="md" variant="filled" elevationLevel={0} style={{ gap: 8, alignSelf: 'stretch' }}>
      <Text style={[typography.h2, { fontSize: 16 }]}>{item.date}</Text>
      <Text style={{ color: colors.muted, fontWeight: '700' }}>Abate: {item.abate}</Text>

      {hasProductFilter ? (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <View style={{ minWidth: '48%', marginRight: spacing.sm, marginBottom: spacing.sm }}>
              <KPI label="Produção" value={fmt(item.produced)} compact />
            </View>
            <View style={{ minWidth: '48%', marginBottom: spacing.sm }}>
              <KPI label="Meta" value={fmt(item.meta)} compact />
            </View>
            <View style={{ minWidth: '48%' }}>
              <KPI
                label="Dif."
                value={fmt(item.diff)}
                status={item.diff > 0 ? 'danger' : 'success'}
                compact
              />
            </View>
          </View>

          <View
            style={{
              height: 10,
              backgroundColor: colors.surfaceAlt,
              borderRadius: 999,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: colors.line,
              overflow: 'hidden',
              marginTop: 2,
            }}
          >
            <Animated.View
              style={{
                height: '100%',
                width: `${Math.round(progress * 100)}%`,
                backgroundColor: colors.primary,
              }}
            />
          </View>
          <Text style={{ color: colors.muted, alignSelf: 'flex-end', fontSize: 12 }}>
            {Math.round(progress * 100)}% de cumprimento
          </Text>
        </>
      ) : (
        <Text style={{ color: colors.muted }}>Selecione produtos para ver metas e diferenças.</Text>
      )}
    </Card>
  );
});

/** ===================== Tile de Totais por Produto ===================== */
const ProductTotalTile = React.memo(function ProductTotalTile({
  name,
  unit,
  produced,
  meta,
  diff,
}: {
  name: string;
  unit: string;
  produced: number;
  meta: number;
  diff: number;
}) {
  const { colors, spacing } = useTheme();
  const progress = meta > 0 ? Math.min(1, Math.max(0, produced / meta)) : 0;

  return (
    <Card padding="md" variant="tonal" elevationLevel={0} style={{ gap: 8 }}>
      <Text style={{ fontWeight: '800', color: colors.text }} numberOfLines={2}>
        {name} <Text style={{ color: colors.muted }}>({String(unit).toUpperCase()})</Text>
      </Text>

      <View
        style={{
          height: 10,
          backgroundColor: colors.surface,
          borderRadius: 999,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.line,
          overflow: 'hidden',
        }}
      >
        <View style={{ width: `${Math.round(progress * 100)}%`, height: '100%', backgroundColor: colors.primary }} />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        <View style={{ minWidth: '48%', marginRight: spacing.sm, marginTop: spacing.xs }}>
          <Text style={{ color: colors.muted, fontWeight: '700' }}>Produzido</Text>
          <Text style={{ fontWeight: '900', color: colors.text }}>{fmt(produced)}</Text>
        </View>
        <View style={{ minWidth: '48%', marginTop: spacing.xs }}>
          <Text style={{ color: colors.muted, fontWeight: '700' }}>Meta</Text>
          <Text style={{ fontWeight: '900', color: colors.text }}>{fmt(meta)}</Text>
        </View>
        <View style={{ minWidth: '48%', marginTop: spacing.xs }}>
          <Text style={{ color: colors.muted, fontWeight: '700' }}>Diferença</Text>
          <Text style={{ fontWeight: '900', color: diff > 0 ? '#DC2626' : colors.text }}>
            {fmt(diff)}
          </Text>
        </View>
      </View>
    </Card>
  );
});

/** ===================== Tela ===================== */
export default function AdminProductionsReportScreen() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const { colors, spacing, typography } = useTheme();
  const { width } = useWindowDimensions();

  // paddings do header para calcular grid
  const PADDING_H = spacing.md * 2;
  const GAP = spacing.sm;
  const tileW = Math.max(160, Math.floor((width - PADDING_H - GAP) / 2)); // 2 colunas responsivas

  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [products, setProducts] = useState<Product[] | null>(null);

  // multiseleção + filtros extras
  const [prodFilters, setProdFilters] = useState<string[]>([]);
  const [unitFilter, setUnitFilter] = useState<Unit | 'ALL'>('ALL');
  const [barCount, setBarCount] = useState<7 | 12 | 30>(12);
  const [sortTotals, setSortTotals] = useState<'produced' | 'compliance' | 'name'>('produced');

  const [sortOpen, setSortOpen] = useState(false);

  const [productions, setProductions] = useState<Production[] | null>(null);
  const [items, setItems] = useState<Item[] | null>(null);

  const [refreshing, setRefreshing] = useState(false);

  // export
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFmt, setExportFmt] = useState<'csv' | 'json' | 'pdf'>('csv');

  // datas padrão
  useEffect(() => {
    if (!from && !to) {
      const now = Date.now();
      setFrom(toISODate(new Date(now - 30 * ONE_DAY)));
      setTo(todayStr());
    }
  }, [from, to]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        stretch: { alignSelf: 'stretch' },
      }),
    [],
  );

  const loadProducts = useCallback(async () => {
    const { data, error } = await supabase.from('products').select('id,name,unit').order('name');
    if (error) {
      Alert.alert('Erro', error.message);
      return;
    }
    setProducts((data as Product[]) || []);
  }, []);

  const loadData = useCallback(async () => {
    setProductions(null);
    setItems(null);

    let q = supabase
      .from('productions')
      .select('id,prod_date,abate')
      .order('prod_date', { ascending: false })
      .limit(200);

    if (from) q = q.gte('prod_date', from);
    if (to) q = q.lte('prod_date', to);

    const { data: prods, error: e1 } = await q;
    if (e1) {
      Alert.alert('Erro', e1.message);
      return;
    }

    const list = (prods as Production[]) || [];
    setProductions(list);

    if (list.length === 0) {
      setItems([]);
      return;
    }

    const ids = list.map((p) => p.id);
    const { data: its, error: e2 } = await supabase
      .from('production_items')
      .select('id,production_id,product_id,produced,meta,diff,avg')
      .in('production_id', ids);
    if (e2) {
      Alert.alert('Erro', e2.message);
      return;
    }
    setItems((its as Item[]) || []);
  }, [from, to]);

  useEffect(() => {
    if (isAdmin) {
      loadProducts();
      loadData();
    }
  }, [isAdmin, loadData, loadProducts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadProducts(), loadData()]);
    setRefreshing(false);
  }, [loadProducts, loadData]);

  const productsById = useMemo(() => {
    const map: Record<string, Product> = {};
    (products || []).forEach((p) => (map[p.id] = p));
    return map;
  }, [products]);

  const hasProductFilter = prodFilters.length > 0;

  // unidades disponíveis dentre os selecionados
  const unitsAvailable: Unit[] = useMemo(() => {
    if (!products) return [];
    const set = new Set<Unit>();
    for (const id of prodFilters) {
      const u = productsById[id]?.unit as Unit | undefined;
      if (u) set.add(u);
    }
    return Array.from(set);
  }, [prodFilters, products, productsById]);

  // seleção efetiva respeitando unitFilter
  const effectiveProductIds = useMemo(() => {
    if (!hasProductFilter) return [];
    if (unitFilter === 'ALL') return prodFilters;
    return prodFilters.filter((id) => String(productsById[id]?.unit) === String(unitFilter));
  }, [hasProductFilter, prodFilters, unitFilter, productsById]);

  // unidade do gráfico
  const chartUnit = useMemo(() => {
    if (!hasProductFilter) return 'UN';
    const set = new Set(effectiveProductIds.map((id) => productsById[id]?.unit));
    return set.size === 1 ? (Array.from(set)[0] as string) : 'Misto';
  }, [hasProductFilter, effectiveProductIds, productsById]);

  // Série do gráfico
  const chartSeries = useMemo(() => {
    if (!hasProductFilter || !items || !productions) return [];
    const picked = new Set(effectiveProductIds);
    const perDay: Record<string, { produced: number; meta: number }> = {};
    for (const p of productions) perDay[p.prod_date] = perDay[p.prod_date] || { produced: 0, meta: 0 };
    for (const it of items) {
      if (!picked.has(it.product_id)) continue;
      const prod = productions.find((p) => p.id === it.production_id);
      if (!prod) continue;
      perDay[prod.prod_date].produced += it.produced;
      perDay[prod.prod_date].meta += it.meta;
    }
    return Object.entries(perDay)
      .map(([date, v]) => ({ label: date, produced: v.produced, meta: v.meta }))
      .sort((a, b) => (a.label < b.label ? 1 : -1));
  }, [items, productions, hasProductFilter, effectiveProductIds]);

  // Agregação por dia
  const days: DayTotals[] = useMemo(() => {
    if (!productions || !items) return [];
    const byDay = new Map<string, DayTotals>();

    for (const p of productions) {
      if (!byDay.has(p.prod_date)) byDay.set(p.prod_date, { date: p.prod_date, abate: 0, produced: 0, meta: 0, diff: 0 });
      byDay.get(p.prod_date)!.abate += p.abate;
    }

    if (hasProductFilter) {
      const picked = new Set(effectiveProductIds);
      for (const it of items) {
        if (!picked.has(it.product_id)) continue;
        const prod = productions.find((p) => p.id === it.production_id);
        if (!prod) continue;
        const row = byDay.get(prod.prod_date)!;
        row.produced += it.produced;
        row.meta += it.meta;
        row.diff += it.diff;
      }
    }

    return Array.from(byDay.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [productions, items, hasProductFilter, effectiveProductIds]);

  // Totais (filtro ativo)
  const totals = useMemo(() => {
    if (!hasProductFilter) return null;
    return days.reduce(
      (acc, d) => {
        acc.abate += d.abate;
        acc.produced += d.produced;
        acc.meta += d.meta;
        acc.diff += d.diff;
        return acc;
      },
      { abate: 0, produced: 0, meta: 0, diff: 0 }
    );
  }, [days, hasProductFilter]);

  // Totais por produto (sem filtro) + ordenação
  const totalsPerProduct = useMemo(() => {
    if (!items || !products) return [];
    const map = new Map<
      string,
      { product_id: string; name: string; unit: string; produced: number; meta: number; diff: number }
    >();
    for (const it of items) {
      const p = productsById[it.product_id];
      if (!p) continue;
      if (!map.has(it.product_id)) {
        map.set(it.product_id, {
          product_id: it.product_id,
          name: p.name,
          unit: p.unit,
          produced: 0,
          meta: 0,
          diff: 0,
        });
      }
      const row = map.get(it.product_id)!;
      row.produced += it.produced;
      row.meta += it.meta;
      row.diff += it.diff;
    }
    const out = Array.from(map.values());
    if (sortTotals === 'name') out.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortTotals === 'produced') out.sort((a, b) => b.produced - a.produced);
    else if (sortTotals === 'compliance') {
      const comp = (r: any) => (r.meta > 0 ? r.produced / r.meta : 0);
      out.sort((a, b) => comp(b) - comp(a));
    }
    return out;
  }, [items, products, productsById, sortTotals]);

  function quickRange(k: '7d' | '30d' | 'month') {
    const now = new Date();
    let f = new Date();
    if (k === '7d') f.setDate(now.getDate() - 7);
    if (k === '30d') f.setDate(now.getDate() - 30);
    if (k === 'month') f = new Date(now.getFullYear(), now.getMonth(), 1);
    setFrom(toISODate(f));
    setTo(toISODate(now));
  }

  /** ===================== Export helpers ===================== */
  const buildCsv = useCallback(() => {
    const hasFilter = prodFilters.length > 0;
    if (hasFilter) {
      const rows = [
        'date;abate;produced;meta;diff;cumprimento_%',
        ...days.map((d) => {
          const cumprimento = d.meta > 0 ? (d.produced / d.meta) * 100 : 0;
          return `${d.date};${d.abate};${fmt(d.produced)};${fmt(d.meta)};${fmt(d.diff)};${Math.round(cumprimento)}`;
        }),
      ];
      return rows.join('\n');
    }
    const rows = [
      'product;unit;produced;meta;diff;cumprimento_%',
      ...totalsPerProduct.map((r) => {
        const cumprimento = r.meta > 0 ? (r.produced / r.meta) * 100 : 0;
        return `${r.name};${r.unit};${fmt(r.produced)};${fmt(r.meta)};${fmt(r.diff)};${Math.round(cumprimento)}`;
      }),
    ];
    return rows.join('\n');
  }, [days, totalsPerProduct, prodFilters.length]);

  const buildJson = useCallback(() => {
    const hasFilter = prodFilters.length > 0;
    if (hasFilter) {
      return JSON.stringify(
        {
          filter_products: effectiveProductIds,
          unit_filter: unitFilter,
          days: days.map((d) => ({
            date: d.date,
            abate: d.abate,
            produced: d.produced,
            meta: d.meta,
            diff: d.diff,
          })),
        },
        null,
        2
      );
    }
    return JSON.stringify(
      {
        totals_per_product: totalsPerProduct.map((r) => ({
          product_id: r.product_id,
          name: r.name,
          unit: r.unit,
          produced: r.produced,
          meta: r.meta,
          diff: r.diff,
        })),
      },
      null,
      2
    );
  }, [days, totalsPerProduct, prodFilters.length, effectiveProductIds, unitFilter]);

  const buildPdfHtml = useCallback(() => {
    const title = 'Relatório de Produções';
    const subtitle =
      prodFilters.length > 0
        ? `Produtos: ${effectiveProductIds.map((id) => productsById[id]?.name || id).join(', ')}`
        : 'Totais por produto';
    const today = new Date().toLocaleString();

    const table =
      prodFilters.length > 0
        ? `
        <table>
          <thead><tr><th>Data</th><th>Abate</th><th>Produzido</th><th>Meta</th><th>Dif.</th><th>Cumpr.%</th></tr></thead>
          <tbody>
            ${days
              .map((d) => {
                const perc = d.meta > 0 ? Math.round((d.produced / d.meta) * 100) : 0;
                return `<tr>
                  <td>${d.date}</td>
                  <td>${d.abate}</td>
                  <td>${fmt(d.produced)}</td>
                  <td>${fmt(d.meta)}</td>
                  <td>${fmt(d.diff)}</td>
                  <td>${perc}%</td>
                </tr>`;
              })
              .join('')}
          </tbody>
        </table>`
        : `
        <table>
          <thead><tr><th>Produto</th><th>Unid.</th><th>Produzido</th><th>Meta</th><th>Dif.</th><th>Cumpr.%</th></tr></thead>
          <tbody>
            ${totalsPerProduct
              .map((r) => {
                const perc = r.meta > 0 ? Math.round((r.produced / r.meta) * 100) : 0;
                return `<tr>
                  <td>${r.name}</td>
                  <td>${r.unit}</td>
                  <td>${fmt(r.produced)}</td>
                  <td>${fmt(r.meta)}</td>
                  <td>${fmt(r.diff)}</td>
                  <td>${perc}%</td>
                </tr>`;
              })
              .join('')}
          </tbody>
        </table>`;

    return `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; padding: 24px; color: #111; }
            h1 { margin: 0 0 4px; }
            .muted { color: #666; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
            th { background: #f6f6f6; text-align: left; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <div class="muted">${subtitle} • Gerado em ${today}</div>
          ${table}
        </body>
      </html>`;
  }, [prodFilters.length, effectiveProductIds, productsById, days, totalsPerProduct]);

  const doExport = useCallback(async () => {
    try {
      const base = `relatorio_producao${prodFilters.length > 0 ? `_multi_${effectiveProductIds.length}` : ''}_${toISODate(new Date())}`;

      if (exportFmt === 'pdf') {
        const html = buildPdfHtml();
        let Print: any = null;
        let Sharing: any = null;
        try {
          // @ts-ignore (módulos opcionais)
          Print = require('expo-print');
          // @ts-ignore
          Sharing = require('expo-sharing');
        } catch {
          Print = null;
          Sharing = null;
        }

        if (Print?.printToFileAsync) {
          const { uri } = await Print.printToFileAsync({ html });
          if (Sharing?.isAvailableAsync && (await Sharing.isAvailableAsync())) {
            await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `${base}.pdf` });
          } else {
            await Share.share({ url: uri, title: `${base}.pdf`, message: uri });
          }
        } else {
          Alert.alert(
            'Exportar PDF',
            'Para exportar em PDF, instale "expo-print" e "expo-sharing". Vou exportar como HTML por enquanto.'
          );
          await Share.share({ title: `${base}.html`, message: html });
        }
        setExportOpen(false);
        return;
      }

      const payload = exportFmt === 'csv' ? buildCsv() : buildJson();
      await Share.share({ title: `${base}.${exportFmt}`, message: payload });
      setExportOpen(false);
    } catch (e: any) {
      Alert.alert('Erro ao exportar', e?.message ?? 'Tente novamente.');
    }
  }, [exportFmt, prodFilters.length, effectiveProductIds.length, buildCsv, buildJson, buildPdfHtml]);

  /** ===================== Header ===================== */
  const ListHeader = useMemo(() => {
    return (
      <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
        <View style={{ gap: spacing.md }}>
          <Text style={typography.h1}>Relatório de Produções</Text>

          {/* Período */}
          <Card style={{ gap: spacing.sm }} padding="md" variant="tonal">
            <Text style={typography.h2}>Período</Text>
            <View style={{ flexDirection: 'row' }}>
              <View style={{ flex: 1, marginRight: spacing.sm }}>
                <DateField label="De" value={from} onChange={setFrom} />
              </View>
              <View style={{ flex: 1 }}>
                <DateField label="Até" value={to} onChange={setTo} />
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ ...(typography.label as any), color: colors.muted, marginRight: spacing.sm }}>Rápido:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: spacing.md }}>
                <View style={{ flexDirection: 'row' }}>
                  <Chip label="7 dias" onPress={() => quickRange('7d')} />
                  <View style={{ width: spacing.xs }} />
                  <Chip label="30 dias" onPress={() => quickRange('30d')} />
                  <View style={{ width: spacing.xs }} />
                  <Chip label="Este mês" onPress={() => quickRange('month')} />
                </View>
              </ScrollView>
            </View>

            <View style={{ marginTop: spacing.sm, flexDirection: 'row' }}>
              <View style={{ flex: 1, marginRight: spacing.sm }}>
                <Button title="Filtrar" small onPress={loadData} />
              </View>
              <View style={{ flex: 1 }}>
                <Button title="Exportar" small variant="tonal" onPress={() => setExportOpen(true)} />
              </View>
            </View>
          </Card>

          {/* Produtos (multi) — chips horizontais, sem quebrar layout */}
          <Card style={{ gap: spacing.sm }} padding="md" variant="tonal">
            <Text style={typography.h2}>Filtrar por produto</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row' }}>
                <Chip
                  label="Todos"
                  active={prodFilters.length === 0}
                  onPress={() => {
                    setProdFilters([]);
                    setUnitFilter('ALL');
                  }}
                />
                <View style={{ width: spacing.xs }} />
                {(products || []).map((p, idx) => {
                  const active = prodFilters.includes(p.id);
                  return (
                    <React.Fragment key={p.id}>
                      <Chip
                        label={`${p.name} (${p.unit})`}
                        active={active}
                        onPress={() =>
                          setProdFilters((curr) => (curr.includes(p.id) ? curr.filter((id) => id !== p.id) : [...curr, p.id]))
                        }
                      />
                      {idx < (products || []).length - 1 && <View style={{ width: spacing.xs }} />}
                    </React.Fragment>
                  );
                })}
              </View>
            </ScrollView>

            {/* Filtro por unidade (apenas quando houver mistura) */}
            {prodFilters.length > 0 && unitsAvailable.length > 1 && (
              <View>
                <Text style={[typography.label, { color: colors.muted, marginBottom: 6 }]}>Unidade</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row' }}>
                    <Chip label="Todas" active={unitFilter === 'ALL'} onPress={() => setUnitFilter('ALL')} />
                    <View style={{ width: spacing.xs }} />
                    {unitsAvailable.map((u, idx) => (
                      <React.Fragment key={u}>
                        <Chip label={String(u).toUpperCase()} active={unitFilter === u} onPress={() => setUnitFilter(u)} />
                        {idx < unitsAvailable.length - 1 && <View style={{ width: spacing.xs }} />}
                      </React.Fragment>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}
          </Card>

          {/* Painel superior / Totais e gráfico */}
          {totals ? (
            <>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <View style={{ width: tileW, marginRight: GAP, marginBottom: GAP }}>
                  <KPI label="Abate total" value={totals.abate} />
                </View>
                <View style={{ width: tileW, marginBottom: GAP }}>
                  <KPI label="Produção total" value={fmt(totals.produced)} />
                </View>
                <View style={{ width: tileW, marginRight: GAP, marginBottom: GAP }}>
                  <KPI label="Meta total" value={fmt(totals.meta)} />
                </View>
                <View style={{ width: tileW, marginBottom: GAP }}>
                  <KPI
                    label="Perdas (dif.)"
                    value={fmt(totals.diff)}
                    status={totals.diff > 0 ? 'danger' : 'success'}
                  />
                </View>
                <View style={{ width: tileW }}>
                  <KPI
                    label="Cumprimento"
                    value={`${Math.round((totals.produced / Math.max(1, totals.meta)) * 100)}%`}
                    progress={Math.min(1, totals.produced / Math.max(1, totals.meta))}
                    compact
                  />
                </View>
              </View>

              <Card padding="md" variant="filled" elevationLevel={1} style={styles.stretch}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={typography.h2}>Evolução diária</Text>
                  <View style={{ flexDirection: 'row' }}>
                    {[7, 12, 30].map((n, i) => (
                      <React.Fragment key={n}>
                        <Chip
                          label={`${n}`}
                          active={barCount === (n as any)}
                          onPress={() => setBarCount(n as 7 | 12 | 30)}
                        />
                        {i < 2 && <View style={{ width: 6 }} />}
                      </React.Fragment>
                    ))}
                  </View>
                </View>
                {!items ? (
                  <SkeletonList rows={2} />
                ) : chartSeries.length === 0 ? (
                  <EmptyState title="Sem dados no período para os produtos selecionados" compact />
                ) : (
                  <BarsChart
                    data={chartSeries.map((d) => ({ label: d.label, produced: d.produced, meta: d.meta }))}
                    unit={chartUnit}
                    maxBars={barCount}
                  />
                )}
              </Card>
            </>
          ) : (
            <View>
              {/* Toolbar: título + ação Ordenar (abre sheet) */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: spacing.sm,
                }}
              >
                <Text style={typography.h2}>Totais por produto</Text>
                <Button title="Ordenar" small variant="tonal" onPress={() => setSortOpen(true)} />
              </View>

              {!items ? (
                <Card><SkeletonList rows={1} /></Card>
              ) : (totalsPerProduct?.length ?? 0) === 0 ? (
                <EmptyState title="Sem dados no período" />
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {totalsPerProduct.map((r, idx) => (
                    <View
                      key={r.product_id}
                      style={{
                        width: tileW,
                        marginRight: idx % 2 === 0 ? GAP : 0,
                        marginBottom: GAP,
                      }}
                    >
                      <ProductTotalTile
                        name={r.name}
                        unit={r.unit}
                        produced={r.produced}
                        meta={r.meta}
                        diff={r.diff}
                      />
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          <Text style={typography.h2}>Por dia</Text>
        </View>
      </View>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    spacing, typography, colors,
    from, to, loadData,
    products, prodFilters, unitsAvailable.length, unitFilter,
    totals, items, chartSeries, chartUnit, barCount,
    totalsPerProduct, tileW, GAP,
  ]);

  /** ===================== Render list ===================== */
  const renderItem: ListRenderItem<DayTotals> = useCallback(
    ({ item }) => (
      <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
        <DayRow
          item={item}
          hasProductFilter={prodFilters.length > 0}
          colors={colors}
          spacing={spacing}
          typography={typography}
        />
      </View>
    ),
    [prodFilters.length, colors, spacing, typography],
  );

  const keyExtractor = useCallback((d: DayTotals) => d.date, []);
  const ItemSeparator = useCallback(() => <View style={{ height: spacing.sm }} />, [spacing.sm]);

  const perfProps: any = { estimatedItemSize: 136 };

  if (!isAdmin) {
    return (
      <Screen padded>
        <Text style={{ color: colors.text }}>Acesso restrito.</Text>
      </Screen>
    );
  }

  return (
    <Screen padded={false} scroll={false}>
      <FlashList
        {...perfProps}
        data={days}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ItemSeparatorComponent={ItemSeparator}
        ListHeaderComponent={ListHeader}
        bounces
        overScrollMode="always"
        decelerationRate="fast"
        removeClippedSubviews={Platform.OS === 'android'}
        showsVerticalScrollIndicator={false}
        // FLASHLIST: apenas padding/background aqui (sem gap, margin, etc.)
        contentContainerStyle={{ paddingBottom: spacing.lg, backgroundColor: 'transparent' }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
            progressViewOffset={Platform.OS === 'android' ? 56 : 0}
          />
        }
        ListEmptyComponent={
          !productions || !items ? (
            <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.md }}>
              <SkeletonList rows={3} />
            </View>
          ) : (
            <EmptyState title="Sem dados no período" />
          )
        }
      />

      {/* Export */}
      <Sheet
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Exportar dados"
        subtitle="Escolha o formato do arquivo"
      >
        <View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <Chip label="CSV"  active={exportFmt === 'csv'}  onPress={() => setExportFmt('csv')}  />
            <View style={{ width: spacing.xs }} />
            <Chip label="JSON" active={exportFmt === 'json'} onPress={() => setExportFmt('json')} />
            <View style={{ width: spacing.xs }} />
            <Chip label="PDF"  active={exportFmt === 'pdf'}  onPress={() => setExportFmt('pdf')}  />
          </View>

          <Text style={{ color: colors.muted, marginVertical: spacing.sm }}>
            {prodFilters.length > 0
              ? 'Exporta a série diária agregada dos produtos selecionados (produzido, meta, perdas).'
              : 'Exporta totais por produto no período (produzido, meta, perdas).'}
          </Text>

          <View style={{ flexDirection: 'row' }}>
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <Button title="Cancelar" variant="text" onPress={() => setExportOpen(false)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Exportar" onPress={doExport} />
            </View>
          </View>
        </View>
      </Sheet>

      {/* Ordenação (Sheet) */}
      <Sheet
        open={sortOpen}
        onClose={() => setSortOpen(false)}
        title="Ordenar totais por produto"
      >
        <View>
          <Text style={{ color: colors.muted, marginBottom: spacing.sm }}>
            Escolha como ordenar a grade de produtos:
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <Chip
              label="Produzido"
              active={sortTotals === 'produced'}
              onPress={() => setSortTotals('produced')}
            />
            <View style={{ width: spacing.xs }} />
            <Chip
              label="Cumprimento %"
              active={sortTotals === 'compliance'}
              onPress={() => setSortTotals('compliance')}
            />
            <View style={{ width: spacing.xs }} />
            <Chip
              label="Nome (A-Z)"
              active={sortTotals === 'name'}
              onPress={() => setSortTotals('name')}
            />
          </View>

          <View style={{ marginTop: spacing.md, flexDirection: 'row' }}>
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <Button title="Fechar" variant="text" onPress={() => setSortOpen(false)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Aplicar" onPress={() => setSortOpen(false)} />
            </View>
          </View>
        </View>
      </Sheet>
    </Screen>
  );
}
