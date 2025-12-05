'use client';

import { GestionSociosDashboard } from '@/components/admin/GestionSociosDashboard';
import { RoleGuard } from '@/components/auth/RoleGuard';

export default function AdminGestionSociosPage() {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <div className="container mx-auto py-8">
        <GestionSociosDashboard />
      </div>
    </RoleGuard>
  );
}
