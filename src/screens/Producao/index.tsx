// src/screens/Producao/index.tsx
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import { useCallback, useMemo } from 'react';
import { RefreshControl, Text, View } from 'react-native';

import Screen from '../../components/Screen';
import { ProducaoSkeleton } from '../../components/Skeletons';
import BottomSheet from '../../components/ui/BottomSheet';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import FAB from '../../components/ui/FAB';
import { useTheme } from '../../state/ThemeProvider';
import HistoryRow from './components/HistoryRow';
import ProductInputCard from './components/ProductInputCard';
import ProductionForm from './components/ProductionForm';
import ProductionHeader from './components/ProductionHeader';
import { useProductionData } from './hooks/useProductionData';
import { Product, Renderable } from './types';

export default function ProducaoScreen() {
  const { colors, spacing } = useTheme();
  const {
    loading,
    refreshing,
    onRefresh,
    historyItems,
    itemsCache,
    products,
    productionStats,
    formOpen,
    setFormOpen,
    prodDate,
    setProdDate,
    abateStr,
    setAbateStr,
    selectedIds,
    producedQuantities,
    setProducedQuantities,
    saving,
    abate,
    showFilters,
    setShowFilters,
    filters,
    setFilters,
    handleSave,
    loadItemDetails,
    toggleProduct,
    selectAll,
    clearSelection,
    prodNum,
    errors,
  } = useProductionData();

  const selectedProducts = useMemo(
    () => (products || []).filter(p => selectedIds.includes(p.id)),
    [products, selectedIds]
  );
  const meta = useCallback((p: Product) => abate * (p.meta_por_animal || 0), [abate]);

  const renderItem: ListRenderItem<Renderable> = useCallback(
    ({ item }) => {
      if (item.type === 'h-header') {
        return (
          <View
            style={{
              paddingHorizontal: spacing.lg,
              marginTop: spacing.xl,
              marginBottom: spacing.md,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
            }}
          >
            <Text style={{ fontWeight: '700', color: colors.text, fontSize: 16 }}>
              {item.title}
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.line, opacity: 0.3 }} />
          </View>
        );
      }
      if (item.type === 'h-row') {
        return (
          <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>
            <HistoryRow item={item.item} cache={itemsCache} loadItems={loadItemDetails} />
          </View>
        );
      }
      return null;
    },
    [spacing, colors, itemsCache, loadItemDetails]
  );

  if (loading) {
    return (
      <Screen padded={false}>
        <ProducaoSkeleton />
      </Screen>
    );
  }

  return (
    <Screen padded={false} scroll={false}>
      <FlashList
        data={historyItems}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        getItemType={item => item.type}
        ListHeaderComponent={
          <ProductionHeader
            stats={productionStats}
            filters={filters}
            setFilters={setFilters}
            showFilters={showFilters}
            setShowFilters={setShowFilters}
            products={products}
            onApplyFilters={onRefresh}
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        }
        estimatedItemSize={120}
        ListEmptyComponent={<EmptyState title="Nenhum lançamento registrado" />}
        contentContainerStyle={{ paddingBottom: 80 }}
      />
      <FAB onPress={() => setFormOpen(true)} />
      <BottomSheet open={formOpen} onClose={() => setFormOpen(false)} title="Registrar Produção">
        <ProductionForm
          prodDate={prodDate}
          setProdDate={setProdDate}
          abateStr={abateStr}
          setAbateStr={setAbateStr}
          products={products}
          selected={selectedIds}
          toggleProduct={toggleProduct}
          selectAll={selectAll}
          clearSelection={clearSelection}
          errors={errors}
        />

        {selectedProducts.length > 0 && (
          <View
            style={{
              height: 1,
              backgroundColor: colors.line,
              marginVertical: spacing.lg,
              opacity: 0.5,
            }}
          />
        )}

        <View style={{ gap: spacing.md }}>
          {selectedProducts.map(p => (
            <ProductInputCard
              key={p.id}
              product={p}
              abate={abate}
              value={producedQuantities[p.id] ?? ''}
              onChangeText={(text: string) => setProducedQuantities(s => ({ ...s, [p.id]: text }))}
              meta={meta}
            />
          ))}
        </View>

        {selectedProducts.length > 0 && (
          <View style={{ marginTop: spacing.xl }}>
            <Button
              title="Registrar Produção"
              onPress={handleSave}
              loading={saving}
              disabled={saving || abate <= 0 || !selectedIds.some(id => prodNum(id) > 0)}
              full
            />
          </View>
        )}
      </BottomSheet>
    </Screen>
  );
}
