// Produtos/hooks/useProductsAdmin.ts

import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
// ATENÇÃO: Ajuste o caminho para seu arquivo de configuração do Supabase

import { supabase } from '@/services/supabase';
import { Product } from '../types';

// A função de validação não muda
const validateProduct = (
  name: string,
  unit: string,
  meta: number,
  list: Product[],
  editingId?: string
) => {
  const trimmedName = name.trim();
  const normalizedUnit = (unit ?? '').toString().trim().toUpperCase();

  if (!trimmedName || trimmedName.length < 2)
    return 'O nome do produto deve ter pelo menos 2 caracteres.';
  if (trimmedName.length > 50) return 'O nome do produto não pode ter mais de 50 caracteres.';
  if (!/^[a-zA-ZÀ-ÿ0-9\s\-\.]+$/.test(trimmedName)) return 'O nome contém caracteres inválidos.';
  if (!normalizedUnit) return 'A unidade de medida é obrigatória.';
  if (normalizedUnit.length > 10) return 'A unidade deve ter entre 1 e 10 caracteres.';
  if (isNaN(meta) || meta < 0 || meta > 1000) return 'Informe uma meta válida entre 0 e 1000.';

  const alreadyExists = list.some(
    p =>
      p.name.trim().toLowerCase() === trimmedName.toLowerCase() &&
      String(p.unit).toUpperCase() === normalizedUnit &&
      (!editingId || p.id !== editingId)
  );

  if (alreadyExists) return 'Já existe um produto com este nome e unidade.';
  return null;
};

export const useProductsAdmin = () => {
  const [list, setList] = useState<Product[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('products').select('*').order('name');
      if (error) {
        Alert.alert('Erro ao carregar', error.message);
        setList([]);
      } else {
        setList((data as Product[]) ?? []);
      }
    } catch (e: unknown) {
      if (e instanceof Error) {
        Alert.alert('Erro Inesperado', e.message);
      }
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProducts();
    setRefreshing(false);
  }, [fetchProducts]);

  const saveProduct = useCallback(
    async (productData: Omit<Product, 'id'>) => {
      const { name, unit, meta_por_animal } = productData;
      const validationError = validateProduct(name, unit, meta_por_animal, list ?? []);
      if (validationError) {
        Alert.alert('Atenção', validationError);
        return { success: false };
      }

      setLoading(true);
      try {
        const sanitizedData = {
          name: name.trim(),
          unit: unit.trim().toUpperCase(),
          meta_por_animal: Math.max(0, Math.min(1000, meta_por_animal)),
        };
        const { error } = await supabase.from('products').insert(sanitizedData);
        if (error) throw error;
        await fetchProducts();
        return { success: true };
      } catch (e: unknown) {
        if (e instanceof Error) {
          Alert.alert('Erro ao Salvar', e.message ?? 'Não foi possível adicionar o produto.');
        }
        return { success: false };
      } finally {
        setLoading(false);
      }
    },
    [list, fetchProducts]
  );

  const updateProduct = useCallback(
    async (id: string, productData: Omit<Product, 'id'>) => {
      const { name, unit, meta_por_animal } = productData;
      const validationError = validateProduct(name, unit, meta_por_animal, list ?? [], id);
      if (validationError) {
        Alert.alert('Atenção', validationError);
        return { success: false };
      }

      setLoading(true);
      try {
        const sanitizedData = {
          name: name.trim(),
          unit: unit.trim().toUpperCase(),
          meta_por_animal: Math.max(0, Math.min(1000, meta_por_animal)),
        };
        const { error } = await supabase.from('products').update(sanitizedData).eq('id', id);
        if (error) throw error;
        await fetchProducts();
        return { success: true };
      } catch (e: unknown) {
        if (e instanceof Error) {
          Alert.alert('Erro ao Atualizar', e.message ?? 'Não foi possível atualizar o produto.');
        }
        return { success: false };
      } finally {
        setLoading(false);
      }
    },
    [list, fetchProducts]
  );

  return {
    products: list,
    loading,
    refreshing,
    fetchProducts,
    onRefresh,
    saveProduct,
    updateProduct,
  };
};
