import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../../state/ThemeProvider';
import { ProductTotals } from '../types';
import { formatNumber } from '../utils';

// A prop 'diff' agora é opcional, pois vamos recalculá-la.
type ProductTotalTileProps = Omit<ProductTotals, 'diff'> & { diff?: number };

export function ProductTotalTile(props: ProductTotalTileProps) {
  const { name, unit, produced, meta } = props;
  const { colors, spacing } = useTheme();

  // --- CORREÇÃO PRINCIPAL ---
  // Recalculamos a porcentagem e a diferença aqui para garantir a precisão.
  const progress = meta > 0 ? produced / meta : 0; // Porcentagem como decimal (ex: 0.95)
  const calculatedDiff = produced - meta; // Diferença real
  // --- FIM DA CORREÇÃO ---

  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(progressAnim, {
      toValue: progress,
      useNativeDriver: false,
      stiffness: 120,
      damping: 15,
    }).start();
  }, [progress, progressAnim]);

  const performanceColor =
    progress >= 0.9 ? colors.success : progress >= 0.7 ? '#F59E0B' : colors.danger;
  const isSurplus = calculatedDiff >= 0;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderLeftColor: performanceColor,
          shadowColor: colors.shadow,
        },
      ]}
    >
      <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
        {name}
      </Text>
      <View style={[styles.unitPill, { backgroundColor: colors.primary + '15' }]}>
        <Text style={[styles.unitText, { color: colors.primary }]}>{unit.toUpperCase()}</Text>
      </View>

      <View style={[styles.progressBarBg, { backgroundColor: colors.surfaceAlt }]}>
        <Animated.View
          style={{
            height: '100%',
            backgroundColor: performanceColor,
            borderRadius: 4,
            width: progressAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
              extrapolate: 'clamp',
            }),
          }}
        />
      </View>

      <View style={{ gap: spacing.xs }}>
        <InfoLine
          icon="check-circle-outline"
          label={`Eficiência`}
          value={`${Math.round(progress * 100)}%`}
          valueColor={performanceColor}
        />
        <InfoLine
          icon={isSurplus ? 'arrow-top-right' : 'arrow-bottom-left'}
          label={isSurplus ? 'Excesso' : 'Déficit'}
          value={`${formatNumber(Math.abs(calculatedDiff), 1)} ${unit}`}
          valueColor={isSurplus ? colors.success : colors.danger}
        />
      </View>
    </View>
  );
}

const InfoLine = ({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  value: string;
  valueColor: string;
}) => {
  const { colors } = useTheme();
  return (
    <View style={styles.infoLine}>
      <View style={styles.infoLabelContainer}>
        <MaterialCommunityIcons name={icon} size={14} color={colors.muted} />
        <Text style={[styles.infoLabel, { color: colors.muted }]}>{label}</Text>
      </View>
      <Text style={[styles.infoValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
};

ProductTotalTile.displayName = 'ProductTotalTile';

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 12,
    borderLeftWidth: 4,
    gap: 10,
    minHeight: 135,
    ...Platform.select({
      ios: { shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  productName: { fontSize: 14, fontWeight: '600', lineHeight: 18 },
  unitPill: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  unitText: { color: '#007AFF', fontWeight: '600', fontSize: 10 },
  progressBarBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  infoLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabelContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoLabel: { fontSize: 12, fontWeight: '500' },
  infoValue: { fontSize: 12, fontWeight: '700' },
});
