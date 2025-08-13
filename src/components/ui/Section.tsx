import React from 'react';
import { StyleProp, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../../state/ThemeProvider';

type Props = { title: string; subtitle?: string; right?: React.ReactNode; style?: StyleProp<ViewStyle>; children?: React.ReactNode };

export default function Section({ title, subtitle, right, style, children }: Props) {
  const { typography, colors, spacing } = useTheme();
  return (
    <View style={style}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: spacing.sm }}>
        <View>
          <Text style={typography.h2}>{title}</Text>
          {subtitle ? <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '600', marginTop: 2 }}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}
