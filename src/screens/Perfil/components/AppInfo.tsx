// src/screens/Perfil/components/AppInfo.tsx
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../../state/ThemeProvider';
import { APP_VERSION, BUILD_NUMBER, DEVELOPER } from '../constants';
import { Section } from './Section';

const InfoRow = ({ label, value }: { label: string; value: string }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { borderBottomColor: colors.line }]}>
      <Text style={[styles.label, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
    </View>
  );
};

export function AppInfo() {
  return (
    <Section title="Informações do Aplicativo" icon="information-outline">
      <InfoRow label="Versão" value={APP_VERSION} />
      <InfoRow label="Build" value={BUILD_NUMBER} />
      <InfoRow label="Desenvolvido por" value={DEVELOPER} />
      <InfoRow label="Plataforma" value={Platform.OS === 'ios' ? 'iOS' : 'Android'} />
    </Section>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: 14,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
  },
});
