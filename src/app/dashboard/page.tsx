
'use client';

import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardPage() {
  const { isLoggedIn, userRole, userName, loggedInUserNumeroSocio, isLoading: isAuthLoading } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
      <Card className="w-full max-w-lg p-6">
        <CardHeader>
          <CardTitle>Estado de Autenticación (Diagnóstico)</CardTitle>
          <CardDescription>
            Esta es una pantalla de diagnóstico. Por favor, comparta esta información.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm font-mono">
          <p><strong>isLoading:</strong> {JSON.stringify(isAuthLoading)}</p>
          <p><strong>isLoggedIn:</strong> {JSON.stringify(isLoggedIn)}</p>
          <p><strong>userRole:</strong> {JSON.stringify(userRole)}</p>
          <p><strong>userName:</strong> {JSON.stringify(userName)}</p>
          <p><strong>loggedInUserNumeroSocio:</strong> {JSON.stringify(loggedInUserNumeroSocio)}</p>
        </CardContent>
      </Card>
    </div>
  );
}
