import React from 'react';
import { View, ScrollView } from 'react-native';
import { useTheme } from '../../state/ThemeProvider';
import CardSkeleton from './CardSkeleton';

interface DashboardSkeletonProps {
  showHeader?: boolean;
  kpiCount?: number;
  showChart?: boolean;
  listItemCount?: number;
}

export default function DashboardSkeleton({
  showHeader = true,
  kpiCount = 3,
  showChart = true,
  listItemCount = 5,
}: DashboardSkeletonProps) {
  const { spacing } = useTheme();

  return (
    <ScrollView 
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: spacing.md, gap: spacing.lg }}
    >
      {/* Header */}
      {showHeader && (
        <View style={{ gap: spacing.sm }}>
          <CardSkeleton width="60%" height={24} />
          <CardSkeleton width="40%" height={16} />
        </View>
      )}

      {/* KPIs */}
      <View style={{
        flexDirection: 'row',
        gap: spacing.md,
      }}>
        {Array.from({ length: kpiCount }).map((_, index) => (
          <View key={index} style={{ flex: 1 }}>
            <CardSkeleton width="100%" height={80} />
          </View>
        ))}
      </View>

      {/* Chart */}
      {showChart && (
        <View style={{ gap: spacing.sm }}>
          <CardSkeleton width="50%" height={20} />
          <CardSkeleton width="100%" height={200} />
        </View>
      )}

      {/* List items */}
      <View style={{ gap: spacing.sm }}>
        <CardSkeleton width="40%" height={20} />
        {Array.from({ length: listItemCount }).map((_, index) => (
          <CardSkeleton key={index} width="100%" height={60} />
        ))}
      </View>
    </ScrollView>
  );
}