
'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { PlusCircle, Trash2, Users, CalendarDate, Info } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, formatISO, isToday, parseISO } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const STORAGE_KEY = 'invitadosDiariosDB';

export function GestionInvitadosDiarios() {
  const [solicitudHoy, setSolicitudHoy] = useState<SolicitudInvitadosDiarios | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { loggedInUserNumeroSocio, userName } = useAuth();
  const todayISO = formatISO(new Date(), { representation: 'date' });

  const form = useForm<SolicitudInvitadosDiarios>({
    resolver: zodResolver(solicitudInvitadosDiariosSchema),
    defaultValues: {
      id: generateId(),
      idSocioTitular: loggedInUserNumeroSocio || '',
      nombreSocioTitular: userName || '',
      fecha: todayISO,
      listaInvitadosDiarios: [{ nombre: '', apellido: '', dni: '', ingresado: false }],
      titularIngresadoEvento: false,
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "listaInvitadosDiarios",
  });

  const loadSolicitudHoy = useCallback(() => {
    setLoading(true);
    if (!loggedInUserNumeroSocio) {
        setLoading(false);
        return;
    }
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (storedData) {
      const allSolicitudes: SolicitudInvitadosDiarios[] = JSON.parse(storedData);
      const userSolicitudHoy = allSolicitudes.find(s => 
        s.idSocioTitular === loggedInUserNumeroSocio && 
        s.fecha === todayISO
      );
      setSolicitudHoy(userSolicitudHoy || null);
      if (userSolicitudHoy) {
        form.reset(userSolicitudHoy);
        // Ensure field array is correctly populated
        replace(userSolicitudHoy.listaInvitadosDiarios.length > 0 ? userSolicitudHoy.listaInvitadosDiarios : [{ nombre: '', apellido: '', dni: '', ingresado: false }]);
      } else {
        form.reset({
            id: generateId(),
            idSocioTitular: loggedInUserNumeroSocio,
            nombreSocioTitular: userName || '',
            fecha: todayISO,
            listaInvitadosDiarios: [{ nombre: '', apellido: '', dni: '', ingresado: false }],
            titularIngresadoEvento: false,
        });
        replace([{ nombre: '', apellido: '', dni: '', ingresado: false }]);
      }
    } else {
        form.reset({
            id: generateId(),
            idSocioTitular: loggedInUserNumeroSocio,
            nombreSocioTitular: userName || '',
            fecha: todayISO,
            listaInvitadosDiarios: [{ nombre: '', apellido: '', dni: '', ingresado: false }],
            titularIngresadoEvento: false,
        });
        replace([{ nombre: '', apellido: '', dni: '', ingresado: false }]);
    }
    setLoading(false);
  }, [loggedInUserNumeroSocio, userName, todayISO, form, replace]);

  useEffect(() => {
    loadSolicitudHoy();
  }, [loadSolicitudHoy]);
  
  useEffect(() => {
    // Update default values if auth info loads after initial setup
    if (loggedInUserNumeroSocio && userName) {
        if (!form.getValues('idSocioTitular')) {
            form.setValue('idSocioTitular', loggedInUserNumeroSocio);
            form.setValue('nombreSocioTitular', userName);
        }
        if (form.getValues('fecha') !== todayISO) {
            form.setValue('fecha', todayISO);
        }
    }
  }, [loggedInUserNumeroSocio, userName, todayISO, form]);


  const onSubmit = (data: SolicitudInvitadosDiarios) => {
    const allSolicitudesFromStorage: SolicitudInvitadosDiarios[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const existingIndex = allSolicitudesFromStorage.findIndex(s => s.id === data.id);

    if (existingIndex > -1) {
      allSolicitudesFromStorage[existingIndex] = data;
      toast({ title: "Lista Actualizada", description: "Tu lista de invitados para hoy ha sido actualizada." });
    } else {
      allSolicitudesFromStorage.push(data);
      toast({ title: "Lista Guardada", description: "Tu lista de invitados para hoy ha sido registrada." });
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allSolicitudesFromStorage));
    window.dispatchEvent(new Event('invitadosDiariosDBUpdated')); // Notify other components
    loadSolicitudHoy(); // Reload to reflect changes
  };


  if (loading) {
    return <p>Cargando información de invitados...</p>;
  }

  return (
    <FormProvider {...form}>
      <Card className="w-full max-w-2xl mx-auto shadow-xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <CardTitle className="text-2xl flex items-center"><Users className="mr-3 h-7 w-7 text-primary" />Carga de Invitados para Hoy</CardTitle>
          </div>
          <CardDescription>
            Registra aquí a tus invitados para el día de hoy ({format(parseISO(todayISO), "dd 'de' MMMM yyyy")}). Puedes agregar hasta {MAX_INVITADOS_DIARIOS} invitados.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
               <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Importante</AlertTitle>
                  <AlertDescription>
                    Recuerda que como socio titular debes registrar tu ingreso en portería antes de que tus invitados puedan acceder.
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
                          disabled={fields.length <= 1 && index === 0}
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
                              <FormItem className="sm:col-span-2">
                                <FormLabel className="text-xs">DNI</FormLabel>
                                <FormControl><Input type="number" placeholder="DNI (sin puntos)" {...field} className="h-9 text-sm"/></FormControl>
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
                    onClick={() => append({ id: generateId(), nombre: '', apellido: '', dni: '', ingresado: false })}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" /> Agregar Invitado
                  </Button>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={form.formState.isSubmitting || !loggedInUserNumeroSocio}>
                {form.formState.isSubmitting ? 'Guardando...' : (solicitudHoy ? 'Actualizar Lista de Hoy' : 'Guardar Lista de Hoy')}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </FormProvider>
  );
}
