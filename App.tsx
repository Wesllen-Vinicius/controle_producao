// App.tsx
import 'react-native-gesture-handler';
import 'react-native-reanimated';

import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import * as SplashScreen from 'expo-splash-screen';
import { Asset } from 'expo-asset';

import Navigator from './src/navigation';
import { ThemeProvider, useTheme } from './src/state/ThemeProvider';
import { AuthProvider } from './src/state/AuthProvider';
import { ToastProvider } from './src/state/ToastProvider';

// não esconda automaticamente
SplashScreen.preventAutoHideAsync().catch(() => {});

function AppBody() {
  const { scheme } = useTheme();
  return (
    <>
      <Navigator />
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);

  // Pré-carrega assets essenciais para evitar “flash” ao sair da splash
  useEffect(() => {
    (async () => {
      try {
        await Asset.loadAsync([
          require('./assets/splash.png'),
          // se tiver estas, melhor ainda:
          // require('./assets/splash-dark.png'),
          // require('./assets/adaptive-icon-foreground.png'),
          // require('./assets/rosa-dos-ventos.png'),
        ]);
      } catch {}
      setReady(true);
    })();
  }, []);

  // Esconde a splash só quando a primeira “view” aparecer
  const onLayout = useCallback(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayout}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <AppBody />
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
