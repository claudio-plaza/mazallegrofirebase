
import type { QuickAccessFeature, UserRole } from '@/types';
import { Home, Users, ShieldCheck, Stethoscope, FileText, BarChart3, UserCircle, Sparkles, Cake, CalendarDays, Download, UserPlus, ListFilter } from 'lucide-react'; 

export const siteConfig = {
  name: 'MazAllegro',
  description: 'Sistema de gestión integral para un club deportivo y social.',
};

export const allFeatures: QuickAccessFeature[] = [
  {
    id: 'dashboard-general',
    title: 'Panel Principal',
    description: 'Vista general y accesos rápidos.',
    icon: Home,
    href: '/dashboard',
    roles: ['portero', 'medico'], 
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
    id: 'mis-cumpleanos',
    title: 'Mis Cumpleaños',
    description: 'Gestiona las listas de invitados para tus festejos.',
    icon: Cake,
    href: '/cumpleanos',
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
    id: 'panel-medico',
    title: 'Panel Médico',
    description: 'Gestiona revisiones médicas y aptos físicos.',
    icon: Stethoscope,
    href: '/medico/panel',
    roles: ['medico', 'administrador'],
  },
  {
    id: 'control-acceso',
    title: 'Control de Acceso',
    description: 'Verifica el estado de socios para el ingreso.',
    icon: ShieldCheck,
    href: '/control-acceso',
    roles: ['portero', 'administrador'],
  },
  {
    id: 'gestion-socios',
    title: 'Gestión de Socios',
    description: 'Administra la base de datos de socios.',
    icon: Users,
    href: '/admin/gestion-socios',
    roles: ['administrador'],
  },
  {
    id: 'ai-suggestions',
    title: 'Sugerencias IA',
    description: 'Recomendaciones de IA para gestión de socios.',
    icon: Sparkles,
    href: '/admin/ai-suggestions',
    roles: [], 
  },
  {
    id: 'gestion-eventos',
    title: 'Gestión de Eventos (Cumpleaños)',
    description: 'Administra y descarga listas de cumpleaños.',
    icon: CalendarDays,
    href: '/admin/gestion-eventos',
    roles: ['administrador'],
  },
  {
    id: 'gestion-invitados-diarios-admin',
    title: 'Gestión de Invitados Diarios',
    description: 'Revisa y descarga listas de invitados diarios.',
    icon: ListFilter,
    href: '/admin/gestion-invitados-diarios',
    roles: ['administrador'],
  }
];
