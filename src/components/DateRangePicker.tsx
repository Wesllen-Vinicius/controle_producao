import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Chip, Input } from './ui';
import { useTheme } from '../state/ThemeProvider';

type Props = {
  from: string; to: string;
  onFrom: (v: string) => void; onTo: (v: string) => void;
  onQuick?: (k: '7d'|'30d'|'month') => void;
};

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

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Input value={from} onChangeText={onFrom} placeholder="De (YYYY-MM-DD)" />
        </View>
        <View style={{ flex: 1 }}>
          <Input value={to} onChangeText={onTo} placeholder="Até (YYYY-MM-DD)" />
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
