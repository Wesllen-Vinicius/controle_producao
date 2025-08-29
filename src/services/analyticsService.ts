import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnalyticsEvent } from '../types';
import { APP_CONFIG, FEATURES } from '../config/constants';

export class AnalyticsService {
  private static instance: AnalyticsService;
  private eventQueue: AnalyticsEvent[] = [];
  private sessionId: string;
  private userId?: string;

  private constructor() {
    this.sessionId = this.generateSessionId();
    // Defer initialization to avoid early execution
    setTimeout(() => {
      this.initializeAnalytics();
    }, 0);
  }

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  private async initializeAnalytics() {
    if (!FEATURES.ANALYTICS) return;

    // Carregar eventos armazenados localmente
    try {
      const storedEvents = await AsyncStorage.getItem('analytics_events');
      if (storedEvents) {
        this.eventQueue = JSON.parse(storedEvents);
      }
    } catch (error) {
      console.warn('Failed to load stored analytics events:', error);
    }

    // Configurar flush automático a cada 30 segundos
    setInterval(() => {
      this.flushEvents();
    }, 30000);
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Definir ID do usuário
  setUserId(userId: string): void {
    this.userId = userId;
  }

  // Registrar evento
  async track(eventName: string, properties?: Record<string, any>): Promise<void> {
    if (!FEATURES.ANALYTICS) return;

    const event: AnalyticsEvent = {
      name: eventName,
      properties: {
        ...properties,
        sessionId: this.sessionId,
        userId: this.userId,
        timestamp: Date.now(),
        platform: 'react-native',
        appVersion: APP_CONFIG.VERSION,
        buildNumber: APP_CONFIG.BUILD_NUMBER,
      },
      timestamp: Date.now(),
    };

    this.eventQueue.push(event);

    // Salvar localmente
    try {
      await AsyncStorage.setItem('analytics_events', JSON.stringify(this.eventQueue));
    } catch (error) {
      console.warn('Failed to store analytics event:', error);
    }

    // Flush se a fila estiver muito grande
    if (this.eventQueue.length >= 50) {
      this.flushEvents();
    }
  }

  // Eventos pré-definidos para facilitar uso
  async trackScreenView(screenName: string, properties?: Record<string, any>): Promise<void> {
    await this.track('screen_view', {
      screen_name: screenName,
      ...properties,
    });
  }

  async trackUserAction(action: string, element?: string, properties?: Record<string, any>): Promise<void> {
    await this.track('user_action', {
      action,
      element,
      ...properties,
    });
  }

  async trackPerformanceMetric(metric: string, value: number, unit?: string): Promise<void> {
    await this.track('performance_metric', {
      metric,
      value,
      unit,
    });
  }

  async trackError(error: Error, context?: string, properties?: Record<string, any>): Promise<void> {
    await this.track('error_occurred', {
      error_message: error.message,
      error_stack: error.stack,
      error_name: error.name,
      context,
      ...properties,
    });
  }

  async trackBusinessEvent(event: string, entity: string, properties?: Record<string, any>): Promise<void> {
    await this.track('business_event', {
      business_event: event,
      entity,
      ...properties,
    });
  }

  // Eventos específicos da aplicação
  async trackLogin(method: 'email' | 'biometric', success: boolean): Promise<void> {
    await this.track('user_login', {
      method,
      success,
      timestamp: Date.now(),
    });
  }

  async trackProduction(action: 'create' | 'view' | 'edit', productCount: number): Promise<void> {
    await this.track('production_action', {
      action,
      product_count: productCount,
    });
  }

  async trackInventory(action: 'entry' | 'exit' | 'adjustment', value: number): Promise<void> {
    await this.track('inventory_action', {
      action,
      value,
    });
  }

  async trackReport(type: string, dateRange: { from: string; to: string }): Promise<void> {
    await this.track('report_generated', {
      report_type: type,
      date_range: dateRange,
    });
  }

  // Flush eventos para o servidor
  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const eventsToFlush = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // Em produção, enviar para serviço de analytics
      if (__DEV__) {
        console.log('[ANALYTICS] Flushing events:', eventsToFlush);
      } else {
        // Aqui você enviaria para seu serviço de analytics (Firebase, Mixpanel, etc.)
        // await this.sendToAnalyticsService(eventsToFlush);
      }

      // Limpar eventos armazenados localmente após envio bem-sucedido
      await AsyncStorage.removeItem('analytics_events');
    } catch (error) {
      console.error('Failed to flush analytics events:', error);
      // Recolocar eventos na fila em caso de erro
      this.eventQueue.unshift(...eventsToFlush);
    }
  }

  // Métricas de sessão
  async trackSessionStart(): Promise<void> {
    await this.track('session_start', {
      session_id: this.sessionId,
    });
  }

  async trackSessionEnd(duration: number): Promise<void> {
    await this.track('session_end', {
      session_id: this.sessionId,
      duration_ms: duration,
    });
    
    // Flush todos os eventos ao final da sessão
    await this.flushEvents();
  }

  // Funnel tracking
  async trackFunnelStep(funnel: string, step: string, success: boolean, properties?: Record<string, any>): Promise<void> {
    await this.track('funnel_step', {
      funnel,
      step,
      success,
      ...properties,
    });
  }

  // A/B Testing support
  async trackExperiment(experiment: string, variant: string, properties?: Record<string, any>): Promise<void> {
    await this.track('experiment_exposure', {
      experiment,
      variant,
      ...properties,
    });
  }

  // Limpeza de dados antigos
  async cleanupOldEvents(): Promise<void> {
    try {
      const cutoffDate = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 dias atrás
      this.eventQueue = this.eventQueue.filter(event => event.timestamp > cutoffDate);
      
      await AsyncStorage.setItem('analytics_events', JSON.stringify(this.eventQueue));
    } catch (error) {
      console.warn('Failed to cleanup old analytics events:', error);
    }
  }

  // Estatísticas de uso
  getQueueStats(): { total: number; oldestEvent: number | null; newestEvent: number | null } {
    if (this.eventQueue.length === 0) {
      return { total: 0, oldestEvent: null, newestEvent: null };
    }

    const timestamps = this.eventQueue.map(e => e.timestamp);
    return {
      total: this.eventQueue.length,
      oldestEvent: Math.min(...timestamps),
      newestEvent: Math.max(...timestamps),
    };
  }

  // Desabilitar analytics (para conformidade com privacidade)
  async disableAnalytics(): Promise<void> {
    this.eventQueue = [];
    await AsyncStorage.removeItem('analytics_events');
    console.log('Analytics disabled and data cleared');
  }
}

// Lazy loading to avoid early execution
export const getAnalyticsService = () => AnalyticsService.getInstance();
export default getAnalyticsService;