import { useCallback, useEffect, useRef } from 'react';
import { InteractionManager, AppState, AppStateStatus } from 'react-native';
import { getLoggingService } from '../services/loggingService';

// Hook para otimização de performance avançada
export function usePerformanceOptimization() {
  const interactionCompleteRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    // Aguardar conclusão das interações antes de executar tarefas pesadas
    const task = InteractionManager.runAfterInteractions(() => {
      interactionCompleteRef.current = true;
    });

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      task.cancel();
      subscription.remove();
    };
  }, []);

  const runAfterInteractions = useCallback((callback: () => void) => {
    if (interactionCompleteRef.current) {
      callback();
    } else {
      InteractionManager.runAfterInteractions(callback);
    }
  }, []);

  const isAppActive = useCallback(() => {
    return appStateRef.current === 'active';
  }, []);

  return {
    runAfterInteractions,
    isAppActive,
    isInteractionComplete: interactionCompleteRef.current,
  };
}

// Hook para throttling de funções
export function useThrottle<T extends (...args: unknown[]) => unknown>(func: T, delay: number): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRunRef = useRef<number>(0);

  const throttledFunc = useCallback(
    (...args: unknown[]) => {
      const now = Date.now();
      const timeSinceLastRun = now - lastRunRef.current;

      if (timeSinceLastRun >= delay) {
        func(...args);
        lastRunRef.current = now;
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          func(...args);
          lastRunRef.current = Date.now();
        }, delay - timeSinceLastRun);
      }
    },
    [func, delay]
  ) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return throttledFunc;
}

// Hook para batching de updates
export function useBatchedUpdates<T>(initialValue: T, batchDelay: number = 16) {
  const valueRef = useRef<T>(initialValue);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbacksRef = useRef<Set<(value: T) => void>>(new Set());

  const setValue = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      const value =
        typeof newValue === 'function' ? (newValue as (prev: T) => T)(valueRef.current) : newValue;

      valueRef.current = value;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbacksRef.current.forEach(callback => callback(valueRef.current));
      }, batchDelay);
    },
    [batchDelay]
  );

  const subscribe = useCallback((callback: (value: T) => void) => {
    callbacksRef.current.add(callback);

    return () => {
      callbacksRef.current.delete(callback);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { setValue, subscribe, currentValue: valueRef.current };
}

// Hook para lazy loading de componentes
export function useLazyComponent<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const componentRef = useRef<T | null>(null);
  const loadingRef = useRef<boolean>(false);
  const errorRef = useRef<Error | null>(null);

  const load = useCallback(async () => {
    if (componentRef.current || loadingRef.current) {
      return componentRef.current;
    }

    loadingRef.current = true;
    errorRef.current = null;

    try {
      const component = await loader();
      componentRef.current = component;
      return component;
    } catch (error: unknown) {
      errorRef.current = error instanceof Error ? error : new Error('Unknown error');
      throw error;
    } finally {
      loadingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loader, ...deps]);

  return {
    component: componentRef.current,
    loading: loadingRef.current,
    error: errorRef.current,
    load,
  };
}

// Hook para gestão de memória otimizada
export function useMemoryOptimization() {
  const cleanupFunctionsRef = useRef<Set<() => void>>(new Set());

  const addCleanupFunction = useCallback((cleanup: () => void) => {
    cleanupFunctionsRef.current.add(cleanup);

    return () => {
      cleanupFunctionsRef.current.delete(cleanup);
    };
  }, []);

  const forceCleanup = useCallback(() => {
    cleanupFunctionsRef.current.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        getLoggingService().warn('Cleanup function failed', 'usePerformanceOptimization', error);
      }
    });
    cleanupFunctionsRef.current.clear();
  }, []);

  useEffect(() => {
    const handleMemoryWarning = () => {
      getLoggingService().info(
        'Memory warning received, running cleanup',
        'usePerformanceOptimization'
      );
      forceCleanup();
    };

    // Em React Native, você pode monitorar warnings de memória
    const subscription = AppState.addEventListener('memoryWarning', handleMemoryWarning);

    return () => {
      forceCleanup();
      subscription.remove();
    };
  }, [forceCleanup]);

  return { addCleanupFunction, forceCleanup };
}

export default usePerformanceOptimization;
