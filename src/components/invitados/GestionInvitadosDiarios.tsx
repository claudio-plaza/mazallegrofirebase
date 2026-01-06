
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm, useFieldArray, FormProvider, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { SolicitudInvitadosDiarios, InvitadoDiario } from '@/types';
import { solicitudInvitadosDiariosSchema, EstadoSolicitudInvitados } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardFooter, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, generateId } from '@/lib/helpers';
import { PlusCircle, Trash2, Users, Info, CalendarDays, Send, Edit, ListChecks, Clock, ChevronUp, ChevronDown, Plus, X, UserPlus, CheckCircle, PartyPopper, Gift, Cake, Upload, FileSpreadsheet, Download } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, formatISO, parseISO, isValid, addDays, isBefore, isSameDay, differenceInYears } from 'date-fns';
import { es } from 'date-fns/locale';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getSolicitudInvitadosDiarios, addOrUpdateSolicitudInvitadosDiarios } from '@/lib/firebase/firestoreService';
import { parseGuestExcel } from '@/lib/excelUtils';
import * as XLSX from 'xlsx';
import { db } from '@/lib/firebase/config';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription as AlertDialogDescriptionAlertDialog, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { collection, getDocs, doc, getDoc, deleteDoc, writeBatch, Timestamp, increment } from 'firebase/firestore';

interface InvitadoFrecuente {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  fechaNacimiento: Date;
  ultimoUso?: Date;
  vecesUsado: number;
}

const createDefaultInvitado = (): InvitadoDiario => ({
  id: generateId(),
  nombre: '',
  apellido: '',
  dni: '',
  fechaNacimiento: new Date(),
  ingresado: false,
  metodoPago: null,
  aptoMedico: null
});

