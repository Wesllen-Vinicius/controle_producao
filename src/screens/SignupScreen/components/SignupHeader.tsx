import React from 'react';
import { View, Text, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../state/ThemeProvider';

interface SignupHeaderProps {
  width: number;
}

export default function SignupHeader({ width }: SignupHeaderProps) {
  const { colors, spacing, typography } = useTheme();

  return (
    <LinearGradient
      colors={[colors.primary, colors.accent]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        height: Math.max(200, width * 0.4),
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <View style={{ alignItems: 'center', gap: spacing.md }}>
        <Image
          source={require('../../../../assets/rosa-dos-ventos.png')}
          style={{ width: 64, height: 64, tintColor: 'white' }}
          resizeMode="contain"
        />
        <View style={{ alignItems: 'center' }}>
          <Text style={[typography.h1, { color: 'white', textAlign: 'center' }]}>
            Criar Nova Conta
          </Text>
          <Text
            style={[
              typography.body,
              { color: 'rgba(255,255,255,0.9)', textAlign: 'center', marginTop: spacing.xs },
            ]}
          >
            Junte-se ao nosso sistema de controle
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}
