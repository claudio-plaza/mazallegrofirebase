'use client';

import { useState, useEffect } from 'react';
import { useSolicitudesFamiliares } from '@/hooks/useSolicitudesFamiliares';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, UserCheck } from 'lucide-react';
import type { MiembroFamiliar, Socio } from '@/types';
import { FamiliarChangeCard } from './FamiliarChangeCard';
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
} from "@/components/ui/alert-dialog";
import { Textarea } from '@/components/ui/textarea'; // Usar Textarea en lugar de Input para el motivo de rechazo
import { getFunctions, httpsCallable } from 'firebase/functions'; // Importar para httpsCallable
import { useAuth } from '@/hooks/useAuth'; // Importar useAuth
import { Timestamp } from 'firebase/firestore'; // Importar Timestamp




export function GestionSolicitudesFamiliaresDashboard() {
  const { solicitudes, loading } = useSolicitudesFamiliares();
  const { toast } = useToast();
  const { user } = useAuth(); // Obtener el usuario autenticado
  const currentAdminUid = user?.uid; // UID del admin que toma la decisión

  const [localFamiliaresPendientes, setLocalFamiliaresPendientes] = useState<{ [socioId: string]: MiembroFamiliar[] }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado para el diálogo de rechazo individual
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [familiarToRejectInfo, setFamiliarToRejectInfo] = useState<{ socioId: string; familiarId: string; familiarNombre: string; familiarApellido: string } | null>(null);
  const [rejectionReasonIndividual, setRejectionReasonIndividual] = useState('');

  useEffect(() => {
    // Inicializar el estado local con los familiares pendientes de cada solicitud
    if (solicitudes.length > 0) {
      const initialLocalState: { [socioId: string]: MiembroFamiliar[] } = {};
      solicitudes.forEach(socio => {
        initialLocalState[socio.id] = (socio.cambiosPendientesFamiliares || []).map(f => ({
          ...f,
          // Asegurarse de que cada familiar tiene un estado inicial 'pendiente' si no lo tiene
          estadoAprobacion: f.estadoAprobacion || 'pendiente'
        }));
      });
      setLocalFamiliaresPendientes(initialLocalState);
    }
  }, [solicitudes]);

  const handleApproveFamiliar = (socioId: string, familiarId: string) => {
    setLocalFamiliaresPendientes(prev => ({
      ...prev,
      [socioId]: prev[socioId].map(f =>
        f.id === familiarId
          ? { ...f, estadoAprobacion: 'aprobado', motivoRechazo: undefined, fechaDecision: Timestamp.now(), decidoPor: currentAdminUid }
          : f
      )
    }));
  };

  const handleRejectFamiliar = (socioId: string, familiarId: string) => {
    const familiar = localFamiliaresPendientes[socioId]?.find(f => f.id === familiarId);
    if (familiar) {
      setFamiliarToRejectInfo({ socioId, familiarId, familiarNombre: familiar.nombre, familiarApellido: familiar.apellido });
      setShowRejectionDialog(true);
    }
  };

  const confirmRejectFamiliar = () => {
    if (!familiarToRejectInfo || !rejectionReasonIndividual.trim()) {
      toast({ title: "Error", description: "Debe proporcionar un motivo de rechazo.", variant: "destructive" });
      return;
    }

    setLocalFamiliaresPendientes(prev => ({
      ...prev,
      [familiarToRejectInfo.socioId]: prev[familiarToRejectInfo.socioId].map(f =>
        f.id === familiarToRejectInfo.familiarId
          ? {
              ...f,
              estadoAprobacion: 'rechazado',
              motivoRechazo: rejectionReasonIndividual.trim(),
              fechaDecision: Timestamp.now(),
              decidoPor: currentAdminUid
            }
          : f
      )
    }));

    // Resetear y cerrar diálogo
    setShowRejectionDialog(false);
    setFamiliarToRejectInfo(null);
    setRejectionReasonIndividual('');
  };

  const handleApproveAll = (socioId: string) => {
    setLocalFamiliaresPendientes(prev => ({
      ...prev,
      [socioId]: prev[socioId].map(f => ({
        ...f,
        estadoAprobacion: 'aprobado',
        motivoRechazo: undefined,
        fechaDecision: Timestamp.now(),
        decidoPor: currentAdminUid
      }))
    }));
  };

  const handleRejectAll = (socioId: string) => {
    const socio = solicitudes.find(s => s.id === socioId);
    if (!socio) return;

    setFamiliarToRejectInfo({ socioId, familiarId: 'all', familiarNombre: 'todos', familiarApellido: 'los familiares' });
    setShowRejectionDialog(true);
    // La confirmación manejará el update de todos los familiares
  };

  const confirmRejectAll = () => {
    if (!familiarToRejectInfo || !rejectionReasonIndividual.trim()) {
      toast({ title: "Error", description: "Debe proporcionar un motivo de rechazo.", variant: "destructive" });
      return;
    }

    setLocalFamiliaresPendientes(prev => ({
      ...prev,
      [familiarToRejectInfo.socioId]: prev[familiarToRejectInfo.socioId].map(f => ({
        ...f,
        estadoAprobacion: 'rechazado',
        motivoRechazo: rejectionReasonIndividual.trim(),
        fechaDecision: Timestamp.now(),
        decidoPor: currentAdminUid
      }))
    }));

    setShowRejectionDialog(false);
    setFamiliarToRejectInfo(null);
    setRejectionReasonIndividual('');
  };

  const handleSaveDecisions = async (socioId: string) => {
    if (!currentAdminUid) {
      toast({ title: "Error de Autenticación", description: "No se pudo identificar al administrador.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    const familiaresDelSocio = localFamiliaresPendientes[socioId];
    if (!familiaresDelSocio || familiaresDelSocio.length === 0) {
      toast({ title: "Advertencia", description: "No hay familiares para procesar.", variant: "default" });
      setIsSubmitting(false);
      return;
    }

    const allDecided = familiaresDelSocio.every(f => f.estadoAprobacion === 'aprobado' || f.estadoAprobacion === 'rechazado');
    if (!allDecided) {
      toast({ title: "Advertencia", description: "Debe aprobar o rechazar a todos los familiares antes de guardar.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    const functions = getFunctions();
    const processFamiliarRequests = httpsCallable(functions, 'processFamiliarRequests');

    try {
      const result = await processFamiliarRequests({
        socioId,
        familiaresDecisiones: familiaresDelSocio
      });
      
      console.log('✅ Resultado de processFamiliarRequests:', result.data);

      toast({ title: "Decisiones Guardadas", description: "Las decisiones sobre los familiares han sido guardadas.", });
      // refetch() eliminado ya que useSolicitudesFamiliares usa onSnapshot (realtime)
    } catch (error: any) {
      console.error("Error saving decisions:", error);
      toast({ title: "Error", description: error.message || "No se pudieron guardar las decisiones.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
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
        const familiaresDeEsteSocio = localFamiliaresPendientes[socio.id] || [];
        const allDecided = familiaresDeEsteSocio.every(f => f.estadoAprobacion === 'aprobado' || f.estadoAprobacion === 'rechazado');
        
        // Ahora solo recibimos familiares NUEVOS (la lógica del frontend ya no envía los existentes)
        // Por simplicidad, todos los familiares pendientes son "NUEVO"
        const familiaresNuevos = familiaresDeEsteSocio;


        return (
          <Card key={socio.id}>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Solicitud de: {socio.nombre} {socio.apellido}</CardTitle>
                  <CardDescription>
                    Número de Socio: {socio.numeroSocio} | DNI: {socio.dni}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleApproveAll(socio.id)} 
                    disabled={isSubmitting || familiaresDeEsteSocio.every(f => f.estadoAprobacion === 'aprobado')}
                  >
                    Aprobar Todos
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleRejectAll(socio.id)} 
                    disabled={isSubmitting || familiaresDeEsteSocio.every(f => f.estadoAprobacion === 'rechazado')}
                  >
                    Rechazar Todos
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {familiaresNuevos.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Familiares Nuevos ({familiaresNuevos.length})</h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {familiaresNuevos.map(f => (
                      <FamiliarChangeCard 
                        key={f.id} 
                        familiar={f} 
                        changeType={"NUEVO"} 
                        onApproveFamiliar={(familiarId) => handleApproveFamiliar(socio.id, familiarId)}
                        onRejectFamiliar={(familiarId) => handleRejectFamiliar(socio.id, familiarId)}
                        isProcessing={isSubmitting}
                      />
                    ))}
                  </div>
                </div>
              )}
              {familiaresDeEsteSocio.length === 0 && (
                 <p className="text-muted-foreground">No hay familiares pendientes en esta solicitud.</p>
              )}
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button 
                onClick={() => handleSaveDecisions(socio.id)} 
                disabled={isSubmitting || !allDecided || familiaresDeEsteSocio.length === 0}
              >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Guardar Decisiones
              </Button>
            </CardFooter>
          </Card>
        );
      })}

      {/* Diálogo de Rechazo Individual/Masivo */}
      <AlertDialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rechazar {familiarToRejectInfo?.familiarNombre} {familiarToRejectInfo?.familiarApellido}</AlertDialogTitle>
            <AlertDialogDescription>
              Por favor indica el motivo del rechazo. El socio verá este mensaje.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea 
            placeholder="Ej: DNI ilegible, foto de perfil no cumple requisitos..."
            value={rejectionReasonIndividual}
            onChange={(e) => setRejectionReasonIndividual(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowRejectionDialog(false);
              setFamiliarToRejectInfo(null);
              setRejectionReasonIndividual('');
            }}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={familiarToRejectInfo?.familiarId === 'all' ? confirmRejectAll : confirmRejectFamiliar}
              disabled={!rejectionReasonIndividual.trim()}
            >
              Confirmar Rechazo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}