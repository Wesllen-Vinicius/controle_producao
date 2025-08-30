// App.tsx
import 'react-native-gesture-handler';
import 'react-native-reanimated';

import React, { useCallback, useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import * as SplashScreen from 'expo-splash-screen';
import { Asset } from 'expo-asset';

import Navigator from './src/navigation';
import { ThemeProvider, useTheme } from './src/state/ThemeProvider';
import { AuthProvider } from './src/state/AuthProvider';
import { ToastProvider } from './src/state/ToastProvider';
import ErrorBoundary from './src/components/ErrorBoundary';
import NetworkStatus from './src/components/NetworkStatus';
import DevModeNotice from './src/components/DevModeNotice';
import { notificationService } from './src/services/notificationService';

// não esconda automaticamente
SplashScreen.preventAutoHideAsync().catch(() => {});

function AppBody() {
  const { scheme } = useTheme();
  return (
    <>
      <Navigator />
      <DevModeNotice />
      <NetworkStatus />
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);

  // Pré-carrega assets essenciais e inicializa serviços
  useEffect(() => {
    (async () => {
      try {
        await Promise.all([
          Asset.loadAsync([
            require('./assets/splash.png'),
            // se tiver estas, melhor ainda:
            // require('./assets/splash-dark.png'),
            // require('./assets/adaptive-icon-foreground.png'),
            // require('./assets/rosa-dos-ventos.png'),
          ]),
          // Inicializar serviço de notificações
          notificationService.initialize(),
        ]);
      } catch (error) {
        console.warn('Erro ao carregar assets ou inicializar serviços:', error);
      }
      setReady(true);
    })();
  }, []);

  // Esconde a splash só quando a primeira “view” aparecer
  const onLayout = useCallback(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}
