import React, { useEffect, useMemo, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import Screen from '../components/Screen';

import Card from '../components/ui/Card';
import SkeletonList from '../components/SkeletonList';

import { supabase } from '../services/supabase';
import { useRoute } from '@react-navigation/native';
import { useTheme } from '../state/ThemeProvider';

type Tx = {
  id: string;
  product_id: string;
  quantity: number;
  unit: string;
  tx_type: 'entrada' | 'saida' | 'ajuste' | 'transferencia' | 'venda' | string;
  created_at: string;
  created_by: string | null;
  source_production_id: string | null;
};

type Product = { id: string; name: string; unit: 'UN' | 'KG' | string };

export default function TransactionDetailsScreen() {
  const route = useRoute<any>();
  const id = route.params?.id as string | undefined;

  const [tx, setTx] = useState<Tx | null>(null);
  const [product, setProduct] = useState<Product | null>(null);

  const { colors, spacing, typography } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: { flexDirection: 'row', justifyContent: 'space-between' },
        label: { color: colors.muted, fontWeight: '700' },
        value: { color: colors.text, fontWeight: '800' },
        typePill: {
          alignSelf: 'flex-start',
          paddingHorizontal: spacing.md,
          paddingVertical: 6,
          borderRadius: 999,
          backgroundColor: colors.surfaceAlt,
          borderWidth: 1,
          borderColor: colors.line,
          marginBottom: spacing.sm,
        },
        typeText: { color: colors.text, fontWeight: '800' },
      }),
    [colors, spacing]
  );

  useEffect(() => {
    (async () => {
      if (!id) return;
      setTx(null);
      setProduct(null);

      const { data: txData, error: e1 } = await supabase
        .from('inventory_transactions')
        .select('*')
        .eq('id', id)
        .single();

      if (!e1 && txData) {
        const t = txData as Tx;
        setTx(t);
        if (t.product_id) {
          const { data: p } = await supabase
            .from('products')
            .select('id,name,unit')
            .eq('id', t.product_id)
            .single();
          setProduct((p as Product) || null);
        }
      }
    })();
  }, [id]);

  const typeLabel = useMemo(() => {
    if (!tx) return '—';
    return tx.tx_type === 'entrada' ? 'carregamento' : tx.tx_type;
  }, [tx]);

  const unitUP = useMemo(() => (product?.unit || tx?.unit || '').toUpperCase(), [product?.unit, tx?.unit]);

  return (
    <Screen padded>
      <Text style={[typography.h1, { color: colors.text }]}>Movimentação</Text>

      <Card padding="md" variant="filled" elevationLevel={1} style={{ gap: spacing.sm }}>
        {!tx ? (
          <SkeletonList rows={4} />
        ) : (
          <>
            <View style={styles.typePill}>
              <Text style={styles.typeText}>{typeLabel}</Text>
            </View>

            <Row label="Produto" value={product?.name ?? tx.product_id} />
            <Row label="Quantidade" value={`${tx.quantity} ${unitUP}`} />
            <Row label="Data" value={new Date(tx.created_at).toLocaleString()} />
            {tx.source_production_id ? (
              <Row label="Origem" value={`Produção #${tx.source_production_id.slice(0, 8)}`} />
            ) : null}
          </>
        )}
      </Card>
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
