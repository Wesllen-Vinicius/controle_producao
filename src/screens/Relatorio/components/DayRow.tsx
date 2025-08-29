import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useCallback, useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../../state/ThemeProvider';
import { DayTotals } from '../types';
import { formatNumber, labelForDate } from '../utils';

interface DayRowProps {
  item: DayTotals;
  hasProductFilter: boolean;
}

export function DayRow({ item, hasProductFilter }: DayRowProps) {
  const { colors, spacing } = useTheme();
  const progress = item.meta > 0 ? Math.min(1, Math.max(0, item.produced / item.meta)) : 0;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(progressAnim, { toValue: progress, useNativeDriver: false, stiffness: 120, damping: 12 }).start();
  }, [progress, progressAnim]);

  const performanceColor = progress >= 0.9 ? colors.success : progress >= 0.7 ? '#F59E0B' : colors.danger;

  const Metric = useCallback(({ label, value, color, align = 'flex-start' }: { label: string, value: string, color: string, align?: 'flex-start' | 'center' | 'flex-end' }) => (
    <View style={{ alignItems: align, flex: 1 }}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
    </View>
  ), []);

  return (
    <View style={[ styles.container, { backgroundColor: colors.surface, borderLeftColor: performanceColor, shadowColor: colors.shadow }]}>
      <View style={styles.header}>
        <Text style={[styles.headerText, { color: colors.text }]}>{labelForDate(item.date)}</Text>
        <View style={[styles.abatePill, { backgroundColor: colors.primary + '15' }]}>
          <MaterialCommunityIcons name="cow" size={14} color={colors.primary} />
          <Text style={[styles.abateText, { color: colors.primary }]}>{item.abate || 0}</Text>
        </View>
      </View>

      {hasProductFilter ? (
        <View style={{ gap: spacing.md }}>
          <View style={styles.metricsContainer}>
            <Metric label="Produzido" value={formatNumber(item.produced)} color={colors.success} />
            <Metric label="Meta" value={formatNumber(item.meta)} color={colors.text} align="center" />
            <Metric label={item.diff >= 0 ? 'Excesso' : 'Déficit'} value={formatNumber(Math.abs(item.diff))} color={item.diff >= 0 ? colors.success : colors.danger} align="flex-end" />
          </View>

          <View>
            <View style={[styles.progressBarBg, { backgroundColor: colors.surfaceAlt }]}>
              <Animated.View style={{ height: '100%', backgroundColor: performanceColor, width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'], extrapolate: 'clamp' }), borderRadius: 4 }} />
            </View>
            <View style={styles.progressLabelContainer}>
              <Text style={[styles.progressLabel, { color: colors.muted }]}>Eficiência</Text>
              <Text style={[styles.progressValue, { color: performanceColor }]}>{Math.round(progress * 100)}%</Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={[styles.noFilterContainer, { backgroundColor: colors.accent + '10' }]}>
            <MaterialCommunityIcons name="filter-variant" size={18} color={colors.accent} />
            <Text style={[styles.noFilterText, { color: colors.accent }]}>
                Selecione produtos para ver métricas detalhadas.
            </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
    container: { borderRadius: 16, padding: 16, borderLeftWidth: 4, gap: 12, ...Platform.select({ ios: { shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 5 }, android: { elevation: 2 } }) },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerText: { fontSize: 16, fontWeight: '600' },
    abatePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    abateText: { fontWeight: '600', fontSize: 12 },
    metricsContainer: { flexDirection: 'row', justifyContent: 'space-between' },
    metricLabel: { color: '#888', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
    metricValue: { fontSize: 15, fontWeight: '700' },
    progressBarBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
    progressLabelContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
    progressLabel: { fontSize: 11, fontWeight: '500' },
    progressValue: { fontSize: 11, fontWeight: '700' },
    noFilterContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 8 },
    noFilterText: { fontWeight: '500', flex: 1, fontSize: 13 },
});
