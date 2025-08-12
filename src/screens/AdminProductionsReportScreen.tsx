import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen';
import { Card, Chip, Button, EmptyState, KPI } from '../components/ui';
import { supabase } from '../services/supabase';
import { useAuth } from '../state/AuthProvider';
import DateRangePicker from '../components/DateRangePicker';
import SkeletonList from '../components/SkeletonList';
import { useTheme } from '../state/ThemeProvider';

type Product = { id: string; name: string; unit: 'UN'|'KG' };
type Production = { id: string; prod_date: string; abate: number };
type Item = { id: string; production_id: string; product_id: string; produced: number; meta: number; diff: number; avg: number };

type DayTotals = { date: string; abate: number; produced: number; meta: number; diff: number };

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

  const styles = useMemo(
    () =>
      StyleSheet.create({
        date: { color: colors.text, fontWeight: '900', fontSize: 16, marginBottom: 6 },
        row: { color: colors.text, marginTop: 2 },
        v: { fontWeight: '800', color: colors.text },
      }),
    [colors]
  );

  const loadProducts = useCallback(async () => {
    const { data, error } = await supabase.from('products').select('id,name,unit').order('name');
    if (error) { Alert.alert('Erro', error.message); return; }
    setProducts((data as Product[]) || []);
  }, []);

  const loadData = useCallback(async () => {
    setProductions(null); setItems(null);
    // 1) produções no período
    let q = supabase.from('productions').select('id,prod_date,abate').order('prod_date', { ascending: false }).limit(200);
    if (from) q = q.gte('prod_date', from);
    if (to) q = q.lte('prod_date', to);
    const { data: prods, error: e1 } = await q;
    if (e1) { Alert.alert('Erro', e1.message); return; }
    const list = (prods as Production[]) || [];
    setProductions(list);

    if (list.length === 0) { setItems([]); return; }

    // 2) itens das produções encontradas
    const ids = list.map(p => p.id);
    const { data: its, error: e2 } = await supabase
      .from('production_items')
      .select('id,production_id,product_id,produced,meta,diff,avg')
      .in('production_id', ids);
    if (e2) { Alert.alert('Erro', e2.message); return; }
    setItems((its as Item[]) || []);
  }, [from, to]);

  useEffect(() => { if (isAdmin) { loadProducts(); loadData(); } }, [isAdmin]); // initial

  const productsById = useMemo(() => {
    const map: Record<string, Product> = {};
    (products || []).forEach(p => (map[p.id] = p));
    return map;
  }, [products]);

  // agregação por dia
  const days: DayTotals[] = useMemo(() => {
    if (!productions || !items) return [];
    const byDay = new Map<string, DayTotals>();
    const filtered = prodFilter ? items.filter(i => i.product_id === prodFilter) : items;

    for (const p of productions) {
      if (!byDay.has(p.prod_date)) {
        byDay.set(p.prod_date, { date: p.prod_date, abate: 0, produced: 0, meta: 0, diff: 0 });
      }
    }
    for (const it of filtered) {
      const prod = productions.find(p => p.id === it.production_id);
      if (!prod) continue;
      const row = byDay.get(prod.prod_date)!;
      row.abate += prod.abate;
      row.produced += it.produced;
      row.meta += it.meta;
      row.diff += it.diff;
    }
    return Array.from(byDay.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [productions, items, prodFilter]);

  const totals = useMemo(() => {
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
  }, [days]);

  function quickRange(k: '7d'|'30d'|'month') {
    const now = new Date();
    let f = new Date();
    if (k === '7d') f.setDate(now.getDate() - 7);
    if (k === '30d') f.setDate(now.getDate() - 30);
    if (k === 'month') f = new Date(now.getFullYear(), now.getMonth(), 1);
    setFrom(f.toISOString().slice(0, 10));
    setTo(now.toISOString().slice(0, 10));
  }

  if (!isAdmin) {
    return (
      <Screen padded>
        <Text style={{ color: colors.text }}>Acesso restrito.</Text>
      </Screen>
    );
  }

  const Header = (
    <View style={{ gap: spacing.md }}>
      <Text style={typography.h1}>Relatório de Produções</Text>

      <Card style={{ gap: spacing.sm }}>
        <DateRangePicker from={from} to={to} onFrom={setFrom} onTo={setTo} onQuick={quickRange} />
        <View style={{ marginTop: spacing.sm }}>
          <Button title="Filtrar" small onPress={loadData} />
        </View>
      </Card>

      <Card style={{ gap: spacing.sm }}>
        <Text style={typography.h2}>Filtrar por produto</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <Chip label="Todos" active={!prodFilter} onPress={() => setProdFilter(null)} />
          {(products || []).map(p => (
            <Chip key={p.id} label={`${p.name} (${p.unit})`} active={prodFilter === p.id} onPress={() => setProdFilter(p.id)} />
          ))}
        </View>
      </Card>

      <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
        <KPI label="Abate total" value={totals.abate} />
        <KPI label="Produção total" value={totals.produced.toFixed(2)} />
        <KPI label="Meta total" value={totals.meta.toFixed(2)} />
        <KPI label="Perdas (dif.)" value={totals.diff.toFixed(2)} />
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <View style={{ flex: 1 }} />
        <View style={{ width: 160 }}>
          <Button title="Exportar CSV (em breve)" disabled />
        </View>
      </View>

      <Text style={typography.h2}>Por dia</Text>
    </View>
  );

  return (
    <Screen padded>
      <FlatList
        data={days}
        keyExtractor={(i) => i.date}
        ListHeaderComponent={
          <>
            {!products ? <Card><SkeletonList rows={1} /></Card> : null}
            {!productions ? <Card><SkeletonList rows={2} /></Card> : null}
            {!items ? <Card><SkeletonList rows={2} /></Card> : null}
            {Header}
          </>
        }
        ListEmptyComponent={
          !productions || !items ? <SkeletonList rows={3} /> : <EmptyState title="Sem dados no período" />
        }
        renderItem={({ item }) => (
          <Card>
            <Text style={styles.date}>{item.date}</Text>
            <Text style={styles.row}>Abate: <Text style={styles.v}>{item.abate}</Text></Text>
            <Text style={styles.row}>Produção total: <Text style={styles.v}>{item.produced.toFixed(2)}</Text></Text>
            <Text style={styles.row}>Meta total: <Text style={styles.v}>{item.meta.toFixed(2)}</Text></Text>
            <Text style={styles.row}>Perdas (dif.): <Text style={styles.v}>{item.diff.toFixed(2)}</Text></Text>
          </Card>
        )}
        contentContainerStyle={{ paddingBottom: spacing.xl, gap: spacing.sm }}
      />
    </Screen>
  );
}
