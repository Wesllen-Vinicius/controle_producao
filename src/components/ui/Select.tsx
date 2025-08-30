import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../state/ThemeProvider';
import Button from './Button';

export type SelectOption<V = string | number> = {
  label: string;
  value: V;
  subtitle?: string; // opcional
};

type Props<V = string | number> = {
  label?: string;
  help?: string;
  error?: string;
  placeholder?: string;
  value?: V | null;
  onChangeValue?: (v: V) => void;
  options: SelectOption<V>[];
  searchable?: boolean;
  disabled?: boolean;
  full?: boolean;

  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  displayFormatter?: (opt?: SelectOption<V>) => string;
  testID?: string;
};

export default function Select<V = string | number>({
  label,
  help,
  error,
  placeholder = 'Selecionar…',
  value,
  onChangeValue,
  options,
  searchable = true,
  disabled,
  full,
  style,
  labelStyle,
  displayFormatter,
  testID,
}: Props<V>) {
  const { colors, spacing, radius, opacity, typography, z } = useTheme();

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const inputRef = useRef<TextInput>(null);

  const selected = useMemo(() => options.find(o => o.value === value), [options, value]);

  const showValue = useMemo(() => {
    if (displayFormatter) return displayFormatter(selected);
    return selected?.label ?? '';
  }, [selected, displayFormatter]);

  const filtered = useMemo(() => {
    if (!q.trim()) return options;
    const s = q.trim().toLowerCase();
    return options.filter(
      o => o.label.toLowerCase().includes(s) || o.subtitle?.toLowerCase().includes(s)
    );
  }, [q, options]);

  useEffect(() => {
    if (open && searchable) {
      // dá um foco leve no campo de busca
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQ('');
    }
  }, [open, searchable]);

  const borderColor = error ? colors.danger : colors.line;
  const textColor = disabled ? colors.muted : colors.text;

  return (
    <View style={[full && { alignSelf: 'stretch' }]}>
      {label ? (
        <Text style={[typography.label, { marginBottom: 6 }, labelStyle]}>{label}</Text>
      ) : null}

      <Pressable
        disabled={disabled}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityState={{ disabled: !!disabled, expanded: open }}
        testID={testID}
        style={[
          styles.container,
          {
            backgroundColor: colors.surface,
            borderColor,
            borderRadius: radius.md,
            opacity: disabled ? opacity.disabled : 1,
            paddingHorizontal: spacing.md,
            minHeight: 44,
          },
          style,
        ]}
      >
        <View style={styles.row}>
          <Text
            style={[styles.valueText, { color: showValue ? textColor : colors.muted }]}
            numberOfLines={1}
          >
            {showValue ?? placeholder}
          </Text>
          <Text style={{ color: colors.muted, fontWeight: '800' }}>▾</Text>
        </View>
      </Pressable>

      {error ? (
        <Text style={[styles.help, { color: colors.danger }]} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : help ? (
        <Text style={[styles.help, { color: colors.muted }]}>{help}</Text>
      ) : null}

      {/* Sheet */}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={[styles.backdrop, { backgroundColor: '#00000066', zIndex: z.overlay }]}
          onPress={() => setOpen(false)}
        />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderTopLeftRadius: radius.lg,
              borderTopRightRadius: radius.lg,
              zIndex: z.sheet,
            },
          ]}
        >
          <View style={{ padding: spacing.md, paddingBottom: spacing.sm }}>
            <Text style={[typography.h2]} numberOfLines={1}>
              {label ?? 'Selecionar'}
            </Text>
            {searchable ? (
              <View
                style={[
                  styles.searchBox,
                  {
                    backgroundColor: colors.surfaceAlt,
                    borderColor: colors.line,
                    borderRadius: radius.md,
                    marginTop: spacing.sm,
                  },
                ]}
              >
                <TextInput
                  ref={inputRef}
                  placeholder="Buscar…"
                  placeholderTextColor={colors.muted}
                  value={q}
                  onChangeText={setQ}
                  style={[styles.searchInput, { color: colors.text }]}
                  returnKeyType="search"
                />
              </View>
            ) : null}
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item, idx) => String(item.value) + '-' + idx}
            keyboardShouldPersistTaps="handled"
            ItemSeparatorComponent={() => (
              <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.line }} />
            )}
            renderItem={({ item }) => {
              const isSelected = item.value === value;
              return (
                <Pressable
                  onPress={() => {
                    onChangeValue?.(item.value as V);
                    setOpen(false);
                  }}
                  android_ripple={{ color: `${colors.text}14` }}
                  style={({ pressed }) => [
                    styles.optionRow,
                    {
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.md,
                      backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.optionLabel,
                        { color: colors.text, fontWeight: isSelected ? '800' : '600' },
                      ]}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>
                    {item.subtitle ? (
                      <Text
                        style={[styles.optionSubtitle, { color: colors.muted }]}
                        numberOfLines={1}
                      >
                        {item.subtitle}
                      </Text>
                    ) : null}
                  </View>
                  <Text
                    style={{ color: isSelected ? colors.primary : colors.muted, fontWeight: '800' }}
                  >
                    {isSelected ? '✓' : ''}
                  </Text>
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View style={{ padding: spacing.lg, alignItems: 'center' }}>
                <Text style={{ color: colors.muted }}>Nenhuma opção encontrada</Text>
              </View>
            }
            style={{ maxHeight: '60%' }}
          />

          <View style={{ padding: spacing.md, paddingTop: spacing.sm }}>
            <Button title="Fechar" variant="text" onPress={() => setOpen(false)} full />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
  },
  row: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  valueText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  help: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '88%',
  },
  searchBox: {
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionLabel: {
    fontSize: 16,
  },
  optionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
});
