
import type { UserRole } from '@/types';
import { mockSocios } from './mockData'; // To find socio details on login
// import { mockRevisiones } from './mockData'; // Import mockRevisiones if you decide to initialize it here

interface UserDetails {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  numeroSocio?: string;
  password?: string;
}

export const mockUsers: UserDetails[] = [
  { id: 'socio1', name: 'Juan Pérez Socio', email: 'socio@example.com', role: 'socio', numeroSocio: '1001', password: 'password123' },
  { id: 'portero1', name: 'Pedro Portero', email: 'portero@example.com', role: 'portero', password: 'password123' },
  { id: 'medico1', name: 'Dra. Ana Médico', email: 'medico@example.com', role: 'medico', password: 'password123' },
  { id: 'admin1', name: 'Admin General', email: 'admin@example.com', role: 'administrador', password: 'password123' },
  { id: 'admin2', name: 'Admin Prueba', email: 'admin2@example.com', role: 'administrador', password: 'adminpass' },
  { id: 'medico2', name: 'Medico Prueba', email: 'medico2@example.com', role: 'medico', password: 'medicopass' },
  { id: 'portero2', name: 'Portero Prueba', email: 'portero2@example.com', role: 'portero', password: 'porteropass' },
  ...mockSocios.filter(socio => socio.email).map(socio => ({
    id: `socio-${socio.numeroSocio}`,
    name: `${socio.nombre} ${socio.apellido}`,
    email: socio.email!.toLowerCase(), // Added non-null assertion as we filter for socio.email
    role: 'socio' as UserRole,
    numeroSocio: socio.numeroSocio,
    password: 'password123', 
  }))
];

export const loginUser = (email: string, DUMMY_PASSWORD_FOR_DEMO: string): UserDetails | null => {
  const user = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
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
    initializeMockDatabases(); 
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

export const initializeMockDatabases = () => {
  if (typeof window !== 'undefined') {
    // Always set/overwrite sociosDB with the current mockSocios data
    localStorage.setItem('sociosDB', JSON.stringify(mockSocios));

    // Optional: Initialize revisionesDB if not present. 
    // Make sure mockRevisiones is imported from './mockData' if you uncomment this.
    // const storedRevisiones = localStorage.getItem('revisionesDB');
    // if (!storedRevisiones) {
    //   localStorage.setItem('revisionesDB', JSON.stringify(mockRevisiones));
    // }
  }
};
