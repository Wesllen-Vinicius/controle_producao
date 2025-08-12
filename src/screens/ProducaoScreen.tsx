import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen';
import { Card, Input, Button, KPI, EmptyState } from '../components/ui';
import { supabase } from '../services/supabase';
import { useAuth } from '../state/AuthProvider';
import { useToast } from '../state/ToastProvider';
import { useHaptics } from '../hooks/useHaptics';
import ExpandableCard from '../components/ExpandableCard';
import SkeletonList from '../components/SkeletonList';
import DateRangePicker from '../components/DateRangePicker';
import { useTheme } from '../state/ThemeProvider';

type Product = { id: string; name: string; unit: 'UN' | 'KG'; meta_por_animal: number };
type Production = { id: string; prod_date: string; abate: number };
type ProductionItem = { id: string; product_id: string; produced: number; meta: number; diff: number; avg: number };

export default function ProducaoScreen() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const h = useHaptics();
  const { colors, spacing, typography } = useTheme();

  const [prodDate, setProdDate] = useState('');
  const [abateStr, setAbateStr] = useState('');
  const [products, setProducts] = useState<Product[] | null>(null);
  const [produced, setProduced] = useState<Record<string, string>>({});
  const abate = useMemo(() => parseInt(abateStr || '0', 10) || 0, [abateStr]);

  const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const [history, setHistory] = useState<Production[] | null>(null);
  const [itemsCache, setItemsCache] = useState<Record<string, ProductionItem[]>>({});
  const [saving, setSaving] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    prodTitle: { color: colors.text, fontWeight: '800' },
    unit: { color: colors.muted, fontWeight: '700' },
    row: { flexDirection: 'row', gap: spacing.sm },
    detail: { color: colors.text, fontSize: 13 },
  }), [colors, spacing]);

  const meta = (p: Product) => abate * (p.meta_por_animal || 0);
  const prodNum = (p: Product) => parseFloat(produced[p.id] || '0') || 0;
  const diff = (p: Product) => meta(p) - prodNum(p);
  const media = (p: Product) => (abate > 0 ? prodNum(p) / abate : 0);

  const fetchProducts = useCallback(async () => {
    const { data, error } = await supabase.from('products').select('id,name,unit,meta_por_animal').order('name');
    if (error) { Alert.alert('Erro', error.message); return; }
    setProducts((data as Product[]) || []);
  }, []);

  const fetchHistory = useCallback(async () => {
    setHistory(null);
    let q = supabase.from('productions').select('id,prod_date,abate').order('prod_date', { ascending: false }).limit(60);
    if (from) q = q.gte('prod_date', from);
    if (to) q = q.lte('prod_date', to);
    const { data, error } = await q;
    if (error) { Alert.alert('Erro', error.message); return; }
    setHistory((data as Production[]) || []);
  }, [from, to]);

  useEffect(() => { fetchProducts(); fetchHistory(); }, [fetchProducts, fetchHistory]);

  async function save() {
    if (!session) return Alert.alert('Login necessário');
    if (!prodDate || !abate) { h.warning(); return Alert.alert('Informe data e abate'); }
    setSaving(true);
    try {
      const { data: prod, error } = await supabase.from('productions')
        .insert({ author_id: session.user.id, prod_date: prodDate, abate })
        .select('id').single();
      if (error) throw error;
      const production_id = (prod as any).id as string;

      const items = (products || []).map((p) => ({
        production_id, product_id: p.id,
        produced: prodNum(p),
        meta: meta(p),
        diff: diff(p),
        avg: media(p),
      }));
      if (items.length) {
        const { error: e2 } = await supabase.from('production_items').insert(items);
        if (e2) throw e2;
      }
      const txs = (products || []).map((p) => ({
        product_id: p.id, quantity: prodNum(p), unit: p.unit,
        tx_type: 'entrada', created_by: session.user.id, source_production_id: production_id,
      }));
      if (txs.length) {
        const { error: e3 } = await supabase.from('inventory_transactions').insert(txs);
        if (e3) throw e3;
      }

      setProdDate(''); setAbateStr(''); setProduced({});
      await fetchHistory();
      h.success();
      showToast({
        type: 'success',
        message: 'Produção registrada.',
        actionLabel: 'Ver',
        onAction: () => {/* navegação para detalhes se quiser */},
      });
    } catch (e: any) {
      h.error();
      Alert.alert('Erro', e.message ?? 'Falha ao salvar');
    } finally {
      setSaving(false);
    }
  }

  async function loadItems(prodId: string) {
    if (itemsCache[prodId]) return;
    const { data, error } = await supabase.from('production_items').select('*').eq('production_id', prodId);
    if (!error) setItemsCache((s) => ({ ...s, [prodId]: (data as ProductionItem[]) || [] }));
  }

  function quickRange(k: '7d' | '30d' | 'month') {
    const now = new Date();
    let f = new Date();
    if (k === '7d') f.setDate(now.getDate() - 7);
    if (k === '30d') f.setDate(now.getDate() - 30);
    if (k === 'month') f = new Date(now.getFullYear(), now.getMonth(), 1);
    setFrom(f.toISOString().slice(0, 10));
    setTo(now.toISOString().slice(0, 10));
  }

  const Header = (
    <View style={{ gap: spacing.md }}>
      <Text style={typography.h1}>Produção</Text>
      <Card style={{ gap: spacing.sm }}>
        <Input value={prodDate} onChangeText={setProdDate} placeholder="Data (YYYY-MM-DD)" />
        <Input value={abateStr} onChangeText={setAbateStr} placeholder="Abate (animais)" keyboardType="numeric" />
      </Card>

      {products === null ? (
        <SkeletonList rows={3} height={120} />
      ) : (products || []).map((p) => (
        <Card key={p.id} style={{ gap: spacing.sm }}>
          <Text style={styles.prodTitle}>{p.name} <Text style={styles.unit}>({p.unit})</Text></Text>
          <Input
            value={produced[p.id] ?? ''}
            onChangeText={(t) => setProduced((s) => ({ ...s, [p.id]: t }))}
            placeholder="Produção do dia"
            keyboardType="numeric"
          />
          <View style={styles.row}>
            <KPI label="Meta" value={meta(p)} />
            <KPI label="Dif." value={diff(p)} />
            <KPI label="Média" value={media(p).toFixed(2)} />
          </View>
        </Card>
      ))}

      <Button title="Salvar" loading={saving} onPress={save} />

      <Text style={typography.h2}>Histórico</Text>
      <Card>
        <DateRangePicker from={from} to={to} onFrom={setFrom} onTo={setTo} onQuick={quickRange} />
        <View style={{ marginTop: spacing.sm }}>
          <Button title="Filtrar" small onPress={fetchHistory} />
        </View>
      </Card>
    </View>
  );

  return (
    <Screen padded>
      <FlatList
        data={history || []}
        keyExtractor={(i) => i.id}
        ListHeaderComponent={Header}
        ListEmptyComponent={history === null ? <SkeletonList rows={3} /> : <EmptyState title="Sem lançamentos" />}
        renderItem={({ item }) => (
          <ExpandableCard
            title={`${item.prod_date}`}
            subtitle={`Abate: ${item.abate}`}
            defaultOpen={false}
            style={{ marginTop: spacing.sm }}
          >
            <View style={{ gap: 6 }}>
              {itemsCache[item.id] ? (
                itemsCache[item.id].map((pi) => (
                  <Text key={pi.id} style={styles.detail}>
                    • {pi.product_id}: {pi.produced} — Meta {pi.meta} — Dif {pi.diff} — Média {pi.avg.toFixed(2)}
                  </Text>
                ))
              ) : (
                <Button title="Carregar detalhes" small onPress={() => loadItems(item.id)} />
              )}
            </View>
          </ExpandableCard>
        )}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
      />
    </Screen>
  );
}
