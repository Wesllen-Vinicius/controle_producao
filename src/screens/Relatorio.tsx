import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Screen from '../components/Screen';

// UI kit direto
import Card from '../components/ui/Card';
import Chip from '../components/ui/Chip';
import Button from '../components/ui/Button';
import KPI from '../components/ui/KPI';
import EmptyState from '../components/ui/EmptyState';
import BottomSheet from '../components/ui/BottomSheet';

import { supabase } from '../services/supabase';
import { useAuth } from '../state/AuthProvider';
import SkeletonList from '../components/SkeletonList';
import { useTheme } from '../state/ThemeProvider';

import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

// ===================== Tipos =====================
type Product = { id: string; name: string; unit: 'UN' | 'KG' | string };
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

// ===================== Datas =====================
function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function parseISODate(s: string | undefined) {
  if (!s) return new Date();
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}
function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
const fmt = (n: number, dec = 2) => Number(n ?? 0).toFixed(dec);

// ===================== DateField =====================
function DateField({
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
    <View>
      {!!label && <Text style={[typography.label, { marginBottom: 6 }]}>{label}</Text>}
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
}

// ===================== Mini gráfico =====================
function BarsChart({
  data, // [{ label, produced, meta }]
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
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: colors.accent }} />
          <Text style={{ color: colors.text, fontWeight: '700' }}>Produzido</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: colors.muted }} />
          <Text style={{ color: colors.text, fontWeight: '700' }}>Meta</Text>
        </View>
      </View>

      <View style={{ height: 160, flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm }}>
        {sliced.map((d, idx) => {
          const hProd = (d.produced / maxVal) * 140;
          const hMeta = (d.meta / maxVal) * 140;
          return (
            <View key={idx} style={{ flex: 1, alignItems: 'stretch', justifyContent: 'flex-end' }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
                <View style={{ flex: 1, height: hProd, backgroundColor: colors.accent, borderRadius: 4 }} />
                <View style={{ flex: 1, height: hMeta, backgroundColor: colors.muted, borderRadius: 4, opacity: 0.7 }} />
              </View>
              <Text style={{ color: colors.muted, fontSize: 10, marginTop: 4, textAlign: 'center' }}>
                {d.label.slice(5)}
              </Text>
            </View>
          );
        })}
      </View>

      <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'right' }}>
        Valores em {unit?.toUpperCase?.() || 'UN'}
      </Text>
    </View>
  );
}

// ===================== BottomSheet wrapper (open/visible) =====================
function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  // suporta ambos os contratos: open ou visible
  return (
    <BottomSheet
      {...({ open: visible, visible } as any)}
      onClose={onClose}
      title={title}
      subtitle={subtitle || ''}
    >
      {children}
    </BottomSheet>
  );
}

