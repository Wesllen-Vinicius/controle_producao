import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';

// Expo expõe variáveis somente com prefixo EXPO_PUBLIC_
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Validação clara pra evitar "Invalid URL"
if (!SUPABASE_URL || !/^https?:\/\//.test(SUPABASE_URL)) {
  throw new Error(
    'SUPABASE_URL inválida. Defina EXPO_PUBLIC_SUPABASE_URL no .env (ex: https://xxxx.supabase.co)'
  );
}
if (!SUPABASE_ANON_KEY) {
  throw new Error(
    'SUPABASE_ANON_KEY ausente. Defina EXPO_PUBLIC_SUPABASE_ANON_KEY no .env'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
