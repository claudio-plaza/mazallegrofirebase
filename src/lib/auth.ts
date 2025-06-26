
'use client';

import type { UserRole, SignupTitularData } from '@/types';
import { toast } from '@/hooks/use-toast';
import { KEYS as FirestoreKeys } from './firebase/firestoreService';
import { generateId } from './helpers';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  numeroSocio?: string;
  password?: string;
}

const getAuthUsers = (): AuthUser[] => {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(FirestoreKeys.USERS);
  return data ? JSON.parse(data) : [];
};

const saveAuthUsers = (users: AuthUser[]): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(FirestoreKeys.USERS, JSON.stringify(users));
};

export const loginUser = (email: string, passwordInput: string): AuthUser | null => {
  const targetEmail = email.toLowerCase();
  const users = getAuthUsers();
  const user = users.find(u => u.email.toLowerCase() === targetEmail && u.password === passwordInput);

  if (user) {
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userRole', user.role);
    localStorage.setItem('userName', user.name);
    localStorage.setItem('userEmail', user.email);
    if (user.role === 'socio' && user.numeroSocio) {
      localStorage.setItem('loggedInUserNumeroSocio', user.numeroSocio);
    } else {
      localStorage.removeItem('loggedInUserNumeroSocio');
    }
    return user;
  }
  return null;
};

export const signupUser = async (data: SignupTitularData): Promise<AuthUser | null> => {
  const users = getAuthUsers();
  const emailExists = users.some(u => u.email.toLowerCase() === data.email.toLowerCase());

  if (emailExists) {
    toast({
      title: 'Error de Registro',
      description: 'El email ingresado ya está en uso. Por favor, utilice otro.',
      variant: 'destructive',
    });
    return null;
  }

  // NOTE: In a real app, the numeroSocio would be assigned *after* the socio is created in the DB.
  // For this simulation, we'll assign a temporary one for the auth record.
  const tempId = `new-${generateId()}`;

  const newUser: AuthUser = {
    id: tempId,
    name: `${data.nombre} ${data.apellido}`,
    email: data.email,
    password: data.password,
    role: 'socio',
    numeroSocio: `TEMP-${tempId}`, // A temporary value until the real socio is created. The login will use the one from the socio record.
  };

  users.push(newUser);
  saveAuthUsers(users);

  return newUser;
};


export const logoutUser = () => {
  localStorage.removeItem('isLoggedIn');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userName');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('loggedInUserNumeroSocio');
};

export const getAuthStatus = (): { isLoggedIn: boolean; userRole: UserRole | null; userName: string | null; loggedInUserNumeroSocio: string | null } => {
  if (typeof window === 'undefined') {
    return { isLoggedIn: false, userRole: null, userName: null, loggedInUserNumeroSocio: null };
  }
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  const userRole = localStorage.getItem('userRole') as UserRole | null;
  const userName = localStorage.getItem('userName');
  const loggedInUserNumeroSocio = localStorage.getItem('loggedInUserNumeroSocio');
  return { isLoggedIn, userRole, userName, loggedInUserNumeroSocio };
};

    