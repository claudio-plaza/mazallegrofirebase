'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { Socio, MiembroFamiliar, AptoMedicoInfo, Adherente } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Download, UserCircle, ShieldCheck, ShieldAlert, CalendarClock, AlertTriangle, CheckCircle2, XCircle, Users, QrCode, UserSquare2, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDate, getAptoMedicoStatus, normalizeText } from '@/lib/helpers';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { siteConfig } from '@/config/site';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from '@/components/ui/separator';
import { useSearchParams, useRouter } from 'next/navigation';
import { getSocio, getSocioByNumeroSocioOrDNI, getAdherentesByTitularId } from '@/lib/firebase/firestoreService';
import { cn } from '@/lib/utils';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';

type DisplayablePerson = {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  aptoMedico?: AptoMedicoInfo;
  fotoFinalUrl: string;
  fechaNacimiento: Date;
  relacion?: string;
  numeroSocio?: string;
  miembroDesde?: Date;
};

export function CarnetDigital() {
  const { socio: authSocio, isLoading: authLoading } = useAuth();
  const [titularData, setTitularData] = useState<Socio | null>(null);
  const [adherentes, setAdherentes] = useState<Adherente[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const cardRef = useRef<HTMLDivElement>(null);

  const fetchSocioData = useCallback(async () => {
    const titularIdFromQuery = searchParams.get('titularId');
    const memberDniFromQuery = searchParams.get('memberDni');
    
    setLoading(true);

    try {
      let currentTitular: Socio | null = null;

      if (titularIdFromQuery) {
        currentTitular = await getSocioByNumeroSocioOrDNI(titularIdFromQuery);
      } else if (!authLoading && authSocio) {
        // Siempre obtener datos frescos para evitar data desactualizada del contexto
        currentTitular = await getSocio(authSocio.id);
      }

      if (currentTitular) {
        setTitularData(currentTitular);
        const adherentesData = await getAdherentesByTitularId(currentTitular.id);
        setAdherentes(adherentesData);

        let personToSelect = currentTitular.id;
        if (memberDniFromQuery) {
          const foundMember = 
            currentTitular.dni === memberDniFromQuery ? currentTitular : 
            currentTitular.familiares?.find(f => f.dni === memberDniFromQuery) || 
            adherentesData.find(a => a.dni === memberDniFromQuery);
          personToSelect = foundMember?.id || foundMember?.dni || currentTitular.id;
        }
        setSelectedPersonId(personToSelect);

      } else if (!authLoading) {
        toast({ title: "Error", description: "No se pudo identificar al socio para mostrar el carnet.", variant: "destructive" });
      }

    } catch (error) {
      console.error("Error fetching data for carnet:", error);
      toast({ title: "Error", description: "No se pudo cargar la información del carnet.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [searchParams, toast, authLoading, authSocio]);

  useEffect(() => {
    fetchSocioData();
  }, [fetchSocioData]);

  const displayablePeopleOptions = useMemo(() => {
    if (!titularData) return [];
    return [
      { value: titularData.id, label: `${titularData.nombre} ${titularData.apellido} (Titular)` },
      ...(titularData.familiares?.map(fam => ({
        value: fam.id || fam.dni,
        label: `${fam.nombre} ${fam.apellido} (${fam.relacion})`,
      })) || []),
      ...(adherentes.map(adh => ({
        value: adh.id || adh.dni,
        label: `${adh.nombre} ${adh.apellido} (Adherente)`,
      })) || [])
    ];
  }, [titularData, adherentes]);

  const selectedPersonData: DisplayablePerson | null = useMemo(() => {
    if (!titularData || !selectedPersonId) return null;

    if (selectedPersonId === titularData.id) {
      const titular = titularData as any; // Use 'any' to check multiple fields
      return {
        ...titular,
        fotoFinalUrl: titular.fotoPerfilUrl || titular.fotoUrl || titular.fotoPerfil || '',
        relacion: 'Titular'
      };
    }

    const familiar = titularData.familiares?.find(fam => (fam.id || fam.dni) === selectedPersonId);
    if (familiar) {
      const fam = familiar as any;
      return {
        ...fam,
        fotoFinalUrl: (fam.fotoPerfilUrl || fam.fotoPerfil || '') as string,
      };
    }

    const adherente = adherentes.find(adh => (adh.id || adh.dni) === selectedPersonId);
    if (adherente) {
      const adh = adherente as any;
      return {
        ...adh,
        fotoFinalUrl: (adh.fotoPerfilUrl || adh.fotoPerfil || '') as string,
        relacion: 'Adherente'
      };
    }
    
    return null;
  }, [titularData, selectedPersonId, adherentes]);

  useEffect(() => {
    if (selectedPersonData && titularData) {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const qrData = `${baseUrl}/carnet?titularId=${titularData.numeroSocio}&memberDni=${selectedPersonData.dni}`;
      QRCode.toDataURL(qrData, { width: 150, margin: 1, color: { dark: '#000000', light: '#FFFFFF' } })
        .then(url => setQrCodeUrl(url))
        .catch(err => console.error('Failed to generate QR code', err));
    }
  }, [selectedPersonData, titularData]);

  const handleDownloadImage = () => {
    if (cardRef.current) {
      html2canvas(cardRef.current, { scale: 2, backgroundColor: null, useCORS: true }).then(canvas => {
        const image = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = image;
        link.download = `carnet-${normalizeText(selectedPersonData?.apellido)}.png`;
        link.click();
      });
    }
  };

  if (loading || (authLoading && !searchParams.get('titularId'))) {
    return <p>Cargando carnet...</p>;
  }

  if (!titularData || !selectedPersonData) {
    return <p>Error al cargar datos del carnet.</p>;
  }

  const aptoStatus = getAptoMedicoStatus(selectedPersonData.aptoMedico, selectedPersonData.fechaNacimiento);
  const esTitularSeleccionado = selectedPersonData.id === titularData.id;

  console.log('🖼️ Datos del socio para carnet:', authSocio);
  console.log('📸 URL de foto perfil:', authSocio?.fotoPerfil);
  console.log('📸 URL de foto (fotoUrl):', authSocio?.fotoUrl);
  console.log('👤 Datos de la persona seleccionada para el carnet:', selectedPersonData);

  return (
    <>
      {displayablePeopleOptions.length > 1 && (
        <Card className="w-full max-w-md mx-auto mb-6">
          <CardContent className="p-4">
            <label htmlFor="select-person" className="text-sm font-medium text-muted-foreground flex items-center mb-2">
              <Users className="mr-1.5 h-4 w-4"/> Ver carnet de:
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
          </CardContent>
        </Card>
      )}

      <Card ref={cardRef} className={cn(
          "w-full max-w-md mx-auto shadow-2xl rounded-xl overflow-hidden border-0",
          "bg-gradient-to-br from-[#EE7717] to-[#0F3C8F] text-primary-foreground"
        )}>
        <CardHeader className="p-4 text-center relative">
          <div className="flex items-center justify-between">
              <UserSquare2 className="h-8 w-8 opacity-80" />
              <CardTitle className="text-2xl font-bold">{siteConfig.name}</CardTitle>
              <Image src="/logo.png" alt="Club Logo" width={40} height={40} className="rounded-sm opacity-90"/>
          </div>
        </CardHeader>
        
        <CardContent className="p-6 space-y-6">
          <div className="text-center space-y-3">
            <Dialog>
              <DialogTrigger asChild>
                <Avatar className="h-32 w-32 border-4 border-primary-foreground/50 shadow-lg mx-auto bg-background/30 cursor-pointer">
                  <AvatarImage src={selectedPersonData.fotoFinalUrl} alt={`${selectedPersonData.nombre} ${selectedPersonData.apellido}`} />
                  <AvatarFallback className="text-4xl bg-background/30 text-primary-foreground/70">
                    {selectedPersonData.nombre[0]}{selectedPersonData.apellido[0]}
                  </AvatarFallback>
                </Avatar>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <Image
                  src={selectedPersonData.fotoFinalUrl}
                  alt={`Foto de perfil de ${selectedPersonData.nombre}`}
                  width={500}
                  height={500}
                  className="rounded-md object-contain"
                />
              </DialogContent>
            </Dialog>
            <div>
              <h2 className="text-2xl font-semibold text-primary-foreground">{selectedPersonData.nombre} {selectedPersonData.apellido}</h2>
              <p className="text-sm text-primary-foreground/80">
                {esTitularSeleccionado ? `Socio N°: ${selectedPersonData.numeroSocio}` : selectedPersonData.relacion}
                {' | DNI: '}{selectedPersonData.dni}
              </p>
            </div>
          </div>

          <Separator className="bg-primary-foreground/20" />

          <div className="grid grid-cols-2 gap-4">
            <div className={cn("p-3 rounded-lg border", titularData.estadoSocio === 'Activo' ? 'border-green-300 bg-green-400/20 text-green-50' : 'border-red-300 bg-red-400/20 text-red-50')}>
              <h3 className="text-xs font-medium text-primary-foreground/70 mb-1">Estado Socio Titular</h3>
              <div className="flex items-center space-x-2">
                {titularData.estadoSocio === 'Activo' ? <ShieldCheck className="h-5 w-5 text-green-200" /> : <ShieldAlert className="h-5 w-5 text-red-200" />}
                <Badge variant={titularData.estadoSocio === 'Activo' ? 'default' : 'destructive'} className={cn("text-xs", titularData.estadoSocio === 'Activo' ? 'bg-green-500 text-white' : 'bg-red-500 text-white')}>{titularData.estadoSocio}</Badge>
              </div>
            </div>
            <div className={cn("p-3 rounded-lg border", aptoStatus.colorClass.includes('green') ? 'border-green-300 bg-green-400/20 text-green-50' : aptoStatus.colorClass.includes('orange') ? 'border-orange-300 bg-orange-400/20 text-orange-50' : aptoStatus.colorClass.includes('gray') ? 'border-gray-300 bg-gray-400/20 text-gray-50' : 'border-red-300 bg-red-400/20 text-red-50')}>
              <h3 className="text-xs font-medium text-primary-foreground/70 mb-1">Apto Médico ({selectedPersonData.relacion || 'Titular'})</h3>
              <div className="flex items-center space-x-2">
                {aptoStatus.status === 'Válido' && <CheckCircle2 className="h-5 w-5 text-green-200" />}
                {aptoStatus.status === 'Vencido' && <XCircle className="h-5 w-5 text-red-200" />}
                {aptoStatus.status === 'Inválido' && <AlertTriangle className="h-5 w-5 text-red-200" />}
                {aptoStatus.status === 'Pendiente' && <CalendarClock className="h-5 w-5 text-yellow-200" />}
                {aptoStatus.status === 'No Aplica' && <Info className="h-5 w-5 text-gray-200" />}
                <Badge variant="outline" className={cn("text-xs border-current", aptoStatus.colorClass.includes('green') && "text-green-100 border-green-200", aptoStatus.colorClass.includes('orange') && "text-orange-100 border-orange-200", aptoStatus.colorClass.includes('red') && "text-red-100 border-red-200", aptoStatus.colorClass.includes('yellow') && "text-yellow-100 border-yellow-200", aptoStatus.colorClass.includes('gray') && "text-gray-100 border-gray-200")}>{aptoStatus.status}</Badge>
              </div>
            </div>
          </div>
          
          <Separator className="bg-primary-foreground/20" />

          <div className="flex flex-col items-center space-y-2 pt-2">
            {qrCodeUrl ? <Image src={qrCodeUrl} alt={`QR Code`} width={150} height={150} className="rounded-lg shadow-md border-4 border-white bg-white p-1" /> : <Skeleton className="h-[150px] w-[150px]"/>}
            <p className="text-xs text-primary-foreground/70 text-center px-4">Presentar este código para ingreso y gestiones.</p>
          </div>
        </CardContent>
        <div className="p-4 bg-black/10 border-t border-primary-foreground/20 flex flex-col gap-2">
          <Button onClick={handleDownloadImage} variant="outline" size="sm" className="w-full bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/20">
            <Download className="mr-2 h-4 w-4" />
            Descargar Tarjeta (Imagen)
          </Button>
        </div>
      </Card>
    </>
  );
}
