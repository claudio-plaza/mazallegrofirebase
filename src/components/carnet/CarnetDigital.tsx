
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { Socio, MiembroFamiliar, AptoMedicoInfo } from '@/types';
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

type DisplayablePerson = Pick<Socio, 'id' | 'nombre' | 'apellido' | 'dni' | 'aptoMedico' | 'fotoUrl'> & {
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

  const fetchSocioData = useCallback(() => {
    if (authLoading) return;
    setLoading(true);
    const storedSocios = localStorage.getItem('sociosDB');
    let currentTitular: Socio | undefined = undefined;

    if (storedSocios) {
      const socios: Socio[] = JSON.parse(storedSocios);
      currentTitular = socios.find(s => s.numeroSocio === loggedInUserNumeroSocio);
    }
    
    setTitularData(currentTitular || null);
    if (currentTitular) {
      setSelectedPersonId(currentTitular.id); 
    } else {
      setSelectedPersonId(null);
    }
    setLoading(false);
  }, [loggedInUserNumeroSocio, authLoading]);

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
          fotoUrl: titularData.fotoUrl,
          fotoFile: (titularData as any).fotoPerfil, // Assuming titular might have fotoPerfil FileList from signup
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
            fotoUrl: (titularData.grupoFamiliar.find(fam => (fam.id || fam.dni) === selectedPersonId)!.fotoPerfil instanceof FileList ? undefined : titularData.grupoFamiliar.find(fam => (fam.id || fam.dni) === selectedPersonId)!.fotoPerfil as string | undefined) || `https://placehold.co/150x150.png?text=${titularData.grupoFamiliar.find(fam => (fam.id || fam.dni) === selectedPersonId)!.nombre[0]}${titularData.grupoFamiliar.find(fam => (fam.id || fam.dni) === selectedPersonId)!.apellido[0]}`,
            fotoFile: titularData.grupoFamiliar.find(fam => (fam.id || fam.dni) === selectedPersonId)!.fotoPerfil instanceof FileList ? titularData.grupoFamiliar.find(fam => (fam.id || fam.dni) === selectedPersonId)!.fotoPerfil as FileList : null,
            relacion: titularData.grupoFamiliar.find(fam => (fam.id || fam.dni) === selectedPersonId)!.relacion
          }
        : null) as DisplayablePerson | null
  : null;

  if (loading || authLoading) {
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
          <p className="text-center text-muted-foreground">No se pudo cargar la información del carnet seleccionado. Por favor, contacte a administración.</p>
        </CardContent>
      </Card>
    );
  }

  const aptoStatus = getAptoMedicoStatus(selectedPersonData.aptoMedico);
  let fotoToShow = selectedPersonData.fotoUrl;
  if (selectedPersonData.fotoFile && selectedPersonData.fotoFile.length > 0) {
    const fileUrl = getFileUrl(selectedPersonData.fotoFile);
    if (fileUrl) fotoToShow = fileUrl;
  }
  fotoToShow = fotoToShow || `https://placehold.co/150x150.png?text=${selectedPersonData.nombre[0]}${selectedPersonData.apellido[0]}`;
  
  const qrData = `Socio N°: ${titularData.numeroSocio}\nTitular: ${titularData.nombre} ${titularData.apellido}\nVerificado por: ${siteConfig.name}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}&format=png&bgcolor=ffffff&color=0E4291&qzone=1`;
  const esTitularSeleccionado = selectedPersonData.id === titularData.id;

  return (
    <Card className="w-full max-w-md mx-auto shadow-2xl rounded-xl overflow-hidden border-2 border-primary/50 bg-card">
      <CardHeader className="bg-primary text-primary-foreground p-4 text-center relative">
        <div className="flex items-center justify-between">
            <UserSquare2 className="h-8 w-8 opacity-80" />
            <CardTitle className="text-2xl font-bold">{siteConfig.name}</CardTitle>
            <Image src="/logo-placeholder-white.png" alt={`${siteConfig.name} Logo`} width={40} height={40} data-ai-hint="club logo white" className="rounded-sm opacity-90"/>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        {displayablePeopleOptions.length > 1 && (
            <div className="space-y-1">
                <label htmlFor="select-person" className="text-xs font-medium text-muted-foreground flex items-center">
                    <Users className="mr-1.5 h-3.5 w-3.5"/> Ver carnet de:
                </label>
                <Select value={selectedPersonId || ''} onValueChange={setSelectedPersonId}>
                    <SelectTrigger id="select-person" className="w-full bg-background text-sm h-9">
                        <SelectValue placeholder="Seleccionar miembro" />
                    </SelectTrigger>
                    <SelectContent>
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
          <Avatar className="h-32 w-32 border-4 border-secondary shadow-lg mx-auto bg-muted">
            <AvatarImage src={fotoToShow} alt={`${selectedPersonData.nombre} ${selectedPersonData.apellido}`} data-ai-hint="member portrait" />
            <AvatarFallback className="text-4xl bg-muted text-muted-foreground">
              {selectedPersonData.nombre[0]}{selectedPersonData.apellido[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl font-semibold text-primary">{selectedPersonData.nombre} {selectedPersonData.apellido}</h2>
            <p className="text-sm text-muted-foreground">
              {esTitularSeleccionado ? `Socio N°: ${selectedPersonData.numeroSocio}` : selectedPersonData.relacion}
              {' | DNI: '}{selectedPersonData.dni}
            </p>
            {esTitularSeleccionado && selectedPersonData.miembroDesde && (
                <p className="text-xs text-muted-foreground">Miembro desde: {formatDate(selectedPersonData.miembroDesde, 'dd/MM/yy')}</p>
            )}
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-1 gap-4">
          <div className={`p-3 rounded-lg border ${titularData.estadoSocio === 'Activo' ? 'border-green-600 bg-green-500/10' : 'border-red-600 bg-red-500/10'}`}>
            <h3 className="text-xs font-medium text-muted-foreground mb-1">Estado Socio Titular</h3>
            <div className="flex items-center space-x-2">
              {titularData.estadoSocio === 'Activo' ? 
                <ShieldCheck className="h-5 w-5 text-green-500" /> : 
                <ShieldAlert className="h-5 w-5 text-red-500" />}
              <Badge variant={titularData.estadoSocio === 'Activo' ? 'default' : 'destructive'} className={`text-xs ${titularData.estadoSocio === 'Activo' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                {titularData.estadoSocio}
              </Badge>
            </div>
          </div>

          <div className={`p-3 rounded-lg border ${aptoStatus.colorClass.includes('green') ? 'border-green-600 bg-green-500/10' : aptoStatus.colorClass.includes('orange') ? 'border-orange-600 bg-orange-500/10' : 'border-red-600 bg-red-500/10'}`}>
            <h3 className="text-xs font-medium text-muted-foreground mb-1">Apto Médico ({selectedPersonData.relacion || 'Titular'})</h3>
            <div className="flex items-center space-x-2">
              {aptoStatus.status === 'Válido' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
              {aptoStatus.status === 'Vencido' && <XCircle className="h-5 w-5 text-red-500" />}
              {(aptoStatus.status === 'Inválido') && <AlertTriangle className="h-5 w-5 text-red-500" />}
              {aptoStatus.status === 'Pendiente' && <Info className="h-5 w-5 text-yellow-500" />}
               <Badge variant="outline" className={`text-xs ${aptoStatus.colorClass.replace('bg-', 'border-').replace('-100', '-500')} ${aptoStatus.colorClass.replace('bg-', 'text-').replace('-100', '-700')}`}>
                {aptoStatus.status}
              </Badge>
            </div>
            <p className={`text-xs mt-1 ${aptoStatus.colorClass.replace('bg-', 'text-').replace('-100', '-600')}`}>{aptoStatus.message}</p>
          </div>
        </div>
        
        <Separator />

        <div className="flex flex-col items-center space-y-2 pt-2">
          <Image src={qrCodeUrl} alt={`QR Code para ${titularData.numeroSocio}`} width={150} height={150} className="rounded-lg shadow-md border-4 border-background bg-white p-1" data-ai-hint="access qr code" />
          <p className="text-xs text-muted-foreground text-center px-4">Presentar este código para ingreso y gestiones. Válido para todo el grupo familiar.</p>
        </div>
        
      </CardContent>
      <CardFooter className="p-4 bg-muted/30 border-t border-border">
        <Button onClick={handleDownloadPdf} className="w-full" variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Descargar PDF (Próximamente)
        </Button>
      </CardFooter>
    </Card>
  );
}

