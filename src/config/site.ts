
import type { QuickAccessFeature, UserRole } from '@/types';
import { Home, Users, ShieldCheck, Stethoscope, FileText, BarChart3, UserCircle, Sparkles, Cake, CalendarDays, Download, UserPlus, ListFilter } from 'lucide-react'; // Added UserPlus, ListFilter

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
    roles: ['socio', 'portero', 'medico', 'administrador'],
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
    id: 'perfil-alta',
    title: 'Mi Perfil / Familiares',
    description: 'Completa o actualiza tus datos familiares.',
    icon: UserCircle,
    href: '/perfil',
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
