
'use client';

import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { allFeatures, siteConfig } from '@/config/site';
import type { QuickAccessFeature, UserRole, Novedad } from '@/types';
import { TipoNovedad } from '@/types';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import { getSocioByNumeroSocioOrDNI } from '@/lib/firebase/firestoreService';
import { getNovedades } from '@/lib/firebase/firestoreService'; // Importar servicio de novedades
import { formatDate } from '@/lib/helpers'; // Para formatear fechas
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Info, AlertTriangleIcon, CalendarDays as CalendarIcon, Megaphone } from 'lucide-react'; // Renombrar CalendarDays para evitar conflicto

export default function DashboardPage() {
  const { isLoggedIn, userRole, userName, isLoading, loggedInUserNumeroSocio } = useAuth();
  const router = useRouter();
  const [accessibleFeatures, setAccessibleFeatures] = useState<QuickAccessFeature[]>([]);
  const [currentSocioEstado, setCurrentSocioEstado] = useState<string | null>(null);
  const [isSocioDataLoading, setIsSocioDataLoading] = useState<boolean>(false);
  const [novedadesClub, setNovedadesClub] = useState<Novedad[]>([]);
  const [loadingNovedades, setLoadingNovedades] = useState<boolean>(true);

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.push('/login');
    }
  }, [isLoggedIn, isLoading, router]);

  useEffect(() => {
    const fetchSocioStatus = async () => {
      if (userRole === 'socio' && loggedInUserNumeroSocio) {
        setIsSocioDataLoading(true);
        try {
          const socio = await getSocioByNumeroSocioOrDNI(loggedInUserNumeroSocio);
          if (socio) {
            setCurrentSocioEstado(socio.estadoSocio);
          } else {
            console.error('Socio no encontrado para el dashboard');
            setCurrentSocioEstado(null);
          }
        } catch (error) {
          console.error('Error fetching socio status:', error);
          setCurrentSocioEstado(null);
        } finally {
          setIsSocioDataLoading(false);
        }
      } else if (userRole !== 'socio') {
        setCurrentSocioEstado(null);
      }
    };

    if (!isLoading && isLoggedIn) {
      fetchSocioStatus();
    }
  }, [isLoading, isLoggedIn, userRole, loggedInUserNumeroSocio]);

  useEffect(() => {
    if (!isLoading && isLoggedIn && userRole) {
      if (userRole === 'portero') {
        router.push('/control-acceso');
      } else if (userRole === 'medico') {
        router.push('/medico/panel');
      } else {
        let features = allFeatures.filter(feature => feature.roles.includes(userRole));
        
        if (userRole === 'socio') {
          if (!isSocioDataLoading) {
            if (currentSocioEstado !== 'Activo') {
              features = features.filter(feature => feature.id !== 'mis-adherentes');
            }
          } else {
            features = features.filter(feature => feature.id !== 'mis-adherentes');
          }
        }
        setAccessibleFeatures(features);
      }
    } else if (!isLoading && !isLoggedIn) {
      setAccessibleFeatures([]); 
    }
  }, [isLoading, isLoggedIn, userRole, currentSocioEstado, isSocioDataLoading, router]);

  useEffect(() => {
    const fetchNovedades = async () => {
      if (isLoggedIn) { // Solo cargar novedades si el usuario está logueado
        setLoadingNovedades(true);
        try {
          const todasLasNovedades = await getNovedades();
          const ahora = new Date();
          const novedadesActivas = todasLasNovedades.filter(novedad => 
            novedad.activa && 
            (!novedad.fechaVencimiento || new Date(novedad.fechaVencimiento) >= ahora)
          );
          setNovedadesClub(novedadesActivas);
        } catch (error) {
          console.error("Error fetching novedades:", error);
          setNovedadesClub([]);
        } finally {
          setLoadingNovedades(false);
        }
      } else {
        setNovedadesClub([]);
        setLoadingNovedades(false);
      }
    };

    if (!isLoading) { // Asegurarse de que el estado de autenticación se haya cargado
        fetchNovedades();
    }
  }, [isLoggedIn, isLoading]);

  const getNovedadIcon = (tipo: TipoNovedad) => {
    switch (tipo) {
      case TipoNovedad.ALERTA: return <AlertTriangleIcon className="h-5 w-5 text-destructive" />;
      case TipoNovedad.EVENTO: return <CalendarIcon className="h-5 w-5 text-purple-600" />;
      case TipoNovedad.INFO:
      default: return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const getNovedadVariant = (tipo: TipoNovedad): "default" | "destructive" => {
    if (tipo === TipoNovedad.ALERTA) return "destructive";
    return "default";
  }
   const getNovedadBadgeVariant = (tipo: TipoNovedad): "default" | "destructive" | "secondary" | "outline" => {
    switch (tipo) {
      case TipoNovedad.ALERTA: return "destructive";
      case TipoNovedad.EVENTO: return "secondary"; 
      case TipoNovedad.INFO:
      default: return "default";
    }
  };


  if (isLoading || (isLoggedIn && userRole === 'socio' && isSocioDataLoading) || (isLoggedIn && (userRole === 'portero' || userRole === 'medico'))) {
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

  if (!isLoggedIn) {
    return null; 
  }
  
  if (userRole !== 'portero' && userRole !== 'medico') {
    return (
      <div className="space-y-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Bienvenido, {userName || 'Usuario'}
          </h1>
          <p className="text-muted-foreground">
            Tu rol actual es: <span className="font-semibold text-primary">{userRole}</span>.
            {userRole === 'socio' && currentSocioEstado && ` (Estado Club: ${currentSocioEstado})`}
            Aquí tienes tus accesos rápidos.
          </p>
        </header>

        {accessibleFeatures.length > 0 && (
          <section>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-6">Accesos Rápidos</h2>
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

  return null;
}
