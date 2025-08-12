// App.tsx
import 'react-native-gesture-handler';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import Navigator from './src/navigation';
import { ThemeProvider, useTheme } from './src/state/ThemeProvider';
import { AuthProvider } from './src/state/AuthProvider';
import { ToastProvider } from './src/state/ToastProvider';

// Pequeno wrapper para ler o tema e definir a StatusBar
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
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
