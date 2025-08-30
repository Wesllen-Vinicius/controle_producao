// Produtos/ProductsAdminScreen.tsx

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
// ATENÇÃO: Ajuste o caminho para seus componentes e providers
import Screen from '../../components/Screen';
import { ProdutosSkeleton } from '../../components/Skeletons';
import { useHaptics } from '../../hooks/useHaptics';
import { useAuth } from '../../state/AuthProvider';
import { useTheme } from '../../state/ThemeProvider';

// Lógica e componentes locais do módulo "Produtos"
import { ProductForm } from './components/ProductForm';
import ProductList from './components/ProductList';
import StatsDashboard from './components/StatsDashboard';
import { useProductsAdmin } from './hooks/useProductsAdmin';
import { Product } from './types';

export default function ProdutosScreen() {
  const { profile } = useAuth();
  const { colors, spacing, typography, radius } = useTheme();
  const h = useHaptics();
  const scrollViewRef = useRef<ScrollView>(null);

  const { products, loading, refreshing, fetchProducts, onRefresh, saveProduct, updateProduct } =
    useProductsAdmin();

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // CORREÇÃO: Movendo a criação dos estilos para dentro do componente.
  const styles = useMemo(
    () =>
      StyleSheet.create({
        pageHeader: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center', // Tipagem correta
          marginBottom: spacing.sm,
        },
        adminBadge: {
          backgroundColor: colors.success + '20',
          paddingHorizontal: spacing.sm,
          paddingVertical: 4,
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor: colors.success + '30',
        },
        adminBadgeText: {
          color: colors.success,
          fontSize: 11,
          fontWeight: '700',
        },
        subtitleText: {
          color: colors.muted,
          // CORREÇÃO: Usando typography.body ao invés de typography.body2
          ...typography.body,
        },
      }),
    [colors, spacing, radius, typography]
  );

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchProducts();
    }
  }, [profile, fetchProducts]);

  const unitsInUse = useMemo(() => {
    const unitSet = new Set<string>((products ?? []).map(p => String(p.unit).toUpperCase()));
    return Array.from(unitSet);
  }, [products]);

  const handleEdit = useCallback(
    (product: Product) => {
      setEditingProduct(product);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      h.light();
    },
    [h]
  );

  const handleCancelEdit = useCallback(() => {
    setEditingProduct(null);
  }, []);

  const handleSubmit = useCallback(
    async (productData: Omit<Product, 'id'>) => {
      let result;
      if (editingProduct) {
        result = await updateProduct(editingProduct.id, productData);
      } else {
        result = await saveProduct(productData);
      }

      if (result.success) {
        setEditingProduct(null);
      }
      return result;
    },
    [editingProduct, saveProduct, updateProduct]
  );

  if (profile?.role !== 'admin') {
    return (
      <Screen padded>
        <Text style={[typography.body, { color: colors.text }]}>Acesso restrito.</Text>
      </Screen>
    );
  }

  if (loading && !products?.length) {
    return (
      <Screen>
        <ProdutosSkeleton />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xl }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        }
      >
        <View style={styles.pageHeader}>
          <View>
            <Text style={[typography.h1, { fontSize: 24, color: colors.text }]}>Produtos</Text>
            <Text style={styles.subtitleText}>Gerenciamento de Catálogo</Text>
          </View>
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>ADMIN</Text>
          </View>
        </View>

        <StatsDashboard totalProducts={products?.length ?? 0} totalUnits={unitsInUse.length} />

        <ProductForm
          editingProduct={editingProduct}
          onSubmit={handleSubmit}
          onCancel={handleCancelEdit}
          isBusy={loading}
          unitsInUse={unitsInUse}
        />

        <ProductList
          products={products}
          loading={loading}
          onEdit={handleEdit}
          editingId={editingProduct?.id ?? null}
        />
      </ScrollView>
    </Screen>
  );
}
