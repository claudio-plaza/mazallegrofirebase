'use client';

import type { MiembroFamiliar } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils'; // Importar cn

interface FamiliarChangeCardProps {
  familiar: MiembroFamiliar;
  originalFamiliar?: MiembroFamiliar;
  changeType: 'NUEVO' | 'MODIFICADO' | 'ELIMINADO';
  onApproveFamiliar: (familiarId: string) => void;
  onRejectFamiliar: (familiarId: string) => void;
  isProcessing?: boolean;
}

// Helper component for displaying an image in a modal
function ImageModal({ src, alt }: { src: string; alt: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Image
          src={src}
          alt={alt}
          width={200}
          height={120}
          className="rounded-md border object-contain cursor-pointer hover:opacity-80 transition-opacity"
        />
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <Image src={src} alt={alt} width={800} height={600} className="w-full h-auto object-contain" />
      </DialogContent>
    </Dialog>
  );
}

// Helper component to display all data
function FullDataDialog({ familiar }: { familiar: MiembroFamiliar }) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="secondary" size="sm" className="w-full mt-2">
                    <FileText className="mr-2 h-4 w-4" />
                    Ver Datos Completos
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Datos Completos del Formulario</DialogTitle>
                </DialogHeader>
                <div className="text-sm max-h-[60vh] overflow-y-auto">
                    <ul className="space-y-1">
                        {Object.entries(familiar).map(([key, value]) => (
                            <li key={key} className="grid grid-cols-2 gap-2 border-b pb-1">
                                <strong className="capitalize font-medium">{key.replace(/([A-Z])/g, ' $1')}:</strong>
                                <span>{value ? String(value) : <span className="text-muted-foreground">N/A</span>}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export function FamiliarChangeCard({ familiar, originalFamiliar, changeType, onApproveFamiliar, onRejectFamiliar, isProcessing }: FamiliarChangeCardProps) {
  
  const detectSpecificChange = () => {
    if (changeType !== 'MODIFICADO' || !originalFamiliar) return changeType;

    const dataChanged = 
      familiar.nombre !== originalFamiliar.nombre ||
      familiar.apellido !== originalFamiliar.apellido ||
      familiar.dni !== originalFamiliar.dni ||
      familiar.fechaNacimiento !== originalFamiliar.fechaNacimiento ||
      familiar.relacion !== originalFamiliar.relacion;

    const photosChanged = 
      familiar.fotoPerfil !== originalFamiliar.fotoPerfil ||
      familiar.fotoDniFrente !== originalFamiliar.fotoDniFrente ||
      familiar.fotoDniDorso !== originalFamiliar.fotoDniDorso ||
      familiar.fotoCarnet !== originalFamiliar.fotoCarnet;

    if (dataChanged && photosChanged) return 'DATOS Y FOTOS';
    if (photosChanged) return 'NUEVA FOTO';
    if (dataChanged) return 'DATOS MODIFICADOS';
    
    return 'MODIFICADO';
  };

  const displayChangeType = detectSpecificChange();

  const getChangeBadgeClass = () => {
    switch (displayChangeType) {
      case 'NUEVO':
        return 'bg-green-100 text-green-800';
      case 'MODIFICADO':
      case 'DATOS MODIFICADOS':
      case 'DATOS Y FOTOS':
        return 'bg-orange-100 text-orange-800';
      case 'ELIMINADO':
        return 'bg-red-100 text-red-800';
      case 'NUEVA FOTO':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeClass = () => {
    switch (familiar.estadoAprobacion) {
      case 'aprobado':
        return 'bg-green-500';
      case 'rechazado':
        return 'bg-red-500';
      default:
        return 'hidden';
    }
  };

  const getStatusBadgeText = () => {
    switch (familiar.estadoAprobacion) {
      case 'aprobado':
        return 'APROBADO';
      case 'rechazado':
        return 'RECHAZADO';
      default:
        return '';
    }
  };

  const isDecisionMade = familiar.estadoAprobacion === 'aprobado' || familiar.estadoAprobacion === 'rechazado';

  return (
    <Card className={cn(
      "overflow-hidden flex flex-col relative",
      familiar.estadoAprobacion === 'aprobado' && "border-green-500 bg-green-50",
      familiar.estadoAprobacion === 'rechazado' && "border-red-500 bg-red-50"
    )}>
      <Badge className={cn("absolute top-2 right-2", getStatusBadgeClass())}>{getStatusBadgeText()}</Badge>
      <CardHeader className="p-4 bg-muted/50">
        <div className="flex items-center justify-between">
            <CardTitle className="text-base">{familiar.nombre} {familiar.apellido}</CardTitle>
            <Badge className={getChangeBadgeClass()}>{displayChangeType}</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4 flex-1">
        <div className="flex items-start space-x-4">
            <Dialog>
                <DialogTrigger asChild>
                    <Avatar className="h-20 w-20 border cursor-pointer hover:opacity-80 transition-opacity">
                        <AvatarImage src={familiar.fotoPerfil || undefined} alt={`Foto de ${familiar.nombre}`} />
                        <AvatarFallback>{familiar.nombre?.[0]}{familiar.apellido?.[0]}</AvatarFallback>
                    </Avatar>
                </DialogTrigger>
                <DialogContent>
                    <Image src={familiar.fotoPerfil || ''} alt={`Foto de ${familiar.nombre}`} width={600} height={600} className="w-full h-auto object-contain" />
                </DialogContent>
            </Dialog>
            <div className="text-sm space-y-1">
                <p><strong>DNI:</strong> {familiar.dni}</p>
                <p><strong>Relación:</strong> {familiar.relacion}</p>
                <p><strong>Nacimiento:</strong> {familiar.fechaNacimiento ? new Date(familiar.fechaNacimiento as any).toLocaleDateString() : 'N/A'}</p>
            </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="space-y-2">
                <h4 className="text-sm font-semibold">DNI Frente</h4>
                {familiar.fotoDniFrente ? (
                    <ImageModal src={familiar.fotoDniFrente} alt="DNI Frente" />
                ) : <p className="text-xs text-muted-foreground">No subido</p>}
            </div>
            <div className="space-y-2">
                <h4 className="text-sm font-semibold">DNI Dorso</h4>
                {familiar.fotoDniDorso ? (
                    <ImageModal src={familiar.fotoDniDorso} alt="DNI Dorso" />
                ) : <p className="text-xs text-muted-foreground">No subido</p>}
            </div>
        </div>

        {familiar.estadoAprobacion === 'rechazado' && familiar.motivoRechazo && (
            <p className="text-sm text-red-600 mt-2">
                <strong>Motivo:</strong> {familiar.motivoRechazo}
            </p>
        )}
      </CardContent>
      <div className="p-4 pt-0">
        <FullDataDialog familiar={familiar} />
        <div className="flex gap-2 mt-4">
            <Button 
                variant="outline" 
                className="flex-1 border-green-500 text-green-600 hover:bg-green-50"
                onClick={() => familiar.id && onApproveFamiliar(familiar.id)}
                disabled={isDecisionMade || isProcessing}
            >
                <Check className="w-4 h-4 mr-2" />
                Aprobar
            </Button>
            <Button 
                variant="outline"
                className="flex-1 border-red-500 text-red-600 hover:bg-red-50"
                onClick={() => familiar.id && onRejectFamiliar(familiar.id)}
                disabled={isDecisionMade || isProcessing}
            >
                <X className="w-4 h-4 mr-2" />
                Rechazar
            </Button>
        </div>
      </div>
    </Card>
  );
}