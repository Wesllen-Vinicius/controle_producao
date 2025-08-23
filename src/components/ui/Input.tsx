import React, { forwardRef, useCallback, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../state/ThemeProvider';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

type InputMode = 'text' | 'integer' | 'decimal';

type Props = Omit<TextInputProps, 'onChange' | 'onChangeText' | 'style'> & {
  label?: string;
  help?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onPressRightIcon?: () => void;
  suffix?: string;
  mode?: InputMode;
  decimals?: number;
  allowNegative?: boolean;
  full?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  onValueNumber?: (num: number | null) => void;
  onChangeText?: (text: string) => void;
};

function normalizeInteger(text: string, allowNegative?: boolean) {
  let t = text.replace(/[^\d-]/g, '');
  if (!allowNegative) t = t.replace(/-/g, '');
  if (allowNegative) {
    t = t.replace(/(?!^)-/g, '');
    if (t.startsWith('--')) t = t.replace(/^--+/, '-');
  }
  return t;
}

function normalizeDecimal(text: string, decimals: number, allowNegative?: boolean) {
  let t = text.replace(',', '.');
  t = t.replace(new RegExp(`[^0-9\\.${allowNegative ? '-' : ''}]`, 'g'), '');
  const parts = t.split('.');
  if (parts.length > 2) t = parts[0] + '.' + parts.slice(1).join('');
  if (!allowNegative) t = t.replace(/-/g, ''); else t = t.replace(/(?!^)-/g, '');
  const [intPart, decPart = ''] = t.split('.');
  const limited = decPart.slice(0, Math.max(0, decimals));
  t = limited.length ? `${intPart}.${limited}` : intPart;
  if (t.startsWith('00')) t = t.replace(/^0+/, '0');
  if (t === '-') return t;
  if (t === '.') return '0.';
  if (t === '-.') return '-0.';
  return t;
}

const Input = forwardRef<TextInput, Props>(function Input(
  {
    label,
    help,
    error,
    leftIcon,
    rightIcon,
    onPressRightIcon,
    suffix,
    mode = 'text',
    decimals = 2,
    allowNegative = false,
    full,
    containerStyle,
    labelStyle,
    onChangeText,
    onValueNumber,
    keyboardType,
    editable = true,
    value,
    ...rest
  },
  ref
) {
  const { colors, spacing, radius, opacity, typography } = useTheme();
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const kbd = useMemo(() => {
    if (keyboardType) return keyboardType;
    if (mode === 'integer') return 'number-pad';
    if (mode === 'decimal') return 'decimal-pad';
    return 'default';
  }, [keyboardType, mode]);

  const handleChange = useCallback(
    (t: string) => {
      let out = t;
      if (mode === 'integer') {
        out = normalizeInteger(t, allowNegative);
        onValueNumber?.(out === '' || out === '-' ? null : Number(out));
      } else if (mode === 'decimal') {
        out = normalizeDecimal(t, decimals, allowNegative);
        const num = out === '' || out === '-' || out === '.' || out === '-.' ? null : Number(out);
        onValueNumber?.(num);
      } else {
        onValueNumber?.(null);
      }
      onChangeText?.(out);
    },
    [mode, decimals, allowNegative, onChangeText, onValueNumber]
  );

  const containerBg = editable ? colors.surface : colors.surfaceAlt;
  const borderColor = error ? colors.danger : focused ? colors.primary : colors.line;
  const textColor = editable ? colors.text : colors.muted;

  const pressToFocus = () => inputRef.current?.focus();
  const showClear = editable && value && String(value).length > 0;

  return (
    <View style={[full && { alignSelf: 'stretch' }, containerStyle]}>
      {label ? (
        <Text style={[typography.label, { marginBottom: 6 }, labelStyle]}>
          {label}
        </Text>
      ) : null}

      <Pressable
        onPress={pressToFocus}
        accessibilityRole="none"
        style={[
          styles.container,
          {
            backgroundColor: containerBg,
            borderColor,
            borderRadius: radius.md,
            opacity: editable ? 1 : opacity.disabled,
          },
        ]}
      >
        {leftIcon ? <View style={[styles.icon, { marginLeft: spacing.md }]}>{leftIcon}</View> : null}

        <TextInput
          ref={(node) => {
            if (typeof ref === 'function') ref(node as any);
            else if (ref) (ref as any).current = node;
            (inputRef as any).current = node;
          }}
          value={value}
          onChangeText={handleChange}
          editable={editable}
          keyboardType={kbd}
          placeholderTextColor={colors.muted}
          style={[
            styles.input,
            {
              color: textColor,
              paddingVertical: 12,
              paddingHorizontal: leftIcon ? spacing.sm : spacing.md,
            },
          ]}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...rest}
        />

        {suffix ? (
          <View style={{ paddingHorizontal: 8, paddingVertical: 6 }}>
            <Text style={{ color: colors.muted, fontWeight: '700' }}>{suffix}</Text>
          </View>
        ) : null}

        {rightIcon ? (
          <Pressable
            onPress={onPressRightIcon}
            hitSlop={8}
            style={[styles.icon, { marginRight: spacing.md }]}
            accessibilityRole="button"
            accessibilityLabel="Ação do campo"
          >
            {rightIcon}
          </Pressable>
        ) : null}

        {showClear && !rightIcon ? (
          <Pressable
            onPress={() => handleChange('')}
            hitSlop={8}
            style={[styles.icon, { marginRight: spacing.md }]}
            accessibilityRole="button"
            accessibilityLabel="Limpar campo"
          >
            <MaterialCommunityIcons name="close-circle" size={18} color={colors.muted} />
          </Pressable>
        ) : null}
      </Pressable>

      {error ? (
        <Text style={[styles.help, { color: colors.danger }]} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : help ? (
        <Text style={[styles.help, { color: colors.muted }]}>{help}</Text>
      ) : null}
    </View>
  );
});

export default Input;

export function InputNumber({
  decimals = 2,
  mode = 'decimal',
  suffix,
  ...props
}: Omit<Props, 'mode'> & { mode?: 'integer' | 'decimal' }) {
  const numericKeyboard = mode === 'integer' ? 'number-pad' : 'decimal-pad';
  return (
    <Input
      {...props}
      mode={mode}
      decimals={decimals}
      keyboardType={numericKeyboard}
      suffix={suffix}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  help: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
  },
});
