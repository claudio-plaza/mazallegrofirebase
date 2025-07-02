'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { SocioDashboard } from '@/components/dashboard/SocioDashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const RedirectingScreen = ({ role }: { role: string }) => (
  <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
    <Card className="w-full max-w-sm p-6">
      <CardHeader>
        <CardTitle>Redireccionando...</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Tu rol es '{role}'. Serás redirigido a tu panel de control.</p>
        <Skeleton className="h-4 w-full mt-4" />
      </CardContent>
    </Card>
  </div>
);

const LoadingScreen = () => (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
    <Card className="w-full max-w-sm p-6">
      <CardHeader>
        <CardTitle>Cargando Sesión...</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Verificando tu identidad y permisos.</p>
        <Skeleton className="h-4 w-full mt-4" />
      </CardContent>
    </Card>
  </div>
);


export default function DashboardPage() {
  const { userRole, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthLoading) {
      return; 
    }
    
    if (userRole) {
      if (userRole === 'admin') {
        router.replace('/admin/gestion-socios');
      } else if (userRole === 'medico') {
        router.replace('/admin/panel-medico');
      } else if (userRole === 'portero') {
        router.replace('/admin/control-acceso');
      }
    }
  }, [userRole, isAuthLoading, router]);

  if (isAuthLoading) {
    return <LoadingScreen />;
  }

  // If user has a role but is not a 'socio', they are being redirected. Show a message.
  if (userRole && userRole !== 'socio') {
    return <RedirectingScreen role={userRole} />;
  }

  // If user is a 'socio', show their dashboard.
  if (userRole === 'socio') {
    return <SocioDashboard />;
  }

  // Fallback for any other case (e.g., user logged in but no role assigned)
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
      <Card className="w-full max-w-lg p-6">
        <CardHeader>
          <CardTitle>Error de Permisos</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Has iniciado sesión, pero tu cuenta no tiene un rol asignado. Por favor, contacta a la administración del club.</p>
        </CardContent>
      </Card>
    </div>
  );
}
