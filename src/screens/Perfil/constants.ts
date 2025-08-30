// src/screens/Perfil/constants.ts
import Constants from 'expo-constants';

/**
 * Busca um valor dentro de `expo.extra.eas` no arquivo de configuração (app.json/app.config.js).
 * @param key A chave a ser procurada.
 * @param fallback Um valor padrão caso a chave não seja encontrada.
 */
function getExtra<T>(key: string, fallback?: T): T | undefined {
  // Ajustamos o caminho para ler de `extra.eas`
  const easExtra =
    (Constants.expoConfig as { extra?: { eas?: Record<string, unknown> } })?.extra?.eas ?? {};
  return (easExtra?.[key] as T) ?? fallback;
}

// Agora, essas constantes lerão os valores de dentro de "extra.eas" no seu app.json
export const SUPPORT_EMAIL = getExtra<string>('supportEmail', '');
export const DEVELOPER = getExtra<string>('developer', 'Wesllen Lima');
export const PRIVACY_URL = getExtra<string>('privacyUrl');
export const TERMS_URL = getExtra<string>('termsUrl');
export const RATE_URL = getExtra<string>('rateUrl');
export const WHATSAPP_URL = getExtra<string>('whatsappUrl');

// Estas constantes já funcionam como esperado
export const APP_VERSION = (Constants.expoConfig as { version?: string })?.version ?? '—';
export const BUILD_NUMBER =
  (Constants.expoConfig as { ios?: { buildNumber?: string } })?.ios?.buildNumber?.toString() ??
  (
    Constants.expoConfig as { android?: { versionCode?: number } }
  )?.android?.versionCode?.toString() ??
  '—';
