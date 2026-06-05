import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '@/api/client';
import { User } from '@/types/user';

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  refreshUser: () => Promise<void>;
  login: (username: string, password: string) => Promise<User | null>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await api.get<User>('/users/me');
        setUser(res.data);
      } catch {
        setUser(null);
        localStorage.removeItem('access_token');
      } finally {
        setIsLoading(false);
      }
    };
    fetchCurrentUser();
  }, []);

  const refreshUser = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const res = await api.get<User>('/users/me');
      setUser(res.data);
    } catch {
      setUser(null);
      localStorage.removeItem('access_token');
    }
  };

  const login = async (username: string, password: string): Promise<User | null> => {
    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      const res = await api.post('/users/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const { access_token, user: userData } = res.data as {
        access_token: string;
        user: User;
      };

      localStorage.setItem('access_token', access_token);
      setUser(userData);
      return userData;
    } catch {
      return null;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('access_token');
  };

  return (
    <AuthContext.Provider
      value={{ user, setUser, refreshUser, login, logout, isLoading, isAuthenticated: !!user }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
