import { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Button from './ui/Button';
import Card from './ui/Card';
import { ErrorBoundaryState } from '../types';
import { getLoggingService } from '../services/loggingService';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

export default class ErrorBoundary extends Component<Props, ErrorBoundaryState> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      hasError: true,
      error,
      errorInfo,
    });

    // Log estruturado do erro
    getLoggingService().error('ErrorBoundary caught an error', 'ErrorBoundary', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      errorInfo,
    });

    // Callback customizado
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  override render() {
    if (this.state.hasError) {
      // Renderizar fallback customizado se fornecido
      if (this.props.fallback && this.state.error && this.state.errorInfo) {
        return this.props.fallback(this.state.error, this.state.errorInfo);
      }

      // Renderizar UI de erro padrão
      return (
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="alert-circle-outline" size={64} color="#EF4444" />
            </View>

            <Card variant="filled" padding="lg" style={styles.errorCard}>
              <Text style={styles.title}>Algo deu errado</Text>
              <Text style={styles.message}>
                Ocorreu um erro inesperado. Por favor, tente novamente.
              </Text>

              {__DEV__ && this.state.error && (
                <View style={styles.debugContainer}>
                  <Text style={styles.debugTitle}>
                    Detalhes do erro (apenas em desenvolvimento):
                  </Text>
                  <ScrollView style={styles.debugScroll} nestedScrollEnabled>
                    <Text style={styles.debugText}>
                      {this.state.error.name}: {this.state.error.message}
                    </Text>
                    {this.state.error.stack && (
                      <Text style={styles.debugText}>
                        {'\n'}Stack trace:{'\n'}
                        {this.state.error.stack}
                      </Text>
                    )}
                    {this.state.errorInfo?.componentStack && (
                      <Text style={styles.debugText}>
                        {'\n'}Component stack:{'\n'}
                        {this.state.errorInfo.componentStack}
                      </Text>
                    )}
                  </ScrollView>
                </View>
              )}

              <View style={styles.actions}>
                <Button
                  title="Tentar Novamente"
                  onPress={this.handleReset}
                  variant="primary"
                  leftIcon={<MaterialCommunityIcons name="refresh" size={18} color="white" />}
                />
              </View>
            </Card>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    marginBottom: 24,
  },
  errorCard: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#667085',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  debugContainer: {
    width: '100%',
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: 8,
  },
  debugScroll: {
    maxHeight: 200,
  },
  debugText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#991B1B',
    lineHeight: 16,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
});