// ===================== Tela =====================
export default function AdminProductionsReportScreen() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const { colors, spacing, typography } = useTheme();

  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [products, setProducts] = useState<Product[] | null>(null);
  const [prodFilter, setProdFilter] = useState<string | null>(null);

  const [productions, setProductions] = useState<Production[] | null>(null);
  const [items, setItems] = useState<Item[] | null>(null);

  // export
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFmt, setExportFmt] = useState<'csv' | 'json'>('csv');

  const styles = useMemo(
    () =>
      StyleSheet.create({
        date: { color: colors.text, fontWeight: '900', fontSize: 16, marginBottom: 6 },
        row: { color: colors.text, marginTop: 2 },
        v: { fontWeight: '800', color: colors.text },
        hint: { color: colors.muted, fontWeight: '700' },
      }),
    [colors]
  );

  const loadProducts = useCallback(async () => {
    const { data, error } = await supabase.from('products').select('id,name,unit').order('name');
    if (error) { Alert.alert('Erro', error.message); return; }
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
    if (e1) { Alert.alert('Erro', e1.message); return; }
    const list = (prods as Production[]) || [];
    setProductions(list);

    if (list.length === 0) { setItems([]); return; }

    const ids = list.map((p) => p.id);
    const { data: its, error: e2 } = await supabase
      .from('production_items')
      .select('id,production_id,product_id,produced,meta,diff,avg')
      .in('production_id', ids);
    if (e2) { Alert.alert('Erro', e2.message); return; }
    setItems((its as Item[]) || []);
  }, [from, to]);

  useEffect(() => {
    if (isAdmin) { loadProducts(); loadData(); }
  }, [isAdmin, loadData, loadProducts]);

  const productsById = useMemo(() => {
    const map: Record<string, Product> = {};
    (products || []).forEach((p) => (map[p.id] = p));
    return map;
  }, [products]);

  // Agregação por dia
  const days: DayTotals[] = useMemo(() => {
    if (!productions || !items) return [];
    const byDay = new Map<string, DayTotals>();
    for (const p of productions) {
      if (!byDay.has(p.prod_date)) {
        byDay.set(p.prod_date, { date: p.prod_date, abate: 0, produced: 0, meta: 0, diff: 0 });
      }
    }
    const relevantItems = prodFilter ? items.filter((i) => i.product_id === prodFilter) : [];
    for (const p of productions) {
      const row = byDay.get(p.prod_date)!;
      row.abate += p.abate;
    }
    for (const it of relevantItems) {
      const prod = productions.find((p) => p.id === it.production_id);
      if (!prod) continue;
      const row = byDay.get(prod.prod_date)!;
      row.produced += it.produced;
      row.meta += it.meta;
      row.diff += it.diff;
    }
    return Array.from(byDay.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [productions, items, prodFilter]);

  // Totais (quando há produto filtrado)
  const totals = useMemo(() => {
    if (!prodFilter) return null;
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
  }, [days, prodFilter]);

  // Totais por produto (quando "Todos")
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
    return Array.from(map.values());
  }, [items, products, productsById]);

  function quickRange(k: '7d' | '30d' | 'month') {
    const now = new Date();
    let f = new Date();
    if (k === '7d') f.setDate(now.getDate() - 7);
    if (k === '30d') f.setDate(now.getDate() - 30);
    if (k === 'month') f = new Date(now.getFullYear(), now.getMonth(), 1);
    setFrom(toISODate(f));
    setTo(toISODate(now));
  }

  // Série do gráfico (produto filtrado)
  const chartSeries = useMemo(() => {
    if (!prodFilter || !items || !productions) return [];
    const perDay: Record<string, { produced: number; meta: number }> = {};
    for (const p of productions) {
      perDay[p.prod_date] = perDay[p.prod_date] || { produced: 0, meta: 0 };
    }
    for (const it of items) {
      if (it.product_id !== prodFilter) continue;
      const prod = productions.find((p) => p.id === it.production_id);
      if (!prod) continue;
      perDay[prod.prod_date].produced += it.produced;
      perDay[prod.prod_date].meta += it.meta;
    }
    return Object.entries(perDay)
      .map(([date, v]) => ({ label: date, produced: v.produced, meta: v.meta }))
      .sort((a, b) => (a.label < b.label ? 1 : -1));
  }, [items, productions, prodFilter]);

  // ===================== Export =====================
  const buildCsv = useCallback(() => {
    if (prodFilter) {
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
  }, [days, totalsPerProduct, prodFilter]);

  const buildJson = useCallback(() => {
    if (prodFilter) {
      return JSON.stringify(
        {
          filter_product: prodFilter,
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
  }, [days, totalsPerProduct, prodFilter]);

  const doExport = useCallback(async () => {
    try {
      const base = `relatorio_producao${prodFilter ? `_produto_${prodFilter}` : ''}_${toISODate(new Date())}`;
      const payload = exportFmt === 'csv' ? buildCsv() : buildJson();
      const title = `${base}.${exportFmt}`;
      // Share nativo (sem dependências)
      await Share.share({
        title,
        message: payload,
      });
      setExportOpen(false);
    } catch (e: any) {
      Alert.alert('Erro ao exportar', e?.message ?? 'Tente novamente.');
    }
  }, [exportFmt, buildCsv, buildJson, prodFilter]);

  // ===================== Header (função pura) =====================
  const renderHeader = useCallback(() => {
    return (
      <View style={{ gap: spacing.md }}>
        <Text style={typography.h1}>Relatório de Produções</Text>

        {/* Filtros com calendário */}
        <Card style={{ gap: spacing.sm }} padding="md" variant="tonal">
          <Text style={typography.h2}>Período</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <DateField label="De" value={from} onChange={setFrom} />
            </View>
            <View style={{ flex: 1 }}>
              <DateField label="Até" value={to} onChange={setTo} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' }}>
            <Text style={{ ...typography.label, color: colors.muted }}>Rápido:</Text>
            <Chip label="7 dias" onPress={() => quickRange('7d')} />
            <Chip label="30 dias" onPress={() => quickRange('30d')} />
            <Chip label="Este mês" onPress={() => quickRange('month')} />
          </View>
          <View style={{ marginTop: spacing.sm, flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Button title="Filtrar" small onPress={loadData} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Exportar" small variant="tonal" onPress={() => setExportOpen(true)} />
            </View>
          </View>
        </Card>

        {/* Filtro de produto */}
        <Card style={{ gap: spacing.sm }} padding="md" variant="tonal">
          <Text style={typography.h2}>Filtrar por produto</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            <Chip label="Todos" active={!prodFilter} onPress={() => setProdFilter(null)} />
            {(products || []).map((p) => (
              <Chip
                key={p.id}
                label={`${p.name} (${p.unit})`}
                active={prodFilter === p.id}
                onPress={() => setProdFilter(p.id)}
              />
            ))}
          </View>
        </Card>

        {/* Painel superior */}
        {totals ? (
          <>
            <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
              <KPI label="Abate total" value={totals.abate} />
              <KPI label="Produção total" value={fmt(totals.produced)} />
              <KPI label="Meta total" value={fmt(totals.meta)} />
              <KPI
                label="Perdas (dif.)"
                value={fmt(totals.diff)}
                status={totals.diff > 0 ? 'danger' : 'success'}
              />
              <KPI
                label="Cumprimento"
                value={`${Math.round((totals.produced / Math.max(1, totals.meta)) * 100)}%`}
                progress={Math.min(1, totals.produced / Math.max(1, totals.meta))}
                compact
              />
            </View>

            <Card padding="md" variant="filled" elevationLevel={1}>
              <Text style={typography.h2}>Evolução diária</Text>
              {chartSeries.length === 0 ? (
                <EmptyState title="Sem dados no período para este produto" compact />
              ) : (
                <BarsChart
                  data={chartSeries.map((d) => ({ label: d.label, produced: d.produced, meta: d.meta }))}
                  unit={productsById[prodFilter!]?.unit || 'UN'}
                  maxBars={12}
                />
              )}
            </Card>
          </>
        ) : (
          <View style={{ gap: spacing.sm }}>
            <Text style={typography.h2}>Totais por produto</Text>
            {!items ? (
              <Card><SkeletonList rows={1} /></Card>
            ) : totalsPerProduct.length === 0 ? (
              <EmptyState title="Sem dados no período" />
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {totalsPerProduct.map((r) => {
                  const prog = r.meta > 0 ? Math.min(1, r.produced / r.meta) : 0;
                  return (
                    <KPI
                      key={r.product_id}
                      label={`${r.name} (${r.unit})`}
                      value={`${fmt(r.produced)} / ${fmt(r.meta)}`}
                      progress={prog}
                      compact
                    />
                  );
                })}
              </View>
            )}
          </View>
        )}

        <Text style={typography.h2}>Por dia</Text>
      </View>
    );
  }, [
    spacing, typography, colors,
    from, to, products, prodFilter,
    totals, chartSeries, productsById,
    items, totalsPerProduct, loadData
  ]);

  if (!isAdmin) {
    return (
      <Screen padded>
        <Text style={{ color: colors.text }}>Acesso restrito.</Text>
      </Screen>
    );
  }

  return (
    // IMPORTANTE: o Screen aqui NÃO usa ScrollView
    <Screen padded scroll={false}>
      <FlatList
        data={days}
        keyExtractor={(i) => i.date}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          !productions || !items ? <SkeletonList rows={3} /> : <EmptyState title="Sem dados no período" />
        }
        renderItem={({ item }) => (
          <Card>
            <Text style={styles.date}>{item.date}</Text>
            <Text style={styles.row}>Abate: <Text style={styles.v}>{item.abate}</Text></Text>

            {prodFilter ? (
              <>
                <Text style={styles.row}>Produção: <Text style={styles.v}>{fmt(item.produced)}</Text></Text>
                <Text style={styles.row}>Meta: <Text style={styles.v}>{fmt(item.meta)}</Text></Text>
                <Text style={styles.row}>
                  Perdas (dif.):{' '}
                  <Text style={[styles.v, { color: item.diff > 0 ? colors.danger : colors.text }]}>
                    {fmt(item.diff)}
                  </Text>
                </Text>
              </>
            ) : (
              <Text style={[styles.row, styles.hint]}>Selecione um produto para ver metas e diferenças.</Text>
            )}
          </Card>
        )}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.xl,
          gap: spacing.sm,
        }}
      />

      {/* Export */}
      <Sheet
        visible={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Exportar dados"
        subtitle="Escolha o formato do arquivo"
      >
        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            <Chip label="CSV" active={exportFmt === 'csv'} onPress={() => setExportFmt('csv')} />
            <Chip label="JSON" active={exportFmt === 'json'} onPress={() => setExportFmt('json')} />
          </View>

          <Text style={{ color: colors.muted }}>
            {prodFilter
              ? 'Exporta a série diária do produto selecionado (produzido, meta, perdas).'
              : 'Exporta totais por produto no período (produzido, meta, perdas).'}
          </Text>

          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Button title="Cancelar" variant="text" onPress={() => setExportOpen(false)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Exportar" onPress={doExport} />
            </View>
          </View>
        </View>
      </Sheet>
    </Screen>
  );
}
