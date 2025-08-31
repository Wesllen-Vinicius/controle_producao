// src/screens/Login/components/LoginHeader.tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { memo } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../../state/ThemeProvider';

type Props = {
  iconScale: Animated.Value;
};

const LoginHeader = memo(({ iconScale }: Props) => {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    header: {
      alignItems: 'center',
      marginBottom: 48,
    },
    iconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
      borderWidth: 3,
      borderColor: colors.primary,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 4,
        },
        android: { elevation: 4 },
      }),
    },
    appName: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: -0.5,
      marginBottom: 4,
    },
    subtitle: { fontSize: 14, fontWeight: '500', color: colors.muted, letterSpacing: 0.2 },
  });

  return (
    <View style={styles.header}>
      <Animated.View style={[styles.iconContainer, { transform: [{ scale: iconScale }] }]}>
        <MaterialCommunityIcons name="compass" size={40} color={colors.primary} />
      </Animated.View>
      <Text style={styles.appName}>Norte Forte</Text>
      <Text style={styles.subtitle}>Controle de Produção</Text>
    </View>
  );
});

LoginHeader.displayName = 'LoginHeader';

export default LoginHeader;
