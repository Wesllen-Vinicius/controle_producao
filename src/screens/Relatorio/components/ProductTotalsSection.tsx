import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Button from '../../../components/ui/Button';
import { useTheme } from '../../../state/ThemeProvider';
import { ProductTotals } from '../types';
import { ProductTotalTile } from './ProductTotalTile';

interface ProductTotalsSectionProps {
  totals: ProductTotals[];
  onSortPress: () => void;
}

export function ProductTotalsSection({ totals, onSortPress }: ProductTotalsSectionProps) {
  const { colors, spacing, typography } = useTheme();
  const { width } = useWindowDimensions();
  const GAP = spacing.sm;
  const tileWidth = (width - spacing.md * 2 - GAP) / 2;

  return (
    <View style={{ paddingHorizontal: spacing.md, gap: spacing.md }}>
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <MaterialCommunityIcons name="view-grid-outline" size={20} color={colors.primary} />
          <Text style={[typography.h2, { fontSize: 16, color: colors.text }]}>
            Totais por Produto
          </Text>
        </View>
        {/* CORREÇÃO: Adicionado ícone ao botão */}
        <Button title="Ordenar" variant="tonal" onPress={onSortPress} small />
      </View>
      <View style={[styles.grid, { gap: GAP }]}>
        {totals.map(item => (
          <View key={item.product_id} style={{ width: tileWidth }}>
            <ProductTotalTile {...item} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
});
