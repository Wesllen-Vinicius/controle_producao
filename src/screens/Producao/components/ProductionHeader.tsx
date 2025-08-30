// src/screens/Producao/components/ProductionHeader.tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import DateField from '../../../components/DateField';
import Button from '../../../components/ui/Button';
import { useTheme } from '../../../state/ThemeProvider';
import { Product, ProductionFilters, ProductionStats } from '../types';
import { todayStr } from '../utils';

type Props = {
  stats: ProductionStats;
  filters: ProductionFilters;
  setFilters: React.Dispatch<React.SetStateAction<ProductionFilters>>;
  showFilters: boolean;
  setShowFilters: React.Dispatch<React.SetStateAction<boolean>>;
  products: Product[] | null;
  onApplyFilters: () => void;
};

const ProductionHeader = memo(
  ({
    stats,
    filters,
    setFilters,
    showFilters,
    setShowFilters,
    onApplyFilters,
  }: Omit<Props, 'products'>) => {
    const { colors, spacing, typography } = useTheme();

    return (
      <View
        style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md }}
      >
        <View style={{ marginBottom: spacing.xl }}>
          <Text
            style={[typography.h1, { fontSize: 28, color: colors.text, marginBottom: spacing.xs }]}
          >
            Produção
          </Text>
          <Text style={{ color: colors.muted, fontSize: 15, fontWeight: '500' }}>
            {stats.thisMonth} registros este mês
          </Text>
        </View>

        {/* Quick Stats */}
        <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl }}>
          {/* Total */}
          <View
            style={{
              flex: 1,
              backgroundColor: colors.surfaceAlt,
              padding: spacing.md,
              borderRadius: 16,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text }}>
              {stats.total}
            </Text>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.muted }}>Total</Text>
          </View>
          {/* This Month */}
          <View
            style={{
              flex: 1,
              backgroundColor: colors.success + '15',
              padding: spacing.md,
              borderRadius: 16,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 24, fontWeight: '800', color: colors.success }}>
              {stats.thisMonth}
            </Text>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.muted }}>Este Mês</Text>
          </View>
          {/* Avg Animals */}
          <View
            style={{
              flex: 1,
              backgroundColor: colors.primary + '15',
              padding: spacing.md,
              borderRadius: 16,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 24, fontWeight: '800', color: colors.primary }}>
              {stats.avgAnimals}
            </Text>
            <Text
              style={{ fontSize: 12, fontWeight: '600', color: colors.muted, textAlign: 'center' }}
            >
              Média Abate
            </Text>
          </View>
        </View>

        {/* Filter Toggle */}
        <Pressable
          onPress={() => setShowFilters(s => !s)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            paddingVertical: spacing.sm,
            marginBottom: showFilters ? spacing.lg : spacing.md,
          }}
        >
          <MaterialCommunityIcons name="filter-variant" size={20} color={colors.muted} />
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.muted }}>Filtrar</Text>
          {(filters.productIds.length > 0 || filters.fromDate) && (
            <View
              style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }}
            />
          )}
          <MaterialCommunityIcons
            name={showFilters ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.muted}
          />
        </Pressable>

        {/* Filter Panel */}
        {showFilters && (
          <View
            style={{
              backgroundColor: colors.surfaceAlt,
              padding: spacing.lg,
              borderRadius: 16,
              marginBottom: spacing.lg,
              gap: spacing.md,
            }}
          >
            <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <DateField
                  label=""
                  value={filters.fromDate}
                  onChange={v => setFilters(f => ({ ...f, fromDate: v }))}
                  placeholder="Data inicial"
                />
              </View>
              <Text style={{ color: colors.muted, fontSize: 14 }}>até</Text>
              <View style={{ flex: 1 }}>
                <DateField
                  label=""
                  value={filters.toDate}
                  onChange={v => setFilters(f => ({ ...f, toDate: v }))}
                  placeholder="Data final"
                />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button
                title="Aplicar"
                onPress={onApplyFilters}
                style={{ flex: 1 }}
                variant="primary"
              />
              <Button
                title="Limpar"
                variant="text"
                onPress={() => {
                  setFilters({ fromDate: '', toDate: todayStr(), productIds: [] });
                  onApplyFilters();
                }}
              />
            </View>
          </View>
        )}

        {/* History Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: spacing.lg,
          }}
        >
          <Text style={[typography.h2, { fontSize: 20, color: colors.text }]}>Histórico</Text>
          {(filters.productIds.length > 0 || filters.fromDate) && (
            <View
              style={{
                backgroundColor: colors.primary + '20',
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
                borderRadius: 12,
              }}
            >
              <Text style={{ fontSize: 10, color: colors.primary, fontWeight: '700' }}>
                FILTRADO
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }
);

export default ProductionHeader;

ProductionHeader.displayName = 'ProductionHeader';
