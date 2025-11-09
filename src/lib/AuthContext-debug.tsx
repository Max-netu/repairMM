import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from './supabase';

// DEBUG VERSION: This bypasses backend authentication to show debug panel
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // DEBUG: Create mock user with 'hall' role to test button visibility
  const [user, setUser] = useState<User | null>({
    id: 1,
    name: 'Test User (Hall)',
    email: 'test@klub.ba',
    role: 'hall', // This should show the blue button!
    club_id: 1,
    created_at: '2025-11-09T00:00:00Z',
    updated_at: '2025-11-09T00:00:00Z'
  });
  
  const [loading, setLoading] = useState(false);

  async function login(email: string, password: string) {
    // Bypass authentication - always succeed with mock data
    console.log('DEBUG: Bypassing authentication for:', email);
    setUser({
      id: 1,
      name: `Test User (${email})`,
      email: email,
      role: email.includes('klub') ? 'hall' : 'technician', // klub@klub.ba gets hall role
      club_id: 1,
      created_at: '2025-11-09T00:00:00Z',
      updated_at: '2025-11-09T00:00:00Z'
    });
  }

  async function logout() {
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