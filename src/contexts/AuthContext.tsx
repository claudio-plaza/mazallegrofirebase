
'use client';

import type { UserRole, Socio } from '@/types';
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { getSocioById, getAdminUserByEmail } from '@/lib/firebase/firestoreService';
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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          // 1. Check if the user is a regular 'socio'
          const socioProfile = await getSocioById(firebaseUser.uid);

          if (socioProfile) {
            setUserRole(socioProfile.role);
            setUserName(`${socioProfile.nombre} ${socioProfile.apellido}`);
            setLoggedInUserNumeroSocio(socioProfile.numeroSocio);
          } else {
            // 2. If not a socio, check if they are a privileged user (admin, medico, etc.)
            const adminUser = await getAdminUserByEmail(firebaseUser.email!);
            if (adminUser) {
              setUserRole(adminUser.role);
              setUserName(adminUser.name);
              setLoggedInUserNumeroSocio(null); // Privileged users are not socios
            } else {
              // 3. User is authenticated but has no profile in Firestore.
              console.warn(
                `User with email ${firebaseUser.email} is authenticated but has no profile in 'socios' or 'adminUsers' collections. Assign a role in Firestore to grant access.`
              );
              setUserRole(null);
              setUserName(firebaseUser.displayName || firebaseUser.email);
              setLoggedInUserNumeroSocio(null);
            }
          }
        } catch (error) {
          console.error("AuthContext: Failed to fetch user profile from Firestore.", error);
          toast({
              title: "Error de Conexión con la Base de Datos",
              description: "No se pudo cargar tu perfil. Es posible que el servicio esté experimentando problemas o que tu cuenta no esté configurada correctamente.",
              variant: "destructive",
              duration: 10000,
          });
          // Set a logged-in state but without a role, which UI should handle
          setUserRole(null);
          setUserName(firebaseUser.displayName || firebaseUser.email);
          setLoggedInUserNumeroSocio(null);
        }
      } else {
        // No user is logged in
        setUser(null);
        setUserRole(null);
        setUserName(null);
        setLoggedInUserNumeroSocio(null);
      }
      setIsLoading(false);
    });

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
