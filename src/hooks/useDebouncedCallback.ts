import { useCallback, useEffect, useRef } from 'react';

type AnyFn = (...args: unknown[]) => void;

/**
 * useDebouncedCallback
 * Retorna uma função estável que aguarda `delay` ms sem novas chamadas
 * antes de executar a função original.
 */
export function useDebouncedCallback<T extends AnyFn>(fn: T, delay = 180, deps: unknown[] = []) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debounced = useCallback(
    (...args: Parameters<T>) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => fnRef.current(...args), delay);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [delay, ...deps]
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return debounced as T;
}