export function GestionInvitadosDiarios() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { toast } = useToast();
  const { loggedInUserNumeroSocio, userName, isLoading: authIsLoading, user, socio } = useAuth();
  const [maxBirthDate, setMaxBirthDate] = useState<string>('');
  const [minSelectableDate, setMinSelectableDate] = useState<string>('');
  const [maxSelectableDate, setMaxSelectableDate] = useState<string>('');
  const queryClient = useQueryClient();
  const [invitadosFrecuentes, setInvitadosFrecuentes] = useState<InvitadoFrecuente[]>([]);
  const [mostrarFrecuentes, setMostrarFrecuentes] = useState(false); // Por defecto cerrado para ahorrar espacio
  const [currentStep, setCurrentStep] = useState(1); // 1: Fecha, 2: Invitados, 3: Revisión

  const today = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);

  useEffect(() => {
    setMaxBirthDate(format(new Date(), 'yyyy-MM-dd'));
    setMinSelectableDate(format(today, 'yyyy-MM-dd'));
    setMaxSelectableDate(format(addDays(today, 5), 'yyyy-MM-dd'));
  }, [today]);

  const selectedDateISO = useMemo(() => formatISO(selectedDate, { representation: 'date' }), [selectedDate]);
  
  
  const { data: solicitudActual, isLoading: loading } = useQuery({
      queryKey: ['solicitudInvitados', user?.uid, selectedDateISO],
      queryFn: () => getSolicitudInvitadosDiarios(user!.uid, selectedDateISO),
      enabled: !!user && !authIsLoading,
  });

  useEffect(() => {
    const cargarInvitadosFrecuentes = async () => {
      if (!user) return;
      try {
        const frecuentesRef = collection(db, 'socios', user.uid, 'invitados_frecuentes');
        const frecuentesSnap = await getDocs(frecuentesRef);
        const frecuentes = frecuentesSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          fechaNacimiento: doc.data().fechaNacimiento.toDate(),
          ultimoUso: doc.data().ultimoUso?.toDate()
        })) as InvitadoFrecuente[];
        frecuentes.sort((a, b) => b.vecesUsado - a.vecesUsado);
        setInvitadosFrecuentes(frecuentes);
      } catch (error) {
        console.error('Error al cargar invitados frecuentes:', error);
      }
    };
    if (user) {
      cargarInvitadosFrecuentes();
    }
  }, [user]);

  const { mutate: saveSolicitud, isPending: isSaving } = useMutation({
    mutationFn: (data: SolicitudInvitadosDiarios) => addOrUpdateSolicitudInvitadosDiarios(data),
    onSuccess: (data, variables) => {
      const queryKey = ['solicitudInvitados', user?.uid, selectedDateISO];
      queryClient.setQueryData(queryKey, variables);

      if (variables.estado === EstadoSolicitudInvitados.ENVIADA) {
        setCurrentStep(1);
      }

      toast({
        title: variables.estado === EstadoSolicitudInvitados.ENVIADA ? 'Lista Enviada' : (variables.id ? 'Lista Actualizada' : 'Borrador Guardado'),
        description: `Tu lista de invitados para el ${formatDate(selectedDateISO)} ha sido actualizada.`,
      });
    },
    onError: (error) => {
        toast({ title: "Error", description: `No se pudo guardar la lista de invitados: ${error.message}`, variant: "destructive"});
    }
  });


  const form = useForm<SolicitudInvitadosDiarios>({
    resolver: zodResolver(solicitudInvitadosDiariosSchema),
    defaultValues: {
      id: generateId(),
      idSocioTitular: user?.uid || '',
      nombreSocioTitular: userName || '',
      fecha: selectedDateISO,
      listaInvitadosDiarios: [createDefaultInvitado()],
      estado: EstadoSolicitudInvitados.BORRADOR,
      fechaCreacion: new Date(),
      fechaUltimaModificacion: new Date(),
      titularIngresadoEvento: false,
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "listaInvitadosDiarios",
  });

  // Usamos useWatch solo cuando es necesario (paso 3) para evitar re-renders excesivos
  const getInvitadosActuales = useCallback(() => {
    return form.getValues('listaInvitadosDiarios');
  }, [form]);

  const hayMenoresDe3 = useMemo(() => {
    const invitados = form.getValues('listaInvitadosDiarios');
    return invitados.some(inv => {
      if (!inv.fechaNacimiento) return false;
      const bDate = inv.fechaNacimiento instanceof Date ? inv.fechaNacimiento : new Date(inv.fechaNacimiento);
      return isValid(bDate) && differenceInYears(new Date(), bDate) < 3;
    });
  }, [form, fields.length]);

  // Solo activamos useWatch en el paso 3 para evitar re-renders en pasos 1 y 2
  const watchedInvitados = useWatch({
    control: form.control,
    name: 'listaInvitadosDiarios',
    disabled: currentStep !== 3, // Solo watch activo en paso 3
  });

  // Usamos fields como fuente principal, watchedInvitados solo para verificación en paso 3
  const invitadosParaVerificacion = currentStep === 3 ? (watchedInvitados || []) : [];

  const irAPaso3 = () => {
    const values = form.getValues('listaInvitadosDiarios');
    // Filtrar invitados que no tienen absolutamente nada escrito
    const filtrados = values.filter(inv => 
      inv.nombre?.trim() || inv.apellido?.trim() || inv.dni?.trim()
    );
    
    if (filtrados.length > 0) {
      replace(filtrados);
    }
    
    setCurrentStep(3);
  };
  
  useEffect(() => {
    if (loading || authIsLoading) {
      return;
    }

    if (solicitudActual) {
      form.reset({
        ...solicitudActual,
        fecha: selectedDateISO,
        listaInvitadosDiarios: solicitudActual.listaInvitadosDiarios.length > 0
          ? solicitudActual.listaInvitadosDiarios.map(inv => {
              const rawDate = inv.fechaNacimiento as any;
              let finalDate = new Date();
              if (rawDate) {
                if (typeof rawDate.seconds === 'number') {
                  finalDate = new Date(rawDate.seconds * 1000);
                } else {
                  finalDate = new Date(rawDate);
                }
              }
              return {
                ...inv,
                id: inv.id || generateId(),
                fechaNacimiento: finalDate,
              };
            })
          : [createDefaultInvitado()],
      });
    } else {
      form.reset({
        id: generateId(),
        idSocioTitular: user?.uid || '',
        nombreSocioTitular: userName || '',
        fecha: selectedDateISO,
        listaInvitadosDiarios: [createDefaultInvitado()],
        estado: EstadoSolicitudInvitados.BORRADOR,
        fechaCreacion: new Date(),
        fechaUltimaModificacion: new Date(),
        titularIngresadoEvento: false,
      });
    }
  }, [solicitudActual, loading, authIsLoading, selectedDateISO, user, userName, form]);

  const guardarComoFrecuentes = async (invitados: InvitadoDiario[]) => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      for (const invitado of invitados) {
        const invitadoId = `inv-${invitado.dni}`;
        const invitadoRef = doc(db, 'socios', user.uid, 'invitados_frecuentes', invitadoId);
        const invitadoDoc = await getDoc(invitadoRef);
        if (invitadoDoc.exists()) {
          batch.update(invitadoRef, {
            ultimoUso: Timestamp.now(),
            vecesUsado: increment(1),
            nombre: invitado.nombre,
            apellido: invitado.apellido,
            fechaNacimiento: Timestamp.fromDate(invitado.fechaNacimiento)
          });
        } else {
          batch.set(invitadoRef, {
            nombre: invitado.nombre,
            apellido: invitado.apellido,
            dni: invitado.dni,
            fechaNacimiento: Timestamp.fromDate(invitado.fechaNacimiento),
            fechaCreacion: Timestamp.now(),
            ultimoUso: Timestamp.now(),
            vecesUsado: 1
          });
        }
      }
      await batch.commit();
      console.log('✅ Invitados guardados como frecuentes');
    } catch (error) {
      console.error('Error al guardar invitados frecuentes:', error);
    }
  };

  const handleSave = async (targetState: EstadoSolicitudInvitados) => {
    if (!user) {
      toast({ title: "Error", description: "Usuario no identificado.", variant: "destructive"});
      return;
    }

    const data = form.getValues();

    const invitadosValidos = data.listaInvitadosDiarios.filter(invitado => {
        const tieneNombre = invitado.nombre && invitado.nombre.trim() !== '';
        const tieneApellido = invitado.apellido && invitado.apellido.trim() !== '';
        const tieneDNI = invitado.dni && invitado.dni.trim() !== '';
        return tieneNombre && tieneApellido && tieneDNI;
    });

    if (targetState === EstadoSolicitudInvitados.ENVIADA && invitadosValidos.length === 0) {
      toast({ title: "Lista Vacía", description: "Debe agregar al menos un invitado con nombre, apellido y DNI para enviar la lista.", variant: "destructive" });
      return;
    }

    const invitadosFinales = invitadosValidos;

    const finalState = solicitudActual?.estado === EstadoSolicitudInvitados.ENVIADA ? EstadoSolicitudInvitados.ENVIADA : targetState;

    const dataToSave: SolicitudInvitadosDiarios = {
        ...data,
        idSocioTitular: user.uid,
        numeroSocioTitular: loggedInUserNumeroSocio || '',
        nombreSocioTitular: userName || 'Socio',
        fecha: selectedDateISO, 
        id: solicitudActual?.id || data.id,
        estado: finalState,
        fechaCreacion: solicitudActual?.fechaCreacion || new Date(),
        fechaUltimaModificacion: new Date(),
        listaInvitadosDiarios: invitadosFinales,
    };
    
    console.log('🔍 Usuario actual:', user);
    console.log('🆔 UID del usuario:', user?.uid);
    console.log('📋 Datos a enviar:', dataToSave);

    saveSolicitud(dataToSave);

    if (targetState === EstadoSolicitudInvitados.ENVIADA) {
      await guardarComoFrecuentes(invitadosValidos);
    }
  };

  const onFormSubmit = () => {
    // El usuario prefiere no tener guardado de borrador manual/confuso.
    // El guardado se realiza al 'Enviar'.
  };

  const handleConfirmarYEnviar = () => {
    handleSave(EstadoSolicitudInvitados.ENVIADA);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [year, month, day] = e.target.value.split('-').map(Number);
    const newDate = new Date(year, month - 1, day);
    if (isValid(newDate)) {
        setSelectedDate(newDate);
    }
  };

  const handleNuevoDia = () => {
    setCurrentStep(1);
    // Opcional: Podrías resetear la fecha aquí si quieres, 
    // pero dejar la actual permite al usuario ver qué día tenía seleccionado.
  };

  const agregarMasMismoDia = () => {
    // Aseguramos que haya al menos un campo vacío si la lista está llena de confirmados
    const current = form.getValues('listaInvitadosDiarios');
    const todosLlenos = current.every(inv => inv.nombre && inv.apellido && inv.dni);
    if (todosLlenos) {
      append(createDefaultInvitado());
    }
    setCurrentStep(2);
  };

  const isEditable = useMemo(() => {
    const esFechaValidaParaEdicion = !isBefore(selectedDate, today) || isSameDay(selectedDate, today);

    if (!solicitudActual) {
      return esFechaValidaParaEdicion;
    }

    if (!esFechaValidaParaEdicion) {
      return false;
    }

    const estadosBloqueados: EstadoSolicitudInvitados[] = [
        EstadoSolicitudInvitados.VENCIDA,
        EstadoSolicitudInvitados.CANCELADA_ADMIN,
        EstadoSolicitudInvitados.CANCELADA_SOCIO,
    ];

    return !estadosBloqueados.includes(solicitudActual.estado);
  }, [solicitudActual, selectedDate, today]);
  
  const puedeEnviar = useMemo(() => {
    if (!isEditable) return false;

    if (solicitudActual?.estado === EstadoSolicitudInvitados.ENVIADA) {
      return true;
    }

    const isTodayOrFutureWithinLimit = !isBefore(selectedDate, today) && isBefore(selectedDate, addDays(today,6));
    
    return (solicitudActual?.estado === EstadoSolicitudInvitados.BORRADOR || !solicitudActual) && 
           isTodayOrFutureWithinLimit;
  }, [solicitudActual, isEditable, selectedDate, today]);

  const agregarInvitadoFrecuente = (inv: InvitadoFrecuente) => {
    const currentInvitados = form.getValues('listaInvitadosDiarios');
    const existe = currentInvitados.some(i => i.dni === inv.dni);
    if (existe) {
      toast({ title: 'Info', description: 'Este invitado ya está en la lista.' });
      return;
    }
    const newInvitado = { ...createDefaultInvitado(), ...inv };
    // Check if the first field is empty and replace it, otherwise append
    if (fields.length === 1 && !fields[0].nombre && !fields[0].apellido && !fields[0].dni) {
      replace([newInvitado]);
    } else {
      append(newInvitado);
    }
    toast({ title: 'Invitado Agregado', description: `${inv.nombre} ${inv.apellido} agregado a la lista.` });
  };

  const cargarTodosLosFrecuentes = () => {
    const currentInvitados = form.getValues('listaInvitadosDiarios');
    const nuevosInvitados = invitadosFrecuentes
      .filter(inv => !currentInvitados.some(i => i.dni === inv.dni))
      .map(inv => ({ ...createDefaultInvitado(), ...inv }));
    if (nuevosInvitados.length > 0) {
      append(nuevosInvitados);
      toast({ title: 'Invitados Cargados', description: `${nuevosInvitados.length} invitados cargados.` });
    } else {
      toast({ title: 'Info', description: 'Todos los invitados frecuentes ya están en la lista.' });
    }
  };

  const eliminarInvitadoFrecuente = async (invitadoId: string) => {
    if (!user) return;
    if (confirm('¿Eliminar este invitado de tus frecuentes?')) {
      try {
        await deleteDoc(doc(db, 'socios', user.uid, 'invitados_frecuentes', invitadoId));
        setInvitadosFrecuentes(invitadosFrecuentes.filter(inv => inv.id !== invitadoId));
        toast({ title: 'Éxito', description: 'Invitado eliminado de frecuentes.' });
      } catch (error) {
        console.error('Error al eliminar:', error);
        toast({ title: 'Error', description: 'Error al eliminar invitado frecuente.', variant: 'destructive' });
      }
    }
  };

  const limpiarInvitadosActuales = () => {
    if (fields.length === 0) return;
    if (confirm('¿Limpiar la lista actual de invitados?')) {
      replace([createDefaultInvitado()]);
      toast({ title: 'Info', description: 'Lista limpiada.' });
    }
  };


  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { data, errors } = await parseGuestExcel(file);
      
      if (errors.length > 0) {
        toast({
          title: "Error en el archivo",
          description: (
            <div className="mt-2 max-h-[200px] overflow-y-auto">
              <p className="font-bold mb-1">Se encontraron los siguientes problemas:</p>
              <ul className="list-disc pl-4 text-xs space-y-1">
                {errors.slice(0, 5).map((err, i) => <li key={i}>{err}</li>)}
                {errors.length > 5 && <li>... y {errors.length - 5} errores más.</li>}
              </ul>
            </div>
          ),
          variant: "destructive",
          duration: 10000,
        });
        return;
      }

      if (data.length === 0) {
        toast({ title: "⚠️ Archivo Vacío", description: "No se encontraron invitados válidos en el archivo.", variant: "default" });
        return;
      }

      // Filtrar invitados vacíos actuales antes de agregar los nuevos
      const invitadosActuales = form.getValues('listaInvitadosDiarios').filter(inv => 
        inv.nombre?.trim() || inv.apellido?.trim() || inv.dni?.trim()
      );

      const nuevosInvitados = data.map(inv => ({
        ...createDefaultInvitado(),
        nombre: inv.nombre,
        apellido: inv.apellido,
        dni: inv.dni,
        fechaNacimiento: inv.fechaNacimiento || new Date(),
      }));

      // Si la lista actual solo tenía un elemento vacío, reemplazarlo. Si no, agregar.
      if (invitadosActuales.length === 0) {
        replace(nuevosInvitados);
      } else {
        // Combinar y actualizar
        replace([...invitadosActuales, ...nuevosInvitados]);
      }

      toast({ 
        title: "Importación Exitosa", 
        description: `Se han cargado ${nuevosInvitados.length} invitados correctamente.` 
      });

      // Limpiar el input para permitir cargar el mismo archivo de nuevo si es necesario
      e.target.value = '';

    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Hubo un error al procesar el archivo Excel.", variant: "destructive" });
    }
  };

  const descargarPlantillaExcel = () => {
    // Crear datos de ejemplo
    const datosEjemplo = [
      { 'Nombre': 'Juan', 'Apellido': 'Pérez', 'DNI': '12345678', 'Fecha de Nacimiento': '15/03/1990' },
      { 'Nombre': 'María', 'Apellido': 'González', 'DNI': '87654321', 'Fecha de Nacimiento': '22/07/1985' },
    ];
    
    // Crear hoja de trabajo
    const ws = XLSX.utils.json_to_sheet(datosEjemplo);
    
    // Ajustar ancho de columnas
    ws['!cols'] = [
      { wch: 20 }, // Nombre
      { wch: 20 }, // Apellido
      { wch: 15 }, // DNI
      { wch: 20 }, // Fecha de Nacimiento
    ];
    
    // Crear libro de trabajo
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Invitados');
    
    // Descargar
    XLSX.writeFile(wb, 'plantilla_invitados.xlsx');
    
    toast({ title: "Plantilla Descargada", description: "Completá los datos y subí el archivo." });
  };

  if (authIsLoading || (loading && !solicitudActual)) {
    return (
      <div className="flex flex-col items-center justify-center py-10 space-y-4">
        <p className="text-muted-foreground">Cargando información de invitados...</p>
        <Skeleton className="h-10 w-full max-w-xs" />
        <Skeleton className="h-20 w-full max-w-2xl" />
        <Skeleton className="h-64 w-full max-w-2xl" />
        <Skeleton className="h-10 w-1/3" />
      </div>
    );
  }
  
  const getEstadoBadge = (estado?: EstadoSolicitudInvitados) => {
    if (!estado) return null;
    switch(estado) {
        case EstadoSolicitudInvitados.BORRADOR: return <Badge variant="outline" className="border-yellow-500 text-yellow-600"><Edit className="mr-1 h-3 w-3" /> Borrador</Badge>;
        case EstadoSolicitudInvitados.ENVIADA: return <Badge className="bg-green-500 text-white"><Send className="mr-1 h-3 w-3" /> Enviada</Badge>;
        case EstadoSolicitudInvitados.PROCESADA: return <Badge className="bg-blue-500 text-white"><ListChecks className="mr-1 h-3 w-3" /> Procesada</Badge>;
        case EstadoSolicitudInvitados.VENCIDA: return <Badge variant="destructive" className="bg-gray-500"><Clock className="mr-1 h-3 w-3" /> Vencida</Badge>;
        default: return <Badge variant="secondary">{estado}</Badge>;
    }
  }


  const StepIndicator = () => (
    <div className="flex items-center justify-between mb-8 px-2">
      {[1, 2, 3].map((step) => (
        <div key={step} className="flex items-center flex-1 last:flex-none">
          <div 
            onClick={() => isEditable && step < currentStep && setCurrentStep(step)}
            className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all cursor-default ${
              currentStep === step 
                ? 'bg-orange-500 border-orange-500 text-white shadow-lg scale-110' 
                : step < currentStep 
                  ? 'bg-green-500 border-green-500 text-white cursor-pointer' 
                  : 'bg-white border-gray-200 text-gray-400'
            }`}
          >
            {step < currentStep ? <CheckCircle className="w-6 h-6" /> : <span className="font-bold">{step}</span>}
          </div>
          {step < 3 && (
            <div className={`h-[2px] flex-1 mx-2 ${step < currentStep ? 'bg-green-500' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <FormProvider {...form}>
      <Card className="w-full max-w-3xl mx-auto shadow-2xl border-none bg-white/80 backdrop-blur-md overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600" />
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-100 rounded-xl">
              <Users className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-gray-800">Carga de Invitados</CardTitle>
              <CardDescription>Paso {currentStep} de 3</CardDescription>
            </div>
          </div>
        </CardHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-6">
            <CardContent className="px-4 sm:px-8 pb-8">
              <StepIndicator />

              {/* PASO 1: SELECCIÓN DE FECHA */}
              {currentStep === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  
                  {/* Vista de Lista ya Enviada para este día */}
                  {solicitudActual?.estado === EstadoSolicitudInvitados.ENVIADA && (
                    <div className="mb-4 space-y-4">
                      <div className="bg-green-50 border border-green-100 rounded-2xl p-5 shadow-sm">
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
                          <h3 className="text-lg font-bold text-green-800 flex items-center gap-2">
                            <CheckCircle className="w-5 h-5" />
                            Invitados para el día {formatDate(selectedDateISO)}
                            <Badge className="bg-green-600 text-white ml-2">{solicitudActual.listaInvitadosDiarios.length}</Badge>
                          </h3>
                          <Button 
                            type="button"
                            onClick={agregarMasMismoDia}
                            className="bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-md h-10 px-6"
                          >
                            <UserPlus className="mr-2 h-4 w-4" /> Agregar / Modificar invitados
                          </Button>
                        </div>
                        
                        <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                          {solicitudActual.listaInvitadosDiarios.map((inv, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-lg border border-green-50">
                              <span className="text-sm font-semibold text-gray-700">{inv.nombre} {inv.apellido}</span>
                              <Badge variant="outline" className="text-[10px] text-green-600 border-green-200 bg-green-50 font-bold uppercase tracking-tighter">Confirmado</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-center text-gray-400 font-medium italic">
                        Si queres cargar invitados para otro día, selecciónalo a continuación:
                      </p>
                    </div>
                  )}

                  <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100 flex flex-col items-center text-center space-y-4">
                    <CalendarDays className="h-12 w-12 text-orange-500" />
                    <div className="space-y-1">
                      <h4 className="text-lg font-semibold text-gray-900">¿Para cuándo es la lista?</h4>
                      <p className="text-sm text-gray-500">Puedes programar hasta con 5 días de anticipación.</p>
                    </div>
                    
                    <div className="w-full max-w-xs">
                      <FormField
                        control={form.control}
                        name="fecha"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                type="date"
                                value={format(selectedDate, 'yyyy-MM-dd')}
                                onChange={handleDateChange}
                                min={minSelectableDate}
                                max={maxSelectableDate}
                                className="h-12 text-center text-lg font-medium rounded-xl border-orange-200 focus:ring-orange-500"
                                disabled={!minSelectableDate || !maxSelectableDate || (solicitudActual?.estado === EstadoSolicitudInvitados.ENVIADA && !isEditable)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {solicitudActual && (
                    <div className="flex justify-between items-center p-4 bg-muted/30 rounded-xl border border-dashed text-sm">
                      <div className="flex items-center gap-2">
                        <Info className="h-4 w-4 text-blue-500" />
                        <span>Estado actual:</span>
                        {getEstadoBadge(solicitudActual.estado)}
                      </div>
                      <div className="hidden sm:block text-xs text-muted-foreground italic">
                        Modificada: {formatDate(solicitudActual.fechaUltimaModificacion, "dd/MM HH:mm")}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-4">
                    <Button 
                      type="button" 
                      onClick={() => setCurrentStep(2)}
                      className="bg-orange-500 hover:bg-orange-600 h-12 px-8 rounded-xl shadow-lg transition-all"
                    >
                      Siguiente: Agregar Invitados <PlusCircle className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                </div>
              )}

              {/* PASO 2: AGREGAR INVITADOS */}
              {currentStep === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                  {/* Invitados Frecuentes - Vista más compacta */}
                  {invitadosFrecuentes.length > 0 && (
                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                      <Button 
                        type="button"
                        variant="ghost" 
                        className="w-full flex justify-between items-center h-auto py-2 hover:bg-transparent"
                        onClick={() => setMostrarFrecuentes(!mostrarFrecuentes)}
                      >
                        <div className="flex items-center gap-2 font-semibold text-gray-700">
                          <Users className="w-5 h-5 text-orange-500" />
                          Invitados Frecuentes
                        </div>
                        {mostrarFrecuentes ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </Button>
                      
                      {mostrarFrecuentes && (
                        <div className="mt-4 space-y-3">
                          <ScrollArea className="max-h-[220px]">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pr-4">
                              {invitadosFrecuentes.map((inv) => (
                                <div 
                                  key={inv.id} 
                                  className="p-3 bg-white border rounded-xl flex items-center justify-between group hover:border-orange-300 transition-colors"
                                >
                                  <div onClick={() => agregarInvitadoFrecuente(inv)} className="flex-1 cursor-pointer">
                                    <p className="text-sm font-semibold">{inv.nombre} {inv.apellido}</p>
                                    <p className="text-[10px] text-gray-500">DNI: {inv.dni} • {inv.vecesUsado} usos</p>
                                  </div>
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => eliminarInvitadoFrecuente(inv.id)}>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                          <div className="flex gap-2">
                            <Button type="button" size="sm" onClick={cargarTodosLosFrecuentes} variant="outline" className="flex-1 text-xs rounded-lg">
                              Cargar Todos
                            </Button>
                            <Button type="button" size="sm" onClick={limpiarInvitadosActuales} variant="ghost" className="text-xs text-red-500 rounded-lg">
                              Limpiar Lista
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Lista de Invitados Actual */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        Lista de Invitados
                        <Badge variant="secondary" className="rounded-full">{fields.length}</Badge>
                      </h3>
                      {isEditable && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-orange-600 border-orange-200 hover:bg-orange-50 rounded-lg"
                          onClick={() => append(createDefaultInvitado())}
                        >
                          <UserPlus className="mr-2 h-4 w-4" /> Nuevo Invitado
                        </Button>
                      )}
                    </div>

                    {/* OCULTO TEMPORALMENTE - Carga Masiva Excel
                    {isEditable && currentStep === 2 && (
                       <div className="mb-4 p-4 bg-green-50 rounded-xl border border-green-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                         <div className="flex items-center gap-3">
                           <div className="p-2 bg-green-100 rounded-lg">
                             <FileSpreadsheet className="h-6 w-6 text-green-600" />
                           </div>
                           <div>
                             <h4 className="font-bold text-green-800 text-sm">Carga Masiva (Excel)</h4>
                             <p className="text-xs text-green-600 max-w-[250px] leading-tight">
                               Usa nuestra plantilla oficial. Columnas requeridas: Nombre, Apellido, DNI, Fecha de Nacimiento.
                             </p>
                           </div>
                         </div>
                         <div className="flex gap-2 w-full sm:w-auto">
                           <input 
                             type="file" 
                             accept=".xlsx, .xls" 
                             className="hidden" 
                             id="excel-upload"
                             onChange={handleFileUpload}
                           />
                           <Button 
                             type="button" 
                             variant="outline" 
                             className="flex-1 sm:flex-none text-green-700 border-green-200 hover:bg-green-100 h-9 text-xs"
                             onClick={descargarPlantillaExcel}
                           >
                             <Download className="mr-2 h-3 w-3" /> Plantilla
                           </Button>
                           <Button 
                             type="button" 
                             className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white h-9 text-xs shadow-sm"
                             onClick={() => document.getElementById('excel-upload')?.click()}
                           >
                             <Upload className="mr-2 h-3 w-3" /> Subir Excel
                           </Button>
                         </div>
                       </div>
                    )}
                    FIN OCULTO TEMPORALMENTE */}

                    <div className="space-y-4">
                      {fields.map((item, index) => (
                        <div key={item.id} className="relative group">
                          <Card className="border shadow-none rounded-2xl overflow-hidden hover:border-orange-300">
                            <div className="bg-muted/30 px-4 py-2 flex justify-between items-center border-b">
                              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Invitado #{index + 1}</span>
                              {isEditable && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-red-400 hover:text-red-500 hover:bg-red-50"
                                  onClick={() => remove(index)}
                                  disabled={fields.length <= 1 && !item.nombre && !item.apellido && !item.dni}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                            <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name={`listaInvitadosDiarios.${index}.nombre`}
                                render={({ field }) => (
                                  <div className="space-y-1">
                                    <FormLabel className="text-[10px] uppercase font-bold text-gray-400 ml-1">Nombre</FormLabel>
                                    <FormControl><Input placeholder="Ej: Juan" {...field} className="h-10 rounded-lg bg-gray-50/50 border-gray-200" disabled={!isEditable} /></FormControl>
                                  </div>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`listaInvitadosDiarios.${index}.apellido`}
                                render={({ field }) => (
                                  <div className="space-y-1">
                                    <FormLabel className="text-[10px] uppercase font-bold text-gray-400 ml-1">Apellido</FormLabel>
                                    <FormControl><Input placeholder="Ej: Perez" {...field} className="h-10 rounded-lg bg-gray-50/50 border-gray-200" disabled={!isEditable}/></FormControl>
                                  </div>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`listaInvitadosDiarios.${index}.dni`}
                                render={({ field }) => (
                                  <div className="space-y-1">
                                    <FormLabel className="text-[10px] uppercase font-bold text-gray-400 ml-1">DNI</FormLabel>
                                    <FormControl><Input type="number" placeholder="DNI sin puntos" {...field} className="h-10 rounded-lg bg-gray-50/50 border-gray-200 font-mono" disabled={!isEditable}/></FormControl>
                                  </div>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`listaInvitadosDiarios.${index}.fechaNacimiento`}
                                render={({ field }) => (
                                  <div className="space-y-1">
                                    <FormLabel className="text-[10px] uppercase font-bold text-gray-400 ml-1">F. Nacimiento</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="date"
                                        value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                                        onChange={(e) => field.onChange(e.target.value ? parseISO(e.target.value) : null)}
                                        max={maxBirthDate}
                                        className="h-10 rounded-lg bg-gray-50/50 border-gray-200"
                                        disabled={!maxBirthDate || !isEditable}
                                      />
                                    </FormControl>
                                  </div>
                                )}
                              />
                            </CardContent>
                          </Card>
                        </div>
                      ))}
                    </div>


                   {/* Botón Duplicado al Final para UX */}
                   {isEditable && fields.length > 3 && (
                        <div className="flex justify-center pt-2 pb-4 animate-in fade-in slide-in-from-bottom-2">
                             <Button
                                type="button"
                                variant="outline"
                                className="w-full sm:w-auto min-w-[200px] border-dashed border-2 border-orange-200 text-orange-600 hover:border-orange-400 hover:bg-orange-50 h-12 rounded-xl"
                                onClick={() => append(createDefaultInvitado())}
                              >
                                <PlusCircle className="mr-2 h-5 w-5" /> Agregar otro invitado
                              </Button>
                        </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-6 border-t">
                    <Button type="button" variant="ghost" onClick={() => setCurrentStep(1)} className="text-gray-500">
                      Atrás
                    </Button>
                    <Button 
                      type="button" 
                      onClick={irAPaso3}
                      className="bg-orange-500 hover:bg-orange-600 h-12 px-8 rounded-xl shadow-lg transition-all"
                    >
                      Siguiente: Finalizar <ListChecks className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                </div>
              )}

              {/* PASO 3: REVISIÓN Y ENVÍO */}
              {currentStep === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 space-y-4">
                    <h4 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                      <ListChecks className="w-6 h-6" /> 
                      Resumen de la Lista
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-white p-3 rounded-xl border border-blue-200">
                        <p className="text-xs text-blue-400 uppercase font-bold mb-1">Fecha</p>
                        <p className="font-semibold text-blue-900">{format(selectedDate, "dd/MM/yyyy")}</p>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-blue-200">
                        <p className="text-xs text-blue-400 uppercase font-bold mb-1">Total Invitados</p>
                        <p className="font-semibold text-blue-900">{fields.length} personas</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h5 className="text-sm font-bold text-gray-600 uppercase tracking-widest ml-1">Verificación Final</h5>
                    <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                      {invitadosParaVerificacion.map((inv, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-white border rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-500">
                              {idx + 1}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-800">{inv.nombre} {inv.apellido}</p>
                              <p className="text-[10px] text-gray-500 font-mono">DNI: {inv.dni}</p>
                            </div>
                          </div>
                          {!inv.nombre?.trim() || !inv.apellido?.trim() || !inv.dni?.trim() ? (
                            <Badge variant="destructive" className="animate-pulse">Incompleto</Badge>
                          ) : (
                            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Listo</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
                    <Button type="button" variant="ghost" onClick={() => setCurrentStep(2)} className="text-gray-500 flex-1">
                      Volver a editar
                    </Button>
                    
                    <div className="flex gap-2 flex-[2]">
                      {puedeEnviar && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              type="button"
                              className="bg-green-600 hover:bg-green-700 h-12 px-6 rounded-xl shadow-lg flex-1"
                            >
                              <Send className="mr-2 h-4 w-4" /> 
                              {solicitudActual?.estado === EstadoSolicitudInvitados.ENVIADA ? 'Actualizar' : 'Enviar'}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className={`rounded-2xl border-none shadow-2xl ${hayMenoresDe3 ? 'bg-red-50' : ''}`}>
                            <AlertDialogHeader>
                              <AlertDialogTitle className={`text-xl font-bold flex items-center gap-2 ${hayMenoresDe3 ? 'text-red-600' : 'text-green-600'}`}>
                                {hayMenoresDe3 ? (
                                  <>
                                    <Info className="w-6 h-6" />
                                    ¡Atención: Menores de 3 años!
                                  </>
                                ) : (
                                  <>
                                    <Send className="w-5 h-5" />
                                    {solicitudActual?.estado === EstadoSolicitudInvitados.ENVIADA ? '¿Actualizar la Lista?' : '¿Enviar Lista de Invitados?'}
                                  </>
                                )}
                              </AlertDialogTitle>
                              <AlertDialogDescriptionAlertDialog className={`${hayMenoresDe3 ? 'text-red-700' : 'text-gray-600'}`}>
                                {hayMenoresDe3 ? (
                                  <div className="space-y-3">
                                    <p className="font-bold text-lg">Los menores de 3 años no tienen permitido el ingreso a la pileta.</p>
                                    <p>¿Deseas confirmar el envío de la lista o prefieres volver para editarla?</p>
                                  </div>
                                ) : (
                                  solicitudActual?.estado === EstadoSolicitudInvitados.ENVIADA
                                    ? 'Se guardarán los cambios en la lista ya enviada. Asegúrate de que todos los datos son correctos.'
                                    : <>Una vez enviada, la lista para el <strong>{formatDate(selectedDateISO)}</strong> estará confirmada para que el portero la vea. Podrás seguir agregando invitados después si es necesario.</>
                                )}
                              </AlertDialogDescriptionAlertDialog>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="pt-4">
                              <AlertDialogCancel className="rounded-xl">
                                {hayMenoresDe3 ? 'Volver y Editar' : 'Revisar de nuevo'}
                              </AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={handleConfirmarYEnviar} 
                                className={`rounded-xl px-8 ${hayMenoresDe3 ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                              >
                                {hayMenoresDe3 ? 'Entendido, enviar' : '¡Todo listo, enviar!'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </form>
        </Form>
      </Card>
    </FormProvider>
  );
}
