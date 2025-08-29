// src/screens/Perfil/components/ActionButtons.tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../../state/ThemeProvider';

interface ActionButtonsProps {
  onChangePassword: () => void;
  onSignOut: () => void;
}

const ActionButton = ({ icon, label, color, onPress }: { icon: any, label: string, color: string, onPress: () => void }) => {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.button, { backgroundColor: colors.surface, opacity: pressed ? 0.8 : 1, shadowColor: colors.shadow }]}
    >
      <MaterialCommunityIcons name={icon} size={22} color={color} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </Pressable>
  );
};

export function ActionButtons({ onChangePassword, onSignOut }: ActionButtonsProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <ActionButton icon="lock-reset" label="Alterar Senha" color={colors.primary} onPress={onChangePassword} />
      <ActionButton icon="logout-variant" label="Sair" color={colors.danger} onPress={onSignOut} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00000010'
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
});
