// src/screens/Perfil/components/ChangePasswordSheet.tsx
import { useCallback, useState } from 'react';
import { Alert, View } from 'react-native';
import BottomSheet from '../../../components/ui/BottomSheet';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { useHaptics } from '../../../hooks/useHaptics';
import { supabase } from '../../../services/supabase';
import { useTheme } from '../../../state/ThemeProvider';
import { useToast } from '../../../state/ToastProvider';

interface ChangePasswordSheetProps {
  open: boolean;
  onClose: () => void;
  email: string;
}

export function ChangePasswordSheet({ open, onClose, email }: ChangePasswordSheetProps) {
  const { spacing } = useTheme();
  const h = useHaptics();
  const { showToast } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClose = useCallback(() => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    onClose();
  }, [onClose]);

  const handleChangePassword = useCallback(async () => {
    if (
      !currentPassword ||
      !newPassword ||
      newPassword !== confirmPassword ||
      newPassword.length < 6
    ) {
      h.warning();
      let message = 'Preencha todos os campos.';
      if (newPassword.length < 6) message = 'A nova senha deve ter pelo menos 6 caracteres.';
      if (newPassword !== confirmPassword) message = 'As novas senhas não coincidem.';
      Alert.alert('Atenção', message);
      return;
    }

    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (signInError) throw new Error('Senha atual incorreta.');

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      h.success();
      showToast({ type: 'success', message: 'Senha alterada com sucesso!' });
      handleClose();
    } catch (e: unknown) {
      h.error();
      const msg =
        e instanceof Error && e.message === 'Senha atual incorreta.'
          ? e.message
          : 'Falha ao alterar a senha. Tente novamente.';
      Alert.alert('Erro', msg);
    } finally {
      setLoading(false);
    }
  }, [currentPassword, newPassword, confirmPassword, email, h, showToast, handleClose]);

  return (
    <BottomSheet open={open} onClose={handleClose} title="Alterar Senha">
      <View style={{ gap: spacing.md, padding: spacing.md }}>
        <Input
          label="Senha atual"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
          autoComplete="current-password"
        />
        <Input
          label="Nova senha"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          autoComplete="new-password"
        />
        <Input
          label="Confirmar nova senha"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoComplete="new-password"
        />
        <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
          <Button
            title="Salvar Alterações"
            onPress={handleChangePassword}
            loading={loading}
            disabled={loading}
          />
          <Button title="Cancelar" variant="text" onPress={handleClose} disabled={loading} />
        </View>
      </View>
    </BottomSheet>
  );
}
