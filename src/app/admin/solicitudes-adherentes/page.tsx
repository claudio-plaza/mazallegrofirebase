
import GestionSolicitudesAdherentesDashboard from '@/components/admin/GestionSolicitudesAdherentesDashboard';
import { RoleGuard } from '@/components/auth/RoleGuard';

export default function SolicitudesAdherentesPage() {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Solicitudes de Adherentes Pendientes</h1>
        <GestionSolicitudesAdherentesDashboard />
      </div>
    </RoleGuard>
  );
}
