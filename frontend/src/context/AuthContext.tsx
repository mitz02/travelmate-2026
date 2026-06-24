import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'rider' | 'driver' | 'admin' | null;
  kycStatus: 'pending' | 'verified' | 'rejected' | null;
  profilePicture: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);
  const initialCheckDone = useRef(false);

  const fetchUser = useCallback(async () => {
    if (!token) return;
    try {
      const { data } = await api.get('/auth/me');
      const u = data.user || data;
      setUser({
        id: u.id,
        email: u.email,
        firstName: u.first_name || u.firstName || '',
        lastName: u.last_name || u.lastName || '',
        role: u.role,
        kycStatus: data.kycStatus || u.kyc_status || null,
        profilePicture: u.profile_picture || u.profilePicture || u.avatar_url || null,
      });
    } catch (error) {
      console.error('Failed to fetch user', error);
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    }
  }, [token]);

  // Fetch on mount (restore session from localStorage)
  useEffect(() => {
    if (initialCheckDone.current) return;
    initialCheckDone.current = true;
    setIsLoading(true);
    fetchUser().finally(() => setIsLoading(false));
  }, [fetchUser]);

  // Periodically refresh when KYC is pending so the UI updates after admin approval
  useEffect(() => {
    if (!user || user.kycStatus !== 'pending') return;
    const interval = setInterval(fetchUser, 15000);
    return () => clearInterval(interval);
  }, [user?.kycStatus, fetchUser]);

  const login = (newToken: string, userData: User) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  };

  const updateUser = (data: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...data });
    }
  };

  const refreshUser = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
