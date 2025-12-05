'use client';

import type { UserRole, Socio } from '@/types';
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { getSocio, getUserRole } from '@/lib/firebase/firestoreService';
import { logoutUser as performLogout } from '@/lib/auth';

export interface AuthContextType {
  isLoggedIn: boolean;
  user: User | null;
  userRole: UserRole | null;
  userName: string | null;
  socio: Socio | null;
  loggedInUserNumeroSocio: string | null;
  isLoading: boolean;
  logout: () => void;
  refreshSocio: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [socio, setSocio] = useState<Socio | null>(null);
  const [loggedInUserNumeroSocio, setLoggedInUserNumeroSocio] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const socioProfile = await getSocio(firebaseUser.uid);

          if (socioProfile) {
            setUserRole('socio');
            setSocio(socioProfile);
            setUserName(`${socioProfile.nombre} ${socioProfile.apellido}`);
            setLoggedInUserNumeroSocio(socioProfile.numeroSocio);
          } else {
            const adminUser = await getUserRole(firebaseUser.uid);
            if (adminUser && adminUser.role) {
              setUserRole(adminUser.role);
              setUserName(adminUser.name);
              setSocio(null);
              setLoggedInUserNumeroSocio(null);
            } else {
              console.warn(`User ${firebaseUser.uid} is authenticated but has no profile in 'socios' or 'adminUsers'.`);
              setUserRole(null);
              setUserName(firebaseUser.displayName || firebaseUser.email);
              setSocio(null);
              setLoggedInUserNumeroSocio(null);
            }
          }
        } catch (error) {
          console.error("AuthContext: Error fetching user data.", error);
          setUserRole(null);
          setUserName(firebaseUser.displayName || firebaseUser.email);
          setSocio(null);
          setLoggedInUserNumeroSocio(null);
        }
      } else {
        setUser(null);
        setUserRole(null);
        setUserName(null);
        setSocio(null);
        setLoggedInUserNumeroSocio(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user && socio && (socio as any).documentosCompletos === false) {
      // Si está en cualquier ruta que NO sea subir-documentos, redirigir
      const currentPath = window.location.pathname;
      if (currentPath !== '/dashboard/subir-documentos') {
        window.location.href = '/dashboard/subir-documentos';
      }
    }
  }, [user, socio]);

  const logout = async () => {
    await performLogout();
  };

  const refreshSocio = async () => {
    if (user?.uid && userRole === 'socio') {
      try {
        const socioData = await getSocio(user.uid);
        setSocio(socioData);
        if(socioData) setLoggedInUserNumeroSocio(socioData.numeroSocio);
      } catch (error) {
        console.error('Error refreshing socio:', error);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn: !!user, user, userRole, userName, socio, loggedInUserNumeroSocio, isLoading, logout, refreshSocio }}>
      {children}
    </AuthContext.Provider>
  );
};
