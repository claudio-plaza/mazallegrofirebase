'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { Socio } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Download, UserCircle, ShieldCheck, ShieldAlert, CalendarClock, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDate, getAptoMedicoStatus } from '@/lib/helpers';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';

export function CarnetDigital() {
  const { loggedInUserNumeroSocio, isLoading: authLoading } = useAuth();
  const [socioData, setSocioData] = useState<Socio | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSocioData = useCallback(() => {
    if (loggedInUserNumeroSocio) {
      setLoading(true);
      const storedSocios = localStorage.getItem('sociosDB');
      if (storedSocios) {
        const socios: Socio[] = JSON.parse(storedSocios);
        const currentSocio = socios.find(s => s.numeroSocio === loggedInUserNumeroSocio);
        setSocioData(currentSocio || null);
      } else {
        setSocioData(null);
      }
      setLoading(false);
    } else {
      // Fallback for admin or if no socio logged in, show a demo socio (e.g. first from mock)
      // This part can be adjusted based on specific requirements for non-socio roles
      const storedSocios = localStorage.getItem('sociosDB');
      if (storedSocios) {
        const socios: Socio[] = JSON.parse(storedSocios);
        setSocioData(socios[0] || null); // Show first socio as demo
      }
      setLoading(false);
    }
  }, [loggedInUserNumeroSocio]);

  useEffect(() => {
    if (!authLoading) {
      fetchSocioData();
    }
  }, [authLoading, fetchSocioData]);

  useEffect(() => {
    const handleSociosDBUpdate = () => {
      fetchSocioData();
    };
    window.addEventListener('sociosDBUpdated', handleSociosDBUpdate);
    return () => {
      window.removeEventListener('sociosDBUpdated', handleSociosDBUpdate);
    };
  }, [fetchSocioData]);

  const handleDownloadPdf = () => {
    toast({
      title: 'Función no implementada',
      description: 'La descarga de PDF será implementada próximamente.',
    });
  };

  if (loading || authLoading) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-lg">
        <CardHeader className="items-center text-center">
          <Skeleton className="h-8 w-3/4 mx-auto" />
          <Skeleton className="h-24 w-24 rounded-full mx-auto mt-4" />
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-10 w-full mt-4" />
        </CardContent>
      </Card>
    );
  }

  if (!socioData) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="text-center text-destructive">Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">No se pudo cargar la información del socio.</p>
        </CardContent>
      </Card>
    );
  }

  const aptoStatus = getAptoMedicoStatus(socioData.aptoMedico);
  const fotoSocio = socioData.fotoUrl || `https://placehold.co/150x150.png?text=${socioData.nombre[0]}${socioData.apellido[0]}`;

  return (
    <Card className="w-full max-w-lg mx-auto shadow-xl rounded-xl overflow-hidden bg-gradient-to-br from-primary/10 via-background to-background">
      <div className="bg-primary text-primary-foreground p-6 flex items-center space-x-4">
        <UserCircle className="h-10 w-10" />
        <div>
          <CardTitle className="text-2xl">Carnet Digital del Socio</CardTitle>
          <p className="text-sm opacity-90">ClubZenith</p>
        </div>
      </div>
      
      <CardContent className="p-6 space-y-6">
        <div className="flex flex-col items-center sm:flex-row sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
          <Avatar className="h-32 w-32 border-4 border-primary shadow-md">
            <AvatarImage src={fotoSocio} alt={`${socioData.nombre} ${socioData.apellido}`} data-ai-hint="member portrait" />
            <AvatarFallback className="text-4xl">
              {socioData.nombre[0]}{socioData.apellido[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-3xl font-semibold text-primary">{socioData.nombre} {socioData.apellido}</h2>
            <p className="text-muted-foreground">N° Socio: <span className="font-medium text-foreground">{socioData.numeroSocio}</span></p>
            <p className="text-muted-foreground">DNI: <span className="font-medium text-foreground">{socioData.dni}</span></p>
            <p className="text-muted-foreground">Miembro Desde: <span className="font-medium text-foreground">{formatDate(socioData.miembroDesde)}</span></p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`p-4 rounded-lg border ${socioData.estadoSocio === 'Activo' ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Estado Socio</h3>
            <div className="flex items-center">
              {socioData.estadoSocio === 'Activo' ? 
                <ShieldCheck className="h-6 w-6 text-green-600 mr-2" /> : 
                <ShieldAlert className="h-6 w-6 text-red-600 mr-2" />}
              <Badge variant={socioData.estadoSocio === 'Activo' ? 'default' : 'destructive'} className={socioData.estadoSocio === 'Activo' ? 'bg-green-600' : 'bg-red-600'}>
                {socioData.estadoSocio}
              </Badge>
            </div>
          </div>

          <div className={`p-4 rounded-lg border ${aptoStatus.colorClass.includes('green') ? 'border-green-500 bg-green-50' : aptoStatus.colorClass.includes('orange') ? 'border-orange-500 bg-orange-50' : 'border-red-500 bg-red-50'}`}>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Apto Médico</h3>
            <div className="flex items-center">
              {aptoStatus.status === 'Válido' && <CheckCircle2 className="h-6 w-6 text-green-600 mr-2" />}
              {aptoStatus.status === 'Vencido' && <XCircle className="h-6 w-6 text-red-600 mr-2" />}
              {aptoStatus.status === 'Inválido' && <AlertTriangle className="h-6 w-6 text-red-600 mr-2" />}
              {aptoStatus.status === 'Pendiente' && <CalendarClock className="h-6 w-6 text-yellow-600 mr-2" />}
               <Badge variant="outline" className={`${aptoStatus.colorClass} border-current`}>
                {aptoStatus.status}
              </Badge>
            </div>
            <p className={`text-xs mt-1 ${aptoStatus.colorClass.replace('bg-', 'text-')}`}>{aptoStatus.message}</p>
            {socioData.aptoMedico?.observaciones && (
              <p className="text-xs mt-1 text-muted-foreground">Obs: {socioData.aptoMedico.observaciones}</p>
            )}
          </div>
        </div>
        
      </CardContent>
      <CardFooter className="p-6 bg-muted/50">
        <Button onClick={handleDownloadPdf} className="w-full" variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Descargar como PDF (Simulado)
        </Button>
      </CardFooter>
    </Card>
  );
}
