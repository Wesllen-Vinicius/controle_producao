import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { useResponsive } from '../../utils/responsive';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  maxWidth?: boolean;
  centered?: boolean;
  padding?: boolean;
}

export default function ResponsiveContainer({
  children,
  style,
  maxWidth = true,
  centered = false,
  padding = true,
}: ResponsiveContainerProps) {
  const { maxContentWidth, screenPadding } = useResponsive();

  return (
    <View
      style={[
        {
          width: '100%',
          alignSelf: centered ? 'center' : 'stretch',
        },
        maxWidth && typeof maxContentWidth === 'number' && {
          maxWidth: maxContentWidth,
        },
        padding && {
          paddingHorizontal: screenPadding,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}