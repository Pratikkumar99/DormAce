import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { socket } from '../lib/socket.js';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const qc = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      return data.user;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      qc.clear();
    };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, [qc]);

  // realtime connection lives as long as someone is signed in
  useEffect(() => {
    if (!user?.id) return undefined;
    socket.connect();
    return () => socket.disconnect();
  }, [user?.id]);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (formData) => {
    const { data } = await api.post('/auth/register', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    await api.post('/auth/logout').catch(() => {});
    setUser(null);
    qc.clear();
  }, [qc]);

  const value = useMemo(() => ({ user, loading, login, register, logout, refreshUser, setUser }), [user, loading, login, register, logout, refreshUser]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
