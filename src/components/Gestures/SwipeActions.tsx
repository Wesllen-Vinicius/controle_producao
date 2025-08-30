import React, { useRef } from 'react';
import { View, Animated, Pressable, Text } from 'react-native';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
  State,
} from 'react-native-gesture-handler';
import { useTheme } from '../../state/ThemeProvider';
import { AppIcon, AppIconName } from '../../utils/iconOptimizer';
import { useHaptics } from '../../hooks/useHaptics';

export interface SwipeAction {
  icon: AppIconName;
  label: string;
  onPress: () => void;
  backgroundColor?: string;
  color?: string;
  threshold?: number;
}

interface SwipeActionsProps {
  children: React.ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  enabled?: boolean;
}

export default function SwipeActions({
  children,
  leftActions = [],
  rightActions = [],
  enabled = true,
}: SwipeActionsProps) {
  const { colors, spacing, typography } = useTheme();
  const { medium: impactHaptic, tap: selectionHaptic } = useHaptics();

  const translateX = useRef(new Animated.Value(0)).current;
  const actionTriggered = useRef(false);

  const handleGesture = (event: PanGestureHandlerGestureEvent) => {
    if (!enabled) return;

    const { translationX, state } = event.nativeEvent;
    const threshold = 80;

    if (state === State.ACTIVE) {
      // Limit swipe distance
      const maxSwipe = Math.min(Math.abs(translationX), 120);
      const limitedTranslation = translationX > 0 ? maxSwipe : -maxSwipe;

      translateX.setValue(limitedTranslation);

      // Trigger haptic feedback when reaching threshold
      if (Math.abs(translationX) > threshold && !actionTriggered.current) {
        impactHaptic();
        actionTriggered.current = true;
      } else if (Math.abs(translationX) <= threshold) {
        actionTriggered.current = false;
      }
    } else if (state === State.END) {
      const shouldTrigger = Math.abs(translationX) > threshold;

      if (shouldTrigger) {
        selectionHaptic();

        // Determine which action to trigger
        if (translationX > 0 && leftActions.length > 0) {
          leftActions[0].onPress();
        } else if (translationX < 0 && rightActions.length > 0) {
          rightActions[0].onPress();
        }
      }

      // Reset animation
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();

      actionTriggered.current = false;
    }
  };

  const renderActions = (actions: SwipeAction[], side: 'left' | 'right') => {
    if (actions.length === 0) return null;

    return (
      <View
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          [side]: 0,
          width: 120,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: side === 'left' ? 'flex-start' : 'flex-end',
        }}
      >
        {actions.map((action, index) => (
          <Pressable
            key={index}
            onPress={() => {
              selectionHaptic();
              action.onPress();
            }}
            style={{
              width: 80,
              height: '100%',
              backgroundColor: action.backgroundColor ?? colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.xs,
            }}
          >
            <AppIcon name={action.icon} size={20} color={action.color ?? 'white'} />
            <Text
              style={[
                typography.body,
                {
                  color: action.color ?? 'white',
                  fontSize: 12,
                  fontWeight: '600',
                  textAlign: 'center',
                },
              ]}
              numberOfLines={1}
            >
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>
    );
  };

  return (
    <View style={{ overflow: 'hidden' }}>
      {renderActions(leftActions, 'left')}
      {renderActions(rightActions, 'right')}

      <PanGestureHandler
        onGestureEvent={handleGesture}
        activeOffsetX={[-10, 10]}
        failOffsetY={[-20, 20]}
        enabled={enabled}
      >
        <Animated.View
          style={{
            transform: [{ translateX }],
            backgroundColor: colors.surface,
          }}
        >
          {children}
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
}
