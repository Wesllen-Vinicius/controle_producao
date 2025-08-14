// utils/clipboard.ts
/* Pequeno helper cross-plataforma para copiar texto para a área de transferência.
   Ordem de tentativa:
   1) Web: navigator.clipboard.writeText
   2) Expo: expo-clipboard (setStringAsync)
   3) RN community: @react-native-clipboard/clipboard (setString)
*/

export async function copyText(text: string): Promise<void> {
  // 1) Web
  try {
    // @ts-ignore - navigator pode não existir no RN
    if (typeof navigator !== 'undefined' && navigator?.clipboard?.writeText) {
      // @ts-ignore
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch {
    // continua tentando outras opções
  }

  // 2) Expo Clipboard
  try {
    // require dinâmico evita erro de tipos quando o pacote não está instalado
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const expoClip = require('expo-clipboard');
    if (expoClip?.setStringAsync && typeof expoClip.setStringAsync === 'function') {
      await expoClip.setStringAsync(text);
      return;
    }
  } catch {
    // segue adiante
  }

  // 3) RN community Clipboard
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const rnClipModule = require('@react-native-clipboard/clipboard');
    const rnClip = rnClipModule?.default ?? rnClipModule;
    if (rnClip?.setString && typeof rnClip.setString === 'function') {
      rnClip.setString(text); // esta API é síncrona
      return;
    }
  } catch {
    // fim das tentativas
  }
}

/** Conveniência com feedback booleano (true se provavelmente copiou). */
export async function tryCopy(text: string): Promise<boolean> {
  try {
    await copyText(text);
    return true;
  } catch {
    return false;
  }
}
