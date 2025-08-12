import React, { useCallback, useEffect, useState } from 'react';
import Screen from '../components/Screen';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '../services/supabase';
import { useAuth } from '../state/AuthProvider';
import { colors, spacing, typography } from '../theme';
import { Button, Card, Chip, EmptyState, Input, Skeleton } from '../components/ui';
import { useToast } from '../state/ToastProvider';
import { useNavigation } from '@react-navigation/native';

type Product = { id: string; name: string; unit: 'UN'|'KG' };
type BalanceRow = { product_id: string; saldo: number; updated_at: string; products: Product };
type Tx = { id: string; product_id: string; quantity: number; unit: string; tx_type: string; created_at: string; source_production_id: string|null };

const toNum = (v: string) => { const n = parseFloat((v || '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };

export default function EstoqueScreen() {
  const { session } = useAuth();
  const nav = useNavigation<any>();
  const { showToast } = useToast();

  const [products, setProducts] = useState<Product[] | null>(null);
  const [balances, setBalances] = useState<BalanceRow[] | null>(null);
  const [txs, setTxs] = useState<Tx[] | null>(null);

  // filtros
  const [filterProduct, setFilterProduct] = useState<string|undefined>();
  const [filterType, setFilterType] = useState<'entrada'|'saida'|'ajuste'|'transferencia'|'venda'|undefined>();
  const [from, setFrom] = useState(''); const [to, setTo] = useState('');

  // lançamento
  const [selProduct, setSelProduct] = useState<string|undefined>();
  const [kind, setKind] = useState<'entrada'|'saida'|'ajuste'|'transferencia'|'venda'>('saida');
  const [qty, setQty] = useState('');

  const loadProducts = useCallback(async () => {
    const { data } = await supabase.from('products').select('id,name,unit').order('name');
    setProducts((data as Product[]) || []);
  }, []);

  const loadBalances = useCallback(async () => {
    const { data, error } = await supabase.from('inventory_balances').select('product_id, saldo, updated_at, products ( id, name, unit )');
    if (error) console.warn(error.message);
    setBalances((data as any) || []);
  }, []);

  const loadTxs = useCallback(async () => {
    setTxs(null);
    let q = supabase.from('inventory_transactions').select('*').order('created_at', { ascending: false }).limit(200);
    if (filterProduct) q = q.eq('product_id', filterProduct);
    if (filterType)   q = q.eq('tx_type', filterType);
    if (from)         q = q.gte('created_at', from);
    if (to)           q = q.lte('created_at', to);
    const { data, error } = await q;
    if (error) console.warn(error.message);
    setTxs((data as Tx[]) || []);
  }, [filterProduct, filterType, from, to]);

  useEffect(()=>{ loadProducts(); loadBalances(); }, [loadProducts, loadBalances]);
  useEffect(()=>{ loadTxs(); }, [loadTxs]);

  async function addTx() {
    if (!session) return;
    const product_id = selProduct; let quantity = toNum(qty);
    if (!product_id || !quantity) return;

    const unit = (products || []).find(p=>p.id===product_id)?.unit || 'UN';
    if (unit === 'UN') quantity = Math.floor(Math.max(0, quantity));

    // otimista
    const optimistic: Tx = { id: 'tmp-'+Date.now(), product_id, quantity, unit, tx_type: kind, created_at: new Date().toISOString(), source_production_id: null };
    setTxs(prev => [optimistic, ...(prev || [])]);
    setQty(undefined as any); setQty('');

    try {
      const { data, error } = await supabase.from('inventory_transactions').insert({
        product_id, quantity, unit, tx_type: kind, created_by: session.user.id, source_production_id: null
      } as any).select().single();
      if (error) throw new Error(error.message);

      // substitui otimista pelo real
      setTxs(prev => (prev || []).map(t => t.id === optimistic.id ? data as any : t));
      showToast({
        type: 'success',
        message: 'Movimentação registrada.',
        actionLabel: 'Desfazer',
        onAction: async () => {
          // apaga o registro real
          await supabase.from('inventory_transactions').delete().eq('id', (data as any).id);
          loadBalances(); loadTxs();
        },
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      loadBalances();
    } catch (e:any) {
      // reverte otimista
      setTxs(prev => (prev || []).filter(t => t.id !== optimistic.id));
      showToast({ type: 'error', message: e.message || 'Erro ao registrar' });
    }
  }

  return (
    <Screen>
      <Text style={typography.h1 as any}>Estoque</Text>

      {/* DASHBOARD: saldos */}
      {balances === null ? (
        <View style={styles.cards}>
          <Skeleton height={86} radius={12} style={{ width: '48%' }} />
          <Skeleton height={86} radius={12} style={{ width: '48%' }} />
        </View>
      ) : balances.length === 0 ? (
        <EmptyState title="Sem saldos ainda" />
      ) : (
        <View style={styles.cards}>
          {balances.map(b=>{
            const p = b.products;
            return (
              <Card key={b.product_id} style={{ minWidth: '48%', flexGrow: 1 }}>
                <Text style={{ color: colors.muted, fontWeight: '700' }}>{p.name}</Text>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 20, marginTop: 4 }}>{b.saldo} {p.unit}</Text>
                <Text style={{ color: '#74808A', marginTop: 4, fontSize: 12 }}>Atualizado: {new Date(b.updated_at).toLocaleDateString()}</Text>
              </Card>
            );
          })}
        </View>
      )}

      {/* MOVIMENTAÇÃO MANUAL */}
      <Text style={[typography.h1 as any, { marginTop: spacing.md }]}>Movimentar</Text>
      <Card>
        <View style={{ flexDirection:'row', flexWrap:'wrap' }}>
          {(products || []).map(p => <Chip key={p.id} label={p.name} active={selProduct === p.id} onPress={()=>setSelProduct(p.id)} />)}
        </View>
        <View style={{ flexDirection:'row', flexWrap:'wrap' }}>
          {(['entrada','saida','ajuste','transferencia','venda'] as const).map(t => (
            <Chip key={t} label={t === 'entrada' ? 'carregamento' : t} active={filterType===t && kind===t ? true : kind===t} onPress={()=>setKind(t)} />
          ))}
        </View>
        <View style={{ flexDirection:'row', gap: 8 }}>
          <Input value={qty} onChangeText={setQty} placeholder="Quantidade" keyboardType="numeric" style={{ flex: 1 }} />
          <Button title="Registrar" small onPress={addTx} />
        </View>
      </Card>

      {/* FILTROS HISTÓRICO */}
      <Text style={[typography.h1 as any, { marginTop: spacing.md }]}>Histórico</Text>
      <Card>
        <View style={{ flexDirection:'row', flexWrap:'wrap' }}>
          {(products || []).map(p => <Chip key={p.id} label={p.name} active={filterProduct === p.id} onPress={()=>setFilterProduct(filterProduct===p.id?undefined:p.id)} />)}
        </View>
        <View style={{ flexDirection:'row', flexWrap:'wrap' }}>
          {(['entrada','saida','ajuste','transferencia','venda'] as const).map(t => <Chip key={t} label={t==='entrada'?'carregamento':t} active={filterType===t} onPress={()=>setFilterType(filterType===t?undefined:t)} />)}
        </View>
        <View style={{ flexDirection:'row', gap: 8 }}>
          <Input value={from} onChangeText={setFrom} placeholder="De (YYYY-MM-DD)" style={{ flex: 1 }} />
          <Input value={to}   onChangeText={setTo}   placeholder="Até (YYYY-MM-DD)" style={{ flex: 1 }} />
          <Button title="Filtrar" small onPress={loadTxs} />
        </View>
      </Card>

      {/* LISTA */}
      {txs === null ? (
        <>
          <Skeleton height={80} radius={12} style={{ marginTop: 8 }} />
          <Skeleton height={80} radius={12} style={{ marginTop: 8 }} />
        </>
      ) : txs.length === 0 ? (
        <EmptyState title="Nenhuma movimentação" />
      ) : (
        <FlatList
          data={txs}
          keyExtractor={(i)=>i.id}
          contentContainerStyle={{ paddingBottom: 28 }}
          renderItem={({item})=>{
            const p = (products || []).find(pp=>pp.id===item.product_id);
            return (
              <Card style={{ marginTop: 8 }}>
                <Text style={{ color:'#fff', fontWeight:'700' }}>
                  {(item.tx_type === 'entrada' ? 'CARREGAMENTO' : item.tx_type.toUpperCase())} • {p?.name} • {item.quantity}{p?.unit}
                </Text>
                <Text style={{ color: colors.muted, marginTop: 2, fontSize: 12 }}>{new Date(item.created_at).toLocaleString()}</Text>
                {item.source_production_id ? <Text style={{ color: colors.muted, marginTop: 2, fontSize: 12 }}>Origem: Produção</Text> : null}
                <Button title="Abrir modal" small onPress={()=>nav.navigate('TransactionDetails', { id: item.id })} />
              </Card>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cards:{ flexDirection:'row', flexWrap:'wrap', gap: 8 },
});
