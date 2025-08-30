import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabase';

export type Session = import('@supabase/supabase-js').Session | null;
type Profile = { id: string; username: string | null; role: 'user' | 'admin' };

type AuthCtx = {
  session: Session;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username?: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  session: null,
  profile: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
});

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [session, setSession] = useState<Session>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Acompanha sessão
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => setSession(sess));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Carrega perfil
  useEffect(() => {
    if (!session) {
      setProfile(null);
      return;
    }
    supabase
      .from('profiles')
      .select('id,username,role')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => setProfile(data as Profile | null));
    // Corrigido: a dependência deve ser o objeto 'session' inteiro.
  }, [session]);

  // Login
  // Corrigido: Envolvido em useCallback para manter a referência da função estável.
  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  }, []);

  // Cadastro
  // Corrigido: Envolvido em useCallback.
  const signUp = useCallback(async (email: string, password: string, username?: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      if (error.message.includes('registered')) throw new Error('E-mail já está em uso.');
      throw new Error(error.message);
    }
    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        // Corrigido: || -> ??
        username: username ?? email.split('@')[0],
        role: 'user',
      });
    }
  }, []);

  // Logout
  // Corrigido: Envolvido em useCallback.
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo(
    () => ({ session, profile, loading, signIn, signUp, signOut }),
    [session, profile, loading, signIn, signUp, signOut]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useAuth = () => useContext(Ctx);
