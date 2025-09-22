import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from './api';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);

  const login = async (email: string, password: string) => {
    const tokenResponse = await authApi.login(email, password);
    const newToken = tokenResponse.access_token;
    
    localStorage.setItem('token', newToken);
    setToken(newToken);
    
    // Fetch user data
    const userData = await authApi.getCurrentUser();
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    
    // Get all permissions from user's roles
    const userPermissions = new Set<string>();
    // This would need to be expanded to fetch role permissions
    // For now, we'll implement basic admin check
    if (user.roles.includes('admin')) {
      return true; // Admin has all permissions
    }
    
    // Add specific permission checks based on roles
    const rolePermissions: Record<string, string[]> = {
      instructor: ['view_events', 'manage_events'],
      student: ['view_events'],
    };
    
    user.roles.forEach(role => {
      const perms = rolePermissions[role] || [];
      perms.forEach(perm => userPermissions.add(perm));
    });
    
    return userPermissions.has(permission);
  };

  const hasRole = (role: string): boolean => {
    return user?.roles.includes(role) || false;
  };

  const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}${url}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Token is invalid, logout user
      logout();
      throw new Error('Unauthorized');
    }

    return response;
  };

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const userData = await authApi.getCurrentUser();
          setUser(userData);
        } catch (error) {
          // Token is invalid, remove it
          localStorage.removeItem('token');
          setToken(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, [token]);

  const value = {
    user,
    token,
    login,
    logout,
    isLoading,
    hasPermission,
    hasRole,
    authFetch,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};