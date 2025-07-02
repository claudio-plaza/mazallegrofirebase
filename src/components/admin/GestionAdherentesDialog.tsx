
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { Socio, Adherente, AptoMedicoInfo } from '@/types';
import { EstadoAdherente, EstadoSolicitudAdherente } from '@/types';
import { updateSocio } from '@/lib/firebase/firestoreService';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, XCircle, Hourglass, ShieldAlert, UserCog, UserPlus, Trash2, MessageSquareWarning, UserCheck, UserX, Ban, Edit3, CalendarDays, Mail, Phone, Info } from 'lucide-react';
import { formatDate, getAptoMedicoStatus } from '@/lib/helpers';

interface GestionAdherentesDialogProps {
  socio: Socio | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdherentesUpdated: () => void;
}

export function GestionAdherentesDialog({ socio, open, onOpenChange, onAdherentesUpdated }: GestionAdherentesDialogProps) {
  const { toast } = useToast();
  const [currentAdherentes, setCurrentAdherentes] = useState<Adherente[]>([]);
  const [motivoRechazoInput, setMotivoRechazoInput] = useState('');
  const [editingRechazoAdherenteId, setEditingRechazoAdherenteId] = useState<string | null>(null);

  useEffect(() => {
    if (socio) {
      setCurrentAdherentes(socio.adherentes || []);
    } else {
      setCurrentAdherentes([]);
    }
    setMotivoRechazoInput('');
    setEditingRechazoAdherenteId(null);
  }, [socio, open]);

  if (!socio) return null;

  const handleUpdateAdherente = async (updatedAdherente: Adherente) => {
    const updatedAdherentesList = currentAdherentes.map(a => a.id === updatedAdherente.id ? updatedAdherente : a);
    try {
      await updateSocio({ ...socio, adherentes: updatedAdherentesList });
      setCurrentAdherentes(updatedAdherentesList);
      onAdherentesUpdated();
      return true;
    } catch (error) {
      toast({ title: "Error", description: "No se pudo actualizar el adherente.", variant: "destructive" });
      return false;
    }
  };

  const handleRemoveAdherenteById = async (adherenteId?: string) => {
    if (!adherenteId) return;
    const adherenteToRemove = currentAdherentes.find(a => a.id === adherenteId);
    if (!adherenteToRemove) return;

    const updatedAdherentesList = currentAdherentes.filter(a => a.id !== adherenteId);
    try {
      await updateSocio({ ...socio, adherentes: updatedAdherentesList });
      setCurrentAdherentes(updatedAdherentesList);
      toast({ title: "Adherente Eliminado", description: `${adherenteToRemove.nombre} ${adherenteToRemove.apellido} ha sido eliminado permanentemente.` });
      onAdherentesUpdated();
    } catch (error) {
      toast({ title: "Error", description: "No se pudo eliminar el adherente.", variant: "destructive" });
    }
  };

  const handleAprobarSolicitud = async (adherenteId?: string) => {
    if (!adherenteId) return;
    const adherente = currentAdherentes.find(a => a.id === adherenteId);
    if (!adherente) return;

    const initialAptoMedico: AptoMedicoInfo = {
        valido: false,
        razonInvalidez: 'Pendiente de revisión médica inicial',
    };

    const success = await handleUpdateAdherente({
      ...adherente,
      estadoSolicitud: EstadoSolicitudAdherente.APROBADO,
      estadoAdherente: EstadoAdherente.ACTIVO, // Activar por defecto al aprobar
      motivoRechazo: null,
      aptoMedico: adherente.aptoMedico || initialAptoMedico,
    });
    if (success) {
      toast({ title: "Solicitud Aprobada", description: `Adherente ${adherente.nombre} aprobado y activado.` });
    }
  };

  const handleRechazarSolicitud = async (adherenteId?: string) => {
    if (!adherenteId) return;
    if (!motivoRechazoInput.trim()) {
      toast({ title: "Error", description: "El motivo de rechazo es obligatorio.", variant: "destructive" });
      return;
    }
    const adherente = currentAdherentes.find(a => a.id === adherenteId);
    if (!adherente) return;

    const success = await handleUpdateAdherente({
      ...adherente,
      estadoSolicitud: EstadoSolicitudAdherente.RECHAZADO,
      estadoAdherente: EstadoAdherente.INACTIVO, // Inactivar al rechazar
      motivoRechazo: motivoRechazoInput,
    });
    if (success) {
      toast({ title: "Solicitud Rechazada", description: `Solicitud para ${adherente.nombre} rechazada.` });
      setEditingRechazoAdherenteId(null);
      setMotivoRechazoInput('');
    }
  };

  const handleToggleEstadoAdherente = async (adherenteId?: string) => {
    if (!adherenteId) return;
    const adherente = currentAdherentes.find(a => a.id === adherenteId);
    if (!adherente || adherente.estadoSolicitud !== EstadoSolicitudAdherente.APROBADO) return;

    const nuevoEstado = adherente.estadoAdherente === EstadoAdherente.ACTIVO ? EstadoAdherente.INACTIVO : EstadoAdherente.ACTIVO;
    const success = await handleUpdateAdherente({ ...adherente, estadoAdherente: nuevoEstado });
    if (success) {
      toast({ title: "Estado Actualizado", description: `Adherente ${adherente.nombre} ahora está ${nuevoEstado.toLowerCase()}.` });
    }
  };
  
  const handleConfirmarEliminacionSocio = async (adherenteId?: string) => {
    if (!adherenteId) return;
    const adherente = currentAdherentes.find(a => a.id === adherenteId);
    if (!adherente) return;
    await handleRemoveAdherenteById(adherenteId);
    // El toast de eliminación ya se muestra en handleRemoveAdherenteById
  };

  const handleCancelarSolicitudEliminacion = async (adherenteId?: string) => {
    if (!adherenteId) return;
    const adherente = currentAdherentes.find(a => a.id === adherenteId);
    if (!adherente) return;
    const success = await handleUpdateAdherente({
      ...adherente,
      estadoSolicitud: EstadoSolicitudAdherente.APROBADO, 
      motivoRechazo: null,
    });
    if (success) {
      toast({ title: "Solicitud Revertida", description: `La solicitud de eliminación para ${adherente.nombre} ha sido cancelada.` });
    }
  };

  const getStatusBadge = (adherente: Adherente) => {
    if (!adherente.estadoSolicitud) {
      return <Badge variant="secondary" className="bg-gray-400 text-white">Estado Inválido</Badge>;
    }
    switch (adherente.estadoSolicitud) {
      case EstadoSolicitudAdherente.PENDIENTE:
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600"><Hourglass className="mr-1.5 h-3 w-3" /> Pendiente Aprobación</Badge>;
      case EstadoSolicitudAdherente.APROBADO:
        return <Badge className={adherente.estadoAdherente === EstadoAdherente.ACTIVO ? 'bg-green-500 hover:bg-green-600' : 'bg-slate-500 hover:bg-slate-600'}><CheckCircle2 className="mr-1.5 h-3 w-3" /> {adherente.estadoAdherente}</Badge>;
      case EstadoSolicitudAdherente.RECHAZADO:
        return <Badge variant="destructive"><XCircle className="mr-1.5 h-3 w-3" /> Rechazado</Badge>;
      case EstadoSolicitudAdherente.PENDIENTE_ELIMINACION:
        return <Badge variant="destructive" className="bg-orange-600 hover:bg-orange-700"><UserX className="mr-1.5 h-3 w-3" /> Eliminación Solicitada</Badge>;
      default:
        return <Badge variant="secondary">Desconocido ({adherente.estadoSolicitud})</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center">
            <UserCog className="mr-2 h-6 w-6 text-primary" />
            Gestionar Adherentes de {socio.nombre} {socio.apellido} (Socio N°: {socio.numeroSocio})
          </DialogTitle>
          <DialogDescription>
            Revise solicitudes, active/desactive o elimine adherentes.
            {socio.estadoSocio !== 'Activo' && <span className="text-destructive font-semibold block mt-1">El socio titular está {socio.estadoSocio}. Algunas acciones pueden estar limitadas.</span>}
            {!currentAdherentes.some(a => a.estadoSolicitud === EstadoSolicitudAdherente.PENDIENTE) && currentAdherentes.length > 0 &&
              <span className="text-sm text-muted-foreground block mt-1">No hay nuevas solicitudes pendientes de adherentes para este socio.</span>
            }
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(80vh-200px)] p-1 -mx-1">
          <div className="p-4 space-y-4">
            {currentAdherentes.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Este socio no tiene adherentes ni solicitudes pendientes.</p>
            )}

            {currentAdherentes.map(adherente => {
              const aptoStatus = getAptoMedicoStatus(adherente.aptoMedico, adherente.fechaNacimiento);
              return (
              <Card key={adherente.id || adherente.dni} className="shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                        <CardTitle className="text-lg text-foreground">{adherente.nombre} {adherente.apellido}</CardTitle>
                        {getStatusBadge(adherente)}
                    </div>
                     <p className="text-xs text-muted-foreground pt-1">DNI: {adherente.dni}</p>
                </CardHeader>
                <CardContent className="space-y-2 text-xs pb-4">
                    {adherente.email && <div className="flex items-center"><Mail className="mr-1.5 h-3.5 w-3.5 text-muted-foreground"/> {adherente.email}</div>}
                    {adherente.telefono && <div className="flex items-center"><Phone className="mr-1.5 h-3.5 w-3.5 text-muted-foreground"/> {adherente.telefono}</div>}
                    {adherente.fechaNacimiento && <div className="flex items-center"><CalendarDays className="mr-1.5 h-3.5 w-3.5 text-muted-foreground"/> Nac: {formatDate(adherente.fechaNacimiento as unknown as string)}</div>}
                    
                    {(adherente.estadoSolicitud === EstadoSolicitudAdherente.APROBADO || adherente.estadoSolicitud === EstadoSolicitudAdherente.PENDIENTE_ELIMINACION) && aptoStatus && (
                        <div className={`flex items-center mt-1 p-1.5 rounded-sm text-xs ${aptoStatus.colorClass.replace('bg-', 'bg-opacity-20 ')}`}>
                            {aptoStatus.status === 'Válido' ? <UserCheck className="mr-1.5 h-3.5 w-3.5"/> : 
                             aptoStatus.status === 'No Aplica' ? <Info className="mr-1.5 h-3.5 w-3.5"/> :
                             <ShieldAlert className="mr-1.5 h-3.5 w-3.5"/>}
                            Apto Médico: {aptoStatus.status} ({aptoStatus.message})
                        </div>
                    )}
                    {adherente.motivoRechazo && (adherente.estadoSolicitud === EstadoSolicitudAdherente.RECHAZADO || adherente.estadoSolicitud === EstadoSolicitudAdherente.PENDIENTE_ELIMINACION) && (
                      <p className="text-xs text-destructive mt-1">Motivo: {adherente.motivoRechazo}</p>
                    )}
                </CardContent>
                
                <CardFooter className="pt-3 border-t flex flex-wrap gap-2 justify-end">
                  {adherente.estadoSolicitud === EstadoSolicitudAdherente.PENDIENTE && (
                    <>
                      <Button size="sm" variant="default" onClick={() => handleAprobarSolicitud(adherente.id)} className="bg-green-600 hover:bg-green-700">
                        <CheckCircle2 className="mr-1.5 h-4 w-4" /> Aprobar Solicitud
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setEditingRechazoAdherenteId(adherente.id!)}>
                        <XCircle className="mr-1.5 h-4 w-4" /> Rechazar Solicitud
                      </Button>
                    </>
                  )}

                  {adherente.estadoSolicitud === EstadoSolicitudAdherente.APROBADO && (
                    <>
                      <Button
                        size="sm"
                        variant={adherente.estadoAdherente === EstadoAdherente.ACTIVO ? "outline" : "default"}
                        onClick={() => handleToggleEstadoAdherente(adherente.id)}
                        className={adherente.estadoAdherente === EstadoAdherente.ACTIVO ? "" : "bg-green-500 hover:bg-green-600"}
                      >
                        {adherente.estadoAdherente === EstadoAdherente.ACTIVO ? <UserX className="mr-1.5 h-4 w-4" /> : <UserCheck className="mr-1.5 h-4 w-4" />}
                        {adherente.estadoAdherente === EstadoAdherente.ACTIVO ? 'Desactivar Adherente' : 'Activar Adherente'}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm"><Trash2 className="mr-1.5 h-4 w-4" /> Eliminar Adherente</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>¿Eliminar Adherente?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta acción eliminará permanentemente a {adherente.nombre} {adherente.apellido} como adherente de este socio.
                            </AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleRemoveAdherenteById(adherente.id)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                  
                  {adherente.estadoSolicitud === EstadoSolicitudAdherente.RECHAZADO && (
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button size="sm" variant="ghost" className="text-xs text-muted-foreground hover:text-destructive"><Trash2 className="mr-1 h-3 w-3"/> Eliminar Solicitud Rechazada</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>¿Eliminar Solicitud?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Se eliminará el registro de esta solicitud rechazada para {adherente.nombre} {adherente.apellido}. El socio podrá volver a proponerlo.
                            </AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleRemoveAdherenteById(adherente.id)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                  )}

                  {adherente.estadoSolicitud === EstadoSolicitudAdherente.PENDIENTE_ELIMINACION && (
                    <>
                      <Button size="sm" variant="destructive" onClick={() => handleConfirmarEliminacionSocio(adherente.id)}>
                        <UserX className="mr-1.5 h-4 w-4" /> Confirmar Eliminación
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleCancelarSolicitudEliminacion(adherente.id)}>
                        <Ban className="mr-1.5 h-4 w-4" /> Cancelar Solicitud
                      </Button>
                    </>
                  )}
                </CardFooter>

                {editingRechazoAdherenteId === adherente.id && (
                  <div className="mt-3 p-3 border rounded-md bg-muted/50">
                    <Label htmlFor={`motivo-rechazo-${adherente.id}`} className="text-xs font-medium">Motivo del Rechazo para {adherente.nombre}</Label>
                    <Textarea
                      id={`motivo-rechazo-${adherente.id}`}
                      value={motivoRechazoInput}
                      onChange={(e) => setMotivoRechazoInput(e.target.value)}
                      placeholder="Escriba el motivo..."
                      className="mt-1 min-h-[60px]"
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <Button size="sm" variant="ghost" onClick={() => { setEditingRechazoAdherenteId(null); setMotivoRechazoInput(''); }}>Cancelar</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleRechazarSolicitud(adherente.id)}>Confirmar Rechazo</Button>
                    </div>
                  </div>
                )}
              </Card>
            )})}
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4 pr-4">
          <DialogClose asChild>
            <Button type="button" variant="outline">Cerrar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
