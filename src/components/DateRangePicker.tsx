import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Chip, Input } from './ui';
import { useTheme } from '../state/ThemeProvider';

type Props = {
  from: string;
  to: string;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
  onQuick?: (k: '7d' | '30d' | 'month') => void;
};

const isISODate = (v: string) => /^(\d{4})-(\d{2})-(\d{2})$/.test(v);

export default function DateRangePicker({ from, to, onFrom, onTo, onQuick }: Props) {
  const { colors, spacing, typography } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: { flexDirection: 'row', gap: spacing.sm },
        hint: { color: colors.muted, fontWeight: '700', alignSelf: 'center' },
      }),
    [colors.muted, spacing.sm]
  );

  const fromInvalid = !!from && !isISODate(from);
  const toInvalid = !!to && !isISODate(to);

  // iOS oferece teclado com hífen; no Android ficamos no default para facilitar digitação
  const dateKeyboard = Platform.select<"default" | "numbers-and-punctuation">({
    ios: 'numbers-and-punctuation',
    android: 'default',
    default: 'default',
  });

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Input
            label="De"
            value={from}
            onChangeText={onFrom}
            placeholder="YYYY-MM-DD"
            keyboardType={dateKeyboard}
            autoCapitalize="none"
            style={fromInvalid ? { borderColor: colors.danger } : undefined}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Input
            label="Até"
            value={to}
            onChangeText={onTo}
            placeholder="YYYY-MM-DD"
            keyboardType={dateKeyboard}
            autoCapitalize="none"
            style={toInvalid ? { borderColor: colors.danger } : undefined}
          />
        </View>
      </View>

      {!!onQuick && (
        <View style={[styles.row, { flexWrap: 'wrap', alignItems: 'center' }]}>
          <Text style={[typography.label, styles.hint]}>Rápido:</Text>
          <Chip label="7 dias" onPress={() => onQuick('7d')} />
          <Chip label="30 dias" onPress={() => onQuick('30d')} />
          <Chip label="Este mês" onPress={() => onQuick('month')} />
        </View>
      )}
    </View>
  );
}
