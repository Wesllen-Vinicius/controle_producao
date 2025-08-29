import React, { Suspense, lazy, ComponentType } from 'react';
import { View } from 'react-native';
import SkeletonList from './SkeletonList';
import { useTheme } from '../state/ThemeProvider';
// import { NetworkErrorBoundary } from './ErrorBoundary/NetworkErrorBoundary';

interface LazyScreenProps {
  loader: () => Promise<{ default: ComponentType<any> }>;
  fallback?: React.ComponentType;
  name?: string;
}

export function LazyScreen({ loader, fallback: CustomFallback, name }: LazyScreenProps) {
  const LazyComponent = lazy(loader);

  const DefaultFallback = () => {
    const { spacing } = useTheme();
    return (
      <View style={{ flex: 1, padding: spacing.md }}>
        <SkeletonList rows={8} />
      </View>
    );
  };

  const Fallback = CustomFallback || DefaultFallback;

  return (
    <Suspense fallback={<Fallback />}>
      <LazyComponent />
    </Suspense>
  );
}

// Helper function to create lazy screens with error boundaries
export function createLazyScreen(
  loader: () => Promise<{ default: ComponentType<any> }>,
  name?: string
) {
  return () => <LazyScreen loader={loader} name={name} />;
}