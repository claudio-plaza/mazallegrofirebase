
'use client';

import { AdminInvitadosDiariosDashboard } from '@/components/admin/AdminInvitadosDiariosDashboard';
import { RoleGuard } from '@/components/auth/RoleGuard';

export default function AdminGestionInvitadosDiariosPage() {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <div className="container mx-auto py-8">
        <AdminInvitadosDiariosDashboard />
      </div>
    </RoleGuard>
  );
}
