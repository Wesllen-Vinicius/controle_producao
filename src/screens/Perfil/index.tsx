// src/screens/Perfil/index.tsx
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import Screen from '../../components/Screen';
import { PerfilSkeleton } from '../../components/Skeletons';
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

export default function PerfilScreen() {
  const auth = useAuth();
  // CORRIGIDO: Removida a variável 'theme' que não estava sendo utilizada.
  const { colors } = useTheme();
  const h = useHaptics();
  const { session, signOut } = auth;
  const { copyHandler, openLink, reportBug, requestAccountDeletion } = useProfileActions(session);

  const [refreshing, setRefreshing] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const avatarScale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    // Simulate loading time for smoother experience
    const loadingTimer = setTimeout(() => setLoading(false), 800);

    Animated.stagger(100, [
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 50, friction: 8 }),
      Animated.spring(avatarScale, { toValue: 1, useNativeDriver: true, tension: 50, friction: 5 }),
    ]).start();

    return () => clearTimeout(loadingTimer);
  }, [fadeAnim, slideAnim, avatarScale]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    h.light();
    await new Promise(r => setTimeout(r, 700)); // Simula recarregamento
    setRefreshing(false);
  }, [h]);

  const handleSignOut = useCallback(() => {
    h.light();
    signOut();
  }, [signOut, h]);

  if (!session) {
    return (
      <Screen>
        <EmptyState title="Sessão não encontrada" subtitle="Faça login para acessar seu perfil." />
      </Screen>
    );
  }

  if (loading) {
    return (
      <Screen padded={false} scroll={false} edges={['top']}>
        <PerfilSkeleton />
      </Screen>
    );
  }

  return (
    <Screen padded={false} scroll={false} edges={['top']}>
      <LinearGradient colors={[colors.background, colors.surface + '20']} style={styles.gradient}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <ProfileHeader auth={auth} onCopy={copyHandler} scaleAnim={avatarScale} />
            <ActionButtons
              onChangePassword={() => setPasswordModalOpen(true)}
              onSignOut={handleSignOut}
            />

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
