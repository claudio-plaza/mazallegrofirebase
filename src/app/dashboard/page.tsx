
'use client';

import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { allFeatures, siteConfig } from '@/config/site';
import type { QuickAccessFeature, UserRole } from '@/types';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import { getSocioByNumeroSocioOrDNI } from '@/lib/firebase/firestoreService'; // Import direct service

export default function DashboardPage() {
  const { isLoggedIn, userRole, userName, isLoading, loggedInUserNumeroSocio } = useAuth();
  const router = useRouter();
  const [accessibleFeatures, setAccessibleFeatures] = useState<QuickAccessFeature[]>([]);
  const [currentSocioEstado, setCurrentSocioEstado] = useState<string | null>(null);
  const [isSocioDataLoading, setIsSocioDataLoading] = useState<boolean>(false);

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
            console.error('Socio no encontrado en localStorage para el dashboard');
            setCurrentSocioEstado(null);
          }
        } catch (error) {
          console.error('Error fetching socio status from localStorage:', error);
          setCurrentSocioEstado(null);
        } finally {
          setIsSocioDataLoading(false);
        }
      } else if (userRole !== 'socio') {
        // Si no es socio, no necesitamos cargar su estado, reseteamos.
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
          // Solo filtrar 'mis-adherentes' si ya terminamos de cargar el estado del socio
          if (!isSocioDataLoading) {
            if (currentSocioEstado !== 'Activo') {
              features = features.filter(feature => feature.id !== 'mis-adherentes');
            }
          } else {
            // Si estamos cargando el estado del socio, temporalmente quitamos 'mis-adherentes'
            // para evitar que flashee y luego desaparezca. Se añadirá si es 'Activo'.
            features = features.filter(feature => feature.id !== 'mis-adherentes');
          }
        }
        setAccessibleFeatures(features);
      }
    } else if (!isLoading && !isLoggedIn) {
      setAccessibleFeatures([]); 
    }
  }, [isLoading, isLoggedIn, userRole, currentSocioEstado, isSocioDataLoading, router]);


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

        {accessibleFeatures.length > 0 ? (
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
        ) : (
          <p className="text-muted-foreground">No tienes accesos rápidos configurados para tu rol o estado actual.</p>
        )}
        <Card className="mt-8 bg-secondary/30">
            <CardHeader>
              <CardTitle>Información del Club</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Mantente al día con las últimas novedades y eventos de {siteConfig.name}. 
                Visita nuestro tablón de anuncios o contáctanos para más información.
              </p>
              <div className="mt-4 p-4 border border-dashed rounded-md">
                <p className="text-sm text-center text-muted-foreground">Próximamente: Novedades del club aquí.</p>
              </div>
            </CardContent>
          </Card>
      </div>
    );
  }

  return null;
}

