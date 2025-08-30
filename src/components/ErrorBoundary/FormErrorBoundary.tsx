import React from 'react';
import { View, Text } from 'react-native';
import Button from '../ui/Button';
import { useTheme } from '../../state/ThemeProvider';
import { BaseErrorBoundary } from './BaseErrorBoundary';

interface FormErrorBoundaryProps {
  children: React.ReactNode;
  onReset?: () => void;
  formName?: string;
}

export class FormErrorBoundary extends BaseErrorBoundary {
  render() {
    if (this.state.hasError && this.state.error) {
      const props = this.props as FormErrorBoundaryProps;

      return (
        <FormErrorFallback
          error={this.state.error}
          formName={props.formName}
          onReset={() => {
            this.resetError();
            props.onReset?.();
          }}
        />
      );
    }

    return (this.props as FormErrorBoundaryProps).children;
  }
}

function FormErrorFallback({
  error,
  formName,
  onReset,
}: {
  error: Error;
  formName?: string;
  onReset: () => void;
}) {
  const { colors, spacing, typography } = useTheme();

  const isValidationError =
    error.message.includes('validation') ||
    error.message.includes('required') ||
    error.message.includes('invalid');

  return (
    <View
      style={{
        padding: spacing.lg,
        backgroundColor: colors.dangerBackground,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.danger,
      }}
    >
      <View style={{ alignItems: 'center', gap: spacing.md }}>
        <Text style={{ fontSize: 24 }}>{isValidationError ? '⚠️' : '💔'}</Text>

        <View style={{ alignItems: 'center', gap: spacing.xs }}>
          <Text style={[typography.h2, { color: colors.danger, textAlign: 'center' }]}>
            {isValidationError ? 'Erro de Validação' : 'Erro no Formulário'}
          </Text>
          {formName && (
            <Text style={[typography.body, { color: colors.muted, textAlign: 'center' }]}>
              {formName}
            </Text>
          )}
        </View>

        <Text
          style={[
            typography.body,
            {
              color: colors.text,
              textAlign: 'center',
              backgroundColor: colors.surface,
              padding: spacing.sm,
              borderRadius: 4,
            },
          ]}
        >
          {isValidationError
            ? 'Verifique os campos e tente novamente.'
            : 'Ocorreu um problema inesperado com o formulário.'}
        </Text>

        <Button title="Tentar Novamente" onPress={onReset} intent="danger" variant="tonal" small />
      </View>
    </View>
  );
}

export default FormErrorBoundary;
