import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import Screen from '../components/Screen';
import { colors, spacing, typography } from '../theme';
import { supabase } from '../services/supabase';

type Tx = {
  id: string; product_id: string; quantity: number; unit: string;
  tx_type: string; created_at: string; created_by: string | null; source_production_id: string | null;
};
type Product = { id: string; name: string; unit: 'UN'|'KG' };

export default function TransactionDetailsScreen() {
  const route = useRoute<any>();
  const [tx, setTx] = useState<Tx | null>(null);
  const [product, setProduct] = useState<Product | null>(null);

  useEffect(() => {
    (async () => {
      const id = route.params?.id as string | undefined;
      if (!id) return;
      const { data } = await supabase.from('inventory_transactions').select('*').eq('id', id).single();
      const t = data as unknown as Tx;
      setTx(t);
      if (t?.product_id) {
        const { data: p } = await supabase.from('products').select('id,name,unit').eq('id', t.product_id).single();
        setProduct(p as any);
      }
    })();
  }, [route.params?.id]);

  return (
    <Screen>
      <Text style={typography.h1}>Movimentação</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Tipo</Text>
        <Text style={styles.value}>{tx?.tx_type === 'entrada' ? 'carregamento' : tx?.tx_type}</Text>

        <Text style={styles.label}>Produto</Text>
        <Text style={styles.value}>{product?.name}</Text>

        <Text style={styles.label}>Quantidade</Text>
        <Text style={styles.value}>{tx?.quantity} {product?.unit}</Text>

        <Text style={styles.label}>Data</Text>
        <Text style={styles.value}>{tx ? new Date(tx.created_at).toLocaleString() : '-'}</Text>

        {tx?.source_production_id && (
          <>
            <Text style={styles.label}>Origem</Text>
            <Text style={styles.value}>Produção #{tx.source_production_id.slice(0,8)}</Text>
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card:{ backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: 12, padding: spacing.md, gap: 4 },
  label:{ color: colors.muted, fontWeight: '600', marginTop: 6 },
  value:{ color: colors.text, fontWeight: '700' },
});
