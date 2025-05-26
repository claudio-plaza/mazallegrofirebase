import type { UserRole } from '@/types';
import { mockSocios } from './mockData'; // To find socio details on login

interface UserDetails {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  numeroSocio?: string;
}

// Simulacion de base de datos de usuarios para login. En una app real, esto vendría de un backend.
export const mockUsers: UserDetails[] = [
  { id: 'socio1', name: 'Juan Pérez Socio', email: 'socio@example.com', role: 'socio', numeroSocio: '1001' },
  { id: 'portero1', name: 'Pedro Portero', email: 'portero@example.com', role: 'portero' },
  { id: 'medico1', name: 'Dra. Ana Médico', email: 'medico@example.com', role: 'medico' },
  { id: 'admin1', name: 'Admin General', email: 'admin@example.com', role: 'administrador' },
  ...mockSocios.map(socio => ({
    id: `socio-${socio.numeroSocio}`,
    name: `${socio.nombre} ${socio.apellido}`,
    email: socio.email.toLowerCase(),
    role: 'socio' as UserRole,
    numeroSocio: socio.numeroSocio,
  }))
];

export const loginUser = (email: string, DUMMY_PASSWORD_FOR_DEMO: string): UserDetails | null => {
  // En este demo, la contraseña no se usa para la comparación, solo el email.
  const user = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (user) {
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userRole', user.role);
    localStorage.setItem('userName', user.name);
    localStorage.setItem('userEmail', user.email); // Store email for potential use
    if (user.role === 'socio' && user.numeroSocio) {
      localStorage.setItem('loggedInUserNumeroSocio', user.numeroSocio);
    } else {
      localStorage.removeItem('loggedInUserNumeroSocio');
    }
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
  // Consider if sociosDB and revisionesDB should be cleared on logout or persist for demo purposes
  // localStorage.removeItem('sociosDB');
  // localStorage.removeItem('revisionesDB');
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

export const initializeMockDatabases = () => {
  if (typeof window !== 'undefined') {
    if (!localStorage.getItem('sociosDB')) {
      localStorage.setItem('sociosDB', JSON.stringify(mockSocios));
    }
    // Initialize revisionesDB from mockData if not present (assuming mockRevisiones is defined in mockData.ts)
    // For this example, let's assume mockRevisiones is exported from mockData.ts
    // import { mockRevisiones } from './mockData';
    // if (!localStorage.getItem('revisionesDB')) {
    //   localStorage.setItem('revisionesDB', JSON.stringify(mockRevisiones));
    // }
  }
};
