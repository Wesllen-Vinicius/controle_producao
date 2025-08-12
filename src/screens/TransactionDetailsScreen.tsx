import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Screen from '../components/Screen';
import { supabase } from '../services/supabase';
import { Card, Skeleton } from '../components/ui';
import { useRoute } from '@react-navigation/native';
import { useTheme } from '../state/ThemeProvider';

type Tx = {
  id: string; product_id: string; quantity: number; unit: string;
  tx_type: string; created_at: string; created_by: string | null; source_production_id: string | null;
};
type Product = { id: string; name: string; unit: 'UN'|'KG' };

export default function TransactionDetailsScreen() {
  const route = useRoute<any>();
  const id = route.params?.id as string | undefined;
  const [tx, setTx] = useState<Tx | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const { colors, spacing, typography } = useTheme();

  useEffect(() => {
    (async () => {
      if (!id) return;
      const { data } = await supabase.from('inventory_transactions').select('*').eq('id', id).single();
      const t = data as Tx | null;
      setTx(t);
      if (t?.product_id) {
        const { data: p } = await supabase.from('products').select('id,name,unit').eq('id', t.product_id).single();
        setProduct(p as any);
      }
    })();
  }, [id]);

  return (
    <Screen padded>
      <Text style={typography.h1}>Movimentação</Text>
      <Card style={{ gap: spacing.sm }}>
        {!tx ? (
          <Skeleton height={100} />
        ) : (
          <>
            <Row label="Tipo" value={tx.tx_type === 'entrada' ? 'carregamento' : tx.tx_type} />
            <Row label="Produto" value={product?.name ?? tx.product_id} />
            <Row label="Quantidade" value={`${tx.quantity} ${product?.unit ?? tx.unit}`} />
            <Row label="Data" value={new Date(tx.created_at).toLocaleString()} />
            {tx.source_production_id && <Row label="Origem" value={`Produção #${tx.source_production_id.slice(0, 8)}`} />}
          </>
        )}
      </Card>
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
