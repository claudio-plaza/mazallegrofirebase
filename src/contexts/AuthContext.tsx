
'use client';

import type { UserRole, Socio } from '@/types';
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { getSocioById, getAdminUserByEmail } from '@/lib/firebase/firestoreService';
import { logoutUser as performLogout } from '@/lib/auth';

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

        // Fetch socio or admin data to determine role and name
        // This is a simplified role system. A real app might use custom claims.
        let socioProfile: Socio | null = null;
        try {
            // Fetch by UID, which is the document ID in 'socios' collection
            socioProfile = await getSocioById(firebaseUser.uid);
        } catch (e) {
             console.warn("Could not find socio profile for user, checking for admin profile.");
        }


        if (socioProfile) {
          setUserRole(socioProfile.role);
          setUserName(`${socioProfile.nombre} ${socioProfile.apellido}`);
          setLoggedInUserNumeroSocio(socioProfile.numeroSocio);
        } else {
           // If not a socio, check if they are a pre-defined admin/medico/portero
          const adminUser = await getAdminUserByEmail(firebaseUser.email!);
          if (adminUser) {
            setUserRole(adminUser.role);
            setUserName(adminUser.name);
            setLoggedInUserNumeroSocio(null);
          } else {
             // Fallback if no profile is found but user is authenticated
            setUserRole(null);
            setUserName(firebaseUser.displayName || firebaseUser.email);
            setLoggedInUserNumeroSocio(null);
          }
        }
      } else {
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
