// Produtos/components/StatsDashboard.tsx

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
// ATENÇÃO: Ajuste o caminho para seus hooks/providers
import { useTheme } from '@/state/ThemeProvider';

// Definindo os tipos para as props do StatCard para remover o erro de "implicit any"
type StatCardProps = {
  label: string;
  value: number | string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; // Tipo forte para o ícone
  color: string;
};

const StatCard = ({ label, value, icon, color }: StatCardProps) => {
  const { colors, spacing, radius, typography } = useTheme();

  // CORREÇÃO: Usando useMemo e StyleSheet.create para tipagem correta dos estilos
  const styles = useMemo(
    () =>
      StyleSheet.create({
        statCard: {
          flex: 1,
          padding: spacing.md,
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.line,
          gap: spacing.xs,
          elevation: 1,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          borderLeftWidth: 3,
        },
        statHeader: {
          flexDirection: 'row',
          alignItems: 'center', // Tipagem correta
          justifyContent: 'space-between',
        },
        valueText: {
          ...typography.h1,
          color: color,
          fontSize: 22,
          letterSpacing: -0.5,
        },
        labelText: {
          ...typography.label,
          color: colors.muted,
        },
      }),
    [colors, radius, spacing, typography, color]
  );

  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <Text style={styles.labelText}>{label}</Text>
        <MaterialCommunityIcons name={icon} size={14} color={colors.muted} />
      </View>
      <Text style={styles.valueText}>{value}</Text>
    </View>
  );
};

type Props = { totalProducts: number; totalUnits: number };

const StatsDashboard = ({ totalProducts, totalUnits }: Props) => {
  const { colors, spacing } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        statsRow: {
          flexDirection: 'row',
          gap: spacing.sm,
        },
      }),
    [spacing]
  );

  return (
    <View style={styles.statsRow}>
      <StatCard
        label="TOTAL PRODUTOS"
        value={totalProducts}
        icon="package-variant"
        color={colors.primary}
      />
      <StatCard
        label="UNIDADES ATIVAS"
        value={totalUnits}
        icon="format-list-bulleted-type"
        color={colors.accent}
      />
    </View>
  );
};

export default React.memo(StatsDashboard);
