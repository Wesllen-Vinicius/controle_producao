import React, { useEffect, useRef, useCallback } from 'react';
import { View, Animated, Easing } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../state/ThemeProvider';

interface SuccessAnimationProps {
  visible: boolean;
  size?: number;
  onAnimationComplete?: () => void;
}

export default function SuccessAnimation({
  visible,
  size = 60,
  onAnimationComplete,
}: SuccessAnimationProps) {
  const { colors } = useTheme();

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const checkmarkAnim = useRef(new Animated.Value(0)).current;

  // Memoize the animation complete callback to prevent unnecessary re-renders
  const handleAnimationComplete = useCallback(() => {
    if (onAnimationComplete) {
      setTimeout(() => {
        onAnimationComplete();
      }, 500);
    }
  }, [onAnimationComplete]);

  useEffect(() => {
    if (visible) {
      // Reset animations
      scaleAnim.setValue(0);
      rotateAnim.setValue(0);
      checkmarkAnim.setValue(0);

      // Start success animation sequence
      Animated.sequence([
        // Circle appears with bounce
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 120,
          friction: 6,
        }),
        // Slight rotation for emphasis
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        // Checkmark appears
        Animated.spring(checkmarkAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 150,
          friction: 8,
        }),
      ]).start(handleAnimationComplete);
    }
  }, [visible, scaleAnim, rotateAnim, checkmarkAnim, handleAnimationComplete]);

  if (!visible) return null;

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        zIndex: 9999,
      }}
    >
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }, { rotate: rotateInterpolate }],
        }}
      >
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.success,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <Animated.View
            style={{
              transform: [{ scale: checkmarkAnim }],
            }}
          >
            <MaterialCommunityIcons name="check" size={size * 0.5} color="white" />
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
}
