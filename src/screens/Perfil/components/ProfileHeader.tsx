// src/screens/Perfil/components/ProfileHeader.tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../../state/AuthProvider';
import { useTheme } from '../../../state/ThemeProvider';

// Usamos ReturnType para obter a tipagem exata que o hook useAuth retorna.
// Isso torna o código mais seguro e fácil de manter.
type AuthPayload = ReturnType<typeof useAuth>;

interface ProfileHeaderProps {
  auth: AuthPayload;
  onCopy: (text: string, label: string) => void;
  scaleAnim: Animated.Value;
}

export function ProfileHeader({ auth, onCopy, scaleAnim }: ProfileHeaderProps) {
  const { colors, spacing, typography } = useTheme();
  const { profile, session } = auth;

  const name = profile?.username || session?.user?.email?.split('@')[0] || 'Usuário';
  const email = session?.user?.email || '';
  const initial = (name?.[0] || 'U').toUpperCase();
  const role = profile?.role;

  return (
    <View style={[styles.container, { paddingHorizontal: spacing.md }]}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Pressable onLongPress={() => onCopy(name, 'Nome')} style={[styles.avatar, { backgroundColor: colors.primary + '20', shadowColor: colors.shadow }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>{initial}</Text>
          <View style={[styles.badge, { backgroundColor: colors.success, borderColor: colors.background }]}>
            <MaterialCommunityIcons name="check" size={12} color="#FFFFFF" />
          </View>
        </Pressable>
      </Animated.View>

      <View style={styles.userInfo}>
        <Text style={[typography.h1, styles.name, { color: colors.text }]} numberOfLines={1}>{name}</Text>
        <Pressable onLongPress={() => email && onCopy(email, 'E-mail')}>
          <Text style={[typography.body, styles.email, { color: colors.muted }]} numberOfLines={1}>{email}</Text>
        </Pressable>
        {role && (
          <View style={[styles.rolePill, { backgroundColor: colors.primary + '15' }]}>
            <MaterialCommunityIcons name={role === 'admin' ? 'shield-crown' : 'account-circle'} size={12} color={colors.primary} />
            <Text style={[styles.roleText, { color: colors.primary }]}>{role.toUpperCase()}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    ...Platform.select({
      ios: { shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
      android: { elevation: 4 },
    }),
  },
  avatarText: {
    fontWeight: '800',
    fontSize: 32,
  },
  badge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  userInfo: {
    flex: 1,
    marginLeft: 16,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  email: {
    fontSize: 14,
    marginTop: 2,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  roleText: {
    fontWeight: 'bold',
    fontSize: 10,
    letterSpacing: 0.5,
  },
});
