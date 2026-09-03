import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface AppUser {
  uid: string;
  email: string;
  role: 'Admin' | 'Developer' | 'Viewer';
}

interface AuthContextType {
  currentUser: AppUser | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string, email: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (error || !data) {
        console.error('VAULTX profile lookup failed:', error);
        setCurrentUser({
          uid: userId,
          email,
          role: 'Viewer',
        });
        return;
      }

      setCurrentUser({
        uid: userId,
        email,
        role: data.role || 'Viewer',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          console.error('Supabase session error:', error);
          setCurrentUser(null);
          setLoading(false);
          return;
        }

        if (session?.user) {
          void fetchProfile(session.user.id, session.user.email || '');
        } else {
          setCurrentUser(null);
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error('Failed to initialize Supabase session:', error);
        setCurrentUser(null);
        setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        void fetchProfile(session.user.id, session.user.email || '');
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ currentUser, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
