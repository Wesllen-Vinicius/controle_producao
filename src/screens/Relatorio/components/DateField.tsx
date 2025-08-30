import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../../state/ThemeProvider';
import { getTodayStr, parseISODate, toISODate } from '../utils';

interface DateFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function DateField({
  label,
  value,
  onChange,
  placeholder = 'Selecione uma data',
}: DateFieldProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const [showPicker, setShowPicker] = useState(false);

  const handleDateChange = (_: DateTimePickerEvent, date?: Date) => {
    setShowPicker(Platform.OS === 'ios');
    if (date) {
      onChange(toISODate(date));
    }
  };

  const displayValue = value
    ? parseISODate(value).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
    : '';

  return (
    <View style={styles.container}>
      {!!label && (
        <Text style={[typography.label, styles.label, { color: colors.text }]}>{label}</Text>
      )}

      <Pressable
        onPress={() => setShowPicker(true)}
        style={({ pressed }) => [
          styles.pressable,
          {
            backgroundColor: colors.surface,
            borderColor: pressed ? colors.primary : colors.line,
            borderRadius: radius.md,
            shadowColor: colors.shadow,
          },
        ]}
        // CORRIGIDO: O operador '||' foi trocado por '??'
        accessibilityLabel={label ?? 'Campo de data'}
        accessibilityValue={{ text: displayValue ?? 'Nenhuma data selecionada' }}
      >
        <MaterialCommunityIcons name="calendar-blank" size={20} color={colors.primary} />
        <Text
          style={[
            styles.text,
            { color: value ? colors.text : colors.muted, marginLeft: spacing.sm },
          ]}
        >
          {displayValue || placeholder}
        </Text>
      </Pressable>

      {showPicker && (
        <DateTimePicker
          testID="dateTimePicker"
          mode="date"
          value={parseISODate(value || getTodayStr())}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  label: {
    fontWeight: '600',
    fontSize: 12,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pressable: {
    borderWidth: 1,
    height: 48,
    paddingHorizontal: 12,
    alignItems: 'center',
    flexDirection: 'row',
    ...Platform.select({
      ios: { shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
      android: { elevation: 1 },
    }),
  },
  text: { fontWeight: '500', fontSize: 15 },
});
