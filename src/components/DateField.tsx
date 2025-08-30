// src/components/DateField.tsx
import { useState, useCallback } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '../state/ThemeProvider';

function parseISODate(s?: string) {
  if (!s) return new Date();
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y || 0, (m || 1) - 1, d || 1);
}

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

type Props = {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
};

export default function DateField({
  label,
  value,
  onChange,
  placeholder = 'YYYY-MM-DD',
  minimumDate,
  maximumDate,
}: Props) {
  const { colors, radius, spacing, typography } = useTheme();
  const [show, setShow] = useState(false);

  const onChangePicker = useCallback(
    (_: DateTimePickerEvent, date?: Date) => {
      setShow(Platform.OS === 'ios');
      if (date) {
        onChange(toISODate(date));
      }
    },
    [onChange]
  );

  const displayMode = Platform.select<
    'default' | 'spinner' | 'calendar' | 'clock' | 'compact' | 'inline'
  >({
    ios: 'inline',
    android: 'default',
  });

  return (
    <View>
      {!!label && <Text style={[typography.label, { marginBottom: 6 }]}>{label}</Text>}
      <Pressable
        onPress={() => setShow(true)}
        style={{
          backgroundColor: colors.surfaceAlt,
          borderRadius: radius.lg,
          borderColor: colors.line,
          borderWidth: 1,
          height: 52,
          paddingHorizontal: spacing.md,
          alignItems: 'center',
          flexDirection: 'row',
        }}
      >
        <MaterialCommunityIcons name="calendar-blank" size={18} color={colors.muted} />
        <Text
          style={{ color: value ? colors.text : colors.muted, marginLeft: 8, fontWeight: '600' }}
        >
          {value || placeholder}
        </Text>
      </Pressable>

      {show && (
        <DateTimePicker
          mode="date"
          value={parseISODate(value)}
          display={displayMode}
          onChange={onChangePicker}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}
    </View>
  );
}
