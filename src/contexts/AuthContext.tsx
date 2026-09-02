import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface AppUser {
  uid: string;
  email: string;
  idNumber: string;
  pluginToken: string;
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

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserRole(session.user.id, session.user.email || '');
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUserRole(session.user.id, session.user.email || '');
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserRole = async (userId: string, email: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (data) {
        setCurrentUser({
          uid: userId,
          email: email,
          idNumber: data.idNumber,
          pluginToken: data.pluginToken,
          role: data.role || 'Viewer'
        });
      } else {
        // Fallback if user row hasn't been created yet or RLS blocks it
        setCurrentUser({
          uid: userId,
          email: email,
          idNumber: 'PENDING-ID',
          pluginToken: 'PENDING-TOKEN',
          role: 'Developer'
        });
      }
    } catch (e) {
      console.error('Error fetching user role:', e);
      // Fallback on error to prevent being trapped on login screen
      setCurrentUser({
        uid: userId,
        email: email,
        idNumber: 'PENDING-ID',
        pluginToken: 'PENDING-TOKEN',
        role: 'Developer'
      });
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ currentUser, loading, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
