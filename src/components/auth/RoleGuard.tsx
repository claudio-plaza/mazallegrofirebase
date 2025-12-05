'use client';

import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { userRole, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Verificando permisos...</p>
      </div>
    );
  }

  const isAllowed = userRole && allowedRoles.includes(userRole);

  if (!isAllowed) {
    return (
      <div className="container mx-auto py-10">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Acceso Denegado</AlertTitle>
          <AlertDescription>
            No tienes los permisos necesarios para ver esta página. Contacta a un administrador si crees que esto es un error.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}
