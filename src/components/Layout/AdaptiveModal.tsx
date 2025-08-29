import React from 'react';
import { Modal, View, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useResponsive } from '../../utils/responsive';
import { useTheme } from '../../state/ThemeProvider';

interface AdaptiveModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: React.ReactNode;
  fullScreen?: boolean;
}

export default function AdaptiveModal({
  visible,
  onClose,
  children,
  title,
  fullScreen = false,
}: AdaptiveModalProps) {
  const { isTablet, modalWidth } = useResponsive();
  const { colors, radius, spacing } = useTheme();

  // Em tablets, usar modal centrado; em phones, usar fullscreen ou bottom sheet
  const useFullScreen = fullScreen || !isTablet;

  if (useFullScreen) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={{
            flex: 1,
            backgroundColor: colors.background,
          }}>
            {title && (
              <View style={{
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: colors.line,
              }}>
                {title}
              </View>
            )}
            <View style={{ flex: 1 }}>
              {children}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  }

  // Modal centrado para tablets
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: spacing.lg,
        }}
        onPress={onClose}
      >
        <Pressable
          style={{
            width: modalWidth,
            maxHeight: '90%',
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 16,
            elevation: 16,
          }}
          onPress={() => {}} // Prevent close on content tap
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            {title && (
              <View style={{
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: colors.line,
                borderTopLeftRadius: radius.lg,
                borderTopRightRadius: radius.lg,
              }}>
                {title}
              </View>
            )}
            <View style={{
              maxHeight: title ? '85%' : '100%',
            }}>
              {children}
            </View>
          </KeyboardAvoidingView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}