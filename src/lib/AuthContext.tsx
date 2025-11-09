import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from './supabase';
import { getCurrentUser, login as authLogin, logout as authLogout, refreshToken } from './auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
    
    // Refresh token periodically (every 23 hours)
    const interval = setInterval(async () => {
      try {
        const authData = await refreshToken();
        setUser(authData.user);
      } catch (error) {
        console.error('Token refresh failed:', error);
        setUser(null);
      }
    }, 23 * 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  async function loadUser() {
    setLoading(true);
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Failed to load user:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const authData = await authLogin(email, password);
    setUser(authData.user);
  }

  async function logout() {
    await authLogout();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
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