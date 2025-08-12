import React from 'react';
import { View } from 'react-native';
import { Skeleton } from './ui';

export default function SkeletonList({ rows = 3, height = 84 }: { rows?: number; height?: number }) {
  return (
    <View>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} height={height} radius={12} style={{ marginTop: i === 0 ? 0 : 8 }} />
      ))}
    </View>
  );
}
