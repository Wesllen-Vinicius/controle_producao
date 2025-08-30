import { useNavigation, useRoute } from '@react-navigation/native';
import { useMemo } from 'react';
import { BreadcrumbItem } from '../components/Navigation/Breadcrumbs';

// Mapping de rotas para breadcrumbs
const ROUTE_BREADCRUMBS: Record<string, (params?: Record<string, unknown>) => BreadcrumbItem[]> = {
  // Auth flow
  Login: () => [{ label: 'Login' }],
  Signup: () => [{ label: 'Criar Conta' }],
  PasswordReset: () => [{ label: 'Recuperar Senha' }],

  // Main app tabs
  Produção: () => [{ label: 'Produção', icon: 'factory' }],
  Estoque: () => [{ label: 'Estoque', icon: 'warehouse' }],
  Perfil: () => [{ label: 'Perfil', icon: 'account-circle' }],
  Admin: () => [{ label: 'Administração', icon: 'cog-outline' }],
  Relatórios: () => [{ label: 'Relatórios', icon: 'chart-box-outline' }],

  // Nested screens (examples)
  ProductDetails: params => [
    { label: 'Administração', icon: 'cog-outline' },
    { label: 'Produtos' },
    { label: (params?.productName as string) ?? 'Produto' },
  ],

  EditProduct: params => [
    { label: 'Administração', icon: 'cog-outline' },
    { label: 'Produtos' },
    { label: (params?.productName as string) ?? 'Produto' },
    { label: 'Editar' },
  ],

  ProductionDetails: params => [
    { label: 'Produção', icon: 'factory' },
    { label: `Produção ${(params?.productionId as string) ?? ''}` },
  ],

  TransactionDetails: params => [
    { label: 'Estoque', icon: 'warehouse' },
    { label: `Movimento ${(params?.transactionId as string) ?? ''}` },
  ],
};

export function useBreadcrumbs() {
  const navigation = useNavigation();
  const route = useRoute();

  const breadcrumbs = useMemo(() => {
    const routeName = route.name;
    const routeParams = route.params;

    // Get breadcrumb generator for current route
    const generator = ROUTE_BREADCRUMBS[routeName];
    if (!generator) {
      return [{ label: routeName }];
    }

    const items = generator(routeParams);

    // Add navigation handlers
    return items.map((item, index) => ({
      ...item,
      onPress:
        index < items.length - 1
          ? () => {
              // Navigate back based on breadcrumb level
              if (index === 0) {
                // Navigate to home/first level
                navigation.navigate('AppTabs' as never);
              } else {
                // Navigate back appropriate number of times
                const levelsBack = items.length - index - 1;
                for (let i = 0; i < levelsBack; i++) {
                  navigation.goBack();
                }
              }
            }
          : undefined,
    }));
  }, [route.name, route.params, navigation]);

  return { breadcrumbs };
}

// Hook for manually setting breadcrumbs
export function useManualBreadcrumbs(items: BreadcrumbItem[]) {
  return { breadcrumbs: items };
}

export default useBreadcrumbs;
