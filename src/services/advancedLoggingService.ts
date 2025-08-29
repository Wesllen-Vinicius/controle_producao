import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLoggingService, LogLevel } from './loggingService';
// import { useAppStore } from '../store/appStore'; // Commented to avoid early access

// Enhanced log entry interface
export interface AdvancedLogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
  userId?: string;
  sessionId?: string;
  deviceInfo?: DeviceInfo;
  performance?: PerformanceMetrics;
  stackTrace?: string;
  tags?: string[];
}

export interface DeviceInfo {
  platform: string;
  version: string;
  buildNumber?: string;
  deviceModel?: string;
  osVersion?: string;
  screenDimensions?: { width: number; height: number };
  networkType?: string;
  batteryLevel?: number;
  memoryUsage?: number;
}

export interface PerformanceMetrics {
  renderTime?: number;
  networkLatency?: number;
  memoryUsage?: number;
  cpuUsage?: number;
  bundleSize?: number;
}

// Log aggregation and analysis
export interface LogAnalytics {
  totalLogs: number;
  byLevel: Record<LogLevel, number>;
  byContext: Record<string, number>;
  byUser: Record<string, number>;
  errorPatterns: Array<{
    pattern: string;
    count: number;
    lastOccurrence: number;
  }>;
  performanceInsights: {
    averageRenderTime: number;
    slowestOperations: Array<{
      operation: string;
      averageTime: number;
      count: number;
    }>;
  };
}

export class AdvancedLoggingService {
  private static instance: AdvancedLoggingService;
  private logs: AdvancedLogEntry[] = [];
  private sessionId: string;
  private logBuffer: AdvancedLogEntry[] = [];
  private uploadQueue: AdvancedLogEntry[] = [];
  private maxLocalLogs = 1000;
  private batchSize = 50;

  private constructor() {
    this.sessionId = Date.now().toString() + Math.random().toString(36);
    // Defer initialization to avoid early execution
    setTimeout(() => {
      this.loadLogsFromStorage();
      this.setupPeriodicUpload();
    }, 0);
  }

  static getInstance(): AdvancedLoggingService {
    if (!AdvancedLoggingService.instance) {
      AdvancedLoggingService.instance = new AdvancedLoggingService();
    }
    return AdvancedLoggingService.instance;
  }

  // Enhanced logging with context enrichment
  async logAdvanced(
    level: LogLevel,
    message: string,
    context?: string,
    data?: any,
    options: {
      tags?: string[];
      includeStackTrace?: boolean;
      includePerformance?: boolean;
      immediate?: boolean;
    } = {}
  ): Promise<void> {
    const { tags, includeStackTrace, includePerformance, immediate } = options;
    let userId: string | undefined;
    try {
      // Dynamically import to avoid early access
      const { useAppStore } = await import('../store/appStore');
      const appStore = useAppStore.getState();
      userId = appStore.user?.id;
    } catch (error) {
      // Store not available, continue without user ID
      userId = undefined;
    }

    const logEntry: AdvancedLogEntry = {
      id: Date.now().toString() + Math.random().toString(36),
      timestamp: Date.now(),
      level,
      message,
      context,
      data: this.sanitizeData(data),
      userId,
      sessionId: this.sessionId,
      deviceInfo: this.getDeviceInfo(),
      tags,
    };

    // Add stack trace for errors
    if (includeStackTrace && level === 'error') {
      logEntry.stackTrace = new Error().stack;
    }

    // Add performance metrics
    if (includePerformance) {
      logEntry.performance = this.getPerformanceMetrics();
    }

    // Store locally
    this.logs.push(logEntry);
    this.logBuffer.push(logEntry);

    // Maintain size limit
    if (this.logs.length > this.maxLocalLogs) {
      this.logs = this.logs.slice(-this.maxLocalLogs);
    }

    // Also use the original logging service
    await getLoggingService().addLog(level, message, context, data);

    // Immediate upload for critical errors
    if (immediate || level === 'fatal') {
      await this.uploadLogs([logEntry]);
    }

    // Save to persistent storage periodically
    this.persistLogsThrottled();
  }

  // Convenience methods
  async debug(message: string, context?: string, data?: any, tags?: string[]): Promise<void> {
    return this.logAdvanced('debug', message, context, data, { tags });
  }

  async info(message: string, context?: string, data?: any, tags?: string[]): Promise<void> {
    return this.logAdvanced('info', message, context, data, { tags });
  }

