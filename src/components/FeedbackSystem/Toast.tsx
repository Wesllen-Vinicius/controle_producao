import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Pressable } from 'react-native';
import { PanGestureHandler, PanGestureHandlerGestureEvent, State } from 'react-native-gesture-handler';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../state/ThemeProvider';
import { useHaptics } from '../../hooks/useHaptics';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface AnimatedToastProps {
  visible: boolean;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  onDismiss: () => void;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export default function AnimatedToast({
  visible,
  type,
  title,
  message,
  duration = 4000,
  onDismiss,
  action,
}: AnimatedToastProps) {
  const { colors, spacing, radius, typography } = useTheme();
  const { success: successHaptic, error: errorHaptic, warning: warningHaptic } = useHaptics();
  
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const panTranslateX = useRef(new Animated.Value(0)).current;

  const icons = {
    success: 'check-circle',
    error: 'alert-circle',
    warning: 'alert',
    info: 'information',
  } as const;

  const toastColors = {
    success: { bg: colors.successBackground, border: colors.success, text: colors.success },
    error: { bg: colors.dangerBackground, border: colors.danger, text: colors.danger },
    warning: { bg: colors.warningBackground, border: colors.warning, text: colors.warning },
    info: { bg: colors.primaryBackground, border: colors.primary, text: colors.primary },
  };

  useEffect(() => {
    if (visible) {
      // Haptic feedback
      switch (type) {
        case 'success':
          successHaptic();
          break;
        case 'error':
          errorHaptic();
          break;
        case 'warning':
          warningHaptic();
          break;
      }

      // Show animation
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.spring(opacity, {
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
      ]).start();

      // Auto dismiss
      if (duration > 0) {
        const timer = setTimeout(() => {
          dismissToast();
        }, duration);
        return () => clearTimeout(timer);
      }
    } else {
      dismissToast();
    }
  }, [visible]);

  const dismissToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
      panTranslateX.setValue(0);
    });
  };

  const handlePan = (event: PanGestureHandlerGestureEvent) => {
    const { translationX, state } = event.nativeEvent;

    if (state === State.ACTIVE) {
      panTranslateX.setValue(translationX);
    } else if (state === State.END) {
      if (Math.abs(translationX) > 100) {
        // Swipe dismiss
        Animated.timing(panTranslateX, {
          toValue: translationX > 0 ? 400 : -400,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          dismissToast();
        });
      } else {
        // Snap back
        Animated.spring(panTranslateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    }
  };

  if (!visible) return null;

  const colorScheme = toastColors[type];

  return (
    <PanGestureHandler onGestureEvent={handlePan}>
      <Animated.View
        style={{
          position: 'absolute',
          top: 50,
          left: spacing.md,
          right: spacing.md,
          zIndex: 9999,
          transform: [
            { translateY },
            { translateX: panTranslateX },
            { scale },
          ],
          opacity,
        }}
      >
        <View
          style={{
            backgroundColor: colorScheme.bg,
            borderLeftWidth: 4,
            borderLeftColor: colorScheme.border,
            borderRadius: radius.md,
            padding: spacing.md,
            flexDirection: 'row',
            alignItems: 'flex-start',
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <MaterialCommunityIcons
            name={icons[type]}
            size={24}
            color={colorScheme.text}
            style={{ marginRight: spacing.md }}
          />

          <View style={{ flex: 1 }}>
            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
              {title}
            </Text>
            {message && (
              <Text style={[typography.body, { color: colors.muted, marginTop: spacing.xs }]}>
                {message}
              </Text>
            )}
          </View>

          {action && (
            <Pressable
              onPress={action.onPress}
              style={{
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
                backgroundColor: colorScheme.border,
                borderRadius: radius.sm,
                marginLeft: spacing.sm,
              }}
            >
              <Text style={[typography.body, { color: 'white', fontSize: 14, fontWeight: '600' }]}>
                {action.label}
              </Text>
            </Pressable>
          )}
        </View>
      </Animated.View>
    </PanGestureHandler>
  );
}