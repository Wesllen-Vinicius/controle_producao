// src/services/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * Em release faltando env não deve derrubar o app.
 * - Se faltar env, criamos um client “inofensivo” apontando para uma URL inválida,
 * assim qualquer chamada vai retornar erro controlado (e não crashar o bundle).
 */
const SAFE_URL = URL || 'https://invalid.supabase.co';
const SAFE_KEY = KEY || 'invalid-anon-key';

if (!URL || !KEY) {
  // Em dev você verá no console. Em produção isso evita crash imediato.
  // (As telas já tratam { error } dos selects/inserts e mostram Alert)
  // Opcional: você pode centralizar um Alert inicial na primeira tela se quiser.
  // CORRIGIDO: Adicionado comentário para desabilitar a regra do ESLint nesta linha específica.
  // eslint-disable-next-line no-console
  console.error(
    '[supabase] Variáveis EXPO_PUBLIC_SUPABASE_URL/EXPO_PUBLIC_SUPABASE_ANON_KEY ausentes. ' +
      'Defina-as no .env (dev) e no EAS (build).'
  );
}

export const supabase: SupabaseClient = createClient(SAFE_URL, SAFE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});
