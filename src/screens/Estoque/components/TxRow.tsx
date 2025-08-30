// src/screens/Estoque/components/TxRow.tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Card from '../../../components/ui/Card';
import { useTheme } from '../../../state/ThemeProvider';
import { Product, Transaction } from '../types';
import { formatQuantity } from '../utils';

interface TxRowProps {
  tx: Transaction;
  products: Product[] | null;
}

const TxRow = memo(function TxRow({ tx, products }: TxRowProps) {
  const { colors, spacing, typography, radius } = useTheme();

  const productName = useMemo(
    () => (products ?? []).find(p => p.id === tx.product_id)?.name ?? 'Produto',
    [products, tx.product_id]
  );
  const timeStr = useMemo(
    () => new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    [tx.created_at]
  );

  const txTypeInfo = useMemo(() => {
    switch (tx.tx_type) {
      case 'entrada':
        return {
          color: colors.success,
          bgColor: colors.success + '15',
          icon: 'arrow-down-box' as const,
          sign: '+',
          label: 'ENTRADA',
          description: 'Produto adicionado ao estoque',
        };
      case 'saida':
        return {
          color: colors.danger,
          bgColor: colors.danger + '15',
          icon: 'arrow-up-box' as const,
          sign: '−',
          label: 'SAÍDA',
          description: 'Produto retirado do estoque',
        };
      case 'venda':
        return {
          color: '#FF8C00',
          bgColor: '#FF8C00' + '15',
          icon: 'cash-register' as const,
          sign: '−',
          label: 'VENDA',
          description: 'Produto vendido',
        };
      case 'ajuste':
        return {
          color: colors.accent,
          bgColor: colors.accent + '15',
          icon: 'tune-variant' as const,
          sign: '±',
          label: 'AJUSTE',
          description: 'Correção de estoque',
        };
      case 'transferencia':
        return {
          color: colors.primary,
          bgColor: colors.primary + '15',
          icon: 'swap-horizontal-variant' as const,
          sign: '↔',
          label: 'TRANSFERÊNCIA',
          description: 'Movimentação entre locais',
        };
      default:
        return {
          color: colors.muted,
          bgColor: colors.muted + '15',
          icon: 'dots-horizontal' as const,
          sign: '',
          label: String(tx.tx_type || 'N/A').toUpperCase(),
          description: 'Movimentação',
        };
    }
  }, [tx.tx_type, colors]);

  const quantityDisplay = useMemo(() => {
    const product = products?.find(p => p.id === tx.product_id);
    return `${txTypeInfo.sign}${formatQuantity(product?.unit, tx.quantity)}`;
  }, [txTypeInfo.sign, tx, products]);

  return (
    <Card
      variant="filled"
      elevationLevel={1}
      padding="md"
      style={{
        borderLeftWidth: 3,
        borderLeftColor: txTypeInfo.color,
        backgroundColor: colors.surface,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: radius.sm,
            backgroundColor: txTypeInfo.bgColor,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialCommunityIcons name={txTypeInfo.icon} size={20} color={txTypeInfo.color} />
        </View>
        <View style={{ flex: 1 }}>
          <View
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Text style={[typography.h2, { fontSize: 14, fontWeight: '700', color: colors.text }]}>
              {txTypeInfo.label}
            </Text>
            <View
              style={{
                backgroundColor: txTypeInfo.color + '20',
                paddingHorizontal: spacing.sm,
                paddingVertical: 2,
                borderRadius: radius.sm,
                borderWidth: 1,
                borderColor: txTypeInfo.color + '30',
              }}
            >
              <Text
                style={{
                  fontWeight: '900',
                  fontSize: 14,
                  color: txTypeInfo.color,
                  letterSpacing: -0.5,
                }}
              >
                {quantityDisplay}
              </Text>
            </View>
          </View>
          <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '500', marginTop: 2 }}>
            {txTypeInfo.description}
          </Text>
        </View>
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: spacing.sm,
          paddingTop: spacing.sm,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.line,
        }}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <MaterialCommunityIcons name="package-variant" size={14} color={colors.muted} />
            <Text
              style={{ color: colors.text, fontSize: 13, fontWeight: '600', flex: 1 }}
              numberOfLines={1}
            >
              {productName}
            </Text>
          </View>
          {tx.customer && (
            <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '500', marginLeft: 18 }}>
              {tx.customer}
            </Text>
          )}
          {tx.justification && (
            <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '500', marginLeft: 18 }}>
              {tx.justification}
            </Text>
          )}
          {tx.observation && (
            <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '500', marginLeft: 18 }}>
              {tx.observation}
            </Text>
          )}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <MaterialCommunityIcons name="clock-outline" size={12} color={colors.muted} />
            <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '500' }}>{timeStr}</Text>
          </View>
          {!!tx.source_production_id && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <MaterialCommunityIcons name="factory" size={12} color={colors.primary} />
              <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '600' }}>
                PRODUÇÃO
              </Text>
            </View>
          )}
        </View>
      </View>
    </Card>
  );
});

export default TxRow;
