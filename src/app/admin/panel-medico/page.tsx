'use client';

import { PanelMedicoDashboard } from '@/components/medico/PanelMedicoDashboard';
import { RoleGuard } from '@/components/auth/RoleGuard';

export default function MedicoPanelPage() {
  return (
    <RoleGuard allowedRoles={['admin', 'medico']}>
      <div className="container mx-auto py-8">
        <PanelMedicoDashboard />
      </div>
    </RoleGuard>
  );
}
