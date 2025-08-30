import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Card from '../../../components/ui/Card';
import { useTheme } from '../../../state/ThemeProvider';
import { Totals } from '../types';
import { formatNumber } from '../utils';

interface KpiDashboardProps {
  totals: Totals;
}
interface KpiCardProps {
  label: string;
  value: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  color: string;
  style?: object; // Permite passar estilos customizados
}

const KpiCard = ({ label, value, icon, color, style }: KpiCardProps) => {
  const { colors } = useTheme();
  return (
    <Card
      style={[styles.kpiCard, { borderLeftColor: color, shadowColor: colors.shadow }, style]}
      padding="md"
    >
      <View style={styles.kpiHeader}>
        <Text style={[styles.kpiLabel, { color: colors.muted }]}>{label}</Text>
        <MaterialCommunityIcons name={icon} size={18} color={colors.muted} />
      </View>
      <Text style={[styles.kpiValue, { color: color }]}>{value}</Text>
    </Card>
  );
};

export function KpiDashboard({ totals }: KpiDashboardProps) {
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={{ gap: spacing.md }}>
      <View style={styles.sectionHeader}>
        <MaterialCommunityIcons name="chart-box-outline" size={20} color={colors.primary} />
        <Text style={[typography.h2, { fontSize: 16, color: colors.text }]}>
          Indicadores de Performance
        </Text>
      </View>

      {/* CORREÇÃO: Layout da grade ajustado para ser mais robusto */}
      <View style={styles.kpiGrid}>
        <KpiCard
          label="ANIMAIS"
          value={formatNumber(totals.abate, 0)}
          icon="cow"
          color={colors.primary}
          style={styles.kpiCardWrapper}
        />
        <KpiCard
          label="PRODUÇÃO"
          value={formatNumber(totals.produced)}
          icon="package-variant-closed"
          color={colors.success}
          style={styles.kpiCardWrapper}
        />
        <KpiCard
          label="META"
          value={formatNumber(totals.meta)}
          icon="target"
          color={colors.accent}
          style={styles.kpiCardWrapper}
        />
        <KpiCard
          label={totals.diff >= 0 ? 'EXCESSO' : 'DÉFICIT'}
          value={formatNumber(Math.abs(totals.diff))}
          icon={totals.diff >= 0 ? 'trending-up' : 'trending-down'}
          color={totals.diff >= 0 ? colors.success : colors.danger}
          style={styles.kpiCardWrapper}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  kpiCardWrapper: {
    width: '48.5%', // Garante que apenas 2 cards caibam por linha
    marginBottom: 12, // Espaçamento vertical entre as linhas da grade
  },
  kpiCard: {
    minHeight: 80,
    borderLeftWidth: 3,
    ...Platform.select({
      ios: { shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
});
