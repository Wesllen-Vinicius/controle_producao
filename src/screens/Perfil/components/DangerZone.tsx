// src/screens/Perfil/components/DangerZone.tsx
import { ListItem } from './ListItem';
import { Section } from './Section';

interface DangerZoneProps {
  onDeleteAccount: () => void;
}

export function DangerZone({ onDeleteAccount }: DangerZoneProps) {
  return (
    <Section title="Zona de Perigo" icon="alert-outline" isDanger>
      <ListItem
        icon="account-cancel-outline"
        title="Solicitar Exclusão de Conta"
        subtitle="Esta ação é permanente e irreversível"
        onPress={onDeleteAccount}
        isDestructive
      />
    </Section>
  );
}
