import React from 'react';
import Screen from '../components/Screen';
import { Button, Card } from '../components/ui';
import { Text } from 'react-native';
import { useAuth } from '../state/AuthProvider';
import { typography } from '../theme';

export default function PerfilScreen() {
  const { session, profile, signOut } = useAuth();
  return (
    <Screen>
      <Text style={typography.h1 as any}>Seu perfil</Text>
      <Card>
        <Text style={{ color:'#cbd5e1' }}>E-mail: {session?.user.email}</Text>
        <Text style={{ color:'#cbd5e1' }}>Usuário: {profile?.username || '-'}</Text>
        <Text style={{ color:'#cbd5e1' }}>Papel: {profile?.role}</Text>
        <Button title="Sair" onPress={signOut} />
      </Card>
    </Screen>
  );
}
