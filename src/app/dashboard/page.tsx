
'use client';

import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';
import { SocioDashboard } from '@/components/dashboard/SocioDashboard';
import { Loader2 } from 'lucide-react';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';

function DashboardLoader() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
            <Card className="w-full max-w-md p-8 text-center">
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
                <CardTitle className="mt-4">Cargando Panel...</CardTitle>
                <CardDescription className="mt-2">
                    Verificando su sesión y permisos. Por favor, espere.
                </CardDescription>
            </Card>
        </div>
    );
}

export default function DashboardPage() {
  const { isLoggedIn, userRole, isLoading: isAuthLoading } = useAuth();

  useEffect(() => {
    if (isAuthLoading) {
      return; // Esperar a que la autenticación se complete
    }
    if (!isLoggedIn) {
      window.location.replace('/login');
      return;
    }
    
    if (userRole && userRole !== 'socio') {
      const targetPath = {
        administrador: '/admin/gestion-socios',
        portero: '/control-acceso',
        medico: '/medico/panel',
      }[userRole];

      if (targetPath) {
        window.location.replace(targetPath);
      }
    }
  }, [isLoggedIn, isAuthLoading, userRole]);
  
  // Si el usuario es socio, muestra su panel dedicado.
  if (userRole === 'socio') {
    return <SocioDashboard />;
  }

  // En cualquier otro caso (cargando, esperando la redirección para admin, etc.), muestra el loader.
  return <DashboardLoader />;
}
