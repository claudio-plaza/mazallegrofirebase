
import { AdminEventosDashboard } from '@/components/admin/AdminEventosDashboard';
import { Metadata } from 'next';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: `Gestión de Eventos - ${siteConfig.name} Admin`,
  description: 'Administra eventos y descarga listas de cumpleaños.',
};

export default function AdminGestionEventosPage() {
  return (
    <div className="container mx-auto py-8">
      <AdminEventosDashboard />
    </div>
  );
}
