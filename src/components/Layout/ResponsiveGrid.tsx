import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { useResponsive } from '../../utils/responsive';
import { useTheme } from '../../state/ThemeProvider';

interface ResponsiveGridProps {
  children: React.ReactNode[];
  columns?: number;
  spacing?: number;
  style?: StyleProp<ViewStyle>;
}

export default function ResponsiveGrid({
  children,
  columns,
  spacing,
  style,
}: ResponsiveGridProps) {
  const { columns: defaultColumns } = useResponsive();
  const { spacing: themeSpacing } = useTheme();
  
  const numColumns = columns || defaultColumns;
  const gap = spacing ?? themeSpacing.md;

  // Reorganizar children em rows
  const rows: React.ReactNode[][] = [];
  for (let i = 0; i < children.length; i += numColumns) {
    rows.push(children.slice(i, i + numColumns));
  }

  return (
    <View style={[{ gap }, style]}>
      {rows.map((row, rowIndex) => (
        <View
          key={rowIndex}
          style={{
            flexDirection: 'row',
            gap,
          }}
        >
          {row.map((child, colIndex) => (
            <View
              key={colIndex}
              style={{
                flex: 1,
                minWidth: 0, // Prevent overflow
              }}
            >
              {child}
            </View>
          ))}
          {/* Fill remaining spaces if row is incomplete */}
          {Array.from({ length: numColumns - row.length }).map((_, index) => (
            <View key={`empty-${index}`} style={{ flex: 1 }} />
          ))}
        </View>
      ))}
    </View>
  );
}