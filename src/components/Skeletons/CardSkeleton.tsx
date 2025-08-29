import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../../state/ThemeProvider';

interface CardSkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  animated?: boolean;
}

export default function CardSkeleton({ 
  width = '100%', 
  height = 120, 
  borderRadius,
  style,
  animated = true 
}: CardSkeletonProps) {
  const { colors, radius } = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (!animated) return;

    const animate = () => {
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start(animate);
    };

    animate();
  }, [opacity, animated]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: colors.line,
          borderRadius: borderRadius ?? radius.md,
          opacity: animated ? opacity : 0.3,
        },
        style,
      ]}
    />
  );
}