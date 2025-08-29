import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTheme } from '../../../state/ThemeProvider';

interface TermsSectionProps {
  onTermsPress?: () => void;
  onPrivacyPress?: () => void;
}

export default function TermsSection({ onTermsPress, onPrivacyPress }: TermsSectionProps) {
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={{ alignItems: 'center', marginTop: spacing.lg }}>
      <Text style={[typography.body, { 
        color: colors.muted, 
        textAlign: 'center',
        fontSize: 14,
        lineHeight: 20
      }]}>
        Ao criar uma conta, você concorda com nossos{' '}
        {onTermsPress ? (
          <Pressable onPress={onTermsPress}>
            <Text style={{ color: colors.primary, textDecorationLine: 'underline' }}>
              Termos de Uso
            </Text>
          </Pressable>
        ) : (
          <Text style={{ color: colors.primary }}>Termos de Uso</Text>
        )}
        {' '}e{' '}
        {onPrivacyPress ? (
          <Pressable onPress={onPrivacyPress}>
            <Text style={{ color: colors.primary, textDecorationLine: 'underline' }}>
              Política de Privacidade
            </Text>
          </Pressable>
        ) : (
          <Text style={{ color: colors.primary }}>Política de Privacidade</Text>
        )}
      </Text>
    </View>
  );
}