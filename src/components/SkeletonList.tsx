import React, { memo } from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../state/ThemeProvider';
import { Skeleton } from './ui';

type RNWidth = number | `${number}%` | 'auto';

type Props = {
  rows?: number;
  height?: number;
  radius?: number;
  width?: RNWidth;
  gap?: number;
  style?: StyleProp<ViewStyle>;
};

function SkeletonList({
  rows = 3,
  height = 84,
  radius = 12,
  width = '100%' as RNWidth,
  gap,
  style,
}: Props) {
  const { spacing } = useTheme();
  const g = gap ?? spacing.sm;

  return (
    // container simples, sem ScrollView, sem rolagem
    <View style={[{ gap: g, alignSelf: 'stretch' }, style]}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} height={height} radius={radius} width={width} />
      ))}
    </View>
  );
}

export default memo(SkeletonList);
