import { supabase } from '../../../services/supabase';
import { Product, Production, ProductionItem } from '../types';

export const fetchProducts = async (): Promise<Product[]> => {
  const { data, error } = await supabase.from('products').select('id,name,unit').order('name');
  if (error) throw new Error(`Erro ao buscar produtos: ${error.message}`);
  return (data as Product[]) || [];
};

export const fetchReportData = async (
  from: string,
  to: string
): Promise<{ productions: Production[]; items: ProductionItem[] }> => {
  let query = supabase
    .from('productions')
    .select('id,prod_date,abate')
    .order('prod_date', { ascending: false })
    .limit(1000);

  if (from) query = query.gte('prod_date', from);
  if (to) query = query.lte('prod_date', to);

  const { data: productions, error: prodError } = await query;
  if (prodError) throw new Error(`Erro ao carregar produções: ${prodError.message}`);
  if (!productions || productions.length === 0) return { productions: [], items: [] };

  const productionIds = productions.map(p => p.id);
  const allItems: ProductionItem[] = [];
  const batchSize = 100;

  for (let i = 0; i < productionIds.length; i += batchSize) {
    const batch = productionIds.slice(i, i + batchSize);
    const { data: items, error: itemsError } = await supabase
      .from('production_items')
      .select('id,production_id,product_id,produced,meta,diff,avg')
      .in('production_id', batch);

    if (itemsError) throw new Error(`Falha ao carregar itens da produção: ${itemsError.message}`);
    allItems.push(...((items as ProductionItem[]) || []));
  }

  return { productions: (productions as Production[]) || [], items: allItems };
};
