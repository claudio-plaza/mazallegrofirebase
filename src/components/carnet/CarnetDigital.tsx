
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { Socio } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Download, UserCircle, ShieldCheck, ShieldAlert, CalendarClock, AlertTriangle, CheckCircle2, XCircle, Users, QrCode, UserSquare2, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDate, getAptoMedicoStatus, getFileUrl } from '@/lib/helpers';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { siteConfig } from '@/config/site';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from '@/components/ui/separator';
import { useSearchParams, useRouter } from 'next/navigation';
import { getSocioByNumeroSocioOrDNI } from '@/lib/firebase/firestoreService';
import { cn } from '@/lib/utils';

type DisplayablePerson = Pick<Socio, 'id' | 'nombre' | 'apellido' | 'dni' | 'aptoMedico' | 'fotoUrl' | 'fechaNacimiento'> & {
  relacion?: string;
  numeroSocio?: string;
  miembroDesde?: string;
  fotoFile?: FileList | null;
};

export function CarnetDigital() {
  const { loggedInUserNumeroSocio, isLoading: authLoading } = useAuth();
  const [titularData, setTitularData] = useState<Socio | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const fetchSocioData = useCallback(async () => {
    const titularIdFromQuery = searchParams.get('titularId');
    
    if (authLoading && !titularIdFromQuery) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const memberDniFromQuery = searchParams.get('memberDni');
    let targetNumeroSocio = titularIdFromQuery || loggedInUserNumeroSocio;

    if (!targetNumeroSocio) {
      setTitularData(null);
      setSelectedPersonId(null);
      setLoading(false);
      if (!authLoading) {
           toast({ title: "Error", description: "No se pudo identificar al socio para mostrar el carnet.", variant: "destructive" });
      }
      return;
    }

    try {
      const currentTitular = await getSocioByNumeroSocioOrDNI(targetNumeroSocio);
      setTitularData(currentTitular || null);

      if (currentTitular) {
        if (memberDniFromQuery) {
          const personToSelect = currentTitular.dni === memberDniFromQuery ? currentTitular.id :
                                 currentTitular.grupoFamiliar?.find(f => f.dni === memberDniFromQuery)?.id ||
                                 currentTitular.grupoFamiliar?.find(f => f.dni === memberDniFromQuery)?.dni ||
                                 currentTitular.id; 
          setSelectedPersonId(personToSelect);
        } else {
          setSelectedPersonId(currentTitular.id);
        }
      } else {
        setSelectedPersonId(null);
        if (targetNumeroSocio) { 
            toast({ title: "Socio no encontrado", description: `No se encontró información para el socio N° ${targetNumeroSocio}.`, variant: "destructive"});
        }
      }
    } catch (error) {
      console.error("Error fetching socio data for carnet:", error);
      toast({ title: "Error", description: "No se pudo cargar la información del carnet.", variant: "destructive" });
      setTitularData(null);
      setSelectedPersonId(null);
    } finally {
      setLoading(false);
    }
  }, [loggedInUserNumeroSocio, authLoading, searchParams, toast]);

  useEffect(() => {
    fetchSocioData();
    const handleSociosDBUpdate = () => fetchSocioData();
    window.addEventListener('sociosDBUpdated', handleSociosDBUpdate);
    return () => window.removeEventListener('sociosDBUpdated', handleSociosDBUpdate);
  }, [fetchSocioData]);

  const handleDownloadPdf = () => {
    toast({
      title: 'Función no implementada',
      description: 'La descarga de PDF será implementada próximamente.',
    });
  };
  
  const displayablePeopleOptions = titularData
  ? [
      { value: titularData.id, label: `${titularData.nombre} ${titularData.apellido} (Titular)` },
      ...(titularData.grupoFamiliar?.map(fam => ({
        value: fam.id || fam.dni,
        label: `${fam.nombre} ${fam.apellido} (${fam.relacion})`,
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
          fechaNacimiento: titularData.fechaNacimiento,
          fotoUrl: titularData.fotoUrl,
          fotoFile: (titularData as any).fotoPerfil,
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
            fechaNacimiento: titularData.grupoFamiliar.find(fam => (fam.id || fam.dni) === selectedPersonId)!.fechaNacimiento,
            fotoUrl: (titularData.grupoFamiliar.find(fam => (fam.id || fam.dni) === selectedPersonId)!.fotoPerfil instanceof FileList ? undefined : titularData.grupoFamiliar.find(fam => (fam.id || fam.dni) === selectedPersonId)!.fotoPerfil as string | undefined) || `https://placehold.co/150x150.png?text=${titularData.grupoFamiliar.find(fam => (fam.id || fam.dni) === selectedPersonId)!.nombre[0]}${titularData.grupoFamiliar.find(fam => (fam.id || fam.dni) === selectedPersonId)!.apellido[0]}`,
            fotoFile: titularData.grupoFamiliar.find(fam => (fam.id || fam.dni) === selectedPersonId)!.fotoPerfil instanceof FileList ? titularData.grupoFamiliar.find(fam => (fam.id || fam.dni) === selectedPersonId)!.fotoPerfil as FileList : null,
            relacion: titularData.grupoFamiliar.find(fam => (fam.id || fam.dni) === selectedPersonId)!.relacion
          }
        : null) as DisplayablePerson | null
  : null;

  if (loading || (authLoading && !searchParams.get('titularId'))) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-lg">
        <CardHeader className="items-center text-center p-4">
          <Skeleton className="h-8 w-3/4" />
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <Skeleton className="h-32 w-32 rounded-full mx-auto" />
          <Skeleton className="h-6 w-5/6 mx-auto" />
          <Skeleton className="h-4 w-3/4 mx-auto" />
          <Skeleton className="h-4 w-1/2 mx-auto" />
          <div className="grid grid-cols-2 gap-4 pt-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
          <Skeleton className="h-24 w-24 mx-auto" />
        </CardContent>
      </Card>
    );
  }

  if (!titularData || !selectedPersonData) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-xl">
        <CardHeader className="bg-destructive text-destructive-foreground p-4">
          <CardTitle className="text-center text-xl">Error de Datos</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">No se pudo cargar la información del carnet. Verifique el N° de Socio o DNI, o contacte a administración.</p>
        </CardContent>
      </Card>
    );
  }

  const aptoStatus = getAptoMedicoStatus(selectedPersonData.aptoMedico, selectedPersonData.fechaNacimiento);
  let fotoToShow = selectedPersonData.fotoUrl;
  if (selectedPersonData.fotoFile && selectedPersonData.fotoFile.length > 0) {
    const fileUrl = getFileUrl(selectedPersonData.fotoFile);
    if (fileUrl) fotoToShow = fileUrl;
  }
  fotoToShow = fotoToShow || `https://placehold.co/150x150.png?text=${selectedPersonData.nombre[0]}${selectedPersonData.apellido[0]}`;
  
  const qrData = `Socio N°: ${titularData.numeroSocio}\nTitular: ${titularData.nombre} ${titularData.apellido}\nVerificado por: ${siteConfig.name}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}&format=png&bgcolor=ffffff&color=ed771b&qzone=1`; // Updated QR color
  const esTitularSeleccionado = selectedPersonData.id === titularData.id;

  return (
    <Card className={cn(
        "w-full max-w-md mx-auto shadow-2xl rounded-xl overflow-hidden border-0",
        "bg-gradient-to-br from-primary to-secondary text-primary-foreground" // Gradient background
      )}>
      <CardHeader className="p-4 text-center relative">
        <div className="flex items-center justify-between">
            <UserSquare2 className="h-8 w-8 opacity-80" />
            <CardTitle className="text-2xl font-bold">{siteConfig.name}</CardTitle>
            <Image src="/logo-placeholder-white.png" alt={`${siteConfig.name} Logo`} width={40} height={40} data-ai-hint="club logo white" className="rounded-sm opacity-90"/>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        {displayablePeopleOptions.length > 1 && (
            <div className="space-y-1">
                <label htmlFor="select-person" className="text-xs font-medium text-primary-foreground/80 flex items-center">
                    <Users className="mr-1.5 h-3.5 w-3.5"/> Ver carnet de:
                </label>
                <Select value={selectedPersonId || ''} onValueChange={setSelectedPersonId}>
                    <SelectTrigger id="select-person" className="w-full bg-background/20 text-primary-foreground border-primary-foreground/30 text-sm h-9 focus:ring-primary-foreground">
                        <SelectValue placeholder="Seleccionar miembro" />
                    </SelectTrigger>
                    <SelectContent> {/* SelectContent will use default theme, which is fine */}
                        {displayablePeopleOptions.map(option => (
                            <SelectItem key={option.value} value={option.value} className="text-sm">
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        )}

        <div className="text-center space-y-3">
          <Avatar className="h-32 w-32 border-4 border-primary-foreground/50 shadow-lg mx-auto bg-background/30">
            <AvatarImage src={fotoToShow} alt={`${selectedPersonData.nombre} ${selectedPersonData.apellido}`} data-ai-hint="member portrait" />
            <AvatarFallback className="text-4xl bg-background/30 text-primary-foreground/70">
              {selectedPersonData.nombre[0]}{selectedPersonData.apellido[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl font-semibold text-primary-foreground">{selectedPersonData.nombre} {selectedPersonData.apellido}</h2>
            <p className="text-sm text-primary-foreground/80">
              {esTitularSeleccionado ? `Socio N°: ${selectedPersonData.numeroSocio}` : selectedPersonData.relacion}
              {' | DNI: '}{selectedPersonData.dni}
            </p>
            {esTitularSeleccionado && selectedPersonData.miembroDesde && (
                <p className="text-xs text-primary-foreground/70">Miembro desde: {formatDate(selectedPersonData.miembroDesde, 'dd/MM/yy')}</p>
            )}
          </div>
        </div>

        <Separator className="bg-primary-foreground/20" />

        <div className="grid grid-cols-1 gap-4">
          <div className={cn(
              "p-3 rounded-lg border",
              titularData.estadoSocio === 'Activo' 
                ? 'border-green-300 bg-green-400/20 text-green-50' 
                : 'border-red-300 bg-red-400/20 text-red-50'
            )}>
            <h3 className="text-xs font-medium text-primary-foreground/70 mb-1">Estado Socio Titular</h3>
            <div className="flex items-center space-x-2">
              {titularData.estadoSocio === 'Activo' ? 
                <ShieldCheck className="h-5 w-5 text-green-200" /> : 
                <ShieldAlert className="h-5 w-5 text-red-200" />}
              <Badge variant={titularData.estadoSocio === 'Activo' ? 'default' : 'destructive'} 
                     className={cn(
                        "text-xs",
                        titularData.estadoSocio === 'Activo' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                      )}>
                {titularData.estadoSocio}
              </Badge>
            </div>
          </div>

          <div className={cn(
              "p-3 rounded-lg border",
              aptoStatus.colorClass.includes('green') ? 'border-green-300 bg-green-400/20 text-green-50' :
              aptoStatus.colorClass.includes('orange') ? 'border-orange-300 bg-orange-400/20 text-orange-50' :
              aptoStatus.colorClass.includes('gray') ? 'border-gray-300 bg-gray-400/20 text-gray-50' :
              'border-red-300 bg-red-400/20 text-red-50'
            )}>
            <h3 className="text-xs font-medium text-primary-foreground/70 mb-1">Apto Médico ({selectedPersonData.relacion || 'Titular'})</h3>
            <div className="flex items-center space-x-2">
              {aptoStatus.status === 'Válido' && <CheckCircle2 className="h-5 w-5 text-green-200" />}
              {aptoStatus.status === 'Vencido' && <XCircle className="h-5 w-5 text-red-200" />}
              {(aptoStatus.status === 'Inválido') && <AlertTriangle className="h-5 w-5 text-red-200" />}
              {aptoStatus.status === 'Pendiente' && <CalendarClock className="h-5 w-5 text-yellow-200" />}
              {aptoStatus.status === 'No Aplica' && <Info className="h-5 w-5 text-gray-200" />}
               <Badge variant="outline" 
                    className={cn(
                        "text-xs border-current",
                        aptoStatus.colorClass.includes('green') && "text-green-100 border-green-200",
                        aptoStatus.colorClass.includes('orange') && "text-orange-100 border-orange-200",
                        aptoStatus.colorClass.includes('red') && "text-red-100 border-red-200",
                        aptoStatus.colorClass.includes('yellow') && "text-yellow-100 border-yellow-200",
                        aptoStatus.colorClass.includes('gray') && "text-gray-100 border-gray-200",
                      )}>
                {aptoStatus.status}
              </Badge>
            </div>
            <p className="text-xs mt-1 text-primary-foreground/90">{aptoStatus.message}</p>
          </div>
        </div>
        
        <Separator className="bg-primary-foreground/20" />

        <div className="flex flex-col items-center space-y-2 pt-2">
          <Image src={qrCodeUrl} alt={`QR Code para ${titularData.numeroSocio}`} width={150} height={150} className="rounded-lg shadow-md border-4 border-white bg-white p-1" data-ai-hint="access qr code" />
          <p className="text-xs text-primary-foreground/70 text-center px-4">Presentar este código para ingreso y gestiones. Válido para todo el grupo familiar.</p>
        </div>
        
      </CardContent>
      <CardFooter className="p-4 bg-black/10 border-t border-primary-foreground/20">
        <Button onClick={handleDownloadPdf} className="w-full" variant="outline" size="sm"
                className="bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/20">
          <Download className="mr-2 h-4 w-4" />
          Descargar PDF (Próximamente)
        </Button>
      </CardFooter>
    </Card>
  );
}
