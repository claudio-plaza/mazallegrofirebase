'use client';

import type { UserRole } from '@/types';
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { getAuthStatus, logoutUser as performLogout } from '@/lib/auth';

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

  // On initial app load, synchronize the state from localStorage.
  useEffect(() => {
    const { 
      isLoggedIn: loggedInStatus, 
      userRole: roleFromStorage, 
      userName: nameFromStorage,
      loggedInUserNumeroSocio: numeroSocioFromStorage 
    } = getAuthStatus();
    
    setIsLoggedIn(loggedInStatus);
    setUserRole(roleFromStorage);
    setUserName(nameFromStorage);
    setLoggedInUserNumeroSocio(numeroSocioFromStorage);
    setIsLoading(false);
  }, []);

  // Called from LoginForm to update the app's state after a successful login.
  const login = (role: UserRole, name: string, numeroSocio?: string) => {
    setIsLoggedIn(true);
    setUserRole(role);
    setUserName(name);
    if (role === 'socio' && numeroSocio) {
      setLoggedInUserNumeroSocio(numeroSocio);
    } else {
      setLoggedInUserNumeroSocio(null);
    }
  };

  // Called from Header to log the user out.
  const logout = () => {
    performLogout(); // Clears localStorage
    // Immediately update the context state to reflect the logout.
    setIsLoggedIn(false);
    setUserRole(null);
    setUserName(null);
    setLoggedInUserNumeroSocio(null);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, userRole, userName, loggedInUserNumeroSocio, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
