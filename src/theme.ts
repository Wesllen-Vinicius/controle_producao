import { TextStyle } from 'react-native';

export const colors = {
  background: '#0B1113',
  surface:    '#12191F',
  surfaceAlt: '#18222B',
  line:       '#26333D',

  primary:    '#da7b59ff',
  primaryAlt: '#FF6A33',
  accent:     '#00A7FF',

  text:       '#E9EEF1',
  muted:      '#9AAABD',

  success:    '#22C55E',
  error:      '#EF4444',
  warning:    '#F59E0B',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 18, xl: 26 };

export const typography: Record<string, TextStyle> = {
  h1:   { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: 0.2 },
  h2:   { fontSize: 18, fontWeight: '700', color: colors.text },
  body: { fontSize: 16, fontWeight: '400', color: colors.text },
  label:{ fontSize: 13, fontWeight: '600', color: colors.muted },
};
