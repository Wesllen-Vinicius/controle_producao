import React from 'react';
import { View, Text, Alert } from 'react-native';
import Button from '../ui/Button';
import { useTheme } from '../../state/ThemeProvider';
import { BaseErrorBoundary, ErrorBoundaryState } from './BaseErrorBoundary';

interface NetworkErrorBoundaryProps {
  children: React.ReactNode;
  onRetry?: () => void;
  fallbackComponent?: React.ComponentType<{ error: Error; retry: () => void }>;
}

export class NetworkErrorBoundary extends BaseErrorBoundary {
  static isNetworkError(error: Error): boolean {
    const networkKeywords = [
      'network',
      'fetch',
      'timeout',
      'connection',
      'offline',
      'unreachable',
      'ENOTFOUND',
      'ECONNREFUSED'
    ];
    
    return networkKeywords.some(keyword => 
      error.message.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  constructor(props: NetworkErrorBoundaryProps) {
    super(props);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // Only handle network-related errors
      if (!NetworkErrorBoundary.isNetworkError(this.state.error)) {
        throw this.state.error; // Let parent boundary handle it
      }

      const props = this.props as NetworkErrorBoundaryProps;
      
      if (props.fallbackComponent) {
        const FallbackComponent = props.fallbackComponent;
        return <FallbackComponent error={this.state.error} retry={this.handleRetry} />;
      }

      return <DefaultNetworkErrorFallback error={this.state.error} onRetry={this.handleRetry} />;
    }

    return (this.props as NetworkErrorBoundaryProps).children;
  }

  private handleRetry = () => {
    const props = this.props as NetworkErrorBoundaryProps;
    this.setState({ hasError: false, error: null });
    props.onRetry?.();
  };
}

function DefaultNetworkErrorFallback({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const { colors, spacing, typography } = useTheme();

  const getErrorMessage = (error: Error) => {
    if (error.message.includes('timeout')) {
      return 'A conexão expirou. Verifique sua internet e tente novamente.';
    }
    if (error.message.includes('offline')) {
      return 'Você está offline. Conecte-se à internet para continuar.';
    }
    if (error.message.includes('fetch')) {
      return 'Erro de comunicação com o servidor. Tente novamente.';
    }
    return 'Problema de conexão. Verifique sua internet e tente novamente.';
  };

  const showDiagnostics = () => {
    Alert.alert(
      'Detalhes do Erro',
      `Erro: ${error.message}\n\nSe o problema persistir, entre em contato com o suporte.`,
      [{ text: 'Fechar' }]
    );
  };

  return (
    <View style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
      backgroundColor: colors.background,
    }}>
      <View style={{
        alignItems: 'center',
        maxWidth: 300,
        gap: spacing.lg,
      }}>
        <Text style={{ fontSize: 48 }}>🌐</Text>
        
        <View style={{ alignItems: 'center', gap: spacing.sm }}>
          <Text style={[typography.h2, { textAlign: 'center', color: colors.text }]}>
            Problema de Conexão
          </Text>
          <Text style={[typography.body, { textAlign: 'center', color: colors.muted }]}>
            {getErrorMessage(error)}
          </Text>
        </View>

        <View style={{ gap: spacing.md, width: '100%' }}>
          <Button
            title="Tentar Novamente"
            onPress={onRetry}
            full
          />
          
          <Button
            title="Ver Detalhes"
            variant="text"
            onPress={showDiagnostics}
            full
          />
        </View>
      </View>
    </View>
  );
}

export default NetworkErrorBoundary;