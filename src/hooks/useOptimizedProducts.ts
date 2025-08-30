import { useState, useCallback, useMemo, useEffect } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../services/supabase';
import { useInventoryCache } from './useInventoryCache';

export type Unit = 'UN' | 'KG' | 'L' | 'CX' | 'PC' | string;
export type Product = {
  id: string;
  name: string;
  unit: Unit;
  meta_por_animal?: number;
};

export function useOptimizedProducts() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number>(0);
  const cache = useInventoryCache<Product[]>({ defaultTTL: 600000 }); // 10 minutos

  const CACHE_KEY = 'products_list';

  const loadProducts = useCallback(
    async (forceRefresh = false) => {
      if (loading) return;

      // Verificar cache se não for refresh forçado
      if (!forceRefresh) {
        const cachedProducts = cache.get(CACHE_KEY);
        if (cachedProducts) {
          setProducts(cachedProducts);
          return cachedProducts;
        }
      }

      setLoading(true);

      try {
        const { data, error } = await supabase
          .from('products')
          .select('id,name,unit,meta_por_animal')
          .order('name');

        if (error) {
          const errorMessage = error.message.includes('network')
            ? 'Erro de conexão. Verifique sua internet.'
            : error.message.includes('permission')
              ? 'Acesso negado aos produtos.'
              : `Erro ao carregar produtos: ${error.message}`;

          throw new Error(errorMessage);
        }

        const productList = (data as Product[]) ?? [];

        // Validar dados dos produtos
        const validProducts = productList.filter(
          product => product.id && product.name && product.unit && product.name.trim().length > 0
        );

        if (validProducts.length !== productList.length) {
          // Warning: produtos inválidos foram filtrados
        }

        setProducts(validProducts);
        cache.set(CACHE_KEY, validProducts);
        setLastUpdated(Date.now());

        return validProducts;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        Alert.alert('Erro', errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [cache, loading]
  );

  // Produtos mapeados por ID para acesso rápido
  const productsById = useMemo(() => {
    const map = new Map<string, Product>();
    (products ?? []).forEach(product => {
      map.set(product.id, product);
    });
    return map;
  }, [products]);

  // Produtos agrupados por unidade
  const productsByUnit = useMemo(() => {
    const map = new Map<Unit, Product[]>();
    (products ?? []).forEach(product => {
      const unit = product.unit;
      if (!map.has(unit)) {
        map.set(unit, []);
      }
      map.get(unit)?.push(product);
    });
    return map;
  }, [products]);

  // Unidades disponíveis
  const availableUnits = useMemo(() => {
    return Array.from(productsByUnit.keys()).sort();
  }, [productsByUnit]);

  // Buscar produto por ID
  const getProductById = useCallback(
    (id: string): Product | undefined => {
      return productsById.get(id);
    },
    [productsById]
  );

  // Buscar produtos por unidade
  const getProductsByUnit = useCallback(
    (unit: Unit): Product[] => {
      return productsByUnit.get(unit) ?? [];
    },
    [productsByUnit]
  );

  // Filtrar produtos por nome
  const filterProducts = useCallback(
    (searchTerm: string): Product[] => {
      if (!products || !searchTerm.trim()) return products ?? [];

      const term = searchTerm.toLowerCase().trim();
      return products.filter(
        product =>
          product.name.toLowerCase().includes(term) || product.unit.toLowerCase().includes(term)
      );
    },
    [products]
  );

  // Invalidar cache quando necessário
  const invalidateCache = useCallback(() => {
    cache.invalidate(CACHE_KEY);
    setLastUpdated(0);
  }, [cache]);

  // Verificar se os dados estão desatualizados (mais de 10 minutos)
  const isDataStale = useMemo(() => {
    return Date.now() - lastUpdated > 600000; // 10 minutos
  }, [lastUpdated]);

  // Carregar produtos na inicialização
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  return {
    products,
    loading,
    lastUpdated,
    isDataStale,
    productsById,
    productsByUnit,
    availableUnits,
    loadProducts,
    getProductById,
    getProductsByUnit,
    filterProducts,
    invalidateCache,
    // Stats para debug
    stats: {
      totalProducts: products?.length ?? 0,
      totalUnits: availableUnits.length,
      cacheStats: cache.stats,
    },
  };
}

export type OptimizedProductsHook = ReturnType<typeof useOptimizedProducts>;
