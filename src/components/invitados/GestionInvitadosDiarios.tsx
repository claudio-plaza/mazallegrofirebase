
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { SolicitudInvitadosDiarios, InvitadoDiario } from '@/types';
import { solicitudInvitadosDiariosSchema, MAX_INVITADOS_DIARIOS } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardFooter, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, generateId } from '@/lib/helpers';
import { PlusCircle, Trash2, Users, CalendarDate, Info, CalendarDays } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, formatISO, isToday, parseISO } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getSolicitudInvitadosDiarios, addOrUpdateSolicitudInvitadosDiarios } from '@/lib/firebase/firestoreService';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from "@/lib/utils";
import { es } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

// Define createDefaultInvitado outside or use useMemo for stability
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
  const [solicitudHoy, setSolicitudHoy] = useState<SolicitudInvitadosDiarios | null>(null);
  const [loading, setLoading] = useState(true); // Initial loading state for component's data
  const { toast } = useToast();
  const { loggedInUserNumeroSocio, userName, isLoading: authIsLoading } = useAuth(); // Auth loading state

  const todayISO = useMemo(() => formatISO(new Date(), { representation: 'date' }), []);
  const defaultInvitado = useMemo(() => createDefaultInvitado(), []);

  const form = useForm<SolicitudInvitadosDiarios>({
    resolver: zodResolver(solicitudInvitadosDiariosSchema),
    defaultValues: {
      id: generateId(),
      idSocioTitular: '', // Will be set by useEffect based on auth state
      nombreSocioTitular: '', // Will be set by useEffect
      fecha: todayISO,
      listaInvitadosDiarios: [defaultInvitado],
      titularIngresadoEvento: false,
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "listaInvitadosDiarios",
  });

  const loadSolicitudHoy = useCallback(async () => {
    if (!loggedInUserNumeroSocio) { // If no socio ID after auth, likely not a socio or error
        form.reset({
            id: generateId(),
            idSocioTitular: '',
            nombreSocioTitular: '',
            fecha: todayISO,
            listaInvitadosDiarios: [defaultInvitado],
            titularIngresadoEvento: false,
        });
        replace([defaultInvitado]);
        setSolicitudHoy(null);
        setLoading(false); // Ensure loading is false
        return;
    }

    setLoading(true); // Set loading true for this specific fetch operation
    try {
        const userSolicitudHoy = await getSolicitudInvitadosDiarios(loggedInUserNumeroSocio, todayISO);
        setSolicitudHoy(userSolicitudHoy || null);
        if (userSolicitudHoy) {
            form.reset({
              ...userSolicitudHoy,
              listaInvitadosDiarios: userSolicitudHoy.listaInvitadosDiarios.map(inv => ({
                ...inv,
                fechaNacimiento: inv.fechaNacimiento && typeof inv.fechaNacimiento === 'string' ? parseISO(inv.fechaNacimiento) : undefined,
              }))
            });
            replace(userSolicitudHoy.listaInvitadosDiarios.length > 0 ? userSolicitudHoy.listaInvitadosDiarios.map(inv => ({...inv, fechaNacimiento: inv.fechaNacimiento && typeof inv.fechaNacimiento === 'string' ? parseISO(inv.fechaNacimiento) : undefined })) : [defaultInvitado]);
        } else {
            form.reset({
                id: generateId(),
                idSocioTitular: loggedInUserNumeroSocio,
                nombreSocioTitular: userName || '',
                fecha: todayISO,
                listaInvitadosDiarios: [defaultInvitado],
                titularIngresadoEvento: false,
            });
            replace([defaultInvitado]);
        }
    } catch (error) {
        console.error("Error cargando solicitud de invitados diarios:", error);
        toast({ title: "Error", description: "No se pudo cargar la lista de invitados.", variant: "destructive"});
        form.reset({
            id: generateId(),
            idSocioTitular: loggedInUserNumeroSocio,
            nombreSocioTitular: userName || '',
            fecha: todayISO,
            listaInvitadosDiarios: [defaultInvitado],
            titularIngresadoEvento: false,
        });
        replace([defaultInvitado]);
    } finally {
        setLoading(false);
    }
  }, [loggedInUserNumeroSocio, userName, todayISO, form, replace, toast, defaultInvitado]); // authIsLoading removed as useEffect handles it

  useEffect(() => {
    if (!authIsLoading) { // Only proceed when auth is not loading
      loadSolicitudHoy();
    }
    // If authIsLoading is true, the main return (if (authIsLoading || loading)) will show "Cargando..."
  }, [authIsLoading, loadSolicitudHoy]); // Depend on authIsLoading and the stable loadSolicitudHoy

  useEffect(() => {
    // Effect to set titular info once auth is ready and if form doesn't have it yet
    if (loggedInUserNumeroSocio && userName && !authIsLoading) {
        const currentFormTitular = form.getValues('idSocioTitular');
        if (!currentFormTitular || currentFormTitular !== loggedInUserNumeroSocio) {
            form.setValue('idSocioTitular', loggedInUserNumeroSocio);
            form.setValue('nombreSocioTitular', userName);
             // Ensure fecha is also set correctly if not already todayISO
            if (form.getValues('fecha') !== todayISO) {
                form.setValue('fecha', todayISO);
            }
        }
    }
  }, [loggedInUserNumeroSocio, userName, todayISO, form, authIsLoading]);


  const onSubmit = async (data: SolicitudInvitadosDiarios) => {
    if (!loggedInUserNumeroSocio) {
        toast({ title: "Error", description: "Usuario no identificado.", variant: "destructive"});
        return;
    }
    
    const dataToSave: SolicitudInvitadosDiarios = {
        ...data,
        idSocioTitular: loggedInUserNumeroSocio,
        nombreSocioTitular: userName || 'Socio',
        fecha: todayISO,
        id: solicitudHoy?.id || data.id || generateId(),
        listaInvitadosDiarios: data.listaInvitadosDiarios.map(inv => ({
          ...inv, 
          id: inv.id || generateId(),
          fechaNacimiento: inv.fechaNacimiento && inv.fechaNacimiento instanceof Date ? formatISO(inv.fechaNacimiento, { representation: 'date' }) : undefined
        }))
    };

    try {
        await addOrUpdateSolicitudInvitadosDiarios(dataToSave);
        toast({ 
          title: "Lista Guardada", 
          description: (
            <div>
              <p>Tu lista de invitados para hoy ha sido guardada/actualizada.</p>
              <p className="mt-2 font-semibold text-orange-600">Recuerde: Se solicitará DNI a cada uno de sus invitados para ingresar y para realizar la revisión médica.</p>
            </div>
          ),
          duration: 7000, 
        });
        loadSolicitudHoy(); 
    } catch (error) {
        console.error("Error guardando solicitud de invitados diarios:", error);
        toast({ title: "Error", description: "No se pudo guardar la lista de invitados.", variant: "destructive"});
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
            <CardTitle className="text-2xl flex items-center"><Users className="mr-3 h-7 w-7 text-primary" />Carga de Invitados para Hoy</CardTitle>
          </div>
          <CardDescription>
            Registra aquí a tus invitados para el día de hoy ({format(parseISO(todayISO), "dd 'de' MMMM yyyy", { locale: es })}). Puedes agregar hasta {MAX_INVITADOS_DIARIOS} invitados. La fecha de nacimiento es opcional.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
               <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Importante</AlertTitle>
                  <AlertDescription>
                    Recuerda que como socio titular debes registrar tu ingreso en portería antes de que tus invitados puedan acceder. Los invitados deben abonar una entrada.
                  </AlertDescription>
                </Alert>
              
              <div>
                <h3 className="text-lg font-medium mb-1">Lista de Invitados ({fields.length}/{MAX_INVITADOS_DIARIOS})</h3>
                <p className="text-xs text-muted-foreground mb-3">Nombre, Apellido y DNI son obligatorios.</p>
                <ScrollArea className="max-h-[400px] pr-3">
                  <div className="space-y-4">
                    {fields.map((item, index) => (
                      <Card key={item.id} className="p-4 relative bg-muted/30">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 h-7 w-7 text-destructive hover:bg-destructive/10"
                          onClick={() => remove(index)}
                          disabled={fields.length <= 1 && index === 0 && !item.nombre && !item.apellido && !item.dni}
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
                              <FormItem className="flex flex-col">
                                <FormLabel className="text-xs">Fecha de Nacimiento (Opcional)</FormLabel>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant={"outline"}
                                        className={cn(
                                          "h-9 w-full justify-start text-left font-normal text-sm",
                                          !field.value && "text-muted-foreground"
                                        )}
                                      >
                                        <CalendarDays className="mr-2 h-4 w-4" />
                                        {field.value ? (
                                          format(field.value as Date, "PPP", { locale: es })
                                        ) : (
                                          <span>Seleccione fecha</span>
                                        )}
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={field.value as Date | undefined}
                                      onSelect={field.onChange}
                                      disabled={(date) =>
                                        date > new Date() || date < new Date("1900-01-01")
                                      }
                                      initialFocus
                                      locale={es}
                                      captionLayout="dropdown-buttons"
                                      fromYear={1900}
                                      toYear={new Date().getFullYear()}
                                    />
                                  </PopoverContent>
                                </Popover>
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

                {fields.length < MAX_INVITADOS_DIARIOS && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => append(defaultInvitado)}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" /> Agregar Invitado
                  </Button>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={form.formState.isSubmitting || !loggedInUserNumeroSocio || authIsLoading}>
                {form.formState.isSubmitting ? 'Guardando...' : (solicitudHoy ? 'Actualizar Lista de Hoy' : 'Guardar Lista de Hoy')}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </FormProvider>
  );
}
