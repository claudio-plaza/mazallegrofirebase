import { QuickAccessFeature } from '@/types';
import { 
    Home,
    Users, 
    FileText, 
    UserPlus, 
    Handshake, 
    UserCircle,
    HelpCircle, // <-- Añadido
    // Admin Icons
    Users as UsersAdmin, // Alias for clarity
    Stethoscope,
    ShieldCheck,
    ListFilter,
    DollarSign,
    Megaphone,
    Database, // Icon for backfill
    FileImage
} from 'lucide-react'; 

export const siteConfig = {
  name: 'Allegro',
  description: 'Sistema de gestión integral para un club deportivo y social.',
};

// Features primarily for the SOCIO role dashboard.
// Non-socio roles are redirected directly to their specific pages from the main dashboard gatekeeper.
export const allFeatures: QuickAccessFeature[] = [
  // --- Socio Features ---
  {
    id: 'inicio',
    title: 'Inicio',
    description: 'Página de inicio.',
    icon: Home,
    href: '/dashboard',
    roles: ['socio'],
  },
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
    href: '/mi-perfil/grupo-familiar',
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
  { // <-- Nuevo elemento de Ayuda
    id: 'ayuda',
    title: 'Ayuda',
    description: 'Accede a tutoriales y guías de uso.',
    icon: HelpCircle,
    href: 'https://tutorial.mazallegro.com/',
    roles: ['socio', 'admin', 'medico', 'portero'],
  },

  // --- Admin, Medico, Portero Features (accessible from Admin sidebar) ---
  {
    id: 'gestion-socios',
    title: 'Gestión de Socios',
    description: 'Administra la base de datos de socios.',
    icon: UsersAdmin,
    href: '/admin/gestion-socios',
    roles: ['admin'],
  },
  {
    id: 'solicitudes-cambio-foto',
    title: "Solicitudes de Foto",
    href: "/admin/solicitudes-cambio-foto",
    icon: FileImage,
    roles: ['admin'],
    description: "Aprobar o rechazar solicitudes de cambio de foto."
  },
  {
    id: 'solicitudes-familiares',
    title: "Solicitudes Familiares",
    href: "/admin/solicitudes-familiares",
    icon: Users,
    roles: ['admin'],
    description: "Aprobar o rechazar cambios en los familiares de los socios."
  },
  {
    id: 'solicitudes-adherentes',
    title: "Solicitudes Adherentes",
    href: "/admin/solicitudes-adherentes",
    icon: UserPlus,
    roles: ['admin'],
    description: "Aprobar o rechazar solicitudes de nuevos adherentes."
  },
  {
    id: 'panel-medico',
    title: 'Panel Médico',
    description: 'Gestiona revisiones médicas y aptos físicos.',
    icon: Stethoscope,
    href: '/admin/panel-medico', // Updated path
    roles: ['medico', 'admin'],
  },
  {
    id: 'control-acceso',
    title: 'Control de Acceso',
    description: 'Verifica el estado de socios para el ingreso.',
    icon: ShieldCheck,
    href: '/admin/control-acceso', // Updated path
    roles: ['portero', 'admin'],
  },
  {
    id: 'registros-ingreso',
    title: 'Registro de Ingresos',
    description: 'Ver el historial de ingresos diarios.',
    icon: ListFilter,
    href: '/admin/control-acceso/registros',
    roles: ['admin'],
  },
  {
    id: 'gestion-invitados-diarios-admin',
    title: 'Listas de Invitados',
    description: 'Revisa y descarga listas de invitados diarios.',
    icon: ListFilter,
    href: '/admin/gestion-invitados-diarios',
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