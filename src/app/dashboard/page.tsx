
'use client';

import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { allFeatures, siteConfig } from '@/config/site';
import type { QuickAccessFeature, Novedad } from '@/types';
import { TipoNovedad } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { getSocioByNumeroSocioOrDNI, getNovedades } from '@/lib/firebase/firestoreService';
import { formatDate } from '@/lib/helpers';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Info, AlertTriangle as AlertTriangleIcon, CalendarDays as CalendarIconLucide, Megaphone, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

// This is the component that will be shown for non-socio roles while redirecting
function RedirectingLoader({ role }: { role: string | null }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
            <Card className="w-full max-w-md p-8 text-center">
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
                <CardTitle className="mt-4">Redireccionando...</CardTitle>
                <CardDescription className="mt-2">
                    Ha iniciado sesión como {role || 'usuario'}.<br />
                    Será redirigido a su panel de control en un momento.
                </CardDescription>
            </Card>
        </div>
    );
}


export default function DashboardPage() {
  const { isLoggedIn, userRole, userName, isLoading: isAuthLoading, loggedInUserNumeroSocio } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthLoading) {
      return; // Do nothing while auth is loading
    }

    if (!isLoggedIn) {
      router.replace('/login');
      return;
    }
    
    // This is the core redirection logic
    if (userRole && userRole !== 'socio') {
      if (userRole === 'administrador') {
        router.replace('/admin/gestion-socios');
      } else if (userRole === 'portero') {
        router.replace('/control-acceso');
      } else if (userRole === 'medico') {
        router.replace('/medico/panel');
      }
    }
  }, [isLoggedIn, isAuthLoading, userRole, router]);

  const { data: socio, isLoading: isSocioDataLoading } = useQuery({
    queryKey: ['socioStatus', loggedInUserNumeroSocio],
    queryFn: () => getSocioByNumeroSocioOrDNI(loggedInUserNumeroSocio!),
    enabled: !!loggedInUserNumeroSocio && userRole === 'socio',
    staleTime: 5 * 60 * 1000,
  });

  const { data: novedadesClub = [], isLoading: loadingNovedades } = useQuery({
    queryKey: ['novedades'],
    queryFn: async () => {
      const todasLasNovedades = await getNovedades();
      const ahora = new Date();
      return todasLasNovedades.filter(novedad =>
        novedad.activa &&
        (!novedad.fechaVencimiento || new Date(novedad.fechaVencimiento) >= ahora)
      );
    },
    enabled: isLoggedIn && userRole === 'socio', // Only fetch for socios
    staleTime: 10 * 60 * 1000,
  });

  const currentSocioEstado = socio?.estadoSocio;

  const accessibleFeatures = useMemo(() => {
    if (userRole !== 'socio') return [];
    
    let features = allFeatures.filter(feature => feature.roles.includes(userRole));
    if (currentSocioEstado !== 'Activo') {
      features = features.filter(feature => feature.id !== 'mis-adherentes');
    }
    return features;
  }, [userRole, currentSocioEstado]);

  const getNovedadIcon = (tipo: TipoNovedad) => {
    switch (tipo) {
      case TipoNovedad.ALERTA: return <AlertTriangleIcon className="h-5 w-5 text-destructive" />;
      case TipoNovedad.EVENTO: return <CalendarIconLucide className="h-5 w-5 text-accent" />;
      case TipoNovedad.INFO:
      default: return <Info className="h-5 w-5 text-secondary" />;
    }
  };

  const getNovedadVariant = (tipo: TipoNovedad): "default" | "destructive" => {
    return tipo === TipoNovedad.ALERTA ? "destructive" : "default";
  };
  
  const getNovedadBadgeVariant = (tipo: TipoNovedad): "default" | "destructive" | "secondary" | "outline" => {
    switch (tipo) {
      case TipoNovedad.ALERTA: return "destructive";
      case TipoNovedad.EVENTO: return "default";
      case TipoNovedad.INFO:
      default: return "secondary";
    }
  };

  // --- Start of Rendering Logic ---

  if (isAuthLoading) {
    return <RedirectingLoader role={null} />;
  }

  // Handle case where user is logged in but has no role (error state)
  if (isLoggedIn && !userRole) {
    return (
        <div className="container mx-auto py-10">
            <Alert variant="destructive" className="max-w-xl mx-auto">
                <AlertTriangleIcon className="h-4 w-4" />
                <AlertTitle>Error al Cargar Perfil de Usuario</AlertTitle>
                <AlertDescription>
                    No pudimos cargar la información de tu rol desde la base de datos.
                    Esto puede deberse a un problema de conexión o a que tu cuenta no tiene un perfil asignado correctamente.
                    <br/><br/>
                    Por favor, verifica que tu base de datos de Firestore esté creada y que las reglas de seguridad permitan la lectura a usuarios autenticados. Si el problema persiste, contacta a soporte.
                </AlertDescription>
            </Alert>
        </div>
    );
  }
  
  // If user is a non-socio role, show the loader while useEffect redirects them.
  if (isLoggedIn && userRole !== 'socio') {
    return <RedirectingLoader role={userRole} />; 
  }
  
  // By this point, the user must be a 'socio'. Render the socio dashboard.
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Bienvenido, {userName || 'Usuario'}
        </h1>
        <p className="text-muted-foreground">
          Tu rol actual es: <span className="font-semibold text-primary">{userRole}</span>.
          {userRole === 'socio' && currentSocioEstado && ` (Estado Club: ${currentSocioEstado})`}
        </p>
      </header>

      {accessibleFeatures.length > 0 && (
        <section>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-6">Funcionalidades Disponibles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accessibleFeatures.map((feature) => (
              <Card key={feature.id} className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center text-xl">
                    {feature.icon && <feature.icon className="mr-3 h-6 w-6 text-primary" />}
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
                <div className="p-6 pt-0">
                  <Link href={feature.href} passHref>
                    <Button className="w-full">
                      Ir a {feature.title}
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      <Card className="mt-8 bg-muted/50 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-xl"><Megaphone className="mr-3 h-6 w-6 text-primary" />Novedades del Club</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingNovedades ? (
               <div className="space-y-4">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
               </div>
            ) : novedadesClub.length > 0 ? (
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {novedadesClub.map((novedad) => (
                  <Alert key={novedad.id} variant={getNovedadVariant(novedad.tipo)} className="shadow-sm">
                      <div className="flex items-center gap-3 mb-1">
                          {getNovedadIcon(novedad.tipo)}
                          <AlertTitle className="text-lg font-semibold">{novedad.titulo}</AlertTitle>
                          <Badge variant={getNovedadBadgeVariant(novedad.tipo)} className="ml-auto capitalize">{novedad.tipo}</Badge>
                      </div>
                      <AlertDescription className="pl-8">
                          <p className="mb-2 text-sm text-foreground/80">{novedad.contenido}</p>
                          <p className="text-xs text-muted-foreground">
                              Publicado: {formatDate(novedad.fechaCreacion, 'dd/MM/yyyy HH:mm')}
                              {novedad.fechaVencimiento && ` - Válido hasta: ${formatDate(novedad.fechaVencimiento, 'dd/MM/yyyy HH:mm')}`}
                          </p>
                      </AlertDescription>
                  </Alert>
                ))}
              </div>
            ) : (
               <p className="text-muted-foreground text-center py-4">No hay novedades importantes por el momento.</p>
            )}
          </CardContent>
        </Card>
    </div>
  );
}
