
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Socio, Adherente } from '@/types';
import { adherenteFormSchema, EstadoSolicitudAdherente, EstadoAdherente, AdherenteFormData } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardFooter, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { generateId, getFileUrl } from '@/lib/helpers';
import { PlusCircle, Trash2, Edit2, Info, CheckCircle, XCircle, Hourglass, Users, UploadCloud, FileText, CalendarDays, Building, BadgeCheck } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getSocioByNumeroSocioOrDNI, updateSocio, uploadFile } from '@/lib/firebase/firestoreService';
import { format, parseISO, subYears } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';


const renderFilePreview = (
  fileList: FileList | null | undefined | string,
  fieldName: keyof AdherenteFormData,
  formInstance: ReturnType<typeof useForm<AdherenteFormData>>
) => {
  let fileNamePreview: string | null = null;
  let isExistingFile = typeof fileList === 'string' && fileList.startsWith('http');

  if (isExistingFile) {
    fileNamePreview = "Archivo cargado";
  } else if (typeof window !== 'undefined' && fileList instanceof FileList && fileList.length > 0) {
    fileNamePreview = fileList[0].name;
  }

  if (fileNamePreview) {
    return (
      <div className="mt-1 flex items-center space-x-2 p-1 border rounded-md bg-muted/30 text-xs">
        <BadgeCheck className="h-4 w-4 text-green-500" />
        <span className="text-muted-foreground truncate max-w-[120px]">
          {fileNamePreview}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => {
            formInstance.setValue(fieldName, null, { shouldValidate: true });
            formInstance.trigger(fieldName);
          }}
        >
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
      </div>
    );
  }
  return null;
};


