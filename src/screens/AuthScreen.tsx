import React, { useState } from 'react';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../state/AuthProvider';
import Screen from '../components/Screen';
import { Card, Input, Button } from '../components/ui';
import { colors, typography } from '../theme';

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login'|'register'>('login');
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [username, setUsername] = useState('');

  async function handle() {
    if (!email || !password || (mode === 'register' && !username)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return Alert.alert('Atenção', 'Preencha os campos obrigatórios.');
    }
    try {
      if (mode === 'login') await signIn(email, password);
      else await signUp(email, password, username);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e:any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Erro', e.message);
    }
  }

  return (
    <Screen>
      <Card>
        <Text style={typography.h1 as any}>{mode === 'login' ? 'Entrar' : 'Cadastrar'}</Text>
        {mode === 'register' && <Input placeholder="Usuário" value={username} onChangeText={setUsername} />}
        <Input placeholder="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <Input placeholder="Senha" value={password} onChangeText={setPassword} secureTextEntry />
        <Button title={mode === 'login' ? 'Entrar' : 'Cadastrar'} onPress={handle} />
        <Text onPress={() => setMode(mode === 'login' ? 'register' : 'login')} style={{ color: colors.accent, fontWeight: '700', marginTop: 10, textAlign: 'center' }}>
          {mode === 'login' ? 'Criar conta' : 'Já tenho conta'}
        </Text>
      </Card>
    </Screen>
  );
}

import { Text } from 'react-native';
