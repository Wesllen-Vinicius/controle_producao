// src/screens/Perfil/hooks/useProfileActions.ts
import { Session } from '@supabase/supabase-js';
import { useCallback } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import { useHaptics } from '../../../hooks/useHaptics';
import { useToast } from '../../../state/ToastProvider';
import { tryCopy } from '../../../utils/clipboard';
import { APP_VERSION, BUILD_NUMBER, SUPPORT_EMAIL } from '../constants';

export function useProfileActions(session: Session | null) {
  const { showToast } = useToast();
  const h = useHaptics();

  const copyHandler = useCallback(
    async (text: string, label: string) => {
      if (await tryCopy(text)) {
        h.success();
        showToast({ type: 'success', message: `${label} copiado!` });
      } else {
        h.error();
        Alert.alert(label, 'Não foi possível copiar agora.');
      }
    },
    [showToast, h]
  );

  const openLink = useCallback(async (url?: string) => {
    if (!url) return;
    try {
      if (await Linking.canOpenURL(url)) {
        await Linking.openURL(url);
      } else {
        throw new Error('Cannot open URL');
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível abrir este link no momento.');
    }
  }, []);

  const reportBug = useCallback(async () => {
    const subject = encodeURIComponent(`[Bug Report] App v${APP_VERSION} (${BUILD_NUMBER})`);
    const email = session?.user?.email ?? 'N/A';
    const body = encodeURIComponent(
      `Descreva o problema:\n\n\n---\nApp: v${APP_VERSION} (${BUILD_NUMBER})\nOS: ${Platform.OS} ${Platform.Version}\nUser: ${email}`
    );
    const url = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;

    try {
      if (await Linking.canOpenURL(url)) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Reportar Bug', `Envie um e-mail para:\n\n${SUPPORT_EMAIL}`, [
          { text: 'OK' },
          {
            text: 'Copiar E-mail',
            onPress: () => copyHandler(SUPPORT_EMAIL, 'E-mail de suporte'),
          },
        ]);
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível abrir seu app de e-mail.');
    }
  }, [session, copyHandler]);

  const requestAccountDeletion = useCallback(async () => {
    Alert.alert(
      'Excluir Conta',
      `⚠️ ATENÇÃO: Esta ação é irreversível e removerá todos os seus dados.\n\nPara prosseguir, uma solicitação será enviada para ${SUPPORT_EMAIL}.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar Solicitação',
          style: 'destructive',
          onPress: async () => {
            const subject = encodeURIComponent('Solicitação de Exclusão de Conta');
            const email = session?.user?.email ?? 'N/A';
            const body = encodeURIComponent(
              `Solicito a exclusão permanente da minha conta e de todos os dados associados.\n\nConta: ${email}\nData: ${new Date().toLocaleString()}`
            );
            const url = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
            await openLink(url);
          },
        },
      ]
    );
  }, [session, openLink]);

  return { copyHandler, openLink, reportBug, requestAccountDeletion };
}
