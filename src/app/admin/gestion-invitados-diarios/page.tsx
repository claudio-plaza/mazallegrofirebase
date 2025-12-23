import { AdminInvitadosDiariosDashboard } from '@/components/admin/AdminInvitadosDiariosDashboard';
import { RoleGuard } from '@/components/auth/RoleGuard';

export default function GestionInvitadosDiariosPage() {
  return (
    <RoleGuard allowedRoles={['admin', 'portero']}>
      <div className="p-4 sm:p-6 lg:p-8">
        <AdminInvitadosDiariosDashboard />
      </div>
    </RoleGuard>
  );
}