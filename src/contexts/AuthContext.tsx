
'use client';

import type { UserRole, Socio } from '@/types';
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { getSocioById, getAdminUserById } from '@/lib/firebase/firestoreService';
import { logoutUser as performLogout } from '@/lib/auth';
import { toast } from '@/hooks/use-toast';

export interface AuthContextType {
  isLoggedIn: boolean;
  user: User | null; // Firebase user object
  userRole: UserRole | null;
  userName: string | null;
  loggedInUserNumeroSocio: string | null;
  isLoading: boolean;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [loggedInUserNumeroSocio, setLoggedInUserNumeroSocio] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let unsubscribe: () => void = () => {};

    if (auth) { // Only subscribe if auth is initialized
      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        setIsLoading(true);
        if (firebaseUser) {
          setUser(firebaseUser);
          console.log("Firebase Auth UID for logged-in user:", firebaseUser.uid);
          try {
            const socioProfile = await getSocioById(firebaseUser.uid);

            if (socioProfile) {
              setUserRole(socioProfile.role);
              setUserName(`${socioProfile.nombre} ${socioProfile.apellido}`);
              setLoggedInUserNumeroSocio(socioProfile.numeroSocio);
            } else {
              const adminUser = await getAdminUserById(firebaseUser.uid);
              if (adminUser) {
                setUserRole(adminUser.role);
                setUserName(adminUser.name);
                setLoggedInUserNumeroSocio(null);
              } else {
                console.warn(
                  `User with UID ${firebaseUser.uid} and email ${firebaseUser.email} is authenticated but has no profile in 'socios' or 'adminUsers' collections. Assign a role in Firestore to grant access.`
                );
                setUserRole(null);
                setUserName(firebaseUser.displayName || firebaseUser.email);
                setLoggedInUserNumeroSocio(null);
              }
            }
          } catch (error) {
            console.error("AuthContext: Failed to fetch user profile from Firestore.", error);
            toast({
                title: "Error de Permisos o Conexión",
                description: "No se pudo cargar tu perfil. Esto puede deberse a un problema de conexión o a que las reglas de seguridad de Firestore no permiten el acceso. Contacte al administrador.",
                variant: "destructive",
                duration: 10000,
            });
            setUserRole(null);
            setUserName(firebaseUser.displayName || firebaseUser.email);
            setLoggedInUserNumeroSocio(null);
          }
        } else {
          setUser(null);
          setUserRole(null);
          setUserName(null);
          setLoggedInUserNumeroSocio(null);
        }
        setIsLoading(false);
      });
    }

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await performLogout();
    // onAuthStateChanged will handle the state updates
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn: !!user, user, userRole, userName, loggedInUserNumeroSocio, isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
