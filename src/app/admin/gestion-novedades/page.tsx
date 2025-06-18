
import { GestionNovedadesDashboard } from '@/components/admin/GestionNovedadesDashboard';
import type { Metadata } from 'next';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: `Gestión de Novedades - ${siteConfig.name} Admin`,
  description: 'Crea, edita y administra las novedades y alertas del club.',
};

export default function GestionNovedadesPage() {
  return (
    <div className="container mx-auto py-8">
      <GestionNovedadesDashboard />
    </div>
  );
}
