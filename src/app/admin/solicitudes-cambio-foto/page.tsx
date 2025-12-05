'use client';

import { RevisarSolicitudesDashboard } from '@/components/admin/RevisarSolicitudesDashboard';
import { RoleGuard } from '@/components/auth/RoleGuard';

export default function SolicitudesCambioFotoPage() {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <div className="container mx-auto py-8">
        <RevisarSolicitudesDashboard />
      </div>
    </RoleGuard>
  );
}
