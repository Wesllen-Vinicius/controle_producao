import React, { useState } from 'react';
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
};

export default function DateField({ label, value, onChange, placeholder = 'YYYY-MM-DD' }: Props) {
  const { colors, radius, spacing, typography } = useTheme();
  const [show, setShow] = useState(false);

  const onChangePicker = (_: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShow(false);
    if (date) onChange(toISODate(date));
  };

  const iosInline =
    Platform.OS === 'ios' && typeof Platform.Version === 'number' && Platform.Version >= 14;

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
        <Text style={{ color: value ? colors.text : colors.muted, marginLeft: 8, fontWeight: '600' }}>
          {value || placeholder}
        </Text>
      </Pressable>

      {show && (
        <DateTimePicker
          mode="date"
          value={parseISODate(value)}
          display={Platform.OS === 'ios' ? (iosInline ? 'inline' : 'spinner') : 'default'}
          onChange={onChangePicker}
        />
      )}
    </View>
  );
}
