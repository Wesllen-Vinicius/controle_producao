import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import Screen from '../components/Screen';
import { colors, spacing, typography } from '../theme';
import { supabase } from '../services/supabase';

type Item = { id: string; product_id: string; produced: number; meta: number; diff: number; avg: number };
type Product = { id: string; name: string; unit: 'UN'|'KG' };

export default function ProductionDetailsScreen() {
  const route = useRoute<any>();
  const [header, setHeader] = useState<{ prod_date: string; abate: number } | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [productsById, setProductsById] = useState<Record<string, Product>>({});

  useEffect(() => {
    (async () => {
      const id = route.params?.id as string | undefined;
      if (!id) return;
      const { data: prod } = await supabase.from('productions').select('prod_date, abate').eq('id', id).single();
      setHeader(prod as any);
      const { data: its } = await supabase.from('production_items').select('*').eq('production_id', id);
      setItems((its as any) || []);
      const { data: prods } = await supabase.from('products').select('id,name,unit');
      const map: Record<string, Product> = {};
      (prods as Product[]).forEach(p => (map[p.id] = p));
      setProductsById(map);
    })();
  }, [route.params?.id]);

  return (
    <Screen>
      <Text style={typography.h1}>Produção {header?.prod_date}</Text>
      <View style={styles.header}>
        <Text style={styles.hint}>Abate</Text>
        <Text style={styles.value}>{header?.abate ?? '-'}</Text>
      </View>

      {items.map(it => {
        const p = productsById[it.product_id];
        return (
          <View key={it.id} style={styles.card}>
            <Text style={styles.title}>
              {p?.name} <Text style={styles.hint}>({p?.unit})</Text>
            </Text>
            <Text style={styles.line}>Produção: {it.produced} {p?.unit}</Text>
            <Text style={styles.line}>Meta: {it.meta} • Dif: {it.diff}</Text>
            <Text style={styles.line}>Média: {it.avg.toFixed(2)}</Text>
          </View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header:{ backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: 12, padding: spacing.md, marginBottom: spacing.sm, flexDirection:'row', justifyContent:'space-between' },
  hint:{ color: colors.muted, fontWeight: '600' },
  value:{ color: colors.text, fontWeight: '800' },
  card:{ backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: 12, padding: spacing.md, marginBottom: spacing.sm },
  title:{ color: colors.text, fontWeight: '700', marginBottom: 6 },
  line:{ color: colors.text, fontSize: 13 },
});
