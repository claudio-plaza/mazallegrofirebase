'use client';

import type { MiembroFamiliar } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';

interface FamiliarChangeCardProps {
  familiar: MiembroFamiliar;
  changeType: 'NUEVO' | 'MODIFICADO' | 'ELIMINADO';
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


export function FamiliarChangeCard({ familiar, changeType }: FamiliarChangeCardProps) {
  const getBadgeClass = () => {
    switch (changeType) {
      case 'NUEVO':
        return 'bg-green-100 text-green-800';
      case 'MODIFICADO':
        return 'bg-yellow-100 text-yellow-800';
      case 'ELIMINADO':
        return 'bg-red-100 text-red-800';
    }
  };

  return (
    <Card className="overflow-hidden flex flex-col">
      <CardHeader className="p-4 bg-muted/50">
        <div className="flex items-center justify-between">
            <CardTitle className="text-base">{familiar.nombre} {familiar.apellido}</CardTitle>
            <Badge className={getBadgeClass()}>{changeType}</Badge>
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
      </CardContent>
      <div className="p-4 pt-0">
        <FullDataDialog familiar={familiar} />
      </div>
    </Card>
  );
}