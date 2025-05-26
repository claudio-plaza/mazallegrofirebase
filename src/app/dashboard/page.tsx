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

export default function DashboardPage() {
  const { isLoggedIn, userRole, userName, isLoading } = useAuth();
  const router = useRouter();
  const [accessibleFeatures, setAccessibleFeatures] = useState<QuickAccessFeature[]>([]);

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.push('/login');
    }
  }, [isLoggedIn, isLoading, router]);

  useEffect(() => {
    if (userRole) {
      const features = allFeatures.filter(feature => feature.roles.includes(userRole));
      setAccessibleFeatures(features);
    }
  }, [userRole]);

  if (isLoading) {
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
    return null; // Or a redirect message, though useEffect handles redirect
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Bienvenido, {userName || 'Usuario'}
        </h1>
        <p className="text-muted-foreground">
          Tu rol actual es: <span className="font-semibold text-primary">{userRole}</span>. Aquí tienes tus accesos rápidos.
        </p>
      </header>

      {accessibleFeatures.length > 0 ? (
        <section>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-6">Accesos Rápidos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accessibleFeatures.map((feature) => (
              <Card key={feature.id} className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                {feature.image && (
                  <div className="relative w-full h-48">
                    <Image 
                      src={feature.image} 
                      alt={feature.title} 
                      layout="fill" 
                      objectFit="cover" 
                      data-ai-hint={feature.imageHint || 'feature image'}
                    />
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="flex items-center text-xl">
                    <feature.icon className="mr-3 h-6 w-6 text-primary" />
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
        <p className="text-muted-foreground">No tienes accesos rápidos configurados para tu rol.</p>
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
            {/* Placeholder for announcements or club info */}
            <div className="mt-4 p-4 border border-dashed rounded-md">
              <p className="text-sm text-center text-muted-foreground">Próximamente: Novedades del club aquí.</p>
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
