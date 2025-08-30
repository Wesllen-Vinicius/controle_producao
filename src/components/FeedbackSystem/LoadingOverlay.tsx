import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, ActivityIndicator, Modal, Pressable } from 'react-native';
import { useTheme } from '../../state/ThemeProvider';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  progress?: number; // 0-1 for progress bar
  cancellable?: boolean;
  onCancel?: () => void;
}

export default function LoadingOverlay({
  visible,
  message = 'Carregando...',
  progress,
  cancellable = false,
  onCancel,
}: LoadingOverlayProps) {
  const { colors, spacing, typography, radius } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, scaleAnim]);

  useEffect(() => {
    if (progress !== undefined) {
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [progress, progressAnim]);

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          opacity: fadeAnim,
        }}
      >
        <Animated.View
          style={{
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            padding: spacing.xl,
            minWidth: 200,
            maxWidth: 300,
            alignItems: 'center',
            transform: [{ scale: scaleAnim }],
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 12,
          }}
        >
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={{ marginBottom: spacing.md }}
          />

          <Text
            style={[
              typography.body,
              {
                color: colors.text,
                textAlign: 'center',
                marginBottom: progress !== undefined ? spacing.md : 0,
              },
            ]}
          >
            {message}
          </Text>

          {progress !== undefined && (
            <View style={{ width: '100%' }}>
              <View
                style={{
                  height: 4,
                  backgroundColor: colors.line,
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <Animated.View
                  style={{
                    height: '100%',
                    backgroundColor: colors.primary,
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  }}
                />
              </View>
              <Text
                style={[
                  typography.body,
                  {
                    color: colors.muted,
                    textAlign: 'center',
                    marginTop: spacing.xs,
                    fontSize: 12,
                  },
                ]}
              >
                {Math.round((progress || 0) * 100)}%
              </Text>
            </View>
          )}

          {cancellable && onCancel && (
            <Pressable
              onPress={onCancel}
              style={{
                marginTop: spacing.md,
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.lg,
              }}
            >
              <Text
                style={[
                  typography.body,
                  {
                    color: colors.muted,
                    textAlign: 'center',
                  },
                ]}
              >
                Cancelar
              </Text>
            </Pressable>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
