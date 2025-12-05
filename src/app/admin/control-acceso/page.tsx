'use client';

import { ControlAcceso } from '@/components/acceso/ControlAcceso';
import { RoleGuard } from '@/components/auth/RoleGuard';

export default function ControlAccesoPage() {
  return (
    <RoleGuard allowedRoles={['admin', 'portero']}>
      <ControlAcceso />
    </RoleGuard>
  );
}