// CORREÇÃO: Importados os tipos de estilo do React Native
import { DimensionValue, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../../state/ThemeProvider';

interface ProducaoSkeletonProps {
  showHeader?: boolean;
  showHistory?: boolean;
}

const ShimmerPlaceholder = ({
  width,
  height,
  style,
}: {
  // CORREÇÃO: Tipos ajustados para maior segurança
  width?: DimensionValue;
  height: number;
  style?: StyleProp<ViewStyle>;
}) => {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          // CORREÇÃO: Operador '||' trocado por '??'
          width: width ?? '100%',
          height,
          backgroundColor: colors.surfaceAlt,
          borderRadius: 8,
        },
        style,
      ]}
    />
  );
};

export default function ProducaoSkeleton({
  showHeader = true,
  showHistory = true,
}: ProducaoSkeletonProps) {
  const { spacing } = useTheme();

  return (
    <View style={[styles.container, { padding: spacing.md }]}>
      {/* Header Stats */}
      {showHeader && (
        <View style={[styles.headerSection, { marginBottom: spacing.lg }]}>
          {/* Main Stats */}
          <View style={[styles.mainStatsRow, { marginBottom: spacing.md }]}>
            <View style={[styles.statCard, { flex: 2 }]}>
              <ShimmerPlaceholder width={120} height={16} />
              <ShimmerPlaceholder width={60} height={32} style={{ marginTop: spacing.sm }} />
              <ShimmerPlaceholder width={80} height={14} style={{ marginTop: spacing.xs }} />
            </View>
            <View style={[styles.statCard, { flex: 1, marginLeft: spacing.sm }]}>
              <ShimmerPlaceholder width={80} height={16} />
              <ShimmerPlaceholder width={40} height={32} style={{ marginTop: spacing.sm }} />
            </View>
          </View>

          {/* Secondary Stats */}
          <View style={[styles.secondaryStats, { gap: spacing.sm }]}>
            {Array.from({ length: 3 }).map((_, index) => (
              <View key={index} style={styles.secondaryStat}>
                <ShimmerPlaceholder width="100%" height={60} style={{ borderRadius: 8 }} />
              </View>
            ))}
          </View>

          {/* Filter Button */}
          <View style={{ marginTop: spacing.md }}>
            <ShimmerPlaceholder height={40} style={{ borderRadius: 20 }} />
          </View>
        </View>
      )}

      {/* History Section */}
      {showHistory && (
        <View style={styles.historySection}>
          {/* Day Headers with Productions */}
          {Array.from({ length: 3 }).map((_, dayIndex) => (
            <View key={dayIndex} style={[styles.dayGroup, { marginBottom: spacing.lg }]}>
              {/* Day Header */}
              <View style={[styles.dayHeader, { marginBottom: spacing.md }]}>
                <ShimmerPlaceholder width={120} height={18} />
                <View style={[styles.headerLine, { marginLeft: spacing.md }]}>
                  <ShimmerPlaceholder height={1} />
                </View>
              </View>

              {/* Productions for this day */}
              {Array.from({ length: 2 }).map((_, prodIndex) => (
                <View key={prodIndex} style={[styles.productionCard, { marginBottom: spacing.sm }]}>
                  <View style={styles.productionHeader}>
                    <View style={styles.productionInfo}>
                      <ShimmerPlaceholder width={60} height={20} />
                      <ShimmerPlaceholder width={100} height={14} style={{ marginTop: 4 }} />
                    </View>
                    <ShimmerPlaceholder width={80} height={16} />
                  </View>

                  <View style={[styles.productionMetrics, { marginTop: spacing.sm }]}>
                    <View style={styles.metric}>
                      <ShimmerPlaceholder width={60} height={12} />
                      <ShimmerPlaceholder width={40} height={20} style={{ marginTop: 4 }} />
                    </View>
                    <View style={styles.metric}>
                      <ShimmerPlaceholder width={60} height={12} />
                      <ShimmerPlaceholder width={40} height={20} style={{ marginTop: 4 }} />
                    </View>
                    <View style={styles.metric}>
                      <ShimmerPlaceholder width={60} height={12} />
                      <ShimmerPlaceholder width={40} height={20} style={{ marginTop: 4 }} />
                    </View>
                  </View>

                  {/* Production Items Preview */}
                  <View style={[styles.itemsPreview, { marginTop: spacing.sm }]}>
                    {Array.from({ length: 3 }).map((_, itemIndex) => (
                      <View key={itemIndex} style={[styles.itemChip, { marginRight: spacing.xs }]}>
                        <ShimmerPlaceholder width={80} height={24} style={{ borderRadius: 12 }} />
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerSection: {},
  mainStatsRow: {
    flexDirection: 'row',
  },
  statCard: {
    padding: 16,
    borderRadius: 12,
  },
  secondaryStats: {
    flexDirection: 'row',
  },
  secondaryStat: {
    flex: 1,
  },
  historySection: {},
  dayGroup: {},
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLine: {
    flex: 1,
  },
  productionCard: {
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
  },
  productionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  productionInfo: {},
  productionMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metric: {
    alignItems: 'center',
  },
  itemsPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  itemChip: {},
});
