
import type { QuickAccessFeature } from '@/types';
import { 
    Users, 
    FileText, 
    UserPlus, 
    Handshake, 
    UserCircle,
    // Admin Icons
    Users as UsersAdmin, // Alias for clarity
    Stethoscope,
    ShieldCheck,
    ListFilter,
    DollarSign,
    Megaphone
} from 'lucide-react'; 

export const siteConfig = {
  name: 'MazAllegro',
  description: 'Sistema de gestión integral para un club deportivo y social.',
};

// Features primarily for the SOCIO role dashboard.
// Non-socio roles are redirected directly to their specific pages from the main dashboard gatekeeper.
export const allFeatures: QuickAccessFeature[] = [
  // --- Socio Features ---
  {
    id: 'mi-perfil-vista',
    title: 'Mi Perfil',
    description: 'Visualiza tus datos personales y de membresía.',
    icon: UserCircle,
    href: '/mi-perfil',
    roles: ['socio'],
  },
  {
    id: 'gestionar-familiares',
    title: 'Gestionar Grupo Familiar',
    description: 'Agrega o modifica los datos de tu grupo familiar.',
    icon: Users,
    href: '/perfil',
    roles: ['socio'],
  },
  {
    id: 'carnet-digital',
    title: 'Carnet Digital',
    description: 'Accede a tu carnet de socio digital.',
    icon: FileText,
    href: '/carnet',
    roles: ['socio'],
  },
  {
    id: 'invitados-diarios',
    title: 'Cargar Invitados del Día',
    description: 'Registra tus invitados para el acceso diario.',
    icon: UserPlus, 
    href: '/invitados-diarios',
    roles: ['socio'],
  },
  {
    id: 'mis-adherentes',
    title: 'Mis Adherentes',
    description: 'Gestiona tus adherentes y sus solicitudes.',
    icon: Handshake, 
    href: '/mis-adherentes',
    roles: ['socio'],
  },

  // --- Admin Features (Not displayed on socio dashboard, but defined for consistency) ---
  {
    id: 'gestion-socios',
    title: 'Gestión de Socios',
    description: 'Administra la base de datos de socios.',
    icon: UsersAdmin,
    href: '/admin/gestion-socios',
    roles: ['admin'],
  },
  {
    id: 'panel-medico',
    title: 'Panel Médico',
    description: 'Gestiona revisiones médicas y aptos físicos.',
    icon: Stethoscope,
    href: '/medico/panel',
    roles: ['medico', 'admin'],
  },
  {
    id: 'control-acceso',
    title: 'Control de Acceso',
    description: 'Verifica el estado de socios para el ingreso.',
    icon: ShieldCheck,
    href: '/control-acceso',
    roles: ['portero', 'admin'],
  },
  {
    id: 'gestion-invitados-diarios-admin',
    title: 'Gestión de Invitados Diarios',
    description: 'Revisa y descarga listas de invitados diarios.',
    icon: ListFilter,
    href: '/admin/gestion-invitados-diarios',
    roles: ['admin'],
  },
  {
    id: 'configuracion-precios',
    title: 'Configurar Precios Invitados',
    description: 'Establece los precios de las entradas para invitados.',
    icon: DollarSign,
    href: '/admin/configuracion-precios',
    roles: ['admin'],
  },
  { 
    id: 'gestion-novedades',
    title: 'Gestión de Novedades',
    description: 'Crea y administra novedades y alertas.',
    icon: Megaphone,
    href: '/admin/gestion-novedades',
    roles: ['admin'],
  }
];
