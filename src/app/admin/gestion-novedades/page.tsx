'use client';

import { GestionNovedadesDashboard } from '@/components/admin/GestionNovedadesDashboard';
import { RoleGuard } from '@/components/auth/RoleGuard';

export default function GestionNovedadesPage() {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <div className="container mx-auto py-8">
        <GestionNovedadesDashboard />
      </div>
    </RoleGuard>
  );
}