
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { Socio, MiembroFamiliar, AptoMedicoInfo } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Download, UserCircle, ShieldCheck, ShieldAlert, CalendarClock, AlertTriangle, CheckCircle2, XCircle, Users, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDate, getAptoMedicoStatus, getFileUrl } from '@/lib/helpers';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { siteConfig } from '@/config/site';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type DisplayablePerson = Pick<Socio, 'id' | 'nombre' | 'apellido' | 'dni' | 'aptoMedico' | 'fotoUrl'> & {
  relacion?: string; // Solo para familiares
  numeroSocio?: string; // Solo para titular
  miembroDesde?: string; // Solo para titular
  fotoFile?: FileList | null; // Para fotos cargadas y no solo URL
};

export function CarnetDigital() {
  const { loggedInUserNumeroSocio, isLoading: authLoading } = useAuth();
  const [titularData, setTitularData] = useState<Socio | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSocioData = useCallback(() => {
    if (authLoading) return;
    setLoading(true);
    const storedSocios = localStorage.getItem('sociosDB');
    let currentTitular: Socio | undefined = undefined;

    if (storedSocios) {
      const socios: Socio[] = JSON.parse(storedSocios);
      if (loggedInUserNumeroSocio) {
        currentTitular = socios.find(s => s.numeroSocio === loggedInUserNumeroSocio);
      } else {
        // Fallback si no hay socio logueado (ej. admin o para pruebas)
        // Aquí podríamos tener una lógica más robusta o simplemente tomar el primero si es necesario.
        currentTitular = socios[0]; // OJO: esto es un fallback para desarrollo
      }
    }
    
    setTitularData(currentTitular || null);
    if (currentTitular) {
      setSelectedPersonId(currentTitular.id); // Por defecto mostrar el carnet del titular
    } else {
      setSelectedPersonId(null);
    }
    setLoading(false);
  }, [loggedInUserNumeroSocio, authLoading]);

  useEffect(() => {
    fetchSocioData();
  }, [fetchSocioData]);

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
  
  const displayablePeopleOptions = titularData
  ? [
      { 
        value: titularData.id, 
        label: `${titularData.nombre} ${titularData.apellido} (Titular)`,
        person: titularData
      },
      ...(titularData.grupoFamiliar?.map(fam => ({
        value: fam.id || fam.dni, // Usar DNI como fallback si no hay ID
        label: `${fam.nombre} ${fam.apellido} (${fam.relacion})`,
        person: fam
      })) || [])
    ]
  : [];

  const selectedPersonData = titularData && selectedPersonId
  ? (selectedPersonId === titularData.id 
      ? {
          id: titularData.id,
          nombre: titularData.nombre,
          apellido: titularData.apellido,
          dni: titularData.dni,
          aptoMedico: titularData.aptoMedico,
          fotoUrl: titularData.fotoUrl,
          numeroSocio: titularData.numeroSocio,
          miembroDesde: titularData.miembroDesde,
          relacion: 'Titular'
        }
      : titularData.grupoFamiliar?.find(fam => (fam.id || fam.dni) === selectedPersonId)
        ? {
            id: titularData.grupoFamiliar.find(fam => (fam.id || fam.dni) === selectedPersonId)!.id || titularData.grupoFamiliar.find(fam => (fam.id || fam.dni) === selectedPersonId)!.dni,
            nombre: titularData.grupoFamiliar.find(fam => (fam.id || fam.dni) === selectedPersonId)!.nombre,
            apellido: titularData.grupoFamiliar.find(fam => (fam.id || fam.dni) === selectedPersonId)!.apellido,
            dni: titularData.grupoFamiliar.find(fam => (fam.id || fam.dni) === selectedPersonId)!.dni,
            aptoMedico: titularData.grupoFamiliar.find(fam => (fam.id || fam.dni) === selectedPersonId)!.aptoMedico,
            fotoUrl: (titularData.grupoFamiliar.find(fam => (fam.id || fam.dni) === selectedPersonId)!.fotoPerfil instanceof FileList ? getFileUrl(titularData.grupoFamiliar.find(fam => (fam.id || fam.dni) === selectedPersonId)!.fotoPerfil as FileList) : titularData.grupoFamiliar.find(fam => (fam.id || fam.dni) === selectedPersonId)!.fotoPerfil as string | undefined) || `https://placehold.co/150x150.png?text=${titularData.grupoFamiliar.find(fam => (fam.id || fam.dni) === selectedPersonId)!.nombre[0]}${titularData.grupoFamiliar.find(fam => (fam.id || fam.dni) === selectedPersonId)!.apellido[0]}`,
            relacion: titularData.grupoFamiliar.find(fam => (fam.id || fam.dni) === selectedPersonId)!.relacion
          }
        : null) as DisplayablePerson | null
  : null;


  if (loading || authLoading) {
    return (
      <Card className="w-full max-w-lg mx-auto shadow-lg">
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

  if (!titularData || !selectedPersonData) {
    return (
      <Card className="w-full max-w-lg mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="text-center text-destructive">Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">No se pudo cargar la información del socio o del carnet seleccionado.</p>
        </CardContent>
      </Card>
    );
  }

  const aptoStatus = getAptoMedicoStatus(selectedPersonData.aptoMedico);
  let fotoToShow = selectedPersonData.fotoUrl || `https://placehold.co/150x150.png?text=${selectedPersonData.nombre[0]}${selectedPersonData.apellido[0]}`;
  if (selectedPersonData.fotoFile) {
    const fileUrl = getFileUrl(selectedPersonData.fotoFile);
    if (fileUrl) fotoToShow = fileUrl;
  }
  
  const qrData = titularData.numeroSocio; // QR siempre con el N° Socio del titular
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(qrData)}&format=png&bgcolor=ffffff&color=0E4291`;

  return (
    <Card className="w-full max-w-lg mx-auto shadow-xl rounded-xl overflow-hidden bg-gradient-to-br from-primary/10 via-background to-background">
      <div className="bg-primary text-primary-foreground p-6 flex items-center justify-between space-x-4">
        <div className="flex items-center space-x-3">
            <UserCircle className="h-10 w-10" />
            <div>
            <CardTitle className="text-2xl">Carnet Digital</CardTitle>
            <p className="text-sm opacity-90">{siteConfig.name}</p>
            </div>
        </div>
        <Image src="/logo-placeholder-white.png" alt={`${siteConfig.name} Logo`} width={50} height={50} data-ai-hint="club logo white" className="rounded-sm"/>
      </div>
      
      <CardContent className="p-6 space-y-6">
        {displayablePeopleOptions.length > 1 && (
            <div className="space-y-2">
                <label htmlFor="select-person" className="text-sm font-medium text-muted-foreground flex items-center">
                    <Users className="mr-2 h-4 w-4"/> Ver carnet de:
                </label>
                <Select value={selectedPersonId || ''} onValueChange={setSelectedPersonId}>
                    <SelectTrigger id="select-person" className="w-full">
                        <SelectValue placeholder="Seleccionar miembro" />
                    </SelectTrigger>
                    <SelectContent>
                        {displayablePeopleOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        )}

        <div className="flex flex-col items-center sm:flex-row sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
          <Avatar className="h-32 w-32 border-4 border-primary shadow-md">
            <AvatarImage src={fotoToShow} alt={`${selectedPersonData.nombre} ${selectedPersonData.apellido}`} data-ai-hint="member portrait" />
            <AvatarFallback className="text-4xl">
              {selectedPersonData.nombre[0]}{selectedPersonData.apellido[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-3xl font-semibold text-primary">{selectedPersonData.nombre} {selectedPersonData.apellido}</h2>
            {selectedPersonData.relacion && selectedPersonData.relacion !== "Titular" && (
                <p className="text-sm text-foreground"><Badge variant="outline">{selectedPersonData.relacion}</Badge></p>
            )}
            <p className="text-muted-foreground">N° Socio Titular: <span className="font-medium text-foreground">{titularData.numeroSocio}</span></p>
            <p className="text-muted-foreground">DNI: <span className="font-medium text-foreground">{selectedPersonData.dni}</span></p>
            {selectedPersonData.miembroDesde && (
                <p className="text-muted-foreground">Miembro Desde: <span className="font-medium text-foreground">{formatDate(selectedPersonData.miembroDesde)}</span></p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
          <div className={`p-4 rounded-lg border ${titularData.estadoSocio === 'Activo' ? 'border-green-500 bg-green-500/10' : 'border-red-500 bg-red-500/10'}`}>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Estado Socio Titular</h3>
            <div className="flex items-center">
              {titularData.estadoSocio === 'Activo' ? 
                <ShieldCheck className="h-6 w-6 text-green-500 mr-2" /> : 
                <ShieldAlert className="h-6 w-6 text-red-500 mr-2" />}
              <Badge variant={titularData.estadoSocio === 'Activo' ? 'default' : 'destructive'} className={titularData.estadoSocio === 'Activo' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}>
                {titularData.estadoSocio}
              </Badge>
            </div>
          </div>

          <div className={`p-4 rounded-lg border ${aptoStatus.colorClass.includes('green') ? 'border-green-500 bg-green-500/10' : aptoStatus.colorClass.includes('orange') ? 'border-orange-500 bg-orange-500/10' : 'border-red-500 bg-red-500/10'}`}>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Apto Médico ({selectedPersonData.relacion || 'Titular'})</h3>
            <div className="flex items-center">
              {aptoStatus.status === 'Válido' && <CheckCircle2 className="h-6 w-6 text-green-500 mr-2" />}
              {aptoStatus.status === 'Vencido' && <XCircle className="h-6 w-6 text-red-500 mr-2" />}
              {aptoStatus.status === 'Inválido' && <AlertTriangle className="h-6 w-6 text-red-500 mr-2" />}
              {aptoStatus.status === 'Pendiente' && <CalendarClock className="h-6 w-6 text-yellow-500 mr-2" />}
               <Badge variant="outline" className={`${aptoStatus.colorClass.replace('bg-', 'border-').replace('-100', '-500')} text-current`}>
                {aptoStatus.status}
              </Badge>
            </div>
            <p className={`text-xs mt-1 ${aptoStatus.colorClass.replace('bg-', 'text-').replace('-100', '-400')}`}>{aptoStatus.message}</p>
            {selectedPersonData.aptoMedico?.observaciones && (
              <p className="text-xs mt-1 text-muted-foreground">Obs: {selectedPersonData.aptoMedico.observaciones}</p>
            )}
          </div>
        </div>
        
        <div className="flex flex-col items-center pt-4">
          <p className="text-xs text-muted-foreground mb-1">Código de Acceso del Titular</p>
          <Image src={qrCodeUrl} alt={`QR Code para ${titularData.numeroSocio}`} width={120} height={120} className="rounded-md shadow-md border bg-white p-1" data-ai-hint="access qr code" />
          <p className="text-xs text-muted-foreground mt-1">Presentar para ingreso y gestiones.</p>
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
