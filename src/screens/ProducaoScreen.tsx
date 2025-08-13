// screens/ProducaoScreen.tsx
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Alert, Animated, FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen';

// UI kit (imports diretos)
import Card from '../components/ui/Card';
import Chip from '../components/ui/Chip';
import Button from '../components/ui/Button';
import KPI from '../components/ui/KPI';
import Input, { InputNumber } from '../components/ui/Input';
import EmptyState from '../components/ui/EmptyState';

import { supabase } from '../services/supabase';
import { useAuth } from '../state/AuthProvider';
import { useToast } from '../state/ToastProvider';
import { useHaptics } from '../hooks/useHaptics';
import SkeletonList from '../components/SkeletonList';
import { useTheme } from '../state/ThemeProvider';

import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

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

/** Campo de Data estilizado que abre o calendário nativo */
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

  const iosSupportsInline =
    Platform.OS === 'ios' &&
    typeof Platform.Version === 'number' &&
    Platform.Version >= 14;

  const display = Platform.OS === 'ios' ? (iosSupportsInline ? 'inline' : 'spinner') : 'default';

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
          display={display as any}
          onChange={onChangePicker}
        />
      )}
    </View>
  );
}

export default function ProducaoScreen() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const h = useHaptics();
  const { colors, spacing, typography } = useTheme();

  const [prodDate, setProdDate] = useState<string>(todayStr());
  const [abateStr, setAbateStr] = useState<string>('');
  const [products, setProducts] = useState<Product[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [produced, setProduced] = useState<Record<string, string>>({});
  const abate = useMemo(() => parseInt(abateStr || '0', 10) || 0, [abateStr]);

  const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const [history, setHistory] = useState<Production[] | null>(null);
  const [itemsCache, setItemsCache] = useState<Record<string, SummaryItem[]>>({});
  const [saving, setSaving] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    prodTitle: { color: colors.text, fontWeight: '800' },
    unit: { color: colors.muted, fontWeight: '700' },
    row: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
    detail: { color: colors.text, fontSize: 13 },
  }), [colors, spacing]);

  const meta  = useCallback((p: Product) => abate * (p.meta_por_animal || 0), [abate]);
  const prodNum = useCallback((p: Product) => parseFloat(produced[p.id] || '0') || 0, [produced]);
  const diff  = useCallback((p: Product) => meta(p) - prodNum(p), [meta, prodNum]);
  const media = useCallback((p: Product) => (abate > 0 ? prodNum(p) / abate : 0), [abate, prodNum]);

  const fetchProducts = useCallback(async () => {
    const { data, error } = await supabase.from('products').select('id,name,unit,meta_por_animal').order('name');
    if (error) { Alert.alert('Erro', error.message); return; }
    const list = (data as Product[]) || [];
    setProducts(list);
    setSelected((prev) => prev.length ? prev.filter(id => list.some(p => p.id === id)) : []);
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

  function toggleProduct(id: string) {
    setSelected((curr) => (curr.includes(id) ? curr.filter(x => x !== id) : [...curr, id]));
  }
  function selectAll() { setSelected((products || []).map(p => p.id)); }
  function clearSelection() { setSelected([]); }

  async function save() {
    if (!session) return Alert.alert('Login necessário');
    if (!prodDate || !abate) { h.warning(); return Alert.alert('Informe data e abate'); }
    if (!selected.length) { h.warning(); return Alert.alert('Selecione ao menos um produto'); }

    setSaving(true);
    try {
      const { data: prod, error } = await supabase.from('productions')
        .insert({ author_id: session.user.id, prod_date: prodDate, abate })
        .select('id').single();
      if (error) throw error;
      const production_id = (prod as any).id as string;

      const items = selected.map((id) => {
        const p = (products || []).find(x => x.id === id)!;
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
      showToast?.({
        type: 'success',
        message: 'Produção registrada.',
        actionLabel: 'Ver',
        onAction: () => {},
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
    const { data, error } = await supabase
      .from('v_production_item_summary')
      .select('production_id,product_id,product_name,unit,produced,meta,diff,media')
      .eq('production_id', prodId);
    if (!error) setItemsCache((s) => ({ ...s, [prodId]: (data as SummaryItem[]) || [] }));
  }

  function quickRange(k: '7d' | '30d' | 'month') {
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
      <Text style={typography.h1}>Produção</Text>

      {/* Card com data (calendário) + abate */}
      <Card padding="md" variant="filled" elevationLevel={1}>
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <DateField label="Data" value={prodDate} onChange={setProdDate} />
            </View>
            <View style={{ width: 120, alignSelf: 'flex-end' }}>
              <Button title="Hoje" variant="tonal" onPress={() => setProdDate(todayStr())} />
            </View>
          </View>

          <InputNumber
            label="Abate (animais)"
            mode="integer"
            value={abateStr}
            onChangeText={setAbateStr}
            placeholder="Ex.: 25"
          />
        </View>
      </Card>

      {/* Seleção de produtos */}
      <Card padding="md" variant="tonal" elevationLevel={0}>
        <Text style={typography.h2}>Produtos</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm }}>
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
      </Card>

      {/* Itens selecionados */}
      {(products || [])
        .filter((p) => selected.includes(p.id))
        .map((p) => {
          const m = meta(p);
          const prod = prodNum(p);
          const d = diff(p);
          const med = media(p);
          const progress = m > 0 ? Math.max(0, Math.min(1, prod / m)) : 0;

          return (
            <Card key={p.id} padding="md" variant="filled" elevationLevel={1}>
              <Text style={styles.prodTitle}>
                {p.name} <Text style={styles.unit}>({p.unit})</Text>
              </Text>

              <View style={{ marginTop: spacing.sm }}>
                <InputNumber
                  label="Produção do dia"
                  mode={String(p.unit).toUpperCase() === 'UN' ? 'integer' : 'decimal'}
                  decimals={3}
                  suffix={String(p.unit).toUpperCase()}
                  value={produced[p.id] ?? ''}
                  onChangeText={(t) => setProduced((s) => ({ ...s, [p.id]: t }))}
                  placeholder={String(p.unit).toUpperCase() === 'UN' ? 'Ex.: 12' : 'Ex.: 34.500'}
                />
              </View>

              <View style={[styles.row, { marginTop: spacing.sm }]}>
                <KPI label="Meta" value={m} status="default" hint={`Por animal: ${p.meta_por_animal}`} />
                <KPI label="Dif." value={d} status={d > 0 ? 'danger' : 'success'} />
                <KPI label="Média" value={med.toFixed(2)} />
                <KPI label="Progresso" value={`${Math.round(progress * 100)}%`} progress={progress} compact />
              </View>
            </Card>
          );
        })}

      <Button title="Salvar" loading={saving} onPress={save} full />

      {/* Filtros do histórico com calendário */}
      <Text style={typography.h2}>Histórico</Text>
      <Card padding="md">
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
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
          <Button title="Filtrar" small onPress={fetchHistory} />
        </View>
      </Card>
    </View>
  );

  return (
    // 👇 IMPORTANTE: Screen sem ScrollView, para não aninhar com a FlatList
    <Screen padded scroll={false}>
      <FlatList
        data={history || []}
        keyExtractor={(i) => i.id}
        ListHeaderComponent={Header}
        ListEmptyComponent={history === null ? <SkeletonList rows={3} /> : <EmptyState title="Sem lançamentos" />}
        renderItem={({ item }) => (
          <HistoryRow
            item={item}
            colors={colors}
            spacing={spacing}
            typography={typography}
            loadItems={loadItems}
            cache={itemsCache}
          />
        )}
        contentContainerStyle={{
          // 👇 voltou o espaçamento lateral
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.xl,
          gap: spacing.sm,
        }}
      />
    </Screen>
  );
}

function HistoryRow({
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
  cache: Record<string, SummaryItem[]>;
}) {
  const [open, setOpen] = useState(false);
  const rot = useRef(new Animated.Value(0)).current;
  const rotate = rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  useEffect(() => {
    Animated.timing(rot, { toValue: open ? 1 : 0, duration: 180, useNativeDriver: true }).start();
  }, [open, rot]);

  useEffect(() => {
    if (open && !cache[item.id]) {
      loadItems(item.id);
    }
  }, [open, cache, item.id, loadItems]);

  return (
    <Card style={{ padding: 0 }}>
      <Pressable
        onPress={() => setOpen(v => !v)}
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

      {open && (
        <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: 6 }}>
          {cache[item.id] ? (
            cache[item.id].map((pi) => (
              <Text key={pi.product_id} style={{ color: colors.text, fontSize: 13 }}>
                • {pi.product_name} ({pi.unit}): {pi.produced} — Meta {pi.meta} — Dif {pi.diff} — Média {pi.media.toFixed(2)}
              </Text>
            ))
          ) : (
            <SkeletonList rows={1} height={40} />
          )}
        </View>
      )}
    </Card>
  );
}
