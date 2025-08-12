import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen';
import { Card, Chip, Input, Button, KPI, EmptyState } from '../components/ui';
import { supabase } from '../services/supabase';
import { useAuth } from '../state/AuthProvider';
import { useToast } from '../state/ToastProvider';
import { useHaptics } from '../hooks/useHaptics';
import SkeletonList from '../components/SkeletonList';
import DateRangePicker from '../components/DateRangePicker';
import { useTheme } from '../state/ThemeProvider';

type Product = { id: string; name: string; unit: 'UN' | 'KG' };
type Balance = { product_id: string; saldo: number; updated_at: string; name?: string | null; unit?: string | null };
type Tx = { id: string; product_id: string; quantity: number; unit: string; tx_type: string; created_at: string; source_production_id: string | null };

export default function EstoqueScreen() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const h = useHaptics();
  const { colors, spacing, typography } = useTheme();

  const [products, setProducts] = useState<Product[] | null>(null);
  const [balances, setBalances] = useState<Balance[] | null>(null);
  const [txs, setTxs] = useState<Tx[] | null>(null);

  const [selProd, setSelProd] = useState<string | null>(null);
  const [selType, setSelType] = useState<'carregamento'|'saida'|'ajuste'|'transferencia'|'venda'>('saida');
  const [qty, setQty] = useState<string>('');
  const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const [filterType, setFilterType] = useState<'entrada'|'saida'|'ajuste'|'transferencia'|'venda'|undefined>();

  const styles = useMemo(() => StyleSheet.create({
    rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    txTitle: { color: colors.text, fontWeight: '800' as const },
    txSub: { color: colors.muted, marginTop: 4, fontSize: 12 },
  }), [colors, spacing]);

  const loadProducts = useCallback(async () => {
    const { data, error } = await supabase.from('products').select('id,name,unit').order('name');
    if (error) { Alert.alert('Erro', error.message); return; }
    setProducts((data as Product[]) || []);
  }, []);

  const loadBalances = useCallback(async () => {
    const { data, error } = await supabase.from('inventory_balances').select('product_id,saldo,updated_at');
    if (error) { Alert.alert('Erro', error.message); return; }
    const prods = (products || []) as Product[];
    const byId = new Map(prods.map(p => [p.id, p]));
    const enriched: Balance[] = ((data as any) || []).map((b: any) => ({
      product_id: b.product_id,
      saldo: b.saldo,
      updated_at: b.updated_at,
      name: byId.get(b.product_id)?.name ?? null,
      unit: byId.get(b.product_id)?.unit ?? null,
    }));
    setBalances(enriched);
  }, [products]);

  const loadTxs = useCallback(async () => {
    setTxs(null);
    let q = supabase.from('inventory_transactions').select('id,product_id,quantity,unit,tx_type,created_at,source_production_id')
      .order('created_at', { ascending: false }).limit(120);
    if (selProd) q = q.eq('product_id', selProd);
    if (filterType) q = q.eq('tx_type', filterType);
    if (from) q = q.gte('created_at', from);
    if (to) q = q.lte('created_at', to);
    const { data, error } = await q;
    if (error) { Alert.alert('Erro', error.message); return; }
    setTxs((data as Tx[]) || []);
  }, [selProd, filterType, from, to]);

  useEffect(() => { loadProducts(); }, [loadProducts]);
  useEffect(() => { if (products) loadBalances(); }, [products, loadBalances]);
  useEffect(() => { loadTxs(); }, [loadTxs]);

  async function addTx() {
    if (!session) return Alert.alert('Login necessário');
    if (!selProd) { h.warning(); return Alert.alert('Selecione um produto'); }
    const q = parseFloat(qty || '0'); if (!q) { h.warning(); return; }
    const unit = (products || []).find(p => p.id === selProd)?.unit || 'UN';

    // Otimista
    const optimistic: Tx = {
      id: 'tmp-' + Date.now(), product_id: selProd, quantity: q, unit,
      tx_type: selType === 'carregamento' ? 'entrada' : selType, created_at: new Date().toISOString(), source_production_id: null
    };
    setTxs(prev => [optimistic, ...(prev || [])]);
    setQty('');

    try {
      const { data, error } = await supabase.from('inventory_transactions').insert({
        product_id: optimistic.product_id,
        quantity: optimistic.quantity,
        unit: optimistic.unit,
        tx_type: optimistic.tx_type,
        created_by: session.user.id,
        source_production_id: null
      } as any).select().single();
      if (error) throw error;

      const real = data as Tx;
      setTxs(prev => (prev || []).map(t => t.id === optimistic.id ? real : t));
      h.success();
      showToast({
        type: 'success',
        message: 'Movimentação registrada.',
        actionLabel: 'Desfazer',
        onAction: async () => {
          await supabase.from('inventory_transactions').delete().eq('id', real.id);
          await loadBalances(); await loadTxs();
        }
      });
      await loadBalances();
    } catch (e: any) {
      h.error();
      setTxs(prev => (prev || []).filter(t => t.id !== optimistic.id));
      Alert.alert('Erro', e.message ?? 'Falha ao registrar');
    }
  }

  function quickRange(k: '7d'|'30d'|'month') {
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
      <Text style={typography.h1}>Estoque</Text>

      {balances === null ? (
        <SkeletonList rows={2} height={70} />
      ) : balances.length === 0 ? (
        <EmptyState title="Sem saldos ainda" />
      ) : (
        <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
          {balances.map(b => (
            <KPI key={b.product_id} label={`${b.name ?? 'Produto'}${b.unit ? ` (${b.unit})` : ''}`} value={b.saldo} />
          ))}
        </View>
      )}

      <Text style={typography.h2}>Movimentar</Text>
      <Card style={{ gap: spacing.sm }}>
        <View style={styles.rowWrap}>
          {(products || []).map(p => (
            <Chip key={p.id} label={p.name} active={selProd === p.id} onPress={() => (setSelProd(p.id), h.tap())} />
          ))}
        </View>
        <View style={styles.rowWrap}>
          {(['carregamento','saida','ajuste','transferencia','venda'] as const).map(t => (
            <Chip key={t} label={t} active={selType === t} onPress={() => (setSelType(t), h.tap())} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Input value={qty} onChangeText={setQty} placeholder="Quantidade" keyboardType="numeric" />
          </View>
          <View style={{ width: 140 }}>
            <Button title="Registrar" onPress={addTx} />
          </View>
        </View>
      </Card>

      <Text style={typography.h2}>Histórico</Text>
      <Card style={{ gap: spacing.sm }}>
        <View style={styles.rowWrap}>
          <Chip label="Todos" active={!filterType} onPress={() => (setFilterType(undefined), h.tap())} />
          {(['entrada','saida','ajuste','transferencia','venda'] as const).map(t => (
            <Chip key={t} label={t} active={filterType === t} onPress={() => (setFilterType(t), h.tap())} />
          ))}
        </View>
        <DateRangePicker from={from} to={to} onFrom={setFrom} onTo={setTo} onQuick={quickRange} />
        <Button title="Filtrar" small onPress={loadTxs} />
      </Card>

      <Text style={typography.h2}>Movimentos</Text>
    </View>
  );

  return (
    <Screen padded>
      <FlatList
        data={txs || []}
        keyExtractor={(i) => i.id}
        ListHeaderComponent={Header}
        ListEmptyComponent={txs === null ? <SkeletonList rows={3} /> : <EmptyState title="Nenhuma movimentação" />}
        renderItem={({ item }) => {
          const prod = (products || []).find(p => p.id === item.product_id);
          return (
            <Card>
              <Text style={styles.txTitle}>
                {(item.tx_type === 'entrada' ? 'CARREGAMENTO' : item.tx_type.toUpperCase())}
                {' • '}{prod?.name ?? 'Produto'} • {item.quantity}{item.unit}
              </Text>
              <Text style={styles.txSub}>{new Date(item.created_at).toLocaleString()}</Text>
              {item.source_production_id && <Text style={styles.txSub}>Origem: Produção</Text>}
            </Card>
          );
        }}
        contentContainerStyle={{ paddingBottom: spacing.xl, gap: spacing.sm }}
      />
    </Screen>
  );
}
