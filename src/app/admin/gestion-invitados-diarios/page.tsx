
import { AdminInvitadosDiariosDashboard } from '@/components/admin/AdminInvitadosDiariosDashboard';
import { Metadata } from 'next';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: `Gestión de Invitados Diarios - ${siteConfig.name} Admin`,
  description: 'Revisa y descarga listas de invitados diarios por fecha.',
};

export default function AdminGestionInvitadosDiariosPage() {
  return (
    <div className="container mx-auto py-8">
      <AdminInvitadosDiariosDashboard />
    </div>
  );
}
