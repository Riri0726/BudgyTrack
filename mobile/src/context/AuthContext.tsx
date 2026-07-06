import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  hasOnboarded: boolean | null;
  completeOnboarding: () => void;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, metadata: any) => Promise<any>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);

  const ensureUserProfile = async (userId: string, email?: string) => {
    try {
      // 1. Profile Check
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();
      
      // PGRST116 indicates no record found
      if (error && error.code === 'PGRST116') {
        const { error: insErr } = await supabase
          .from('profiles')
          .insert([{ 
            id: userId, 
            first_name: email ? email.split('@')[0] : 'User', 
            last_name: '' 
          }]);
        if (insErr) console.error('Error auto-creating user profile:', insErr.message);
      }

      // 2. Onboarding Check (Does user have at least 1 account?)
      const { data: accounts, error: accErr } = await supabase
        .from('accounts')
        .select('id')
        .eq('user_id', userId)
        .limit(1);
        
      if (!accErr && accounts) {
        setHasOnboarded(accounts.length > 0);
      } else {
        setHasOnboarded(false);
      }
    } catch (err: any) {
      console.error('Error verifying user profile:', err.message);
      setHasOnboarded(true); // Failsafe
    }
  };

  useEffect(() => {
    // Check active sessions on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        ensureUserProfile(session.user.id, session.user.email).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for state updates (sign in/out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setLoading(true);
        ensureUserProfile(session.user.id, session.user.email).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = (email: string, password: string) => supabase.auth.signInWithPassword({ email, password });
  
  const signUp = async (email: string, password: string, metadata: any) => {
    const response = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    });
    return response;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };
  
  const completeOnboarding = () => setHasOnboarded(true);

  return (
    <AuthContext.Provider value={{ user, session, loading, hasOnboarded, completeOnboarding, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
