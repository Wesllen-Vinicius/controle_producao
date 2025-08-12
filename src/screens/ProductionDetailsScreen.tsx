import React, { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import Screen from '../components/Screen';
import { supabase } from '../services/supabase';
import { Card, Skeleton, EmptyState } from '../components/ui';
import { useRoute } from '@react-navigation/native';
import { useTheme } from '../state/ThemeProvider';

type Product = { id: string; name: string; unit: 'UN'|'KG' };
type Header = { prod_date: string; abate: number };
type Item = { id: string; product_id: string; produced: number; meta: number; diff: number; avg: number };

export default function ProductionDetailsScreen() {
  const route = useRoute<any>();
  const id = route.params?.id as string | undefined;

  const [header, setHeader] = useState<Header | null>(null);
  const [items, setItems] = useState<Item[] | null>(null);
  const [productsById, setProductsById] = useState<Record<string, Product>>({});
  const { colors, spacing, typography } = useTheme();

  useEffect(() => {
    (async () => {
      if (!id) return;
      setItems(null);
      const [{ data: prod }, { data: its }, { data: prods }] = await Promise.all([
        supabase.from('productions').select('prod_date, abate').eq('id', id).single(),
        supabase.from('production_items').select('*').eq('production_id', id),
        supabase.from('products').select('id,name,unit'),
      ]);
      setHeader((prod as any) || null);
      setItems((its as any) || []);
      const map: Record<string, Product> = {};
      (prods as Product[] || []).forEach(p => (map[p.id] = p));
      setProductsById(map);
    })();
  }, [id]);

  const total = (field: keyof Item) => (items || []).reduce((acc, it) => acc + (it[field] as number), 0);

  return (
    <Screen padded>
      <Text style={typography.h1}>Detalhes da Produção</Text>

      <Card style={{ gap: spacing.sm }}>
        {header ? (
          <>
            <Row label="Data" value={header.prod_date} />
            <Row label="Abate" value={header.abate} />
          </>
        ) : (
          <>
            <Skeleton height={18} />
            <Skeleton height={18} />
          </>
        )}
      </Card>

      <Text style={typography.h2}>Itens</Text>
      {!items ? (
        <Card><Skeleton height={90} /></Card>
      ) : items.length === 0 ? (
        <EmptyState title="Sem itens nesta produção" />
      ) : (
        <View style={{ gap: spacing.sm }}>
          {items.map(it => {
            const p = productsById[it.product_id];
            return (
              <Card key={it.id} style={{ gap: 6 }}>
                <Text style={{ color: colors.text, fontWeight: '800' }}>
                  {p?.name ?? it.product_id} <Text style={{ color: colors.muted }}>({p?.unit})</Text>
                </Text>
                <Text style={{ color: colors.text }}>Produção: {it.produced} {p?.unit}</Text>
                <Text style={{ color: colors.text }}>Meta: {it.meta} • Dif: {it.diff}</Text>
                <Text style={{ color: colors.text }}>Média: {it.avg.toFixed(2)}</Text>
              </Card>
            );
          })}

          <Card style={{ gap: 6 }}>
            <Text style={{ color: colors.text, fontWeight: '900', fontSize: 16 }}>Totais</Text>
            <Text style={{ color: colors.text }}>Produção total: {total('produced')}</Text>
            <Text style={{ color: colors.text }}>Meta total: {total('meta')} • Perdas (dif): {total('diff')}</Text>
          </Card>
        </View>
      )}
    </Screen>
  );

  function Row({ label, value }: { label: string; value: any }) {
    return (
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: colors.muted, fontWeight: '700' }}>{label}</Text>
        <Text style={{ color: colors.text, fontWeight: '800' }}>{String(value)}</Text>
      </View>
    );
  }
}
