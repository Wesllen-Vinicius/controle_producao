// CORRIGIDO: Removido o hífen extra no nome do pacote
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_CONFIG } from '../config/constants';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  context?: string;
  data?: unknown;
  userId?: string;
  sessionId?: string;
  stackTrace?: string;
}

export class LoggingService {
  private static instance: LoggingService;
  private logs: LogEntry[] = [];
  private sessionId: string;
  private userId?: string;
  private readonly maxLogs = APP_CONFIG.MONITORING.MAX_LOG_ENTRIES;

  private constructor() {
    this.sessionId = this.generateSessionId();
    setTimeout(() => {
      this.initializeLogging();
    }, 0);
  }

  static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }

  private generateSessionId(): string {
    return `log_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async initializeLogging() {
    try {
      const storedLogs = await AsyncStorage.getItem('app_logs');
      if (storedLogs) {
        this.logs = JSON.parse(storedLogs);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Failed to load stored logs:', error);
    }

    setInterval(
      () => {
        this.cleanupOldLogs();
      },
      60 * 60 * 1000
    );

    this.info('Logging service initialized', 'LoggingService');
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal'];
    const configLevel = APP_CONFIG.MONITORING.LOG_LEVEL as LogLevel;
    const currentLevelIndex = levels.indexOf(level);
    const configLevelIndex = levels.indexOf(configLevel);
    return currentLevelIndex >= configLevelIndex;
  }

  private async addLog(
    level: LogLevel,
    message: string,
    context?: string,
    data?: unknown
  ): Promise<void> {
    if (!this.shouldLog(level)) return;

    const logEntry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      context,
      data,
      userId: this.userId,
      sessionId: this.sessionId,
    };

    if (level === 'error' || level === 'fatal') {
      logEntry.stackTrace = new Error().stack;
    }

    this.logs.push(logEntry);

    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    try {
      await AsyncStorage.setItem('app_logs', JSON.stringify(this.logs));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Failed to store log entry:', error);
    }

    if (__DEV__) {
      const timestamp = new Date(logEntry.timestamp).toISOString();
      const contextStr = context ? `[${context}] ` : '';
      const logMessage = `${timestamp} [${level.toUpperCase()}] ${contextStr}${message}`;

      switch (level) {
        case 'debug':
          // eslint-disable-next-line no-console
          console.debug(logMessage, data);
          break;
        case 'info':
          // eslint-disable-next-line no-console
          console.info(logMessage, data);
          break;
        case 'warn':
          // eslint-disable-next-line no-console
          console.warn(logMessage, data);
          break;
        case 'error':
        case 'fatal':
          // eslint-disable-next-line no-console
          console.error(logMessage, data, logEntry.stackTrace);
          break;
      }
    }
  }

  debug(message: string, context?: string, data?: unknown): Promise<void> {
    return this.addLog('debug', message, context, data);
  }

  info(message: string, context?: string, data?: unknown): Promise<void> {
    return this.addLog('info', message, context, data);
  }

  warn(message: string, context?: string, data?: unknown): Promise<void> {
    return this.addLog('warn', message, context, data);
  }

  error(message: string, context?: string, error?: Error | unknown): Promise<void> {
    const errorData =
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : error;
    return this.addLog('error', message, context, errorData);
  }

  fatal(message: string, context?: string, error?: Error | unknown): Promise<void> {
    const errorData =
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : error;
    return this.addLog('fatal', message, context, errorData);
  }

  async logUserAction(action: string, details?: unknown): Promise<void> {
    await this.info(`User action: ${action}`, 'UserAction', details);
  }

  async logAPICall(
    endpoint: string,
    method: string,
    duration: number,
    success: boolean
  ): Promise<void> {
    const level = success ? 'info' : 'warn';
    const message = `API ${method} ${endpoint} - ${duration}ms - ${success ? 'SUCCESS' : 'FAILED'}`;
    await this.addLog(level, message, 'API');
  }

  async logPerformance(metric: string, value: number, threshold?: number): Promise<void> {
    const level = threshold && value > threshold ? 'warn' : 'info';
    const message = `Performance metric: ${metric} = ${value}${
      threshold ? ` (threshold: ${threshold})` : ''
    }`;
    await this.addLog(level, message, 'Performance');
  }

  async logSecurityEvent(event: string, details?: unknown): Promise<void> {
    await this.addLog('warn', `Security event: ${event}`, 'Security', details);
  }

  async logBusinessEvent(event: string, entity: string, details?: unknown): Promise<void> {
    await this.info(`Business event: ${event} on ${entity}`, 'Business', details);
  }

  getLogsSummary(): {
    total: number;
    byLevel: Record<LogLevel, number>;
    errors: LogEntry[];
    timeRange: { from: number; to: number } | null;
  } {
    if (this.logs.length === 0) {
      return {
        total: 0,
        byLevel: { debug: 0, info: 0, warn: 0, error: 0, fatal: 0 },
        errors: [],
        timeRange: null,
      };
    }

    const byLevel = this.logs.reduce(
      (acc, log) => {
        acc[log.level] = (acc[log.level] ?? 0) + 1;
        return acc;
      },
      {} as Record<LogLevel, number>
    );

    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal'];
    levels.forEach(level => {
      if (!byLevel[level]) byLevel[level] = 0;
    });

    const timestamps = this.logs.map(log => log.timestamp);
    const errors = this.logs.filter(log => log.level === 'error' || log.level === 'fatal');

    return {
      total: this.logs.length,
      byLevel,
      errors,
      timeRange: {
        from: Math.min(...timestamps),
        to: Math.max(...timestamps),
      },
    };
  }

  getRecentLogs(limit = 50): LogEntry[] {
    return this.logs.slice(-limit);
  }

  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  getLogsByContext(context: string): LogEntry[] {
    return this.logs.filter(log => log.context === context);
  }

  searchLogs(query: string): LogEntry[] {
    const lowerQuery = query.toLowerCase();
    return this.logs.filter(
      log =>
        log.message.toLowerCase().includes(lowerQuery) ||
        // CORRIGIDO: Adicionado '?? false' para tratar explicitamente o 'undefined' do optional chaining.
        (log.context?.toLowerCase().includes(lowerQuery) ?? false) ||
        JSON.stringify(log.data ?? {})
          .toLowerCase()
          .includes(lowerQuery)
    );
  }

  async exportLogs(): Promise<string> {
    try {
      return JSON.stringify(this.logs, null, 2);
    } catch (error) {
      await this.error('Failed to export logs', 'LoggingService', error);
      throw error;
    }
  }

  private async cleanupOldLogs(): Promise<void> {
    const cutoffTime = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 dias
    const initialCount = this.logs.length;
    this.logs = this.logs.filter(log => log.timestamp > cutoffTime);
    const removedCount = initialCount - this.logs.length;
    if (removedCount > 0) {
      await this.info(`Cleaned up ${removedCount} old log entries`, 'LoggingService');
      try {
        await AsyncStorage.setItem('app_logs', JSON.stringify(this.logs));
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Failed to save logs after cleanup:', error);
      }
    }
  }

  async clearAllLogs(): Promise<void> {
    this.logs = [];
    try {
      await AsyncStorage.removeItem('app_logs');
      await this.info('All logs cleared', 'LoggingService');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to clear logs:', error);
    }
  }

  async logSystemInfo(): Promise<void> {
    const systemInfo = {
      platform: 'react-native',
      appVersion: APP_CONFIG.VERSION,
      buildNumber: APP_CONFIG.BUILD_NUMBER,
      timestamp: Date.now(),
      memoryUsage: 'N/A',
    };
    await this.info('System information logged', 'System', systemInfo);
  }
}

export const getLoggingService = () => LoggingService.getInstance();
export default getLoggingService;
