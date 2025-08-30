// CORREÇÃO: Importados os tipos de estilo do React Native
import { LinearGradient } from 'expo-linear-gradient';
import { DimensionValue, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../../state/ThemeProvider';

interface PerfilSkeletonProps {
  showHeader?: boolean;
  showActions?: boolean;
  showSections?: boolean;
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
          // CORREÇÃO: Operador '||' trocado por '??'
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

export default function PerfilSkeleton({
  showHeader = true,
  showActions = true,
  showSections = true,
}: PerfilSkeletonProps) {
  const { colors, spacing } = useTheme();

  return (
    <LinearGradient colors={[colors.background, colors.surface + '20']} style={styles.gradient}>
      <View style={[styles.container, { padding: spacing.lg }]}>
        {/* Profile Header */}
        {showHeader && (
          <View style={[styles.profileHeader, { marginBottom: spacing.xl }]}>
            {/* Avatar */}
            <View style={styles.avatarContainer}>
              <ShimmerPlaceholder width={80} height={80} borderRadius={40} />
            </View>

            {/* User Info */}
            <View style={[styles.userInfo, { marginTop: spacing.md }]}>
              <ShimmerPlaceholder width={160} height={24} style={{ alignSelf: 'center' }} />
              <View style={{ marginTop: spacing.xs }}>
                <ShimmerPlaceholder width={200} height={16} style={{ alignSelf: 'center' }} />
              </View>
              <View style={{ marginTop: spacing.xs }}>
                <ShimmerPlaceholder width={120} height={14} style={{ alignSelf: 'center' }} />
              </View>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        {showActions && (
          <View style={[styles.actionButtons, { marginBottom: spacing.xl, gap: spacing.sm }]}>
            <ShimmerPlaceholder height={50} borderRadius={25} />
            <ShimmerPlaceholder height={50} borderRadius={25} />
          </View>
        )}

        {/* Settings Sections */}
        {showSections && (
          <View style={[styles.sectionsContainer, { gap: spacing.lg }]}>
            {/* Theme Section */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconTitle, { gap: spacing.sm }]}>
                  <ShimmerPlaceholder width={24} height={24} borderRadius={12} />
                  <ShimmerPlaceholder width={100} height={18} />
                </View>
              </View>
              <View style={[styles.sectionContent, { marginTop: spacing.md }]}>
                <View style={styles.themeToggle}>
                  <ShimmerPlaceholder width={60} height={32} borderRadius={16} />
                  <ShimmerPlaceholder width={80} height={16} />
                </View>
              </View>
            </View>

            {/* Support Section */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconTitle, { gap: spacing.sm }]}>
                  <ShimmerPlaceholder width={24} height={24} borderRadius={12} />
                  <ShimmerPlaceholder width={80} height={18} />
                </View>
              </View>
              <View style={[styles.sectionContent, { marginTop: spacing.md, gap: spacing.sm }]}>
                {Array.from({ length: 2 }).map((_, index) => (
                  <View key={index} style={styles.supportItem}>
                    <ShimmerPlaceholder width={20} height={20} borderRadius={10} />
                    <ShimmerPlaceholder width={120} height={16} />
                    <ShimmerPlaceholder width={16} height={16} borderRadius={8} />
                  </View>
                ))}
              </View>
            </View>

            {/* App Info Section */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconTitle, { gap: spacing.sm }]}>
                  <ShimmerPlaceholder width={24} height={24} borderRadius={12} />
                  <ShimmerPlaceholder width={120} height={18} />
                </View>
              </View>
              <View style={[styles.sectionContent, { marginTop: spacing.md, gap: spacing.xs }]}>
                <ShimmerPlaceholder width={150} height={14} />
                <ShimmerPlaceholder width={100} height={14} />
              </View>
            </View>

            {/* Danger Zone */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconTitle, { gap: spacing.sm }]}>
                  <ShimmerPlaceholder width={24} height={24} borderRadius={12} />
                  <ShimmerPlaceholder width={100} height={18} />
                </View>
              </View>
              <View style={[styles.sectionContent, { marginTop: spacing.md }]}>
                <ShimmerPlaceholder height={16} />
                <View style={{ marginTop: spacing.sm }}>
                  <ShimmerPlaceholder height={40} borderRadius={20} />
                </View>
              </View>
            </View>
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
  profileHeader: {
    alignItems: 'center',
  },
  avatarContainer: {
    alignItems: 'center',
  },
  userInfo: {
    alignItems: 'center',
    gap: 4,
  },
  actionButtons: {
    flexDirection: 'row',
  },
  sectionsContainer: {},
  sectionCard: {
    padding: 16,
    borderRadius: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionIconTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionContent: {},
  themeToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  supportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
});
