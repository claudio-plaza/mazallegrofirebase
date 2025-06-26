'use client';

import type { UserRole } from '@/types';
import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getAuthStatus as getLocalStorageAuthStatus, logoutUser as performLogout } from '@/lib/auth';

export interface AuthContextType {
  isLoggedIn: boolean;
  userRole: UserRole | null;
  userName: string | null;
  loggedInUserNumeroSocio: string | null;
  isLoading: boolean;
  login: (role: UserRole, name: string, numeroSocio?: string) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [loggedInUserNumeroSocio, setLoggedInUserNumeroSocio] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const updateAuthState = useCallback(() => {
    const { 
      isLoggedIn: loggedInStatus, 
      userRole: roleFromStorage, 
      userName: nameFromStorage,
      loggedInUserNumeroSocio: numeroSocioFromStorage 
    } = getLocalStorageAuthStatus();
    
    setIsLoggedIn(loggedInStatus);
    setUserRole(roleFromStorage);
    setUserName(nameFromStorage);
    setLoggedInUserNumeroSocio(numeroSocioFromStorage);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    updateAuthState(); // Initial check

    const handleAuthChange = () => {
      updateAuthState();
    };

    window.addEventListener('authChange', handleAuthChange);
    return () => {
      window.removeEventListener('authChange', handleAuthChange);
    };
  }, [updateAuthState]);

  const login = (role: UserRole, name: string, numeroSocio?: string) => {
    // This function is called by LoginForm after it sets localStorage
    // It primarily triggers a re-render of consumers via state update
    // The actual localStorage setting is done in lib/auth.ts's loginUser
    updateAuthState(); 
  };

  const logout = () => {
    performLogout(); // This clears localStorage and dispatches 'authChange'
    updateAuthState(); // Re-read from storage to ensure consistency
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, userRole, userName, loggedInUserNumeroSocio, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
