// src/screens/Producao/components/ProductInputCard.tsx
import { memo, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { InputNumber } from '../../../components/ui/Input';
import { useDebouncedCallback } from '../../../hooks/useDebouncedCallback';
import { useTheme } from '../../../state/ThemeProvider';
import { Product } from '../types';
import { getProgressColor } from '../utils';

type Props = {
  product: Product;
  value: string;
  onChangeText: (text: string) => void;
  meta: (p: Product) => number;
  abate: number;
};

const ProductInputCard = memo(({ product, value, onChangeText, meta, abate }: Props) => {
  const { colors, spacing, elevation } = useTheme();
  const [localValue, setLocalValue] = useState(value);
  const debouncedChange = useDebouncedCallback(onChangeText, 250);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (text: string) => {
    setLocalValue(text);
    debouncedChange(text);
  };

  const isUN = String(product.unit).toUpperCase() === 'UN';
  const prod = parseFloat(localValue || '0') || 0;
  const m = meta(product);
  const progress = m > 0 ? Math.max(0, Math.min(1, prod / m)) : 0;
  const mediaAnimal = abate > 0 ? prod / abate : 0;
  const diferenca = prod - m;
  const fmt = (n: number) => (isUN ? Math.round(n).toString() : n.toFixed(1));
  const progressColor = getProgressColor(progress, colors);

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: progressColor,
        ...elevation.e2,
      }}
    >
      <View style={{ marginBottom: spacing.md }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 }}>
          {product.name}
        </Text>
        <Text style={{ fontSize: 12, color: colors.muted, lineHeight: 16 }}>
          Meta Total: {fmt(m)} {product.unit} ({product.meta_por_animal} {product.unit} por animal)
        </Text>
      </View>
      <InputNumber
        mode={isUN ? 'integer' : 'decimal'}
        decimals={isUN ? 0 : 2}
        value={localValue}
        onChangeText={handleChange}
        placeholder="0"
        keyboardType="numeric"
      />
      <View style={{ marginTop: spacing.md }}>
        <View
          style={{
            backgroundColor: colors.surfaceAlt,
            borderRadius: 6,
            overflow: 'hidden',
            height: 6,
            marginBottom: spacing.sm,
          }}
        >
          <View
            style={{
              height: '100%',
              width: `${Math.min(100, progress * 100)}%`,
              backgroundColor: progressColor,
            }}
          />
        </View>
        <View style={{ gap: spacing.xs }}>
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Text style={{ fontSize: 11, color: colors.muted }}>
              Produzido: {fmt(prod)} / {fmt(m)} {product.unit}
            </Text>
            <Text style={{ fontSize: 11, fontWeight: '600', color: progressColor }}>
              {Math.round(progress * 100)}% da meta
            </Text>
          </View>
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Text style={{ fontSize: 11, color: colors.muted }}>
              Média por animal: {fmt(mediaAnimal)} {product.unit}
            </Text>
            <Text
              style={{
                fontSize: 11,
                color: diferenca >= 0 ? colors.success : colors.danger,
                fontWeight: '500',
              }}
            >
              {diferenca >= 0 ? 'Acima' : 'Abaixo'}: {fmt(Math.abs(diferenca))} {product.unit}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
});

export default ProductInputCard;

ProductInputCard.displayName = 'ProductInputCard';
