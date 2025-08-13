import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../state/ThemeProvider';

export default function Divider({ inset = 0 }: { inset?: number }) {
  const { colors } = useTheme();
  return <View style={{ height: 1, marginLeft: inset, backgroundColor: colors.line, opacity: 0.8 }} />;
}
