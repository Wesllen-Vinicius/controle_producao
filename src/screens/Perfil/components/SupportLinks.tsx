// src/screens/Perfil/components/SupportLinks.tsx
import { PRIVACY_URL, RATE_URL, TERMS_URL, WHATSAPP_URL } from '../constants';
import { ListItem } from './ListItem';
import { Section } from './Section';

interface SupportLinksProps {
  onReportBug: () => void;
  onOpenLink: (url?: string) => void;
}

export function SupportLinks({ onReportBug, onOpenLink }: SupportLinksProps) {
  return (
    <Section title="Suporte & Ajuda" icon="help-circle-outline">
      <ListItem icon="bug-outline" title="Reportar um Bug" subtitle="Ajude-nos a melhorar o app" onPress={onReportBug} />
      {WHATSAPP_URL && <ListItem icon="whatsapp" title="Suporte via WhatsApp" subtitle="Fale com nossa equipe" onPress={() => onOpenLink(WHATSAPP_URL)} />}
      {PRIVACY_URL && <ListItem icon="shield-check-outline" title="Política de Privacidade" onPress={() => onOpenLink(PRIVACY_URL)} />}
      {TERMS_URL && <ListItem icon="file-document-outline" title="Termos de Uso" onPress={() => onOpenLink(TERMS_URL)} />}
      {RATE_URL && <ListItem icon="star-outline" title="Avaliar o App" subtitle="Deixe sua opinião na loja" onPress={() => onOpenLink(RATE_URL)} />}
    </Section>
  );
}
