// CORREÇÃO: Importados os tipos de estilo do React Native
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../state/ThemeProvider';

interface ErrorFeedbackProps {
  error?: string | null;
  warning?: string | null;
  success?: string | null;
  info?: string | null;
  onDismiss?: () => void;
  inline?: boolean;
  // CORREÇÃO: 'any' substituído por um tipo de estilo específico.
  style?: StyleProp<ViewStyle>;
}

export default function ErrorFeedback({
  error,
  warning,
  success,
  info,
  onDismiss,
  inline = true,
  style,
}: ErrorFeedbackProps) {
  const { colors, spacing, radius, typography } = useTheme();

  // CORREÇÃO: Operador '||' trocado por '??' para maior segurança.
  const message = error ?? warning ?? success ?? info;
  if (!message) return null;

  const getIcon = () => {
    if (error) return 'alert-circle';
    if (warning) return 'alert';
    if (success) return 'check-circle';
    if (info) return 'information';
    return 'information';
  };

  const getColors = () => {
    if (error)
      return {
        bg: colors.danger + '15',
        border: colors.danger,
        text: colors.danger,
        icon: colors.danger,
      };
    if (warning)
      return {
        bg: colors.accent + '15',
        border: colors.accent,
        text: colors.accent,
        icon: colors.accent,
      };
    if (success)
      return {
        bg: colors.success + '15',
        border: colors.success,
        text: colors.success,
        icon: colors.success,
      };
    if (info)
      return {
        bg: colors.primary + '15',
        border: colors.primary,
        text: colors.primary,
        icon: colors.primary,
      };
    return { bg: colors.surfaceAlt, border: colors.line, text: colors.text, icon: colors.text };
  };

  const colorSet = getColors();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colorSet.bg,
          borderColor: colorSet.border,
          borderRadius: inline ? radius.sm : radius.md,
          paddingHorizontal: inline ? spacing.sm : spacing.md,
          paddingVertical: inline ? spacing.xs : spacing.sm,
          marginVertical: inline ? spacing.xs : spacing.sm,
        },
        style,
      ]}
    >
      <View style={styles.content}>
        <MaterialCommunityIcons
          name={getIcon()}
          size={inline ? 16 : 20}
          color={colorSet.icon}
          style={styles.icon}
        />
        <Text
          style={[
            // CORREÇÃO: 'typography.caption' não existia; substituído por 'typography.label'.
            inline ? typography.label : typography.body,
            {
              color: colorSet.text,
              flex: 1,
              fontWeight: inline ? '500' : '600',
            },
          ]}
        >
          {message}
        </Text>
        {onDismiss && (
          <Pressable onPress={onDismiss} hitSlop={8} style={styles.dismiss}>
            <MaterialCommunityIcons name="close" size={inline ? 14 : 18} color={colorSet.icon} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 8,
  },
  dismiss: {
    marginLeft: 8,
    opacity: 0.7,
  },
});
