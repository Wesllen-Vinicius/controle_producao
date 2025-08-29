import { FlashList, ListRenderItem } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useState } from 'react';
import { RefreshControl, StatusBar, StyleSheet, View, useColorScheme } from 'react-native';

import { useHaptics } from '../../hooks/useHaptics';
import { useAuth } from '../../state/AuthProvider';
import { useTheme } from '../../state/ThemeProvider';
import { useReportData } from './hooks/useReportData';
import { DayTotals } from './types';

import Screen from '../../components/Screen';
import EmptyState from '../../components/ui/EmptyState';


import { BarsChart } from './components/BarsChart'; // 1. Importar o gráfico
import { DayRow } from './components/DayRow';
import { ExportSheet } from './components/ExportSheet';
import { KpiDashboard } from './components/KpiDashboard';
import { ProductTotalsSection } from './components/ProductTotalsSection';
import { ReportHeader } from './components/ReportHeader';
import { SortSheet } from './components/SortSheet';
import SkeletonList from '@/components/SkeletonList';

export default function AdminProductionsReportScreen() {
  const { profile } = useAuth();
  const { colors, spacing } = useTheme();
  const colorScheme = useColorScheme();
  const haptics = useHaptics();

  const [exportOpen, setExportOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const {
    loading, products, dailyTotals, productTotals, totals, hasProductFilter,
    chartSeries, chartUnit, // 2. Obter dados para o gráfico do hook
    dateRange, setDateRange, productFilters, setProductFilters,
    unitFilter, setUnitFilter, sortTotalsBy, setSortTotalsBy,
    onRefresh,
  } = useReportData();

  const handleRefresh = useCallback(async () => {
    haptics.light();
    await onRefresh();
  }, [onRefresh, haptics]);

  const renderItem = useCallback<ListRenderItem<DayTotals>>(({ item }) => (
      <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.sm }}>
          <DayRow item={item} hasProductFilter={hasProductFilter} />
      </View>
  ), [hasProductFilter, spacing]);

  if (profile?.role !== 'admin') {
    return <EmptyState title="Acesso Negado" subtitle="Esta área é restrita para administradores." icon="account-lock-outline" />;
  }

  const ListHeader = () => (
    <>
      <ReportHeader
        products={products}
        dateRange={dateRange}
        productFilters={productFilters}
        unitFilter={unitFilter}
        onDateChange={setDateRange}
        onProductFilterChange={setProductFilters}
        onUnitFilterChange={setUnitFilter}
        onExportPress={() => setExportOpen(true)}
        onApplyFilters={handleRefresh}
      />
      {/* 3. Renderizar KPIs e Gráfico quando houver filtro */}
      {hasProductFilter && totals && (
        <View style={{paddingHorizontal: spacing.md, gap: spacing.lg, marginBottom: spacing.md}}>
            <KpiDashboard totals={totals} />
            <BarsChart data={chartSeries} unit={chartUnit} />
        </View>
      )}
    </>
  );

  const ListEmpty = () => {
    if (loading && !dailyTotals.length && !productTotals.length) {
      return <View style={{padding: spacing.md}}><SkeletonList rows={8} /></View>;
    }
    if (!hasProductFilter) {
      return <ProductTotalsSection totals={productTotals} onSortPress={() => setSortOpen(true)} />;
    }
    return <EmptyState title="Nenhum registro encontrado" subtitle="Não há dados de produção para os filtros e o período selecionados." />;
  };

  return (
    <Screen padded={false} scroll={false} edges={['top', 'left', 'right', 'bottom']}>
      <LinearGradient colors={[colors.background, colors.surface + '80', colors.background]} style={styles.gradient}>
        <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

        <FlashList
          data={hasProductFilter ? dailyTotals : []}
          keyExtractor={(item) => (item as DayTotals).date}
          renderItem={renderItem}
          estimatedItemSize={160}
          ListHeaderComponent={<ListHeader />}
          ListEmptyComponent={<ListEmpty />}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
          contentContainerStyle={styles.listContent}
        />

        <ExportSheet
          open={exportOpen}
          onClose={() => setExportOpen(false)}
          hasProductFilter={hasProductFilter}
          data={hasProductFilter ? dailyTotals : productTotals}
        />
        <SortSheet
          open={sortOpen}
          onClose={() => setSortOpen(false)}
          currentSort={sortTotalsBy}
          onSortChange={setSortTotalsBy}
        />
      </LinearGradient>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  listContent: { paddingBottom: 100 },
});