export function GestionAdherentesSocio() {
  const { toast } = useToast();
  const { loggedInUserNumeroSocio, isLoading: authLoading } = useAuth();
  const [maxBirthDate, setMaxBirthDate] = useState<string>('');
  const queryClient = useQueryClient();

  const { data: socioData, isLoading: loading } = useQuery({
    queryKey: ['socio', loggedInUserNumeroSocio],
    queryFn: () => getSocioByNumeroSocioOrDNI(loggedInUserNumeroSocio!),
    enabled: !!loggedInUserNumeroSocio && !authLoading,
  });

  const { mutate: updateSocioMutation, isPending: isSubmitting } = useMutation({
    mutationFn: (updatedSocio: Socio) => updateSocio(updatedSocio),
    onError: (error) => {
      toast({ title: "Error", description: `No se pudo completar la operación: ${error.message}`, variant: "destructive" });
    },
  });

  useEffect(() => {
    const today = new Date();
    setMaxBirthDate(format(today, 'yyyy-MM-dd'));
  }, []);


  const form = useForm<AdherenteFormData>({
    resolver: zodResolver(adherenteFormSchema),
    mode: 'onBlur',
    defaultValues: {
      nombre: '',
      apellido: '',
      dni: '',
      fechaNacimiento: new Date(),
      empresa: '',
      telefono: '',
      direccion: '',
      email: '',
      fotoDniFrente: null,
      fotoDniDorso: null,
      fotoPerfil: null,
      fotoCarnet: null,
    },
  });


  const onSubmit = async (data: AdherenteFormData) => {
    if (!socioData) {
      toast({ title: 'Error', description: 'No se pudo cargar la información del socio.', variant: 'destructive' });
      return;
    }

    const uploadAndGetUrl = async (fileInput: any, pathSuffix: string): Promise<string | null> => {
        if (fileInput instanceof FileList && fileInput.length > 0) {
            return uploadFile(fileInput[0], `socios/${socioData.id}/${pathSuffix}`);
        }
        return null;
    };

    const adherenteId = generateId();

    const nuevoAdherente: Adherente = {
      id: adherenteId,
      nombre: data.nombre,
      apellido: data.apellido,
      dni: data.dni,
      empresa: data.empresa,
      telefono: data.telefono,
      direccion: data.direccion,
      email: data.email,
      fechaNacimiento: format(data.fechaNacimiento, "yyyy-MM-dd") as unknown as Date,
      fotoDniFrente: await uploadAndGetUrl(data.fotoDniFrente, `adherentes/${adherenteId}_dniFrente.jpg`),
      fotoDniDorso: await uploadAndGetUrl(data.fotoDniDorso, `adherentes/${adherenteId}_dniDorso.jpg`),
      fotoPerfil: await uploadAndGetUrl(data.fotoPerfil, `adherentes/${adherenteId}_perfil.jpg`),
      fotoCarnet: await uploadAndGetUrl(data.fotoCarnet, `adherentes/${adherenteId}_carnet.jpg`),
      estadoAdherente: EstadoAdherente.INACTIVO,
      estadoSolicitud: EstadoSolicitudAdherente.PENDIENTE,
      aptoMedico: { valido: false, razonInvalidez: 'Pendiente de revisión médica inicial' },
    };

    const updatedAdherentes = [...(socioData.adherentes || []), nuevoAdherente];

    updateSocioMutation({ ...socioData, adherentes: updatedAdherentes }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['socio', loggedInUserNumeroSocio] });
        toast({ title: 'Solicitud Enviada', description: `La solicitud para agregar a ${data.nombre} ${data.apellido} como adherente ha sido enviada.` });
        form.reset();
      },
      onError: (error) => {
        toast({ title: "Error", description: `No se pudo enviar la solicitud para el adherente: ${error.message}`, variant: "destructive" });
      }
    });
  };

  const handleSolicitarEliminacion = async (adherenteId?: string) => {
    if (!adherenteId || !socioData || !socioData.adherentes) return;

    const adherenteAEliminar = socioData.adherentes.find(a => a.id === adherenteId);
    if (!adherenteAEliminar) return;

    const updatedAdherentes = socioData.adherentes.map(a =>
      a.id === adherenteId
      ? { ...a, estadoSolicitud: EstadoSolicitudAdherente.PENDIENTE_ELIMINACION, motivoRechazo: "Solicitud de eliminación por el socio" }
      : a
    );

    updateSocioMutation({ ...socioData, adherentes: updatedAdherentes }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['socio', loggedInUserNumeroSocio] });
        toast({ title: 'Solicitud de Eliminación Enviada', description: `Se ha solicitado la eliminación de ${adherenteAEliminar.nombre}. Un administrador revisará la solicitud.` });
      },
      onError: (error) => {
         toast({ title: "Error", description: `No se pudo enviar la solicitud de eliminación: ${error.message}`, variant: "destructive" });
      }
    });
  };


  if (loading || authLoading) {
    return <p className="text-center py-10">Cargando información de adherentes...</p>;
  }

  if (!socioData) {
    return (
      <Card className="w-full max-w-lg mx-auto text-center py-10">
        <CardHeader><CardTitle>Error</CardTitle></CardHeader>
        <CardContent><p>No se pudo cargar la información del socio. Por favor, recargue o contacte a soporte.</p></CardContent>
      </Card>
    );
  }

  const adherentesPorEstado = (estado: EstadoSolicitudAdherente) =>
    socioData.adherentes?.filter(a => a.estadoSolicitud === estado && estado !== EstadoSolicitudAdherente.PENDIENTE_ELIMINACION) || [];

  const adherentesConSolicitudEliminacion = socioData.adherentes?.filter(a => a.estadoSolicitud === EstadoSolicitudAdherente.PENDIENTE_ELIMINACION) || [];


  const getStatusBadge = (adherente: Adherente) => {
    if (adherente.estadoSolicitud === EstadoSolicitudAdherente.PENDIENTE_ELIMINACION) {
       return <Badge variant="destructive" className="bg-orange-600 hover:bg-orange-700"><Hourglass className="mr-1.5 h-3 w-3" /> Eliminación Pendiente</Badge>;
    }
    switch (adherente.estadoSolicitud) {
      case EstadoSolicitudAdherente.PENDIENTE:
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600"><Hourglass className="mr-1.5 h-3 w-3" /> Pendiente Aprobación</Badge>;
      case EstadoSolicitudAdherente.APROBADO:
        return <Badge className={`${adherente.estadoAdherente === EstadoAdherente.ACTIVO ? 'bg-green-500 hover:bg-green-600' : 'bg-slate-500 hover:bg-slate-600'}`}><CheckCircle className="mr-1.5 h-3 w-3" /> {adherente.estadoAdherente}</Badge>;
      case EstadoSolicitudAdherente.RECHAZADO:
        return <Badge variant="destructive"><XCircle className="mr-1.5 h-3 w-3" /> Rechazado</Badge>;
      default:
        return <Badge variant="secondary">Desconocido</Badge>;
    }
  };


  return (
    <div className="space-y-8">
      <Card className="w-full max-w-3xl mx-auto shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center"><Users className="mr-3 h-7 w-7 text-primary" />Mis Adherentes</CardTitle>
          <CardDescription>
            Aquí puedes proponer nuevos adherentes para tu cuenta (ej. amigos). Las solicitudes serán revisadas por administración. El adherente también deberá completar su revisión médica.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-4 border rounded-md bg-background mb-8">
              <h3 className="text-lg font-semibold text-primary border-b pb-2 mb-4">Proponer Nuevo Adherente</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <FormField control={form.control} name="nombre" render={({ field }) => ( <FormItem> <FormLabel>Nombre</FormLabel> <FormControl><Input placeholder="Nombre del adherente" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                <FormField control={form.control} name="apellido" render={({ field }) => ( <FormItem> <FormLabel>Apellido</FormLabel> <FormControl><Input placeholder="Apellido del adherente" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                <FormField control={form.control} name="dni" render={({ field }) => ( <FormItem> <FormLabel>DNI</FormLabel> <FormControl><Input type="number" placeholder="DNI (sin puntos)" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                <FormField
                  control={form.control}
                  name="fechaNacimiento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de Nacimiento</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                          <Input
                            type="date"
                            value={field.value ? format(new Date(field.value), 'yyyy-MM-dd') : ''}
                            onChange={(e) => field.onChange(e.target.value ? parseISO(e.target.value) : null)}
                            max={maxBirthDate}
                            min="1900-01-01"
                            className="w-full pl-10"
                            disabled={!maxBirthDate}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="empresa"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Empresa / Sindicato</FormLabel>
                       <FormControl>
                        <div className="relative">
                           <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                           <Input placeholder="Nombre de la empresa o sindicato" {...field} className="pl-10" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField control={form.control} name="telefono" render={({ field }) => ( <FormItem> <FormLabel>Teléfono (Opcional)</FormLabel> <FormControl><Input type="tel" placeholder="Teléfono de contacto" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                <FormField control={form.control} name="email" render={({ field }) => ( <FormItem> <FormLabel>Email (Opcional)</FormLabel> <FormControl><Input type="email" placeholder="Email de contacto" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                 <FormField control={form.control} name="direccion" render={({ field }) => ( <FormItem className="md:col-span-2"> <FormLabel>Dirección (Opcional)</FormLabel> <FormControl><Input placeholder="Dirección del adherente" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
              </div>

              <Separator className="my-6" />
              <h4 className="text-md font-semibold mb-3">Documentación del Adherente</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  {(['fotoDniFrente', 'fotoDniDorso', 'fotoPerfil', 'fotoCarnet'] as const).map(docType => {
                      const isOptional = docType === 'fotoCarnet';
                      let labelText = '';
                        switch(docType) {
                            case 'fotoDniFrente': labelText = 'DNI Frente'; break;
                            case 'fotoDniDorso': labelText = 'DNI Dorso'; break;
                            case 'fotoPerfil': labelText = 'Foto Perfil'; break;
                            case 'fotoCarnet': labelText = 'Foto Carnet (Opcional)'; break;
                        }
                      const placeholderText = docType === 'fotoPerfil' || docType === 'fotoCarnet' ? "Subir foto (PNG, JPG)" : "Subir DNI (PNG, JPG, PDF)";

                      return (
                        <FormField
                            control={form.control}
                            name={docType}
                            key={docType}
                            render={({ field }) => {
                              const hasFileSelected = typeof window !== 'undefined' && field.value instanceof FileList && field.value.length > 0;
                              return (
                                <FormItem>
                                    <FormLabel>{labelText}</FormLabel>
                                    <FormControl>
                                        <label className="cursor-pointer w-full min-h-[100px] flex flex-col items-center justify-center p-3 border-2 border-dashed rounded-md hover:border-primary bg-background hover:bg-muted/50 transition-colors">
                                            <UploadCloud className="h-6 w-6 text-muted-foreground mb-1" />
                                            <span className="text-xs text-muted-foreground text-center">
                                              {!hasFileSelected ? placeholderText : null}
                                            </span>
                                            <Input
                                              type="file"
                                              className="hidden"
                                              onChange={e => {
                                                field.onChange(e.target.files);
                                                form.trigger(docType);
                                              }}
                                              accept={docType === 'fotoPerfil' || docType === 'fotoCarnet' ? "image/png,image/jpeg" : "image/png,image/jpeg,application/pdf"}
                                              ref={field.ref}
                                              name={field.name}
                                              onBlur={field.onBlur}
                                            />
                                        </label>
                                    </FormControl>
                                    {renderFilePreview(field.value, docType, form)}
                                    <FormMessage />
                                </FormItem>
                              );
                            }}
                          />
                      );
                  })}
              </div>

              <Button type="submit" className="mt-6 w-full sm:w-auto" disabled={isSubmitting}>
                <PlusCircle className="mr-2 h-4 w-4" /> {isSubmitting ? 'Enviando...' : 'Enviar Solicitud de Adherente'}
              </Button>
            </form>
          </FormProvider>

          <Separator className="my-8" />

          {(!socioData.adherentes || socioData.adherentes.length === 0) && (
            <p className="text-center text-muted-foreground py-6">Aún no has propuesto adherentes.</p>
          )}

          {[
            { title: "Adherentes Aprobados", adherentes: adherentesPorEstado(EstadoSolicitudAdherente.APROBADO) },
            { title: "Adherentes con Solicitud Pendiente", adherentes: adherentesPorEstado(EstadoSolicitudAdherente.PENDIENTE) },
            { title: "Adherentes con Solicitud Rechazada", adherentes: adherentesPorEstado(EstadoSolicitudAdherente.RECHAZADO) },
            { title: "Adherentes con Eliminación Solicitada", adherentes: adherentesConSolicitudEliminacion },
          ].map(group => group.adherentes.length > 0 && (
            <div key={group.title} className="mb-6">
              <h3 className="text-xl font-semibold mb-3 text-foreground">{group.title} ({group.adherentes.length})</h3>
              <div className="space-y-3">
                {group.adherentes.map(adherente => (
                  <Card key={adherente.id} className="p-4 bg-card shadow-sm">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div>
                        <p className="font-semibold text-foreground">{adherente.nombre} {adherente.apellido}</p>
                        <p className="text-xs text-muted-foreground">DNI: {adherente.dni}</p>
                        {adherente.telefono && <p className="text-xs text-muted-foreground">Tel: {adherente.telefono}</p>}
                        {adherente.email && <p className="text-xs text-muted-foreground">Email: {adherente.email}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-2 mt-2 sm:mt-0">
                        {getStatusBadge(adherente)}
                        {adherente.estadoSolicitud === EstadoSolicitudAdherente.RECHAZADO && adherente.motivoRechazo && (
                          <p className="text-xs text-destructive mt-1">Motivo: {adherente.motivoRechazo}</p>
                        )}
                        {adherente.estadoSolicitud === EstadoSolicitudAdherente.APROBADO && (
                           <Button
                             variant="outline"
                             size="sm"
                             className="mt-1 text-xs"
                             onClick={() => handleSolicitarEliminacion(adherente.id)}
                           >
                             <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Solicitar Eliminación
                           </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
