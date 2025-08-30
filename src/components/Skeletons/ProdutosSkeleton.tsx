// CORREÇÃO: Importados os tipos de estilo do React Native
import { DimensionValue, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../../state/ThemeProvider';

interface ProdutosSkeletonProps {
  showHeader?: boolean;
  showStats?: boolean;
  showForm?: boolean;
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

export default function ProdutosSkeleton({
  showHeader = true,
  showStats = true,
  showForm = true,
  showList = true,
}: ProdutosSkeletonProps) {
  const { colors, spacing } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { padding: spacing.md, gap: spacing.lg, backgroundColor: colors.background },
      ]}
    >
      {/* Header */}
      {showHeader && (
        <View style={[styles.header, { marginBottom: spacing.lg }]}>
          <View style={styles.titleSection}>
            <ShimmerPlaceholder width={120} height={24} />
            <View style={{ marginTop: spacing.xs }}>
              <ShimmerPlaceholder width={180} height={16} />
            </View>
          </View>
          <View style={styles.adminBadge}>
            <ShimmerPlaceholder width={50} height={20} borderRadius={16} />
          </View>
        </View>
      )}

      {/* Stats Dashboard */}
      {showStats && (
        <View style={[styles.statsSection, { marginBottom: spacing.lg }]}>
          <View style={[styles.statsGrid, { gap: spacing.md }]}>
            <View style={styles.statCard}>
              <ShimmerPlaceholder width={32} height={32} borderRadius={16} />
              <View style={{ marginTop: spacing.sm }}>
                <ShimmerPlaceholder width={40} height={24} />
                <View style={{ marginTop: spacing.xs }}>
                  <ShimmerPlaceholder width={80} height={14} />
                </View>
              </View>
            </View>
            <View style={styles.statCard}>
              <ShimmerPlaceholder width={32} height={32} borderRadius={16} />
              <View style={{ marginTop: spacing.sm }}>
                <ShimmerPlaceholder width={30} height={24} />
                <View style={{ marginTop: spacing.xs }}>
                  <ShimmerPlaceholder width={90} height={14} />
                </View>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Product Form */}
      {showForm && (
        <View style={[styles.formSection, { marginBottom: spacing.lg }]}>
          <View style={styles.formCard}>
            <View style={[styles.formHeader, { marginBottom: spacing.md }]}>
              <ShimmerPlaceholder width={140} height={20} />
              <ShimmerPlaceholder width={24} height={24} borderRadius={12} />
            </View>

            <View style={[styles.formFields, { gap: spacing.md }]}>
              {/* Product Name Field */}
              <View>
                <ShimmerPlaceholder width={60} height={14} style={{ marginBottom: spacing.xs }} />
                <ShimmerPlaceholder height={48} borderRadius={24} />
              </View>

              {/* Unit Field */}
              <View>
                <ShimmerPlaceholder width={50} height={14} style={{ marginBottom: spacing.xs }} />
                <ShimmerPlaceholder height={48} borderRadius={24} />
              </View>

              {/* Meta per Animal Field */}
              <View>
                <ShimmerPlaceholder width={120} height={14} style={{ marginBottom: spacing.xs }} />
                <ShimmerPlaceholder height={48} borderRadius={24} />
              </View>

              {/* Action Buttons */}
              <View style={[styles.formActions, { gap: spacing.sm, marginTop: spacing.md }]}>
                <ShimmerPlaceholder height={48} style={{ flex: 1 }} borderRadius={24} />
                <ShimmerPlaceholder height={48} style={{ flex: 1 }} borderRadius={24} />
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Products List */}
      {showList && (
        <View style={styles.listSection}>
          <View style={[styles.listHeader, { marginBottom: spacing.lg }]}>
            <ShimmerPlaceholder width={100} height={20} />
            <ShimmerPlaceholder width={60} height={16} />
          </View>

          {Array.from({ length: 6 }).map((_, index) => (
            <View key={index} style={[styles.listItem, { marginBottom: spacing.md }]}>
              <View style={styles.productInfo}>
                <View style={styles.productIcon}>
                  <ShimmerPlaceholder width={40} height={40} borderRadius={20} />
                </View>
                <View style={[styles.productDetails, { marginLeft: spacing.sm }]}>
                  <ShimmerPlaceholder width={120} height={16} />
                  <View style={{ marginTop: spacing.xs }}>
                    <ShimmerPlaceholder width={80} height={14} />
                  </View>
                  <View style={{ marginTop: spacing.xs }}>
                    <ShimmerPlaceholder width={100} height={12} />
                  </View>
                </View>
              </View>
              <View style={styles.productActions}>
                <ShimmerPlaceholder width={32} height={32} borderRadius={16} />
              </View>
            </View>
          ))}

          {/* Load More Button */}
          <View style={{ marginTop: spacing.lg }}>
            <ShimmerPlaceholder height={44} borderRadius={22} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleSection: {},
  adminBadge: {
    padding: 8,
  },
  statsSection: {},
  statsGrid: {
    flexDirection: 'row',
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  formSection: {},
  formCard: {
    padding: 16,
    borderRadius: 16,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  formFields: {},
  formActions: {
    flexDirection: 'row',
  },
  listSection: {},
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  productIcon: {},
  productDetails: {
    flex: 1,
  },
  productActions: {},
});
