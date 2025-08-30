// src/screens/Estoque/components/DayHeader.tsx
import { memo } from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../../../state/ThemeProvider';

const DayHeader = memo(function DayHeader({ title }: { title: string }) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View
      style={{ paddingHorizontal: spacing.md, marginTop: spacing.lg, marginBottom: spacing.sm }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingVertical: spacing.sm,
        }}
      >
        <View
          style={{
            backgroundColor: colors.primary + '20',
            paddingVertical: spacing.xs,
            paddingHorizontal: spacing.sm,
            borderRadius: radius.sm,
            borderLeftWidth: 3,
            borderLeftColor: colors.primary,
          }}
        >
          <Text
            style={{ fontWeight: '800', color: colors.primary, fontSize: 13, letterSpacing: 0.5 }}
          >
            {title}
          </Text>
        </View>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.line, opacity: 0.5 }} />
      </View>
    </View>
  );
});

export default DayHeader;
