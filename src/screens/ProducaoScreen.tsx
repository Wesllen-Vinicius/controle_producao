import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Screen from '../components/Screen';
import { supabase } from '../services/supabase';
import { useAuth } from '../state/AuthProvider';
import { colors, spacing, typography } from '../theme';
import { Button, Card, Chip, EmptyState, Input, KPI, Skeleton } from '../components/ui';
import { useToast } from '../state/ToastProvider';
import { useNavigation } from '@react-navigation/native';

type Product = { id: string; name: string; unit: 'UN'|'KG'; meta_por_animal: number };
type Production = { id: string; prod_date: string; abate: number; author_id: string };
type ProductionItem = { id: string; production_id: string; product_id: string; produced: number; meta: number; diff: number; avg: number };

const toNum = (v: string) => {
  const n = parseFloat((v || '').replace(',', '.')); return Number.isFinite(n) ? n : 0;
};

export default function ProducaoScreen() {
  const { session } = useAuth();
  const nav = useNavigation<any>();
  const { showToast } = useToast();

  // form
  const [prodDate, setProdDate] = useState('');
  const [abate, setAbate] = useState('');
  const [products, setProducts] = useState<Product[] | null>(null);
  const [produced, setProduced] = useState<Record<string,string>>({});

  // histórico + filtros
  const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const [rows, setRows] = useState<(Production & { production_items: ProductionItem[] })[] | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const loadProducts = useCallback(async () => {
    const { data, error } = await supabase.from('products').select('*').order('name');
    if (error) Alert.alert('Erro', error.message);
    else setProducts((data as Product[]) || []);
  }, []);

  const metaByProduct = useMemo(()=>{
    const a = toNum(abate); const map: Record<string, number> = {};
    (products || []).forEach(p => { map[p.id] = a * p.meta_por_animal; });
    return map;
  }, [abate, products]);

  const loadRows = useCallback(async () => {
    setRows(null);
    let q = supabase.from('productions')
      .select('id, prod_date, abate, author_id, production_items(*)')
      .order('prod_date', { ascending: false }).limit(100);
    if (from) q = q.gte('prod_date', from);
    if (to)   q = q.lte('prod_date', to);
    const { data, error } = await q;
    if (error) Alert.alert('Erro', error.message);
    else setRows((data as any) || []);
  }, [from, to]);

  useEffect(() => { loadProducts(); loadRows(); }, [loadProducts, loadRows]);

  const save = async () => {
    if (!session) return Alert.alert('Login necessário');
    if (!prodDate || !abate) return Alert.alert('Informe data e abate');
    const a = Math.max(0, Math.floor(toNum(abate)));

    const { data: prod, error } = await supabase.from('productions')
      .insert({ prod_date: prodDate, abate: a, author_id: session.user.id } as any)
      .select().single();
    if (error || !prod) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); return Alert.alert('Erro', error?.message || 'Falha ao salvar'); }

    const items = (products || []).map(p => {
      let q = toNum(produced[p.id]); if (p.unit === 'UN') q = Math.floor(Math.max(0, q));
      const meta = metaByProduct[p.id] || 0;
      const diff = meta - q;
      const avg = a ? q / a : 0;
      return { production_id: prod.id, product_id: p.id, produced: q, meta, diff, avg } as Omit<ProductionItem,'id'>;
    });

    if (items.length) await supabase.from('production_items').insert(items as any);

    // entrada automática no estoque
    const entradas = items.filter(i => i.produced > 0).map(i => ({
      product_id: i.product_id,
      quantity: i.produced,
      unit: (products || []).find(p => p.id === i.product_id)?.unit || 'UN',
      tx_type: 'entrada',
      created_by: session.user.id,
      source_production_id: prod.id,
    }));
    if (entradas.length) await supabase.from('inventory_transactions').insert(entradas as any);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setProdDate(''); setAbate(''); setProduced({});
    showToast({
      type: 'success',
      message: 'Produção registrada.',
      actionLabel: 'Ver detalhes',
      onAction: () => nav.navigate('ProductionDetails', { id: prod.id }),
    });
    loadRows();
  };

  return (
    <Screen>
      <Text style={typography.h1 as any}>Produção</Text>

      {/* FORM */}
      <Card>
        <Input value={prodDate} onChangeText={setProdDate} placeholder="Data (YYYY-MM-DD)" />
        <Input value={abate} onChangeText={setAbate} placeholder="Abate (animais)" keyboardType="numeric" />

        {products === null && (
          <>
            <Skeleton height={44} />
            <Skeleton height={44} />
            <Skeleton height={44} />
          </>
        )}

        {products?.map(p => {
          const meta = metaByProduct[p.id] || 0;
          const q    = toNum(produced[p.id]);
          const dif  = meta - q;
          const avg  = toNum(abate) ? q / toNum(abate) : 0;

          return (
            <View key={p.id} style={styles.prodBox}>
              <Text style={styles.prodTitle}>{p.name} <Text style={{ color: colors.muted, fontWeight: '700' }}>({p.unit})</Text></Text>
              <Input
                value={produced[p.id] || ''}
                onChangeText={(v)=>setProduced(prev=>({ ...prev, [p.id]: v }))}
                placeholder="Produção do dia"
                keyboardType="numeric"
              />
              <View style={{ flexDirection: 'row' }}>
                <KPI label="Meta"  value={meta}/>
                <KPI label="Dif."  value={dif}/>
                <KPI label="Média" value={Number.isFinite(avg)? Number(avg.toFixed(2)) : 0}/>
              </View>
            </View>
          );
        })}

        <Button title="Salvar" onPress={save} />
      </Card>

      {/* FILTROS */}
      <Text style={[typography.h1 as any, { marginTop: spacing.md }]}>Histórico</Text>
      <Card>
        <Input value={from} onChangeText={setFrom} placeholder="De (YYYY-MM-DD)" />
        <Input value={to} onChangeText={setTo} placeholder="Até (YYYY-MM-DD)" />
        <Button title="Filtrar" small onPress={loadRows} />
      </Card>

      {/* LISTA */}
      {rows === null ? (
        <>
          <Skeleton height={80} radius={12} style={{ marginTop: 8 }} />
          <Skeleton height={80} radius={12} style={{ marginTop: 8 }} />
        </>
      ) : rows.length === 0 ? (
        <EmptyState title="Sem produções no período" />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(i)=>i.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({item})=>{
            const open = !!expanded[item.id];
            return (
              <Pressable style={styles.rowCard} onPress={()=>{
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setExpanded(prev=>({ ...prev, [item.id]: !open }));
              }}>
                <Text style={styles.rowTitle}>{item.prod_date} • Abate: {item.abate}</Text>
                {!open && <Text style={styles.rowHint}>Toque para ver detalhes</Text>}
                {open && (
                  <View style={{ marginTop: 8, gap: 6 }}>
                    {item.production_items?.map(pi=>{
                      const p = products?.find(x=>x.id===pi.product_id);
                      return (
                        <Text key={pi.id} style={styles.rowLine}>
                          {p?.name}: {pi.produced} {p?.unit} • Meta {pi.meta} • Dif {pi.diff} • Média {pi.avg.toFixed(2)}
                        </Text>
                      );
                    })}
                    <Button title="Abrir modal" small onPress={()=>nav.navigate('ProductionDetails', { id: item.id })} />
                  </View>
                )}
              </Pressable>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  prodBox:{ backgroundColor: colors.surface, borderRadius:10, borderColor: colors.line, borderWidth:1, padding: 10, marginTop: 8 },
  prodTitle:{ color: '#fff', fontWeight: '700', marginBottom: 6 },
  rowCard:{ backgroundColor: colors.surface, borderRadius:12, borderColor: colors.line, borderWidth:1, padding: 12, marginTop: 8 },
  rowTitle:{ color:'#fff', fontWeight:'700' },
  rowHint:{ color: colors.accent, marginTop: 6, fontSize: 12 },
  rowLine:{ color:'#E6E8EA', fontSize: 13 },
});
