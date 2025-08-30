// Produtos/components/ProductList.tsx

import { Text, View } from 'react-native';
import { Product } from '../types';
import ProductListItem from './ProductListItem';
// ATENÇÃO: Ajuste o caminho para seus componentes de UI

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/state/ThemeProvider';
import SkeletonList from '@/components/SkeletonList';
import EmptyState from '@/components/ui/EmptyState';

type Props = {
  products: Product[] | null;
  loading: boolean;
  onEdit: (item: Product) => void;
  editingId: string | null;
};

const ProductList = ({ products, loading, onEdit, editingId }: Props) => {
  const { colors, typography, spacing } = useTheme();

  if (loading && !products) {
    return <SkeletonList rows={4} style={{ marginTop: spacing.lg }} />;
  }

  if (!products || products.length === 0) {
    return <EmptyState title="Nenhum produto cadastrado" style={{ marginTop: spacing.lg }} />;
  }

  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <MaterialCommunityIcons name="package-variant-closed" size={18} color={colors.text} />
        <Text style={[typography.h2, { fontSize: 18, color: colors.text }]}>
          Catálogo de Produtos
        </Text>
      </View>
      <View style={{ gap: spacing.sm }}>
        {products.map(item => (
          <ProductListItem
            key={item.id}
            item={item}
            onEdit={onEdit}
            isEditing={editingId === item.id}
          />
        ))}
      </View>
    </View>
  );
};

export default ProductList;
