import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen';

// UI kit
import Card from '../components/ui/Card';
import Chip from '../components/ui/Chip';
import Button from '../components/ui/Button';
import KPI from '../components/ui/KPI';
import Input, { InputNumber } from '../components/ui/Input';
import BottomSheet from '../components/ui/BottomSheet';
import EmptyState from '../components/ui/EmptyState';

import { supabase } from '../services/supabase';
import { useAuth } from '../state/AuthProvider';
import { useToast } from '../state/ToastProvider';
import { useHaptics } from '../hooks/useHaptics';
import SkeletonList from '../components/SkeletonList';
import { useTheme } from '../state/ThemeProvider';

import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

type Unit = 'UN' | 'KG' | string;
type Product = { id: string; name: string; unit: Unit };
type Balance = { product_id: string; saldo: number; updated_at: string; name?: string | null; unit?: string | null };
type Tx = {
  id: string;
  product_id: string;
  quantity: number;
  unit: string;
  tx_type: 'entrada' | 'saida' | 'ajuste' | 'transferencia' | 'venda';
  created_at: string;
  source_production_id: string | null;
};

/* ===== helpers de data (iguais à Produção) ===== */
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

/** Campo de Data com aparência de Input que abre o calendário nativo */
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

export default function EstoqueScreen() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const h = useHaptics();
  const { colors, spacing, typography } = useTheme();

  const [products, setProducts] = useState<Product[] | null>(null);
  const [balances, setBalances] = useState<Balance[] | null>(null);
  const [txs, setTxs] = useState<Tx[] | null>(null);

  // filtros
  const [selProd, setSelProd] = useState<string | null>(null);
  const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const [filterType, setFilterType] = useState<Tx['tx_type'] | undefined>();

  // bottom sheet: movimentação manual
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mvProd, setMvProd] = useState<string | null>(null);
  const [mvType, setMvType] = useState<Tx['tx_type']>('saida');
  const [mvQty, setMvQty] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    txTitle: { color: colors.text, fontWeight: '800' as const },
    txSub: { color: colors.muted, marginTop: 4, fontSize: 12 },
  }), [colors, spacing]);

  // helpers
  const prodsById = useMemo(() => {
    const map = new Map<string, Product>();
    (products || []).forEach(p => map.set(p.id, p));
    return map;
  }, [products]);

  const mvProdUnit: Unit | null = mvProd ? (prodsById.get(mvProd)?.unit ?? null) : null;
  const mvIsInteger = (mvProdUnit || '').toUpperCase() === 'UN';

  const loadProducts = useCallback(async () => {
    const { data, error } = await supabase.from('products').select('id,name,unit').order('name');
    if (error) { Alert.alert('Erro', error.message); return; }
    const list = (data as Product[]) || [];
    setProducts(list);
    setSelProd(prev => (prev && list.some(p => p.id === prev) ? prev : null));
    setMvProd(prev => (prev && list.some(p => p.id === prev) ? prev : null));
  }, []);

  const loadBalances = useCallback(async () => {
    const { data, error } = await supabase.from('inventory_balances').select('product_id,saldo,updated_at');
    if (error) { Alert.alert('Erro', error.message); return; }
    const list = (data as any[]) || [];
    const byId = new Map((products || []).map(p => [p.id, p]));
    const enriched: Balance[] = list.map(b => ({
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
    let q = supabase
      .from('inventory_transactions')
      .select('id,product_id,quantity,unit,tx_type,created_at,source_production_id')
      .order('created_at', { ascending: false })
      .limit(120);

    if (selProd) q = q.eq('product_id', selProd);
    if (filterType) {
      // “venda” deve mostrar tanto venda quanto saída (mapeamento legado)
      if (filterType === 'venda') q = q.in('tx_type', ['venda', 'saida'] as any);
      else q = q.eq('tx_type', filterType);
    }
    if (from) q = q.gte('created_at', from);
    if (to) q = q.lte('created_at', to);

    const { data, error } = await q;
    if (error) { Alert.alert('Erro', error.message); return; }
    setTxs((data as Tx[]) || []);
  }, [selProd, filterType, from, to]);

  useEffect(() => { loadProducts(); }, [loadProducts]);
  useEffect(() => { if (products) loadBalances(); }, [products, loadBalances]);
  useEffect(() => { loadTxs(); }, [loadTxs]);

  function openMoveSheet() {
    setMvProd(selProd ?? (products && products[0]?.id) ?? null);
    setMvType('saida');
    setMvQty('');
    setSheetOpen(true);
  }
  function closeMoveSheet() { setSheetOpen(false); }

  async function addTx() {
    if (!session) return Alert.alert('Login necessário');
    if (!mvProd) { h.warning(); return Alert.alert('Selecione um produto'); }
    const q = parseFloat(mvQty || '0'); if (!q) { h.warning(); return Alert.alert('Informe a quantidade'); }

    const unit = prodsById.get(mvProd)?.unit || 'UN';

    // >>>>>>> CORREÇÃO: mapear 'venda' → 'saida' (para afetar o saldo na VIEW)
    const txTypeToPersist: Tx['tx_type'] = mvType === 'venda' ? 'saida' : mvType;

    setSaving(true);

    // otimista
    const optimistic: Tx = {
      id: 'tmp-' + Date.now(),
      product_id: mvProd,
      quantity: q,
      unit,
      tx_type: txTypeToPersist,
      created_at: new Date().toISOString(),
      source_production_id: null,
    };
    setTxs(prev => [optimistic, ...(prev || [])]);

    try {
      const { data, error } = await supabase.from('inventory_transactions').insert({
        product_id: optimistic.product_id,
        quantity: optimistic.quantity,
        unit: optimistic.unit,
        tx_type: optimistic.tx_type,
        created_by: session.user.id,
        source_production_id: null,
      } as any).select().single();
      if (error) throw error;

      const real = data as Tx;
      setTxs(prev => (prev || []).map(t => t.id === optimistic.id ? real : t));
      await loadBalances();
      closeMoveSheet();

      h.success();
      showToast?.({
        type: 'success',
        message: 'Movimentação registrada.',
        actionLabel: 'Desfazer',
        onAction: async () => {
          await supabase.from('inventory_transactions').delete().eq('id', real.id);
          await loadBalances(); await loadTxs();
        },
      });
    } catch (e: any) {
      h.error();
      setTxs(prev => (prev || []).filter(t => t.id !== optimistic.id));
      Alert.alert('Erro', e.message ?? 'Falha ao registrar');
    } finally {
      setSaving(false);
    }
  }

  function quickRange(k: '7d'|'30d'|'month') {
    const now = new Date();
    let f = new Date();
    if (k === '7d') f.setDate(now.getDate() - 7);
    if (k === '30d') f.setDate(now.getDate() - 30);
    if (k === 'month') f = new Date(now.getFullYear(), now.getMonth(), 1);
    setFrom(toISODate(f));
    setTo(toISODate(now));
  }

  const Header = (
    <View style={{ gap: spacing.md }}>
      <Text style={typography.h1}>Estoque</Text>

      {/* KPIs de saldo por produto */}
      {balances === null ? (
        <SkeletonList rows={2} height={70} />
      ) : balances.length === 0 ? (
        <EmptyState title="Sem saldos ainda" />
      ) : (
        <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
          {balances.map(b => (
            <KPI
              key={b.product_id}
              label={`${b.name ?? 'Produto'}${b.unit ? ` (${b.unit})` : ''}`}
              value={b.saldo}
              status={b.saldo < 0 ? 'danger' : 'default'}
              hint={`Atualizado: ${new Date(b.updated_at).toLocaleDateString()}`}
            />
          ))}
        </View>
      )}

      {/* CTA acima dos filtros (não quebra layout) */}
      <View style={{ alignSelf: 'stretch' }}>
        <Button title="Movimentar" onPress={openMoveSheet} />
      </View>

      {/* Filtros */}
      <Card padding="md" variant="tonal" elevationLevel={0}>
        <Text style={typography.h2}>Filtros</Text>

        <View style={[styles.rowWrap, { marginTop: spacing.sm }]}>
          <Chip label="Todos" active={!selProd} onPress={() => (setSelProd(null), h.tap())} />
          {(products || []).map(p => (
            <Chip key={p.id} label={p.name} active={selProd === p.id} onPress={() => (setSelProd(p.id), h.tap())} />
          ))}
        </View>

        <View style={[styles.rowWrap, { marginTop: spacing.sm }]}>
          <Chip label="Todos" active={!filterType} onPress={() => (setFilterType(undefined), h.tap())} />
          {(['entrada','saida','ajuste','transferencia','venda'] as const).map(t => (
            <Chip key={t} label={t} active={filterType === t} onPress={() => (setFilterType(t), h.tap())} />
          ))}
        </View>

        {/* De/Até com calendário */}
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <DateField label="De" value={from} onChange={setFrom} />
          </View>
          <View style={{ flex: 1 }}>
            <DateField label="Até" value={to} onChange={setTo} />
          </View>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm, alignItems: 'center' }}>
          <Text style={[typography.label, { color: colors.muted }]}>Rápido:</Text>
          <Chip label="7 dias" onPress={() => quickRange('7d')} />
          <Chip label="30 dias" onPress={() => quickRange('30d')} />
          <Chip label="Este mês" onPress={() => quickRange('month')} />
        </View>

        <View style={{ marginTop: spacing.sm }}>
          <Button title="Aplicar" small onPress={loadTxs} />
        </View>
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
          const title = (item.tx_type === 'entrada' ? 'CARREGAMENTO' : item.tx_type.toUpperCase());
          return (
            <Card>
              <Text style={styles.txTitle}>
                {title}{' • '}{prod?.name ?? 'Produto'} • {item.quantity}{item.unit}
              </Text>
              <Text style={styles.txSub}>{new Date(item.created_at).toLocaleString()}</Text>
              {item.source_production_id && <Text style={styles.txSub}>Origem: Produção</Text>}
            </Card>
          );
        }}
        // Se o seu Screen já dá padding lateral, REMOVA a linha abaixo
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm }}
        nestedScrollEnabled
      />

      {/* BottomSheet de movimentação */}
      <BottomSheet
        open={sheetOpen}
        onClose={closeMoveSheet}
        title="Registrar movimentação"
        subtitle="Informe os dados abaixo"
      >
        <View style={{ gap: spacing.md }}>
          <Text style={typography.h2}>Produto</Text>
          <View style={[styles.rowWrap]}>
            {(products || []).map(p => (
              <Chip
                key={p.id}
                label={`${p.name} (${p.unit})`}
                active={mvProd === p.id}
                onPress={() => setMvProd(p.id)}
              />
            ))}
          </View>

          <Text style={typography.h2}>Tipo</Text>
          <View style={[styles.rowWrap]}>
            {(['entrada','saida','ajuste','transferencia','venda'] as const).map(t => (
              <Chip key={t} label={t} active={mvType === t} onPress={() => setMvType(t)} />
            ))}
          </View>

          <InputNumber
            label={`Quantidade ${mvProdUnit ? `(${String(mvProdUnit).toUpperCase()})` : ''}`}
            mode={mvIsInteger ? 'integer' : 'decimal'}
            decimals={mvIsInteger ? 0 : 3}
            value={mvQty}
            onChangeText={setMvQty}
            placeholder={mvIsInteger ? 'Ex.: 12' : 'Ex.: 34.500'}
          />

          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Button title="Cancelar" variant="text" onPress={closeMoveSheet} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Registrar" onPress={addTx} loading={saving} />
            </View>
          </View>
        </View>
      </BottomSheet>
    </Screen>
  );
}
