
'use client';

import type { UserRole } from '@/types';
import { mockSocios } from '../lib/mockData'; // To find socio details on login

// Import KEYS from firestoreService to ensure consistency if used, though firestoreService manages its own keys primarily.
// For 'sociosDB' (KEYS.SOCIOS), firestoreService.ts is responsible for initialization.


interface UserDetails {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  numeroSocio?: string;
  password?: string;
}

// Using a Map to ensure email uniqueness, then converting to an array.
const allMockUsers: UserDetails[] = [
  { id: 'socio1', name: 'Juan Pérez Socio', email: 'socio@example.com', role: 'socio', numeroSocio: '1001', password: 'password123' },
  { id: 'portero1', name: 'Pedro Portero', email: 'portero@example.com', role: 'portero', password: 'password123' },
  { id: 'medico1', name: 'Dra. Ana Médico', email: 'medico@example.com', role: 'medico', password: 'password123' },
  { id: 'admin1', name: 'Admin General', email: 'admin@example.com', role: 'administrador', password: 'password123' },
  { id: 'admin2', name: 'Admin Prueba', email: 'admin2@example.com', role: 'administrador', password: 'password123' },
  { id: 'medico2', name: 'Medico Prueba', email: 'medico2@example.com', role: 'medico', password: 'password123' },
  { id: 'portero2', name: 'Portero Prueba', email: 'portero2@example.com', role: 'portero', password: 'password123' },
  ...mockSocios.filter(socio => socio.email).map(socio => ({
    id: `socio-${socio.numeroSocio}`,
    name: `${socio.nombre} ${socio.apellido}`,
    email: socio.email!.toLowerCase(),
    role: 'socio' as UserRole,
    numeroSocio: socio.numeroSocio,
    password: 'password123', // Unified password
  })),
];

const userMap = new Map<string, UserDetails>();
allMockUsers.forEach(user => {
  // The map will automatically handle duplicates, keeping only the last entry for a given email.
  userMap.set(user.email.toLowerCase(), user);
});

export const mockUsers: UserDetails[] = Array.from(userMap.values());


export const loginUser = (email: string, passwordInput: string): UserDetails | null => {
  const targetEmail = email.toLowerCase();
  const user = mockUsers.find(u => u.email.toLowerCase() === targetEmail && u.password === passwordInput);

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
    // Database initialization is now handled by the Providers component.
    window.dispatchEvent(new Event('authChange'));
    return user;
  }
  return null;
};

export const logoutUser = () => {
  localStorage.removeItem('isLoggedIn');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userName');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('loggedInUserNumeroSocio');
  window.dispatchEvent(new Event('authChange'));
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
