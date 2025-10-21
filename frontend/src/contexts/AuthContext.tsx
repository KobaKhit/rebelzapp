import React, { createContext, useEffect, useState, useMemo, useCallback } from 'react';
import { authApi } from '../lib/api';
import type { User } from '../types';

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

  const refreshUser = async () => {
    if (token) {
      try {
        const userData = await authApi.getCurrentUser();
        setUser(userData);
      } catch (error) {
        console.error('Failed to refresh user data:', error);
      }
    }
  };

  // Memoize role permissions mapping
  const rolePermissionsMap: Record<string, string[]> = useMemo(() => ({
    instructor: ['view_events', 'manage_events'],
    student: ['view_events'],
  }), []);

  // Memoize user permissions based on roles
  const userPermissions = useMemo(() => {
    if (!user) return new Set<string>();
    
    // Admin has all permissions
    if (user.roles.includes('admin')) {
      return new Set<string>(['*']); // Special marker for all permissions
    }
    
    const permissions = new Set<string>();
    user.roles.forEach(role => {
      const perms = rolePermissionsMap[role] || [];
      perms.forEach(perm => permissions.add(perm));
    });
    
    return permissions;
  }, [user, rolePermissionsMap]);

  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false;
    if (userPermissions.has('*')) return true; // Admin check
    return userPermissions.has(permission);
  }, [user, userPermissions]);

  const hasRole = useCallback((role: string): boolean => {
    return user?.roles.includes(role) || false;
  }, [user]);

  const authFetch = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    const headers = new Headers({
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    });

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
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
  }, [token]);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const userData = await authApi.getCurrentUser();
          setUser(userData);
        } catch {
          // Token is invalid, remove it
          localStorage.removeItem('token');
          setToken(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, [token]);

  const value = useMemo(() => ({
    user,
    token,
    login,
    logout,
    refreshUser,
    isLoading,
    hasPermission,
    hasRole,
    authFetch,
  }), [user, token, isLoading, hasPermission, hasRole, authFetch]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

