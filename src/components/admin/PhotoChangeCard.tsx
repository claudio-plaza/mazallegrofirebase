'use client';

import { useState } from 'react';

import { SolicitudCambioFoto } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, X, FileImage, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PhotoChangeCardProps {
  solicitud: SolicitudCambioFoto;
  onApprove: (solicitud: SolicitudCambioFoto) => void;
  onReject: (solicitud: SolicitudCambioFoto) => void;
  isProcessing?: boolean;
}

import { ExternalLink, FileText as FileTextIcon, ImageOff } from 'lucide-react';
// ... imports

// Helper component for displaying an image in a modal
function ImageModal({ src, alt, label }: { src: string; alt: string; label: string }) {
  const [hasError, setHasError] = useState(false);
  // Simple check for PDF based on URL (not perfect but helpful)
  const isPdf = src.toLowerCase().includes('.pdf') || src.toLowerCase().includes('application/pdf');

  if (hasError || isPdf) {
      return (
        <div className="group relative border rounded-md overflow-hidden bg-muted/20 flex flex-col items-center justify-center p-4 h-full aspect-[4/3]">
             {isPdf ? <FileTextIcon className="h-10 w-10 text-muted-foreground mb-2" /> : <ImageOff className="h-10 w-10 text-muted-foreground mb-2" />}
             <p className="text-xs text-muted-foreground text-center mb-2">{isPdf ? 'Documento PDF' : 'Error al cargar imagen'}</p>
             <a 
                href={src} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-xs flex items-center gap-1 text-primary hover:underline bg-white/80 px-2 py-1 rounded border shadow-sm"
             >
                <ExternalLink className="h-3 w-3" />
                {isPdf ? 'Abrir PDF' : 'Abrir Enlace'}
             </a>
             <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs py-1 px-2 text-center truncate">
                {label}
            </div>
        </div>
      );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="group relative cursor-pointer border rounded-md overflow-hidden bg-muted/20 hover:ring-2 hover:ring-primary/50 transition-all h-full">
          <div className="aspect-[4/3] relative w-full">
            <Image
              src={src}
              alt={alt}
              fill
              className="object-contain p-2"
              onError={() => setHasError(true)}
              unoptimized
            />
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs py-1 px-2 text-center truncate">
            {label}
          </div>
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center pointer-events-none">
             <span className="opacity-0 group-hover:opacity-100 bg-white/90 text-black text-xs px-2 py-1 rounded shadow-sm">Ver Ampliado</span>
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col items-center justify-center bg-transparent border-0 shadow-none p-0">
          <div className="relative w-full h-full max-h-[85vh] bg-white rounded-lg p-2 overflow-hidden flex flex-col items-center justify-center gap-2">
             <Image 
                src={src} 
                alt={alt} 
                width={1000} 
                height={800} 
                className="max-w-full max-h-[75vh] object-contain" 
                unoptimized
             />
             <a href={src} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline mt-2">
                <ExternalLink className="h-4 w-4" />
                Abrir imagen en nueva pestaña
             </a>
          </div>
      </DialogContent>
    </Dialog>
  );
}

export function PhotoChangeCard({ solicitud, onApprove, onReject, isProcessing }: PhotoChangeCardProps) {

  const getStatusBadgeClass = () => {
    switch (solicitud.estado) {
      case 'Aprobada': return 'bg-green-500';
      case 'Rechazada': return 'bg-red-500';
      default: return 'hidden';
    }
  };

  const getTipoFotoLabel = (tipo: string) => {
      const map: {[key: string]: string} = {
          'fotoPerfil': 'FOTO PERFIL',
          'fotoDniFrente': 'DNI FRENTE',
          'fotoDniDorso': 'DNI DORSO',
          'fotoCarnet': 'CARNET',
      };
      return map[tipo] || tipo.toUpperCase();
  };

  const isDecisionMade = solicitud.estado === 'Aprobada' || solicitud.estado === 'Rechazada';

  return (
    <Card className={cn(
      "overflow-hidden flex flex-col relative h-full",
      solicitud.estado === 'Aprobada' && "border-green-500 bg-green-50",
      solicitud.estado === 'Rechazada' && "border-red-500 bg-red-50"
    )}>
      <Badge className={cn("absolute top-2 right-2 z-10", getStatusBadgeClass())}>{solicitud.estado.toUpperCase()}</Badge>
      
      <CardHeader className="p-4 bg-muted/50 pb-2">
        <div className="flex items-start justify-between gap-2">
            <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                   <User className="h-4 w-4 text-muted-foreground" />
                   {solicitud.socioNombre}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                    Socio N° {solicitud.socioNumero} • {solicitud.tipoPersona}
                </p>
            </div>
            <Badge variant="outline" className="shrink-0 bg-blue-50 text-blue-700 border-blue-200">
                {getTipoFotoLabel(solicitud.tipoFoto)}
            </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 space-y-4 flex-1">
        
        <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground ml-1">ACTUAL</p>
                {solicitud.fotoActualUrl ? (
                    <ImageModal src={solicitud.fotoActualUrl} alt="Foto Actual" label="Actual" />
                ) : (
                    <div className="aspect-[4/3] flex items-center justify-center bg-muted/30 border border-dashed rounded-md text-muted-foreground text-xs text-center p-2 h-full">
                        Sin foto previa
                    </div>
                )}
            </div>
            <div className="space-y-1">
                <p className="text-xs font-semibold text-blue-600 ml-1">NUEVA (Solicitada)</p>
                 {solicitud.fotoNuevaUrl ? (
                    <ImageModal src={solicitud.fotoNuevaUrl} alt="Foto Nueva" label="Nueva" />
                ) : (
                    <div className="aspect-[4/3] flex items-center justify-center bg-red-50 border border-red-200 text-red-500 text-xs text-center p-2 rounded-md h-full">
                        Error: Sin imagen
                    </div>
                )}
            </div>
        </div>

        <div className="text-xs text-muted-foreground pt-2 border-t flex flex-col gap-1">
            <p className="flex items-center gap-1">
                <FileImage className="h-3 w-3" />
                Solicitado: {format(new Date(solicitud.fechaSolicitud), "Pp", { locale: es })}
            </p>
            {solicitud.motivoRechazo && (
                 <p className="text-red-600 font-medium bg-red-50 p-2 rounded border border-red-100 mt-1">
                    Motivo Rechazo: {solicitud.motivoRechazo}
                </p>
            )}
        </div>

      </CardContent>
      
      <div className="p-3 bg-muted/20 border-t flex gap-2">
            <Button 
                variant="outline" 
                size="sm"
                className="flex-1 border-green-500 text-green-700 hover:bg-green-50 hover:text-green-800"
                onClick={() => onApprove(solicitud)}
                disabled={isDecisionMade || isProcessing}
            >
                <Check className="w-4 h-4 mr-1.5" />
                Aprobar
            </Button>
            <Button 
                variant="outline"
                size="sm"
                className="flex-1 border-red-500 text-red-700 hover:bg-red-50 hover:text-red-800"
                onClick={() => onReject(solicitud)}
                disabled={isDecisionMade || isProcessing}
            >
                <X className="w-4 h-4 mr-1.5" />
                Rechazar
            </Button>
      </div>
    </Card>
  );
}