  async warn(message: string, context?: string, data?: any, tags?: string[]): Promise<void> {
    return this.logAdvanced('warn', message, context, data, { tags });
  }

  async error(message: string, context?: string, data?: any, tags?: string[]): Promise<void> {
    return this.logAdvanced('error', message, context, data, { 
      tags, 
      includeStackTrace: true,
      includePerformance: true 
    });
  }

  async fatal(message: string, context?: string, data?: any, tags?: string[]): Promise<void> {
    return this.logAdvanced('fatal', message, context, data, { 
      tags, 
      includeStackTrace: true,
      includePerformance: true,
      immediate: true 
    });
  }

  // Performance logging
  async logPerformance(
    operation: string,
    duration: number,
    context?: string,
    metadata?: any
  ): Promise<void> {
    return this.logAdvanced('info', `Performance: ${operation}`, context, {
      operation,
      duration,
      ...metadata,
    }, {
      tags: ['performance'],
      includePerformance: true,
    });
  }

  // User action logging
  async logUserAction(
    action: string,
    screen: string,
    metadata?: any
  ): Promise<void> {
    return this.logAdvanced('info', `User Action: ${action}`, 'user-interaction', {
      action,
      screen,
      ...metadata,
    }, {
      tags: ['user-action', screen],
    });
  }

  // Network request logging
  async logNetworkRequest(
    method: string,
    url: string,
    duration: number,
    status: number,
    error?: any
  ): Promise<void> {
    const level: LogLevel = status >= 400 ? 'error' : 'info';
    return this.logAdvanced(level, `${method} ${url}`, 'network', {
      method,
      url,
      duration,
      status,
      error,
    }, {
      tags: ['network', method.toLowerCase()],
    });
  }

  // Get device information
  private getDeviceInfo(): DeviceInfo {
    // This would be implemented with actual device detection libraries
    return {
      platform: 'react-native', // Platform.OS
      version: '1.0.0', // from app.json
      // deviceModel: Device.modelName,
      // osVersion: Device.osVersion,
      // screenDimensions: Dimensions.get('window'),
    };
  }

  // Get performance metrics
  private getPerformanceMetrics(): PerformanceMetrics {
    // This would integrate with performance monitoring tools
    return {
      // renderTime: performance.now(),
      // memoryUsage: performance.memory?.usedJSHeapSize,
    };
  }

  // Sanitize sensitive data
  private sanitizeData(data: any): any {
    if (!data) return data;

    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'credential'];
    
