'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { SocioDashboard } from '@/components/dashboard/SocioDashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const LoadingScreen = () => (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
    <Card className="w-full max-w-sm p-6">
      <CardHeader>
        <CardTitle>Cargando Sesión...</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Verificando tu identidad y permisos. Un momento...</p>
        <Skeleton className="h-4 w-full mt-4" />
      </CardContent>
    </Card>
  </div>
);


export default function DashboardPage() {
  const { userRole, isLoading: isAuthLoading } = useAuth();

  useEffect(() => {
    // Ensure window exists for client-side execution and that auth has finished loading
    if (typeof window === 'undefined' || isAuthLoading) {
      return; 
    }
    
    // Redirect based on role
    if (userRole) {
      if (userRole === 'admin') {
        window.location.replace('/admin/gestion-socios');
      } else if (userRole === 'medico') {
        window.location.replace('/admin/panel-medico');
      } else if (userRole === 'portero') {
        window.location.replace('/admin/control-acceso');
      }
    }
  }, [userRole, isAuthLoading]);

  // If we are still loading authentication, or if the user is a non-socio who is being redirected,
  // show the loader. This prevents any flicker of the socio dashboard.
  if (isAuthLoading || (userRole && userRole !== 'socio')) {
    return <LoadingScreen />;
  }
  
  // If the user is a 'socio', show their dashboard.
  if (userRole === 'socio') {
    return <SocioDashboard />;
  }

  // Fallback for any other case (e.g., user logged in but no role assigned, or auth error)
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
