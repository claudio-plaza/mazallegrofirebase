
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { Socio, MiembroFamiliar, EstadoCambioGrupoFamiliar } from '@/types';
import { EstadoCambioGrupoFamiliar as ECGF } from '@/types'; // Alias for enum
import { updateSocio } from '@/lib/firebase/firestoreService';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, CheckCircle2, Info, MailQuestion, Users, XCircle } from 'lucide-react';
import { format } from 'date-fns';

interface RevisarCambiosGrupoFamiliarDialogProps {
  socio: Socio | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRevisionUpdated: () => void;
}

const renderFamiliar = (familiar: MiembroFamiliar, type: string) => (
  <div key={familiar.dni || familiar.id} className="p-2 border rounded-md bg-background text-xs">
    <p className="font-semibold">{familiar.nombre} {familiar.apellido} ({type})</p>
    <p>DNI: {familiar.dni}</p>
    <p>Nac: {familiar.fechaNacimiento ? format(new Date(familiar.fechaNacimiento), 'dd/MM/yyyy') : 'N/A'}</p>
    {familiar.email && <p>Email: {familiar.email}</p>}
    {familiar.telefono && <p>Tel: {familiar.telefono}</p>}
  </div>
);

export function RevisarCambiosGrupoFamiliarDialog({ socio, open, onOpenChange, onRevisionUpdated }: RevisarCambiosGrupoFamiliarDialogProps) {
  const { toast } = useToast();
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setMotivoRechazo(''); // Reset reason when dialog opens
    }
  }, [open]);

  if (!socio || !socio.cambiosPendientesGrupoFamiliar) return null;

  const cambios = socio.cambiosPendientesGrupoFamiliar;

  const handleApprove = async () => {
    if (!socio) return;
    setIsSubmitting(true);
    const socioActualizado: Socio = {
      ...socio,
      grupoFamiliar: [
        ...(cambios.familiares?.conyuge ? [cambios.familiares.conyuge] : []),
        ...(cambios.familiares?.hijos || []),
        ...(cambios.familiares?.padres || []),
      ].filter(Boolean) as MiembroFamiliar[], // Ensure no nulls if conyuge is null
      estadoCambioGrupoFamiliar: ECGF.NINGUNO,
      cambiosPendientesGrupoFamiliar: null,
      motivoRechazoCambioGrupoFamiliar: null, 
    };

    try {
      await updateSocio(socioActualizado);
      toast({ title: "Cambios Aprobados", description: `El grupo familiar de ${socio.nombre} ha sido actualizado.` });
      onRevisionUpdated();
      onOpenChange(false);
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron aprobar los cambios.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!socio || !motivoRechazo.trim()) {
      toast({ title: "Error", description: "Debe ingresar un motivo de rechazo.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const socioActualizado: Socio = {
      ...socio,
      estadoCambioGrupoFamiliar: ECGF.RECHAZADO,
      motivoRechazoCambioGrupoFamiliar: motivoRechazo,
      // cambiosPendientesGrupoFamiliar se mantiene para referencia del socio
    };

    try {
      await updateSocio(socioActualizado);
      toast({ title: "Cambios Rechazados", description: `La solicitud de ${socio.nombre} ha sido rechazada.` });
      onRevisionUpdated();
      onOpenChange(false);
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron rechazar los cambios.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentGrupoFamiliar = socio.grupoFamiliar || [];
  const proposedConyuge = cambios.familiares?.conyuge;
  const proposedHijos = cambios.familiares?.hijos || [];
  const proposedPadres = cambios.familiares?.padres || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center">
            <MailQuestion className="mr-2 h-6 w-6 text-primary" />
            Revisar Cambios en Grupo Familiar de {socio.nombre} {socio.apellido}
          </DialogTitle>
          <DialogDescription>
            Revise los cambios propuestos por el socio y apruebe o rechace la solicitud.
            Tipo de grupo propuesto: {cambios.tipoGrupoFamiliar === 'conyugeEHijos' ? 'Cónyuge e Hijos/as' : 'Padres/Madres'}.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(80vh-250px)] p-1 -mx-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center"><Users className="mr-2 h-5 w-5 text-muted-foreground" /> Grupo Familiar Actual</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {currentGrupoFamiliar.length === 0 && <p className="text-xs text-muted-foreground">Sin familiares registrados actualmente.</p>}
                {currentGrupoFamiliar.filter(f => f.relacion === 'Conyuge').map(f => renderFamiliar(f, 'Cónyuge'))}
                {currentGrupoFamiliar.filter(f => f.relacion === 'Hijo/a').map(f => renderFamiliar(f, 'Hijo/a'))}
                {currentGrupoFamiliar.filter(f => f.relacion === 'Padre/Madre').map(f => renderFamiliar(f, 'Padre/Madre'))}
              </CardContent>
            </Card>

            <Card className="border-primary">
              <CardHeader>
                <CardTitle className="text-base flex items-center"><Users className="mr-2 h-5 w-5 text-primary" /> Cambios Propuestos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {proposedConyuge && renderFamiliar(proposedConyuge, 'Cónyuge')}
                {proposedHijos.map(f => renderFamiliar(f, 'Hijo/a'))}
                {proposedPadres.map(f => renderFamiliar(f, 'Padre/Madre'))}
                {!proposedConyuge && proposedHijos.length === 0 && proposedPadres.length === 0 && (
                  <p className="text-xs text-muted-foreground">No se proponen familiares o se propone eliminar todos.</p>
                )}
              </CardContent>
            </Card>
          </div>
          
          <Separator className="my-4" />

          <div className="px-4 space-y-3">
             <h4 className="text-sm font-medium">Acción Requerida</h4>
             <Textarea
                placeholder="Motivo del rechazo (obligatorio si rechaza)"
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
                className="min-h-[80px]"
             />
             {motivoRechazo.trim() === '' && isSubmitting && <p className="text-xs text-destructive">El motivo es obligatorio para rechazar.</p>}
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4 pr-4">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSubmitting}>Cancelar</Button>
          </DialogClose>
          <Button type="button" variant="destructive" onClick={handleReject} disabled={isSubmitting || !motivoRechazo.trim()}>
            <XCircle className="mr-2 h-4 w-4" /> Rechazar Cambios
          </Button>
          <Button type="button" onClick={handleApprove} disabled={isSubmitting}>
            <CheckCircle2 className="mr-2 h-4 w-4" /> Aprobar Cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
