import React, { useEffect, useMemo, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import Screen from '../components/Screen';

import Card from '../components/ui/Card';
import KPI from '../components/ui/KPI';
import EmptyState from '../components/ui/EmptyState';

import { supabase } from '../services/supabase';
import { useRoute } from '@react-navigation/native';
import { useTheme } from '../state/ThemeProvider';
import SkeletonList from '../components/SkeletonList';

type Header = { prod_date: string; abate: number };
type SummaryItem = {
  production_id: string;
  product_id: string;
  product_name: string;
  unit: string;
  produced: number;
  meta: number;
  diff: number;
  media: number; // coluna da view
};

export default function ProductionDetailsScreen() {
  const route = useRoute<any>();
  const id = route.params?.id as string | undefined;

  const [header, setHeader] = useState<Header | null>(null);
  const [items, setItems] = useState<SummaryItem[] | null>(null);

  const { colors, spacing, typography } = useTheme();

  useEffect(() => {
    (async () => {
      if (!id) return;
      setHeader(null);
      setItems(null);

      const [{ data: prod, error: e1 }, { data: its, error: e2 }] = await Promise.all([
        supabase.from('productions').select('prod_date, abate').eq('id', id).single(),
        supabase
          .from('v_production_item_summary')
          .select('production_id,product_id,product_name,unit,produced,meta,diff,media')
          .eq('production_id', id),
      ]);

      if (!e1) setHeader((prod as any) || null);
      if (!e2) setItems((its as any) || []);
    })();
  }, [id]);

  const totals = useMemo(() => {
    const base = { produced: 0, meta: 0, diff: 0 };
    if (!items) return base;
    return items.reduce(
      (acc, it) => ({
        produced: acc.produced + (it.produced ?? 0),
        meta: acc.meta + (it.meta ?? 0),
        diff: acc.diff + (it.diff ?? 0),
      }),
      base
    );
  }, [items]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: { flexDirection: 'row', justifyContent: 'space-between' },
        label: { color: colors.muted, fontWeight: '700' },
        value: { color: colors.text, fontWeight: '800' },
        prodTitle: { color: colors.text, fontWeight: '800' },
        unit: { color: colors.muted, fontWeight: '700' },
      }),
    [colors]
  );

  return (
    <Screen padded>
      <Text style={typography.h1}>Detalhes da Produção</Text>

      <Card padding="md" variant="filled" elevationLevel={1} style={{ gap: spacing.sm }}>
        {header ? (
          <>
            <Row label="Data" value={header.prod_date} />
            <Row label="Abate" value={header.abate} />
          </>
        ) : (
          <SkeletonList rows={2} height={18} />
        )}
      </Card>

      {/* KPIs de totais */}
      <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginTop: spacing.md }}>
        <KPI label="Abate" value={header?.abate ?? '—'} />
        <KPI label="Produção total" value={items ? totals.produced.toFixed(2) : '···'} />
        <KPI label="Meta total" value={items ? totals.meta.toFixed(2) : '···'} />
        <KPI
          label="Perdas (dif.)"
          value={items ? totals.diff.toFixed(2) : '···'}
          status={items ? (totals.diff > 0 ? 'danger' : 'success') : 'default'}
        />
      </View>

      <Text style={[typography.h2, { marginTop: spacing.md }]}>Itens</Text>

      {!items ? (
        <Card padding="md"><SkeletonList rows={3} /></Card>
      ) : items.length === 0 ? (
        <EmptyState title="Sem itens nesta produção" />
      ) : (
        <View style={{ gap: spacing.sm }}>
          {items.map((it) => (
            <Card key={it.product_id} padding="md" variant="filled" elevationLevel={1} style={{ gap: 6 }}>
              <Text style={styles.prodTitle}>
                {it.product_name}{' '}
                <Text style={styles.unit}>({String(it.unit).toUpperCase()})</Text>
              </Text>
              <Text style={{ color: colors.text }}>
                Produção: {it.produced} {String(it.unit).toUpperCase()}
              </Text>
              <Text style={{ color: colors.text }}>
                Meta: {it.meta} • Dif: {it.diff}
              </Text>
              <Text style={{ color: colors.text }}>
                Média: {Number.isFinite(it.media) ? it.media.toFixed(2) : '—'}
              </Text>
            </Card>
          ))}

          <Card padding="md" variant="outlined" style={{ gap: 6 }}>
            <Text style={{ color: colors.text, fontWeight: '900', fontSize: 16 }}>Totais</Text>
            <Text style={{ color: colors.text }}>Produção total: {totals.produced.toFixed(2)}</Text>
            <Text style={{ color: colors.text }}>
              Meta total: {totals.meta.toFixed(2)} • Perdas (dif): {totals.diff.toFixed(2)}
            </Text>
          </Card>
        </View>
      )}
    </Screen>
  );

  function Row({ label, value }: { label: string; value: any }) {
    return (
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{String(value)}</Text>
      </View>
    );
  }
}
