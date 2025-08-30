// CORREÇÃO: Importados os tipos de estilo do React Native
import { LinearGradient } from 'expo-linear-gradient';
import { DimensionValue, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../../state/ThemeProvider';

interface RelatorioSkeletonProps {
  showHeader?: boolean;
  showFilters?: boolean;
  showKpis?: boolean;
  showChart?: boolean;
  showList?: boolean;
}

const ShimmerPlaceholder = ({
  width,
  height,
  style,
  borderRadius = 8,
}: {
  // CORREÇÃO: Tipos ajustados para maior segurança
  width?: DimensionValue;
  height: number;
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
}) => {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          width: width ?? '100%',
          height,
          backgroundColor: colors.surfaceAlt,
          borderRadius,
        },
        style,
      ]}
    />
  );
};

export default function RelatorioSkeleton({
  showHeader = true,
  showFilters = true,
  showKpis = true,
  showChart = true,
  showList = true,
}: RelatorioSkeletonProps) {
  const { colors, spacing } = useTheme();

  return (
    <LinearGradient
      colors={[colors.background, colors.surface + '80', colors.background]}
      style={styles.gradient}
    >
      <View style={[styles.container, { padding: spacing.lg }]}>
        {/* Header */}
        {showHeader && (
          <View style={[styles.header, { marginBottom: spacing.xl }]}>
            <View style={styles.titleSection}>
              <ShimmerPlaceholder width={140} height={28} />
              <View style={{ marginTop: spacing.xs }}>
                <ShimmerPlaceholder width={180} height={16} />
              </View>
            </View>
            <ShimmerPlaceholder width={40} height={40} borderRadius={20} />
          </View>
        )}

        {/* Filters */}
        {showFilters && (
          <View style={[styles.filtersSection, { marginBottom: spacing.xl }]}>
            <View style={[styles.filterRow, { gap: spacing.sm, marginBottom: spacing.md }]}>
              <ShimmerPlaceholder height={48} style={{ flex: 1 }} borderRadius={24} />
              <ShimmerPlaceholder height={48} style={{ flex: 1 }} borderRadius={24} />
            </View>
            <View style={[styles.filterRow, { gap: spacing.sm, marginBottom: spacing.md }]}>
              <ShimmerPlaceholder height={40} style={{ flex: 1 }} borderRadius={20} />
              <ShimmerPlaceholder height={40} style={{ flex: 1 }} borderRadius={20} />
            </View>
            <ShimmerPlaceholder height={44} borderRadius={22} />
          </View>
        )}

        {/* KPIs */}
        {showKpis && (
          <View style={[styles.kpisSection, { marginBottom: spacing.xl }]}>
            <View style={[styles.kpisGrid, { gap: spacing.md }]}>
              {Array.from({ length: 4 }).map((_, index) => (
                <View key={index} style={styles.kpiCard}>
                  <ShimmerPlaceholder width={60} height={32} />
                  <View style={{ marginTop: spacing.xs }}>
                    <ShimmerPlaceholder width={80} height={14} />
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Chart */}
        {showChart && (
          <View style={[styles.chartSection, { marginBottom: spacing.xl }]}>
            <View style={styles.chartHeader}>
              <ShimmerPlaceholder width={100} height={20} />
              <ShimmerPlaceholder width={60} height={16} />
            </View>
            <View style={[styles.chartArea, { marginTop: spacing.md }]}>
              <ShimmerPlaceholder height={200} borderRadius={12} />
            </View>
          </View>
        )}

        {/* List Items */}
        {showList && (
          <View style={styles.listSection}>
            <View style={[styles.listHeader, { marginBottom: spacing.lg }]}>
              <ShimmerPlaceholder width={120} height={20} />
              <ShimmerPlaceholder width={80} height={16} />
            </View>

            {Array.from({ length: 6 }).map((_, index) => (
              <View key={index} style={[styles.listItem, { marginBottom: spacing.md }]}>
                <View style={styles.listItemHeader}>
                  <ShimmerPlaceholder width={100} height={18} />
                  <ShimmerPlaceholder width={60} height={16} />
                </View>
                <View style={[styles.listItemStats, { marginTop: spacing.sm, gap: spacing.sm }]}>
                  <View style={styles.statItem}>
                    <ShimmerPlaceholder width={20} height={20} borderRadius={10} />
                    <View style={{ flex: 1, marginLeft: spacing.sm }}>
                      <ShimmerPlaceholder width={100} height={14} />
                      <View style={{ marginTop: 4 }}>
                        <ShimmerPlaceholder width={80} height={12} />
                      </View>
                    </View>
                    <ShimmerPlaceholder width={50} height={16} />
                  </View>
                  <View style={styles.statItem}>
                    <ShimmerPlaceholder width={20} height={20} borderRadius={10} />
                    <View style={{ flex: 1, marginLeft: spacing.sm }}>
                      <ShimmerPlaceholder width={90} height={14} />
                      <View style={{ marginTop: 4 }}>
                        <ShimmerPlaceholder width={70} height={12} />
                      </View>
                    </View>
                    <ShimmerPlaceholder width={45} height={16} />
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleSection: {},
  filtersSection: {},
  filterRow: {
    flexDirection: 'row',
  },
  kpisSection: {},
  kpisGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  kpiCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  chartSection: {},
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chartArea: {},
  listSection: {},
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listItem: {
    padding: 16,
    borderRadius: 12,
  },
  listItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listItemStats: {},
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