    const sanitize = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) return obj;
      
      if (Array.isArray(obj)) {
        return obj.map(sanitize);
      }

      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = sanitize(value);
        }
      }
      
      return sanitized;
    };

    return sanitize(data);
  }

  // Analytics and insights
  getAnalytics(): LogAnalytics {
    const analytics: LogAnalytics = {
      totalLogs: this.logs.length,
      byLevel: { debug: 0, info: 0, warn: 0, error: 0, fatal: 0 },
      byContext: {},
      byUser: {},
      errorPatterns: [],
      performanceInsights: {
        averageRenderTime: 0,
        slowestOperations: [],
      },
    };

    // Analyze logs
    const errorMessages = new Map<string, { count: number; lastOccurrence: number }>();
    const performanceLogs: Array<{ operation: string; duration: number }> = [];

    for (const log of this.logs) {
      // Count by level
      analytics.byLevel[log.level]++;

      // Count by context
      if (log.context) {
        analytics.byContext[log.context] = (analytics.byContext[log.context] || 0) + 1;
      }

      // Count by user
      if (log.userId) {
        analytics.byUser[log.userId] = (analytics.byUser[log.userId] || 0) + 1;
      }

      // Analyze error patterns
      if (log.level === 'error' || log.level === 'fatal') {
        const existing = errorMessages.get(log.message);
        if (existing) {
          existing.count++;
          existing.lastOccurrence = Math.max(existing.lastOccurrence, log.timestamp);
        } else {
          errorMessages.set(log.message, { count: 1, lastOccurrence: log.timestamp });
        }
      }

      // Collect performance data
      if (log.tags?.includes('performance') && log.data?.duration) {
        performanceLogs.push({
          operation: log.data.operation,
          duration: log.data.duration,
        });
      }
    }

    // Process error patterns
    analytics.errorPatterns = Array.from(errorMessages.entries())
      .map(([pattern, data]) => ({ pattern, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Process performance insights
    if (performanceLogs.length > 0) {
      const operationMap = new Map<string, { total: number; count: number }>();
      
      for (const perf of performanceLogs) {
        const existing = operationMap.get(perf.operation);
        if (existing) {
          existing.total += perf.duration;
          existing.count++;
        } else {
          operationMap.set(perf.operation, { total: perf.duration, count: 1 });
        }
      }

      analytics.performanceInsights.slowestOperations = Array.from(operationMap.entries())
        .map(([operation, data]) => ({
          operation,
          averageTime: data.total / data.count,
          count: data.count,
        }))
        .sort((a, b) => b.averageTime - a.averageTime)
        .slice(0, 10);
    }

    return analytics;
  }

  // Persist logs to storage
  private persistLogsThrottled = this.throttle(async () => {
    try {
      await AsyncStorage.setItem('advanced_logs', JSON.stringify(this.logs.slice(-500)));
    } catch (error) {
      console.warn('Failed to persist logs:', error);
    }
  }, 5000);

  // Load logs from storage
  private async loadLogsFromStorage(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('advanced_logs');
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load logs from storage:', error);
    }
  }

  // Setup periodic upload
  private setupPeriodicUpload(): void {
    setInterval(() => {
      if (this.logBuffer.length >= this.batchSize) {
        const batch = this.logBuffer.splice(0, this.batchSize);
        this.uploadQueue.push(...batch);
        this.processUploadQueue();
      }
    }, 30000); // Every 30 seconds
  }

  // Upload logs to remote service
  private async uploadLogs(logs: AdvancedLogEntry[]): Promise<void> {
    try {
      // This would integrate with your logging service (e.g., Sentry, LogRocket, etc.)
      console.log('Uploading logs:', logs.length);
      
      // Example: Send to remote endpoint
      // await fetch('/api/logs', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(logs),
      // });
    } catch (error) {
      console.warn('Failed to upload logs:', error);
      // Re-add to buffer for retry
      this.logBuffer.push(...logs);
    }
  }

  // Process upload queue
  private async processUploadQueue(): Promise<void> {
    if (this.uploadQueue.length === 0) return;

    const batch = this.uploadQueue.splice(0, this.batchSize);
    await this.uploadLogs(batch);
  }

  // Utility: throttle function
  private throttle<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;
    let lastRun = 0;

    return (...args: Parameters<T>) => {
      if (timeout) {
        clearTimeout(timeout);
      }

      const now = Date.now();
      const timeSinceLastRun = now - lastRun;

      if (timeSinceLastRun >= wait) {
        func(...args);
        lastRun = now;
      } else {
        timeout = setTimeout(() => {
          func(...args);
          lastRun = Date.now();
        }, wait - timeSinceLastRun);
      }
    };
  }

  // Export logs for debugging
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // Clear all logs
  clearLogs(): void {
    this.logs = [];
    this.logBuffer = [];
    this.uploadQueue = [];
    AsyncStorage.removeItem('advanced_logs');
  }

  // Get recent logs
  getRecentLogs(limit = 100): AdvancedLogEntry[] {
    return this.logs.slice(-limit);
  }

  // Search logs
  searchLogs(query: string, filters?: {
    level?: LogLevel;
    context?: string;
    userId?: string;
    startTime?: number;
    endTime?: number;
    tags?: string[];
  }): AdvancedLogEntry[] {
    return this.logs.filter(log => {
      // Text search
      const matchesQuery = !query || 
        log.message.toLowerCase().includes(query.toLowerCase()) ||
        (log.context && log.context.toLowerCase().includes(query.toLowerCase()));

      if (!matchesQuery) return false;

      // Apply filters
      if (filters) {
        if (filters.level && log.level !== filters.level) return false;
        if (filters.context && log.context !== filters.context) return false;
        if (filters.userId && log.userId !== filters.userId) return false;
        if (filters.startTime && log.timestamp < filters.startTime) return false;
        if (filters.endTime && log.timestamp > filters.endTime) return false;
        if (filters.tags && !filters.tags.some(tag => log.tags?.includes(tag))) return false;
      }

      return true;
    });
  }
}

// Lazy loading to avoid early execution
export const getAdvancedLogging = () => AdvancedLoggingService.getInstance();
export default getAdvancedLogging;