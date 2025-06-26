
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
import { Info, AlertTriangleIcon, CalendarDays as CalendarIconLucide, Megaphone } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export default function DashboardPage() {
  const { isLoggedIn, userRole, userName, isLoading: isAuthLoading, loggedInUserNumeroSocio } = useAuth();
  const router = useRouter();

  // --- Effects for redirection and initial auth check ---
  useEffect(() => {
    if (!isAuthLoading && !isLoggedIn) {
      router.push('/login');
    }
  }, [isLoggedIn, isAuthLoading, router]);

  // --- Data Fetching with React Query ---

  const { data: socio, isLoading: isSocioDataLoading } = useQuery({
    queryKey: ['socioStatus', loggedInUserNumeroSocio],
    queryFn: () => getSocioByNumeroSocioOrDNI(loggedInUserNumeroSocio!),
    enabled: !!loggedInUserNumeroSocio && userRole === 'socio',
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
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
    enabled: isLoggedIn,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  });

  // --- Derived State and Side Effects ---

  const currentSocioEstado = socio?.estadoSocio;

  const accessibleFeatures = useMemo(() => {
    if (!userRole) return [];
    
    // Redirect logic now encapsulated in useMemo, which runs after data fetching.
    // We check router.isReady if needed, but in App Router this is less of an issue.
    if (userRole === 'portero') {
      router.push('/control-acceso');
      return [];
    }
    if (userRole === 'medico') {
      router.push('/medico/panel');
      return [];
    }
    
    let features = allFeatures.filter(feature => feature.roles.includes(userRole));
    if (userRole === 'socio' && currentSocioEstado !== 'Activo') {
      features = features.filter(feature => feature.id !== 'mis-adherentes');
    }
    return features;
  }, [userRole, currentSocioEstado, router]);

  // --- Helper Functions ---
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

  // --- Render Logic ---

  const showSkeleton = isAuthLoading || 
                       (isLoggedIn && userRole === 'socio' && isSocioDataLoading) || 
                       (isLoggedIn && (userRole === 'portero' || userRole === 'medico'));

  if (showSkeleton) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-6 w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-10 w-1/3 mt-4" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="mt-8 bg-secondary/30">
            <CardHeader><Skeleton className="h-8 w-1/4" /></CardHeader>
            <CardContent><Skeleton className="h-24 w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  if (!isLoggedIn || userRole === 'portero' || userRole === 'medico') {
    return null; // Don't render anything for these roles as they are being redirected.
  }
  
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
