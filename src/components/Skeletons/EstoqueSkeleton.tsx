// CORREÇÃO: Importado o tipo 'DimensionValue' para tipagem correta de estilos.
import { DimensionValue, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../../state/ThemeProvider';

interface EstoqueSkeletonProps {
  showHeader?: boolean;
  showBalances?: boolean;
  showHistory?: boolean;
}

const ShimmerPlaceholder = ({
  width,
  height,
  style,
}: {
  // CORREÇÃO: O tipo da prop 'width' foi ajustado para 'DimensionValue'.
  width?: DimensionValue;
  height: number;
  style?: StyleProp<ViewStyle>;
}) => {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
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

export default function EstoqueSkeleton({
  showHeader = true,
  showBalances = true,
  showHistory = true,
}: EstoqueSkeletonProps) {
  const { spacing } = useTheme();

  return (
    <View style={[styles.container, { padding: spacing.md }]}>
      {/* Header Stats */}
      {showHeader && (
        <View style={[styles.headerSection, { marginBottom: spacing.lg }]}>
          <View style={[styles.statsRow, { gap: spacing.sm }]}>
            <ShimmerPlaceholder height={80} style={{ flex: 1, borderRadius: 12 }} />
            <ShimmerPlaceholder height={80} style={{ flex: 1, borderRadius: 12 }} />
            <ShimmerPlaceholder height={80} style={{ flex: 1, borderRadius: 12 }} />
          </View>
          <View style={{ marginTop: spacing.sm }}>
            <ShimmerPlaceholder height={40} style={{ borderRadius: 20 }} />
          </View>
        </View>
      )}

      {/* Balance Cards */}
      {showBalances && (
        <View style={[styles.balanceSection, { marginBottom: spacing.lg }]}>
          {Array.from({ length: 3 }).map((_, index) => (
            <View key={index} style={[styles.balanceCard, { marginBottom: spacing.sm }]}>
              <View style={styles.balanceHeader}>
                <ShimmerPlaceholder width={120} height={16} />
                <ShimmerPlaceholder width={60} height={16} />
              </View>
              <View style={[styles.balanceBody, { marginTop: spacing.sm }]}>
                <ShimmerPlaceholder width={80} height={24} />
                <ShimmerPlaceholder width={40} height={14} />
              </View>
              <View style={[styles.progressBar, { marginTop: spacing.sm }]}>
                <ShimmerPlaceholder height={4} style={{ borderRadius: 2 }} />
              </View>
            </View>
          ))}
        </View>
      )}

      {/* History Section */}
      {showHistory && (
        <View style={styles.historySection}>
          {/* Section Title */}
          <View style={[styles.sectionTitle, { marginBottom: spacing.md }]}>
            <ShimmerPlaceholder width={24} height={20} />
            <ShimmerPlaceholder width={180} height={20} />
          </View>

          {/* History Items */}
          {Array.from({ length: 4 }).map((_, index) => (
            <View key={index} style={[styles.historyItem, { marginBottom: spacing.md }]}>
              <View style={styles.historyHeader}>
                <ShimmerPlaceholder width={100} height={14} />
                <ShimmerPlaceholder width={60} height={14} />
              </View>
              <View style={[styles.historyBody, { marginTop: spacing.sm }]}>
                <ShimmerPlaceholder width={40} height={40} style={{ borderRadius: 20 }} />
                <View style={[styles.historyDetails, { marginLeft: spacing.sm }]}>
                  <ShimmerPlaceholder width={150} height={16} />
                  <ShimmerPlaceholder width={100} height={14} style={{ marginTop: 4 }} />
                </View>
                <ShimmerPlaceholder width={60} height={20} />
              </View>
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
  statsRow: {
    flexDirection: 'row',
  },
  balanceSection: {},
  balanceCard: {
    padding: 16,
    borderRadius: 12,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressBar: {},
  historySection: {},
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyItem: {
    padding: 16,
    borderRadius: 12,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyBody: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyDetails: {
    flex: 1,
  },
});
