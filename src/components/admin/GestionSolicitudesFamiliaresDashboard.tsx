'use client';

import { useState } from 'react';
import { useSolicitudesFamiliares } from '@/hooks/useSolicitudesFamiliares';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, UserCheck } from 'lucide-react';
import type { Socio } from '@/types';
import { FamiliarChangeCard } from './FamiliarChangeCard';
import { updateSocio } from '@/lib/firebase/firestoreService';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';

// Helper to categorize changes
const processFamiliarChanges = (socio: Socio) => {
  const actuales = socio.familiares || [];
  const pendientes = socio.cambiosPendientesFamiliares || [];

  const added = pendientes.filter(p => !actuales.some(a => a.id === p.id));
  const removed = actuales.filter(a => !pendientes.some(p => p.id === a.id));
  const modified = pendientes.filter(p => {
    const original = actuales.find(a => a.id === p.id);
    // A simple JSON.stringify check for modification.
    return original && JSON.stringify(original) !== JSON.stringify(p);
  });

  return { added, modified, removed };
};


export function GestionSolicitudesFamiliaresDashboard() {
  const { solicitudes, loading } = useSolicitudesFamiliares();
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleApprove = async (socio: Socio) => {
    setProcessingId(socio.id);
    try {
      await updateSocio(socio.id, {
        familiares: socio.cambiosPendientesFamiliares,
        estadoCambioFamiliares: 'Aprobado',
        cambiosPendientesFamiliares: [],
        motivoRechazoFamiliares: null,
      });
      toast({ title: "Solicitud Aprobada", description: `Los familiares de ${socio.nombre} ${socio.apellido} han sido actualizados.` });
    } catch (error) {
      console.error("Error approving request:", error);
      toast({ title: "Error", description: "No se pudo aprobar la solicitud.", variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (socio: Socio) => {
    if (!rejectionReason) {
      toast({ title: "Error", description: "Debe proporcionar un motivo de rechazo.", variant: "destructive" });
      return;
    }
    setProcessingId(socio.id);
    try {
      await updateSocio(socio.id, {
        estadoCambioFamiliares: 'Rechazado',
        cambiosPendientesFamiliares: [],
        motivoRechazoFamiliares: rejectionReason,
      });
      toast({ title: "Solicitud Rechazada", variant: "destructive" });
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast({ title: "Error", description: "No se pudo rechazar la solicitud.", variant: "destructive" });
    } finally {
      setProcessingId(null);
      setRejectionReason('');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Cargando solicitudes...</p>
      </div>
    );
  }

  if (solicitudes.length === 0) {
    return (
      <Alert className="mt-6">
        <UserCheck className="h-4 w-4" />
        <AlertTitle>Todo al día</AlertTitle>
        <AlertDescription>
          No hay solicitudes de cambio de familiares pendientes de revisión.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      {solicitudes.map((socio) => {
        const { added, modified, removed } = processFamiliarChanges(socio);
        const isProcessing = processingId === socio.id;

        return (
          <Card key={socio.id}>
            <CardHeader>
              <CardTitle>Solicitud de: {socio.nombre} {socio.apellido}</CardTitle>
              <CardDescription>
                Número de Socio: {socio.numeroSocio} | DNI: {socio.dni}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Familiares Propuestos ({socio.cambiosPendientesFamiliares?.length || 0})</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {added.map(f => <FamiliarChangeCard key={f.id} familiar={f} changeType="NUEVO" />)}
                  {modified.map(f => <FamiliarChangeCard key={f.id} familiar={f} changeType="MODIFICADO" />)}
                </div>
              </div>
              {removed.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Familiares a Eliminar ({removed.length})</h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {removed.map(f => <FamiliarChangeCard key={f.id} familiar={f} changeType="ELIMINADO" />)}
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" disabled={isProcessing}>Rechazar</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Rechazar Solicitud</AlertDialogTitle>
                    <AlertDialogDescription>
                      Por favor, ingrese el motivo del rechazo. Este será visible para el socio.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <Input 
                    placeholder="Ej: La foto del DNI no es legible."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleReject(socio)} disabled={!rejectionReason}>Confirmar Rechazo</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button onClick={() => handleApprove(socio)} disabled={isProcessing}>
                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Aprobar
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}