
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { SolicitudInvitadosDiarios, InvitadoDiario } from '@/types';
import { solicitudInvitadosDiariosSchema } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardFooter, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, generateId } from '@/lib/helpers';
import { PlusCircle, Trash2, Users, Info, CalendarDays } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, formatISO, parseISO, isValid, addDays } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getSolicitudInvitadosDiarios, addOrUpdateSolicitudInvitadosDiarios } from '@/lib/firebase/firestoreService';
import { Skeleton } from '@/components/ui/skeleton';

const createDefaultInvitado = (): InvitadoDiario => ({
  id: generateId(),
  nombre: '',
  apellido: '',
  dni: '',
  fechaNacimiento: undefined,
  ingresado: false,
  metodoPago: null,
});

export function GestionInvitadosDiarios() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [solicitudActual, setSolicitudActual] = useState<SolicitudInvitadosDiarios | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { loggedInUserNumeroSocio, userName, isLoading: authIsLoading } = useAuth();
  const [maxBirthDate, setMaxBirthDate] = useState<string>('');
  const [minSelectableDate, setMinSelectableDate] = useState<string>('');
  const [maxSelectableDate, setMaxSelectableDate] = useState<string>('');

  useEffect(() => {
    const today = new Date();
    setMaxBirthDate(format(today, 'yyyy-MM-dd'));
    setMinSelectableDate(format(today, 'yyyy-MM-dd'));
    setMaxSelectableDate(format(addDays(today, 2), 'yyyy-MM-dd'));
  }, []);

  const selectedDateISO = useMemo(() => formatISO(selectedDate, { representation: 'date' }), [selectedDate]);
  
  const form = useForm<SolicitudInvitadosDiarios>({
    resolver: zodResolver(solicitudInvitadosDiariosSchema),
    defaultValues: {
      id: generateId(),
      idSocioTitular: '',
      nombreSocioTitular: '',
      fecha: selectedDateISO,
      listaInvitadosDiarios: [createDefaultInvitado()],
      titularIngresadoEvento: false,
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "listaInvitadosDiarios",
  });

  const loadSolicitudParaFecha = useCallback(async () => {
    if (!loggedInUserNumeroSocio && !authIsLoading) {
        form.reset({
            id: generateId(),
            idSocioTitular: '',
            nombreSocioTitular: '',
            fecha: selectedDateISO,
            listaInvitadosDiarios: [createDefaultInvitado()],
            titularIngresadoEvento: false,
        });
        setSolicitudActual(null);
        setLoading(false);
        return;
    }
    if (authIsLoading || !loggedInUserNumeroSocio) {
      setLoading(false); 
      return;
    }

    setLoading(true);
    try {
        const userSolicitud = await getSolicitudInvitadosDiarios(loggedInUserNumeroSocio, selectedDateISO);
        setSolicitudActual(userSolicitud || null);

        if (userSolicitud) {
            form.reset({
              ...userSolicitud,
              fecha: selectedDateISO, // Ensure form date matches selectedDateISO
              listaInvitadosDiarios: userSolicitud.listaInvitadosDiarios.length > 0 
                ? userSolicitud.listaInvitadosDiarios.map(inv => ({
                    ...inv,
                    id: inv.id || generateId(),
                    fechaNacimiento: inv.fechaNacimiento && typeof inv.fechaNacimiento === 'string' 
                                      ? parseISO(inv.fechaNacimiento) 
                                      : inv.fechaNacimiento instanceof Date ? inv.fechaNacimiento : undefined,
                  }))
                : [createDefaultInvitado()],
            });
        } else {
            form.reset({
                id: generateId(),
                idSocioTitular: loggedInUserNumeroSocio,
                nombreSocioTitular: userName || '',
                fecha: selectedDateISO,
                listaInvitadosDiarios: [createDefaultInvitado()],
                titularIngresadoEvento: false,
            });
        }
    } catch (error) {
        console.error("Error cargando solicitud de invitados diarios:", error);
        toast({ title: "Error", description: "No se pudo cargar la lista de invitados.", variant: "destructive"});
        form.reset({
            id: generateId(),
            idSocioTitular: loggedInUserNumeroSocio,
            nombreSocioTitular: userName || '',
            fecha: selectedDateISO,
            listaInvitadosDiarios: [createDefaultInvitado()],
            titularIngresadoEvento: false,
        });
    } finally {
        setLoading(false);
    }
  }, [loggedInUserNumeroSocio, userName, selectedDateISO, form, toast, authIsLoading]);

  useEffect(() => {
    if (!authIsLoading) {
      loadSolicitudParaFecha();
    }
  }, [authIsLoading, loadSolicitudParaFecha, selectedDateISO]); // Added selectedDateISO

  useEffect(() => {
    if (loggedInUserNumeroSocio && userName && !authIsLoading) {
        const currentFormTitular = form.getValues('idSocioTitular');
        if (!currentFormTitular || currentFormTitular !== loggedInUserNumeroSocio) {
            form.setValue('idSocioTitular', loggedInUserNumeroSocio);
            form.setValue('nombreSocioTitular', userName);
        }
        if (form.getValues('fecha') !== selectedDateISO) {
           form.setValue('fecha', selectedDateISO);
        }
    }
  }, [loggedInUserNumeroSocio, userName, selectedDateISO, form, authIsLoading]);


  const onSubmit = async (data: SolicitudInvitadosDiarios) => {
    if (!loggedInUserNumeroSocio) {
        toast({ title: "Error", description: "Usuario no identificado.", variant: "destructive"});
        return;
    }

    const dataToSave: SolicitudInvitadosDiarios = {
        ...data,
        idSocioTitular: loggedInUserNumeroSocio,
        nombreSocioTitular: userName || 'Socio',
        fecha: selectedDateISO, // Use the selected date
        id: solicitudActual?.id || data.id || generateId(),
        listaInvitadosDiarios: data.listaInvitadosDiarios.map(inv => ({
          ...inv,
          id: inv.id || generateId(),
          fechaNacimiento: inv.fechaNacimiento instanceof Date 
                            ? formatISO(inv.fechaNacimiento, { representation: 'date' }) 
                            : (typeof inv.fechaNacimiento === 'string' && isValid(parseISO(inv.fechaNacimiento)) ? inv.fechaNacimiento : undefined)
        }))
    };

    try {
        await addOrUpdateSolicitudInvitadosDiarios(dataToSave);
        toast({
          title: "Lista Guardada",
          description: (
            <div>
              <p>Tu lista de invitados para el {formatDate(selectedDateISO)} ha sido guardada/actualizada.</p>
              <p className="mt-2 font-semibold text-orange-600">Recuerde: Se solicitará DNI a cada uno de sus invitados para ingresar y para realizar la revisión médica.</p>
              <p className="mt-1 text-sm text-muted-foreground">Recuerde: Es responsable del comportamiento de sus invitados y puede ser sancionado.</p>
            </div>
          ),
          duration: 8000,
        });
        loadSolicitudParaFecha();
    } catch (error) {
        console.error("Error guardando solicitud de invitados diarios:", error);
        toast({ title: "Error", description: "No se pudo guardar la lista de invitados.", variant: "destructive"});
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = parseISO(e.target.value);
    if (isValid(newDate)) {
        setSelectedDate(newDate);
    }
  };


  if (authIsLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10 space-y-4">
        <p className="text-muted-foreground">Cargando información de invitados...</p>
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-64 w-full max-w-2xl" />
        <Skeleton className="h-10 w-1/3" />
      </div>
    );
  }

  return (
    <FormProvider {...form}>
      <Card className="w-full max-w-2xl mx-auto shadow-xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <CardTitle className="text-2xl flex items-center"><Users className="mr-3 h-7 w-7 text-primary" />Carga de Invitados</CardTitle>
          </div>
          <CardDescription>
            Registra aquí a tus invitados para el día: {format(selectedDate, "dd 'de' MMMM yyyy", { locale: es })}.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="space-y-2">
                    <FormLabel htmlFor="selected-event-date" className="text-sm font-medium flex items-center">
                        <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground"/>
                        Seleccionar Fecha para Cargar Invitados
                    </FormLabel>
                    <Input
                        id="selected-event-date"
                        type="date"
                        value={format(selectedDate, 'yyyy-MM-dd')}
                        onChange={handleDateChange}
                        min={minSelectableDate}
                        max={maxSelectableDate}
                        className="w-full sm:w-[280px]"
                        disabled={!minSelectableDate || !maxSelectableDate}
                    />
                    <FormMessage>{form.formState.errors.fecha?.message}</FormMessage>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Importante</AlertTitle>
                  <AlertDescription>
                    Recuerda que como socio titular debes registrar tu ingreso en portería antes de que tus invitados puedan acceder. Los invitados deben abonar una entrada.
                  </AlertDescription>
                </Alert>

                <div>
                  <h3 className="text-lg font-medium mb-1">Lista de Invitados ({fields.length})</h3>
                  <p className="text-xs text-muted-foreground mb-3">Nombre, Apellido, DNI y Fecha de Nacimiento son obligatorios.</p>
                  
                  <ScrollArea className="max-h-[500px]"> 
                    <div className="space-y-4 pr-3">
                      {fields.map((item, index) => (
                        <Card key={item.id} className="p-4 relative bg-muted/30">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 h-7 w-7 text-destructive hover:bg-destructive/10"
                            onClick={() => remove(index)}
                            disabled={fields.length <= 1 && index === 0 && !item.nombre && !item.apellido && !item.dni && !item.fechaNacimiento}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <p className="text-sm font-semibold mb-2">Invitado {index + 1}</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                            <FormField
                              control={form.control}
                              name={`listaInvitadosDiarios.${index}.nombre`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Nombre</FormLabel>
                                  <FormControl><Input placeholder="Nombre" {...field} className="h-9 text-sm"/></FormControl>
                                  <FormMessage className="text-xs"/>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`listaInvitadosDiarios.${index}.apellido`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Apellido</FormLabel>
                                  <FormControl><Input placeholder="Apellido" {...field} className="h-9 text-sm"/></FormControl>
                                  <FormMessage className="text-xs"/>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`listaInvitadosDiarios.${index}.dni`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">DNI</FormLabel>
                                  <FormControl><Input type="number" placeholder="DNI (sin puntos)" {...field} className="h-9 text-sm"/></FormControl>
                                  <FormMessage className="text-xs"/>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`listaInvitadosDiarios.${index}.fechaNacimiento`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Fecha de Nacimiento</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="date"
                                      value={field.value ? format(new Date(field.value), 'yyyy-MM-dd') : ''}
                                      onChange={(e) => field.onChange(e.target.value ? parseISO(e.target.value) : null)}
                                      max={maxBirthDate}
                                      min="1900-01-01"
                                      className="w-full h-9 text-sm"
                                      disabled={!maxBirthDate}
                                    />
                                  </FormControl>
                                  <FormMessage className="text-xs"/>
                                </FormItem>
                              )}
                            />
                          </div>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                  {form.formState.errors.listaInvitadosDiarios && !form.formState.errors.listaInvitadosDiarios.root && (
                      <FormMessage className="text-xs mt-1">
                          {form.formState.errors.listaInvitadosDiarios.message}
                      </FormMessage>
                  )}
                  {form.formState.errors.listaInvitadosDiarios?.root && (
                       <FormMessage className="text-xs mt-1">
                          {form.formState.errors.listaInvitadosDiarios.root.message}
                      </FormMessage>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => append(createDefaultInvitado())}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" /> Agregar Invitado
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-6">
              <Button type="submit" disabled={form.formState.isSubmitting || !loggedInUserNumeroSocio || authIsLoading}>
                {form.formState.isSubmitting ? 'Guardando...' : (solicitudActual ? `Actualizar Lista para ${formatDate(selectedDateISO)}` : `Guardar Lista para ${formatDate(selectedDateISO)}`)}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </FormProvider>
  );
}

