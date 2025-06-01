
import type { UserRole } from '@/types';
import { mockSocios } from '../lib/mockData'; // To find socio details on login
import { mockRevisiones } from '../lib/mockData'; // Needed for initializeMockDatabases

// Import KEYS from firestoreService to use the correct localStorage key
const KEYS = {
  SOCIOS: 'firestore/socios',
  // We only need SOCIOS here, but defining the structure for clarity if other keys were needed.
  // REVISIONES: 'firestore/revisionesMedicas',
  // CUMPLEANOS: 'firestore/solicitudesCumpleanos',
  // INVITADOS_DIARIOS: 'firestore/solicitudesInvitadosDiarios',
};


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
  { id: 'admin2', name: 'Admin Prueba', email: 'admin2@example.com', role: 'administrador', password: 'password123' },
  { id: 'medico2', name: 'Medico Prueba', email: 'medico2@example.com', role: 'medico', password: 'password123' },
  { id: 'portero2', name: 'Portero Prueba', email: 'portero2@example.com', role: 'portero', password: 'password123' },
  ...mockSocios.filter(socio => socio.email).map(socio => ({
    id: `socio-${socio.numeroSocio}`,
    name: `${socio.nombre} ${socio.apellido}`,
    email: socio.email!.toLowerCase(),
    role: 'socio' as UserRole,
    numeroSocio: socio.numeroSocio,
    password: 'password123',
  })),
  { id: 'socio-2001', name: 'Carlos Solari', email: 'carlos.solari@example.com', role: 'socio', numeroSocio: '2001', password: 'password123' },
  { id: 'socio-2002', name: 'Laura Fernández', email: 'laura.fernandez@example.com', role: 'socio', numeroSocio: '2002', password: 'password123' },
  { id: 'socio-2003', name: 'Miguel Ángel Russo', email: 'miguel.russo@example.com', role: 'socio', numeroSocio: '2003', password: 'password123' },
  { id: 'socio-2004', name: 'Valeria Lynch', email: 'valeria.lynch@example.com', role: 'socio', numeroSocio: '2004', password: 'password123' },
  { id: 'socio-2005', name: 'Ricardo Darín', email: 'ricardo.darin@example.com', role: 'socio', numeroSocio: '2005', password: 'password123' },
];

export const loginUser = (email: string, DUMMY_PASSWORD_FOR_DEMO: string): UserDetails | null => {
  const user = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === DUMMY_PASSWORD_FOR_DEMO);
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
    // Use the correct key from KEYS (imported or defined locally for this scope)
    localStorage.setItem(KEYS.SOCIOS, JSON.stringify(mockSocios));

    const storedRevisiones = localStorage.getItem('revisionesDB'); // Assuming 'revisionesDB' is the correct key for these for now.
    if (!storedRevisiones) { 
       localStorage.setItem('revisionesDB', JSON.stringify(mockRevisiones));
    }

    const storedCumpleanos = localStorage.getItem('cumpleanosDB');
    if (!storedCumpleanos) {
        localStorage.setItem('cumpleanosDB', JSON.stringify([]));
    }

    const storedInvitadosDiarios = localStorage.getItem('invitadosDiariosDB');
    if (!storedInvitadosDiarios) {
        localStorage.setItem('invitadosDiariosDB', JSON.stringify([]));
    }
  }
};
