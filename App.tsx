import 'react-native-gesture-handler';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './src/state/AuthProvider';
import { ThemeProvider } from './src/state/ThemeProvider';
import Navigator from './src/navigation';
import { ToastProvider } from './src/state/ToastProvider';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <Navigator />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
