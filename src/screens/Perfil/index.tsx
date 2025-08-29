// src/screens/Perfil/index.tsx
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, RefreshControl, ScrollView, StatusBar, StyleSheet, View } from 'react-native';

import Screen from '../../components/Screen';
import ThemeToggle from '../../components/ThemeToggle';
import EmptyState from '../../components/ui/EmptyState';

import { useHaptics } from '../../hooks/useHaptics';
import { useAuth } from '../../state/AuthProvider';
import { useTheme } from '../../state/ThemeProvider';

import { ActionButtons } from './components/ActionButtons';
import { AppInfo } from './components/AppInfo';
import { ChangePasswordSheet } from './components/ChangePasswordSheet';
import { DangerZone } from './components/DangerZone';
import { ProfileHeader } from './components/ProfileHeader';
import { Section } from './components/Section';
import { SupportLinks } from './components/SupportLinks';
import { useProfileActions } from './hooks/useProfileActions';

// Criamos um tipo que representa o retorno do hook useTheme,
// e adicionamos a propriedade 'theme' que estava faltando na tipagem original.
type AppThemeContext = ReturnType<typeof useTheme> & {
  theme: 'light' | 'dark';
};

export default function PerfilScreen() {
  const auth = useAuth();
  // Usamos 'as AppThemeContext' para dizer ao TypeScript para usar nosso tipo corrigido.
  const { colors, theme } = useTheme() as AppThemeContext;
  const h = useHaptics();
  const { session, signOut } = auth;
  const { copyHandler, openLink, reportBug, requestAccountDeletion } = useProfileActions(session);

  const [refreshing, setRefreshing] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const avatarScale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.stagger(100, [
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 50, friction: 8 }),
      Animated.spring(avatarScale, { toValue: 1, useNativeDriver: true, tension: 50, friction: 5 }),
    ]).start();
  }, [fadeAnim, slideAnim, avatarScale]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    h.light();
    await new Promise((r) => setTimeout(r, 700)); // Simula recarregamento
    setRefreshing(false);
  }, [h]);

  const handleSignOut = useCallback(() => {
    h.light();
    signOut();
  }, [signOut, h]);

  if (!session) {
    return <Screen><EmptyState title="Sessão não encontrada" subtitle="Faça login para acessar seu perfil." /></Screen>;
  }

  return (
    <Screen padded={false} scroll={false} edges={['top']}>
      <LinearGradient colors={[colors.background, colors.surface + '20']} style={styles.gradient}>
        <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <ProfileHeader auth={auth} onCopy={copyHandler} scaleAnim={avatarScale} />
            <ActionButtons onChangePassword={() => setPasswordModalOpen(true)} onSignOut={handleSignOut} />

            <View style={styles.sectionsContainer}>
              <Section title="Aparência" icon="palette-outline">
                <ThemeToggle />
              </Section>
              <SupportLinks onReportBug={reportBug} onOpenLink={openLink} />
              <AppInfo />
              <DangerZone onDeleteAccount={requestAccountDeletion} />
            </View>
          </Animated.View>
        </ScrollView>
      </LinearGradient>

      {session.user.email && (
        <ChangePasswordSheet
          open={passwordModalOpen}
          onClose={() => setPasswordModalOpen(false)}
          email={session.user.email}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  scrollContainer: {
    paddingBottom: 48,
  },
  sectionsContainer: {
    marginTop: 24,
    gap: 16,
  },
});
