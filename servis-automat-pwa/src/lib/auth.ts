import { supabase, User } from './supabase';
import localforage from 'localforage';

const AUTH_KEY = 'servis_automat_auth';

interface AuthData {
  token: string;
  user: User;
}

export async function login(email: string, password: string): Promise<AuthData> {
  const { data, error } = await supabase.functions.invoke('auth-login', {
    body: { email, password }
  });

  if (error) {
    throw new Error(error.message);
  }

  if (data.error) {
    throw new Error(data.error.message);
  }

  const authData = data.data;
  await localforage.setItem(AUTH_KEY, authData);
  return authData;
}

export async function refreshToken(): Promise<AuthData> {
  const authData = await getAuthData();
  if (!authData) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase.functions.invoke('auth-refresh', {
    headers: {
      'x-user-token': authData.token
    }
  });

  if (error || data.error) {
    await logout();
    throw new Error('Session expired');
  }

  const newAuthData = data.data;
  await localforage.setItem(AUTH_KEY, newAuthData);
  return newAuthData;
}

export async function logout(): Promise<void> {
  await localforage.removeItem(AUTH_KEY);
}

export async function getAuthData(): Promise<AuthData | null> {
  return await localforage.getItem<AuthData>(AUTH_KEY);
}

export async function getAuthToken(): Promise<string | null> {
  const authData = await getAuthData();
  return authData?.token || null;
}

export async function getCurrentUser(): Promise<User | null> {
  const authData = await getAuthData();
  return authData?.user || null;
}
