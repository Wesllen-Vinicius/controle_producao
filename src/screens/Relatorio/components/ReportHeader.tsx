import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../../state/ThemeProvider';
import { Product, Unit } from '../types';
import { toISODate } from '../utils';

import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Chip from '../../../components/ui/Chip';
import { DateField } from './DateField';

interface ReportHeaderProps {
  onExportPress: () => void;
  dateRange: { from: string; to: string };
  onDateChange: (range: { from: string; to: string }) => void;
  onApplyFilters: () => void;
  products: Product[];
  productFilters: string[];
  onProductFilterChange: (filters: string[]) => void;
  unitFilter: Unit | 'ALL';
  onUnitFilterChange: (unit: Unit | 'ALL') => void;
}

export const ReportHeader = React.memo((props: ReportHeaderProps) => {
  const { colors, spacing, typography } = useTheme();
  const {
    onExportPress,
    dateRange,
    onDateChange,
    onApplyFilters,
    products,
    productFilters,
    onProductFilterChange,
    unitFilter,
    onUnitFilterChange,
  } = props;

  const quickRange = useCallback(
    (days: 7 | 30 | 'month') => {
      const now = new Date();
      let fromDate = new Date();
      if (days === 'month') {
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else {
        fromDate.setDate(now.getDate() - days);
      }
      onDateChange({ from: toISODate(fromDate), to: toISODate(now) });
      onApplyFilters();
    },
    [onDateChange, onApplyFilters]
  );

  const toggleProductFilter = useCallback(
    (id: string) => {
      const newFilters = productFilters.includes(id)
        ? productFilters.filter(pId => pId !== id)
        : [...productFilters, id];
      onProductFilterChange(newFilters);
    },
    [productFilters, onProductFilterChange]
  );

  const unitsAvailable: Unit[] = useMemo(() => {
    if (!products) return [];
    const selectedProducts = products.filter(p => productFilters.includes(p.id));
    return Array.from(new Set(selectedProducts.map(p => p.unit)));
  }, [productFilters, products]);

  return (
    <View style={{ gap: spacing.md, marginBottom: spacing.md, paddingTop: spacing.sm }}>
      <View style={[styles.pageHeader, { paddingHorizontal: spacing.md }]}>
        <View>
          <Text style={[typography.h1, { color: colors.text }]}>Relatórios</Text>
          <Text style={[typography.body, { color: colors.muted }]}>
            Análise de performance da produção
          </Text>
        </View>
        <Pressable
          onPress={onExportPress}
          style={({ pressed }) => [
            styles.exportButton,
            { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <MaterialCommunityIcons name="download" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      <Card style={{ marginHorizontal: spacing.md }} padding="md">
        <Text style={[styles.cardTitle, { color: colors.text }]}>Período</Text>
        {/* CORREÇÃO: Campos de data agora ficam em coluna por padrão */}
        <View style={styles.dateFieldsContainer}>
          <DateField
            label="Início"
            value={dateRange.from}
            onChange={from => onDateChange({ ...dateRange, from })}
          />
          <DateField
            label="Fim"
            value={dateRange.to}
            onChange={to => onDateChange({ ...dateRange, to })}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipContainer}>
            <Chip label="7 Dias" onPress={() => quickRange(7)} />
            <Chip label="30 Dias" onPress={() => quickRange(30)} />
            <Chip label="Este Mês" onPress={() => quickRange('month')} />
          </View>
        </ScrollView>
        <Button
          title="Aplicar Período"
          onPress={onApplyFilters}
          style={{ marginTop: spacing.md }}
        />
      </Card>

      <Card style={{ marginHorizontal: spacing.md }} padding="md">
        <Text style={[styles.cardTitle, { color: colors.text }]}>Produtos</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipContainer}>
            <Chip
              label="Todos"
              active={productFilters.length === 0}
              onPress={() => onProductFilterChange([])}
            />
            {products.map(p => (
              <Chip
                key={p.id}
                label={p.name}
                active={productFilters.includes(p.id)}
                onPress={() => toggleProductFilter(p.id)}
              />
            ))}
          </View>
        </ScrollView>
        {productFilters.length > 0 && unitsAvailable.length > 1 && (
          <View style={{ marginTop: spacing.md }}>
            <Text style={[styles.subCardTitle, { color: colors.text }]}>Unidades</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: spacing.sm }}
            >
              <View style={styles.chipContainer}>
                <Chip
                  label="Todas"
                  active={unitFilter === 'ALL'}
                  onPress={() => onUnitFilterChange('ALL')}
                />
                {unitsAvailable.map(u => (
                  <Chip
                    key={u}
                    label={u.toUpperCase()}
                    active={unitFilter === u}
                    onPress={() => onUnitFilterChange(u)}
                  />
                ))}
              </View>
            </ScrollView>
          </View>
        )}
      </Card>
    </View>
  );
});
ReportHeader.displayName = 'ReportHeader';

const styles = StyleSheet.create({
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  exportButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  subCardTitle: { fontSize: 14, fontWeight: '500', marginBottom: 4 },
  dateFieldsContainer: { gap: 12, marginBottom: 12 },
  chipContainer: { flexDirection: 'row', gap: 8, alignItems: 'center' },
});
