// Polyfills necessários para RN/Expo
import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    '[supabase] Faltando EXPO_PUBLIC_SUPABASE_URL/ANON_KEY no .env. ' +
      'Defina e reinicie com "npx expo start -c".'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});
