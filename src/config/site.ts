import type { QuickAccessFeature, UserRole } from '@/types';
import { Home, Users, ShieldCheck, Stethoscope, FileText, BarChart3, UserCircle, Sparkles } from 'lucide-react';

export const siteConfig = {
  name: 'ClubZenith',
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
    image: 'https://placehold.co/600x400.png',
    imageHint: 'club entrance',
  },
  {
    id: 'carnet-digital',
    title: 'Carnet Digital',
    description: 'Accede a tu carnet de socio digital.',
    icon: FileText,
    href: '/carnet',
    roles: ['socio', 'administrador'],
    image: 'https://placehold.co/600x400.png',
    imageHint: 'digital card',
  },
  {
    id: 'perfil-alta',
    title: 'Mi Perfil / Alta Socio',
    description: 'Completa o actualiza tus datos personales y familiares.',
    icon: UserCircle,
    href: '/perfil',
    roles: ['socio'], // Typically for new users or existing ones to update
    image: 'https://placehold.co/600x400.png',
    imageHint: 'profile update',
  },
  {
    id: 'panel-medico',
    title: 'Panel Médico',
    description: 'Gestiona revisiones médicas y aptos físicos.',
    icon: Stethoscope,
    href: '/medico/panel',
    roles: ['medico', 'administrador'],
    image: 'https://placehold.co/600x400.png',
    imageHint: 'medical office',
  },
  {
    id: 'control-acceso',
    title: 'Control de Acceso',
    description: 'Verifica el estado de socios para el ingreso.',
    icon: ShieldCheck,
    href: '/control-acceso',
    roles: ['portero', 'administrador'],
    image: 'https://placehold.co/600x400.png',
    imageHint: 'security gate',
  },
  {
    id: 'gestion-socios',
    title: 'Gestión de Socios',
    description: 'Administra la base de datos de socios.',
    icon: Users,
    href: '/admin/gestion-socios',
    roles: ['administrador'],
    image: 'https://placehold.co/600x400.png',
    imageHint: 'member database',
  },
  {
    id: 'ai-suggestions',
    title: 'Sugerencias IA',
    description: 'Recomendaciones de IA para gestión de socios.',
    icon: Sparkles,
    href: '/admin/ai-suggestions',
    roles: ['administrador'],
    image: 'https://placehold.co/600x400.png',
    imageHint: 'ai analytics',
  }
];
