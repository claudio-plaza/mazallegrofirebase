
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm, FormProvider, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, ChevronRight, PlusCircle, Trash2, UploadCloud, FileText as FileIcon, Users, Heart, UserSquare2, Lock, Info, MailQuestion, XSquare, CalendarDays } from 'lucide-react';
import { format, parseISO, isValid, subYears } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import {
  type AgregarFamiliaresData, agregarFamiliaresSchema,
  RelacionFamiliar, MAX_HIJOS, MAX_PADRES, type Socio, EstadoCambioGrupoFamiliar, MiembroFamiliar
} from '@/types';
import { getFileUrl, generateId } from '@/lib/helpers';
import { getSocioByNumeroSocioOrDNI, updateSocio } from '@/lib/firebase/firestoreService';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const totalSteps = 3;

export function AltaSocioMultiStepForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const { toast } = useToast();
  const { loggedInUserNumeroSocio, isLoading: authLoading } = useAuth();
  const [socioData, setSocioData] = useState<Socio | null>(null);
  const [loadingSocio, setLoadingSocio] = useState(true);
  const [existingGroupType, setExistingGroupType] = useState<'conyugeEHijos' | 'padresMadres' | null>(null);
  const [maxBirthDate, setMaxBirthDate] = useState<string>('');

  useEffect(() => {
    setMaxBirthDate(format(new Date(), 'yyyy-MM-dd'));
  }, []);

  const form = useForm<AgregarFamiliaresData>({
    resolver: async (data, context, options) => {
      let result;
      if (currentStep === 1) {
        const step1Schema = z.object({
          tipoGrupoFamiliar: z.enum(["conyugeEHijos", "padresMadres"], {
            required_error: "Debe seleccionar un tipo de grupo familiar.",
          }),
        });
        result = await zodResolver(step1Schema)(data, context, options);
      } else {
        result = await zodResolver(agregarFamiliaresSchema)(data, context, options);
      }
      return result;
    },
    mode: 'onChange',
    defaultValues: {
      tipoGrupoFamiliar: undefined,
      familiares: {
        conyuge: null,
        hijos: [],
        padres: [],
      }
    },
  });

  const { control, trigger, handleSubmit, watch, setValue, getValues, reset, formState: { errors } } = form;

  const { fields: hijosFields, append: appendHijo, remove: removeHijo } = useFieldArray({
    control,
    name: "familiares.hijos",
  });

  const { fields: padresFields, append: appendPadre, remove: removePadre } = useFieldArray({
    control,
    name: "familiares.padres",
  });

  const tipoGrupoFamiliar = watch("tipoGrupoFamiliar");

  const fetchSocioData = useCallback(async () => {
    if (!loggedInUserNumeroSocio || authLoading) return;
    setLoadingSocio(true);
    const data = await getSocioByNumeroSocioOrDNI(loggedInUserNumeroSocio);
    setSocioData(data);
    if (data) {
      let groupTypeDetermined: 'conyugeEHijos' | 'padresMadres' | null = null;

      if (data.grupoFamiliar?.some(f => f.relacion === RelacionFamiliar.CONYUGE) || data.grupoFamiliar?.some(f => f.relacion === RelacionFamiliar.HIJO_A)) {
        groupTypeDetermined = 'conyugeEHijos';
      } else if (data.grupoFamiliar?.some(f => f.relacion === RelacionFamiliar.PADRE_MADRE)) {
        groupTypeDetermined = 'padresMadres';
      }
      setExistingGroupType(groupTypeDetermined);

      const dataToDisplayOrEdit = data.estadoCambioGrupoFamiliar === EstadoCambioGrupoFamiliar.PENDIENTE && data.cambiosPendientesGrupoFamiliar
        ? data.cambiosPendientesGrupoFamiliar
        : {
            tipoGrupoFamiliar: groupTypeDetermined,
            familiares: {
              conyuge: data.grupoFamiliar?.find(f => f.relacion === RelacionFamiliar.CONYUGE) || null,
              hijos: data.grupoFamiliar?.filter(f => f.relacion === RelacionFamiliar.HIJO_A) || [],
              padres: data.grupoFamiliar?.filter(f => f.relacion === RelacionFamiliar.PADRE_MADRE) || [],
            }
          };

      setValue('tipoGrupoFamiliar', dataToDisplayOrEdit.tipoGrupoFamiliar || undefined);

      const conyugeData = dataToDisplayOrEdit.familiares?.conyuge;
      const hijosData = dataToDisplayOrEdit.familiares?.hijos;
      const padresData = dataToDisplayOrEdit.familiares?.padres;

      setValue('familiares.conyuge', conyugeData ? {
        ...conyugeData,
        fechaNacimiento: conyugeData.fechaNacimiento,
        fotoDniFrente: typeof conyugeData.fotoDniFrente === 'string' ? conyugeData.fotoDniFrente : null,
        fotoDniDorso: typeof conyugeData.fotoDniDorso === 'string' ? conyugeData.fotoDniDorso : null,
        fotoPerfil: typeof conyugeData.fotoPerfil === 'string' ? conyugeData.fotoPerfil : null,
      } : null);
      setValue('familiares.hijos', hijosData?.map(h => ({
        ...h,
        fechaNacimiento: h.fechaNacimiento,
        fotoDniFrente: typeof h.fotoDniFrente === 'string' ? h.fotoDniFrente : null,
        fotoDniDorso: typeof h.fotoDniDorso === 'string' ? h.fotoDniDorso : null,
        fotoPerfil: typeof h.fotoPerfil === 'string' ? h.fotoPerfil : null,
      })) || []);
      setValue('familiares.padres', padresData?.map(p => ({
        ...p,
        fechaNacimiento: p.fechaNacimiento,
        fotoDniFrente: typeof p.fotoDniFrente === 'string' ? p.fotoDniFrente : null,
        fotoDniDorso: typeof p.fotoDniDorso === 'string' ? p.fotoDniDorso : null,
        fotoPerfil: typeof p.fotoPerfil === 'string' ? p.fotoPerfil : null,
      })) || []);
    }
    setLoadingSocio(false);
  }, [loggedInUserNumeroSocio, authLoading, setValue]);

  useEffect(() => {
    fetchSocioData();
    window.addEventListener('sociosDBUpdated', fetchSocioData);
    return () => {
      window.removeEventListener('sociosDBUpdated', fetchSocioData);
    };
  }, [fetchSocioData]);


  const nextStep = async () => {
    let isValidStep = false;
    if (currentStep === 1) {
      isValidStep = await trigger(["tipoGrupoFamiliar"]);
    } else if (currentStep === 2) {
      isValidStep = await trigger(["familiares"]);
    } else {
      isValidStep = true;
    }

    if (isValidStep) {
      if (currentStep < totalSteps) {
        setCurrentStep(prev => prev + 1);
      }
    } else {
      let description = "Por favor, corrija los errores en el formulario.";
       if (currentStep === 1 && errors.tipoGrupoFamiliar) {
        description = errors.tipoGrupoFamiliar.message || "Por favor, seleccione un tipo de grupo familiar para continuar.";
      } else if (currentStep === 2 && errors.familiares && (errors.familiares as any).message) {
        description = (errors.familiares as any).message;
      } else if (currentStep === 2 && errors.familiares) {
        description = "Verifique los datos de los familiares.";
      }

      toast({
        title: "Error de Validación",
        description: description,
        variant: "destructive",
      });
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const onSubmit = async (data: AgregarFamiliaresData) => {
    if (!socioData) {
      toast({ title: "Error", description: "No se pudieron cargar los datos del socio titular.", variant: "destructive" });
      return;
    }
    if (socioData.estadoCambioGrupoFamiliar === EstadoCambioGrupoFamiliar.PENDIENTE) {
      toast({ title: "Solicitud en Curso", description: "Ya tiene una solicitud pendiente de aprobación.", variant: "default" });
      return;
    }

    const cambiosPropuestos: Required<Socio>['cambiosPendientesGrupoFamiliar'] = {
      tipoGrupoFamiliar: data.tipoGrupoFamiliar,
      familiares: {
        conyuge: data.familiares.conyuge ? {
          ...data.familiares.conyuge,
          id: data.familiares.conyuge.id || generateId(),
          fechaNacimiento: data.familiares.conyuge.fechaNacimiento,
        } : null,
        hijos: data.familiares.hijos?.map(h => ({
          ...h,
          id: h.id || generateId(),
          fechaNacimiento: h.fechaNacimiento,
        })) || [],
        padres: data.familiares.padres?.map(p => ({
          ...p,
          id: p.id || generateId(),
          fechaNacimiento: p.fechaNacimiento,
        })) || [],
      }
    };

    const socioActualizado: Socio = {
      ...socioData,
      cambiosPendientesGrupoFamiliar: cambiosPropuestos,
      estadoCambioGrupoFamiliar: EstadoCambioGrupoFamiliar.PENDIENTE,
      motivoRechazoCambioGrupoFamiliar: null,
    };

    try {
      await updateSocio(socioActualizado);
      toast({
        title: 'Solicitud de Cambio Enviada',
        description: 'Tus cambios en el grupo familiar han sido enviados para aprobación.',
      });
      fetchSocioData();
      setCurrentStep(1);
    } catch (error) {
      console.error("Error actualizando socio con cambios pendientes:", error);
      toast({ title: "Error", description: "No se pudo enviar la solicitud de cambio.", variant: "destructive" });
    }
  };

 const renderFilePreview = (fileList: FileList | null | undefined | string, fieldName: `familiares.conyuge.${string}` | `familiares.hijos.${number}.${string}` | `familiares.padres.${number}.${string}`) => {
    if (typeof fileList === 'string') {
      return (
        <div className="mt-2 flex items-center space-x-2">
          <FileIcon className="h-5 w-5 text-muted-foreground" />
          <a href={fileList} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate max-w-[150px] sm:max-w-[200px]">Ver archivo</a>
        </div>
      );
    }
    const url = getFileUrl(fileList);
    if (url) {
      return (
        <div className="mt-2 flex items-center space-x-2">
          <FileIcon className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground truncate max-w-[150px] sm:max-w-[200px]">{fileList![0].name}</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => form.setValue(fieldName as any, null)} disabled={socioData?.estadoCambioGrupoFamiliar === EstadoCambioGrupoFamiliar.PENDIENTE}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      );
    }
    return null;
  };

  useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      if (name === 'tipoGrupoFamiliar' && type === 'change') {
        const newType = value.tipoGrupoFamiliar;
        if (socioData?.estadoCambioGrupoFamiliar !== EstadoCambioGrupoFamiliar.PENDIENTE) {
            if (newType === 'conyugeEHijos') {
                setValue('familiares.padres', []);
            } else if (newType === 'padresMadres') {
                setValue('familiares.conyuge', null);
                setValue('familiares.hijos', []);
            }
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, setValue, socioData?.estadoCambioGrupoFamiliar]);


  if (loadingSocio || authLoading) {
      return <p className="text-center py-10">Cargando datos del perfil...</p>
  }
  if (!socioData && !authLoading && !loadingSocio) {
      return <p className="text-center py-10 text-destructive">Error al cargar datos del socio. Por favor, intente recargar.</p>
  }

  const isFormDisabled = socioData?.estadoCambioGrupoFamiliar === EstadoCambioGrupoFamiliar.PENDIENTE;
  const isSelectionTypeDisabled = !!existingGroupType || isFormDisabled;

  return (
    <FormProvider {...form}>
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Gestionar Grupo Familiar</CardTitle>
           <CardDescription>
            Paso {currentStep} de {totalSteps} - {
            currentStep === 1 ? "Selección de tipo de grupo" :
            currentStep === 2 ? "Detalles de familiares" :
            "Revisión final"
          }</CardDescription>

            <Alert variant="default" className="mt-4 bg-primary/10 border-primary/30 text-primary">
              <Info className="h-5 w-5" />
              <AlertTitle className="font-semibold">Información sobre Modificaciones</AlertTitle>
              <AlertDescription>
                Cualquier cambio que realice aquí a su grupo familiar (agregar, quitar o modificar datos de familiares, incluyendo fotos) se enviará como una solicitud que deberá ser aprobada por la administración.
              </AlertDescription>
            </Alert>
            {isFormDisabled && (
                <Alert variant="default" className="mt-4 bg-yellow-500/10 border-yellow-500/30 text-yellow-700">
                    <MailQuestion className="h-5 w-5" />
                    <AlertTitle className="font-semibold">Solicitud Pendiente</AlertTitle>
                    <AlertDescription>
                        Tiene una solicitud de cambio para su grupo familiar pendiente de aprobación. No podrá realizar nuevas solicitudes hasta que la actual sea procesada.
                        Si desea cancelar la solicitud actual, contacte a administración.
                    </AlertDescription>
                </Alert>
            )}
            {socioData?.estadoCambioGrupoFamiliar === EstadoCambioGrupoFamiliar.RECHAZADO && (
                 <Alert variant="destructive" className="mt-4">
                    <XSquare className="h-5 w-5" />
                    <AlertTitle className="font-semibold">Solicitud Rechazada</AlertTitle>
                    <AlertDescription>
                        Su última solicitud de cambio fue rechazada. Motivo: {socioData.motivoRechazoCambioGrupoFamiliar || "No especificado"}.
                        Puede realizar una nueva solicitud corrigiendo los datos.
                    </AlertDescription>
                </Alert>
            )}
            {existingGroupType && !isFormDisabled && currentStep === 1 && (
                 <Alert variant="default" className="mt-4 bg-secondary/10 border-secondary/30 text-secondary">
                    <Lock className="h-5 w-5 text-secondary" />
                    <AlertTitle className="font-semibold text-secondary">Tipo de Grupo Establecido</AlertTitle>
                    <AlertDescription>
                        Actualmente tiene un grupo familiar de tipo: <strong>{existingGroupType === 'conyugeEHijos' ? 'Cónyuge e Hijos/as' : 'Padres/Madres'}</strong>.
                        Si necesita cambiar el tipo de grupo fundamental, deberá contactar a la administración, ya que esta selección está bloqueada. Puede editar los miembros dentro del tipo actual en el siguiente paso.
                    </AlertDescription>
                </Alert>
            )}

          <div className="w-full bg-muted rounded-full h-2.5 mt-2">
            <div className="bg-primary h-2.5 rounded-full" style={{ width: `${(currentStep / totalSteps) * 100}%` }}></div>
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            {currentStep === 1 && (
              <section>
                <h3 className="text-lg font-semibold mb-4">Tipo de Grupo Familiar</h3>
                 <FormField
                    control={control}
                    name="tipoGrupoFamiliar"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className={isSelectionTypeDisabled ? 'text-muted-foreground' : ''}>
                            {isSelectionTypeDisabled ? 'Tipo de grupo actual (bloqueado):' :
                            '¿Qué tipo de grupo familiar desea registrar o modificar?'}
                        </FormLabel>
                        <FormControl>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <Button
                                    type="button"
                                    variant={field.value === 'conyugeEHijos' ? 'default' : 'outline'}
                                    onClick={() => field.onChange('conyugeEHijos')}
                                    className="flex-1 justify-start p-6 text-left h-auto"
                                    disabled={isSelectionTypeDisabled}
                                >
                                    <div className="flex items-center">
                                        <Heart className="mr-3 h-6 w-6 text-red-500" />
                                        <div>
                                            <p className="font-semibold">Cónyuge e Hijos/as</p>
                                            <p className="text-xs text-muted-foreground">Agregue los datos de su cónyuge y/o hijos.</p>
                                        </div>
                                    </div>
                                </Button>
                                <Button
                                    type="button"
                                    variant={field.value === 'padresMadres' ? 'default' : 'outline'}
                                    onClick={() => field.onChange('padresMadres')}
                                    className="flex-1 justify-start p-6 text-left h-auto"
                                    disabled={isSelectionTypeDisabled}
                                >
                                    <div className="flex items-center">
                                        <Users className="mr-3 h-6 w-6 text-secondary" />
                                        <div>
                                            <p className="font-semibold">Padres/Madres</p>
                                            <p className="text-xs text-muted-foreground">Agregue los datos de sus padres o madres.</p>
                                        </div>
                                    </div>
                                </Button>
                            </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </section>
            )}

            {currentStep === 2 && (
              <section>
                <h3 className="text-lg font-semibold mb-2">Datos del Grupo Familiar</h3>
                 {(!tipoGrupoFamiliar) && <p className="text-destructive">Por favor, regrese al paso anterior y seleccione un tipo de grupo familiar.</p>}
                {(tipoGrupoFamiliar === 'conyugeEHijos') && (
                    <>
                    <div className="mb-6 p-4 border rounded-md">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="text-md font-semibold">Datos del Cónyuge</h4>
                            {!watch("familiares.conyuge") ? (
                                <Button type="button" size="sm" variant="outline" onClick={() => setValue('familiares.conyuge', { apellido: '', nombre: '', fechaNacimiento: new Date(), dni: '', relacion: RelacionFamiliar.CONYUGE, fotoDniFrente: null, fotoDniDorso: null, fotoPerfil: null, telefono: '', direccion: '', email: '' })} disabled={isFormDisabled}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Agregar Cónyuge
                                </Button>
                            ) : (
                                <Button type="button" size="sm" variant="destructive" onClick={() => setValue('familiares.conyuge', null)} disabled={isFormDisabled}>
                                    <Trash2 className="mr-2 h-4 w-4" /> Quitar Cónyuge
                                </Button>
                            )}
                        </div>
                        {watch("familiares.conyuge") && (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField control={control} name="familiares.conyuge.apellido" render={({ field }) => ( <FormItem> <FormLabel>Apellido Cónyuge</FormLabel> <FormControl><Input {...field} disabled={isFormDisabled} /></FormControl> <FormMessage /> </FormItem> )} />
                              <FormField control={control} name="familiares.conyuge.nombre" render={({ field }) => ( <FormItem> <FormLabel>Nombre Cónyuge</FormLabel> <FormControl><Input {...field} disabled={isFormDisabled} /></FormControl> <FormMessage /> </FormItem> )} />
                              <FormField control={control} name="familiares.conyuge.fechaNacimiento" render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Fecha Nac. Cónyuge</FormLabel>
                                  <FormControl>
                                    <div className="relative">
                                      <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                      <Input type="date" value={field.value ? format(new Date(field.value), 'yyyy-MM-dd') : ''} onChange={(e) => field.onChange(e.target.value ? parseISO(e.target.value) : null)} className="w-full pl-10" max={maxBirthDate} min="1900-01-01" disabled={isFormDisabled || !maxBirthDate} />
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}/>
                              <FormField control={control} name="familiares.conyuge.dni" render={({ field }) => ( <FormItem> <FormLabel>DNI Cónyuge</FormLabel> <FormControl><Input type="number" {...field} disabled={isFormDisabled} /></FormControl> <FormMessage /> </FormItem> )} />
                              <FormField control={control} name="familiares.conyuge.telefono" render={({ field }) => ( <FormItem> <FormLabel>Teléfono (Opcional)</FormLabel> <FormControl><Input type="tel" {...field} disabled={isFormDisabled} /></FormControl> <FormMessage /> </FormItem> )} />
                              <FormField control={control} name="familiares.conyuge.direccion" render={({ field }) => ( <FormItem> <FormLabel>Dirección (Opcional)</FormLabel> <FormControl><Input {...field} disabled={isFormDisabled} /></FormControl> <FormMessage /> </FormItem> )} />
                              <FormField control={control} name="familiares.conyuge.email" render={({ field }) => ( <FormItem className="md:col-span-2"> <FormLabel>Email (Opcional)</FormLabel> <FormControl><Input type="email" {...field} disabled={isFormDisabled} /></FormControl> <FormMessage /> </FormItem> )} />
                          </div>
                          <h5 className="text-sm font-semibold mt-4 mb-2">Documentación Cónyuge</h5>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {(['fotoDniFrente', 'fotoDniDorso', 'fotoPerfil'] as const).map(docType => (
                                  <FormField
                                      control={control}
                                      name={`familiares.conyuge.${docType}`}
                                      key={`conyuge-${docType}`}
                                      render={({ field: { onChange, value, ...restField }}) => (
                                      <FormItem>
                                          <FormLabel>{docType === 'fotoDniFrente' ? 'DNI Frente' : docType === 'fotoDniDorso' ? 'DNI Dorso' : 'Foto Perfil'}</FormLabel>
                                          <FormControl>
                                              <label className={`cursor-pointer w-full flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-md ${isFormDisabled ? 'cursor-not-allowed bg-muted/50' : 'hover:border-primary'}`}>
                                                  <UploadCloud className="h-8 w-8 text-muted-foreground mb-2" />
                                                  <span className="text-sm text-muted-foreground">{(value instanceof FileList && value.length > 0) ? value[0].name : (typeof value === 'string' ? "Archivo cargado" : "Subir")}</span>
                                                  <Input type="file" className="hidden" onChange={e => onChange(e.target.files)} accept={docType === 'fotoPerfil' ? "image/png,image/jpeg" : "image/png,image/jpeg,application/pdf"} {...restField} disabled={isFormDisabled}/>
                                              </label>
                                          </FormControl>
                                          {renderFilePreview(value, `familiares.conyuge.${docType}`)}
                                          <FormMessage />
                                      </FormItem>
                                  )} />
                              ))}
                          </div>
                        </>
                       )}
                    </div>
                    <div className="mb-6 p-4 border rounded-md">
                        <h4 className="text-md font-semibold mb-2">Datos de Hijos/as (hasta {MAX_HIJOS})</h4>
                        {hijosFields.map((item, index) => (
                        <div key={item.id} className="mb-4 p-4 border rounded-md relative bg-muted/20">
                            <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive hover:bg-destructive/10" onClick={() => removeHijo(index)} disabled={isFormDisabled}> <Trash2 className="h-4 w-4" /> </Button>
                            <p className="font-medium mb-2">Hijo/a {index + 1}</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={control} name={`familiares.hijos.${index}.apellido`} render={({ field }) => ( <FormItem> <FormLabel>Apellido</FormLabel> <FormControl><Input {...field} disabled={isFormDisabled} /></FormControl> <FormMessage /> </FormItem> )} />
                            <FormField control={control} name={`familiares.hijos.${index}.nombre`} render={({ field }) => ( <FormItem> <FormLabel>Nombre</FormLabel> <FormControl><Input {...field} disabled={isFormDisabled} /></FormControl> <FormMessage /> </FormItem> )} />
                            <FormField control={control} name={`familiares.hijos.${index}.fechaNacimiento`} render={({ field }) => (
                              <FormItem> <FormLabel>Fecha Nac.</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                    <Input type="date" value={field.value ? format(new Date(field.value), 'yyyy-MM-dd') : ''} onChange={(e) => field.onChange(e.target.value ? parseISO(e.target.value) : null)} className="w-full pl-10" max={maxBirthDate} min="1900-01-01" disabled={isFormDisabled || !maxBirthDate} />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}/>
                            <FormField control={control} name={`familiares.hijos.${index}.dni`} render={({ field }) => ( <FormItem> <FormLabel>DNI</FormLabel> <FormControl><Input type="number" {...field} disabled={isFormDisabled} /></FormControl> <FormMessage /> </FormItem> )} />
                            <FormField control={control} name={`familiares.hijos.${index}.telefono`} render={({ field }) => ( <FormItem> <FormLabel>Teléfono (Opcional)</FormLabel> <FormControl><Input type="tel" {...field} disabled={isFormDisabled} /></FormControl> <FormMessage /> </FormItem> )} />
                            <FormField control={control} name={`familiares.hijos.${index}.direccion`} render={({ field }) => ( <FormItem> <FormLabel>Dirección (Opcional)</FormLabel> <FormControl><Input {...field} disabled={isFormDisabled} /></FormControl> <FormMessage /> </FormItem> )} />
                            <FormField control={control} name={`familiares.hijos.${index}.email`} render={({ field }) => ( <FormItem className="md:col-span-2"> <FormLabel>Email (Opcional)</FormLabel> <FormControl><Input type="email" {...field} disabled={isFormDisabled} /></FormControl> <FormMessage /> </FormItem> )} />
                            </div>
                            <h5 className="text-sm font-semibold mt-4 mb-2">Documentación Hijo/a {index + 1}</h5>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {(['fotoDniFrente', 'fotoDniDorso', 'fotoPerfil'] as const).map(docType => (
                                    <FormField control={control} name={`familiares.hijos.${index}.${docType}`} key={`hijo-${index}-${docType}`}
                                        render={({ field: { onChange, value, ...restField }}) => (
                                        <FormItem>
                                            <FormLabel>{docType === 'fotoDniFrente' ? 'DNI Frente' : docType === 'fotoDniDorso' ? 'DNI Dorso' : 'Foto Perfil'}</FormLabel>
                                            <FormControl>
                                                <label className={`cursor-pointer w-full flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-md ${isFormDisabled ? 'cursor-not-allowed bg-muted/50' : 'hover:border-primary'}`}>
                                                    <UploadCloud className="h-8 w-8 text-muted-foreground mb-2" />
                                                    <span className="text-sm text-muted-foreground">{(value instanceof FileList && value.length > 0) ? value[0].name : (typeof value === 'string' ? "Archivo cargado" : "Subir")}</span>
                                                    <Input type="file" className="hidden" onChange={e => onChange(e.target.files)} accept={docType === 'fotoPerfil' ? "image/png,image/jpeg" : "image/png,image/jpeg,application/pdf"} {...restField} disabled={isFormDisabled} />
                                                </label>
                                            </FormControl>
                                            {renderFilePreview(value, `familiares.hijos.${index}.${docType}`)}
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                ))}
                            </div>
                        </div>
                        ))}
                        {hijosFields.length < MAX_HIJOS && (
                        <Button type="button" variant="outline" onClick={() => appendHijo({ id: generateId(), apellido: '', nombre: '', fechaNacimiento: new Date(), dni: '', relacion: RelacionFamiliar.HIJO_A, fotoDniFrente: null, fotoDniDorso: null, fotoPerfil: null, telefono: '', direccion: '', email: '' })} disabled={isFormDisabled}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Agregar Hijo/a
                        </Button>
                        )}
                    </div>
                    </>
                )}

                {(tipoGrupoFamiliar === 'padresMadres') && (
                    <div className="mb-6 p-4 border rounded-md">
                        <h4 className="text-md font-semibold mb-2">Datos de Padres/Madres (hasta {MAX_PADRES})</h4>
                        {padresFields.map((item, index) => (
                        <div key={item.id} className="mb-4 p-4 border rounded-md relative bg-muted/20">
                            <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive hover:bg-destructive/10" onClick={() => removePadre(index)} disabled={isFormDisabled}> <Trash2 className="h-4 w-4" /> </Button>
                            <p className="font-medium mb-2">Padre/Madre {index + 1}</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField control={control} name={`familiares.padres.${index}.apellido`} render={({ field }) => ( <FormItem> <FormLabel>Apellido</FormLabel> <FormControl><Input {...field} disabled={isFormDisabled} /></FormControl> <FormMessage /> </FormItem> )} />
                              <FormField control={control} name={`familiares.padres.${index}.nombre`} render={({ field }) => ( <FormItem> <FormLabel>Nombre</FormLabel> <FormControl><Input {...field} disabled={isFormDisabled} /></FormControl> <FormMessage /> </FormItem> )} />
                              <FormField control={control} name={`familiares.padres.${index}.fechaNacimiento`} render={({ field }) => (
                                <FormItem> <FormLabel>Fecha Nac.</FormLabel>
                                  <FormControl>
                                    <div className="relative">
                                      <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                      <Input type="date" value={field.value ? format(new Date(field.value), 'yyyy-MM-dd') : ''} onChange={(e) => field.onChange(e.target.value ? parseISO(e.target.value) : null)} className="w-full pl-10" max={maxBirthDate} min="1900-01-01" disabled={isFormDisabled || !maxBirthDate} />
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}/>
                              <FormField control={control} name={`familiares.padres.${index}.dni`} render={({ field }) => ( <FormItem> <FormLabel>DNI</FormLabel> <FormControl><Input type="number" {...field} disabled={isFormDisabled} /></FormControl> <FormMessage /> </FormItem> )} />
                              <FormField control={control} name={`familiares.padres.${index}.telefono`} render={({ field }) => ( <FormItem> <FormLabel>Teléfono (Opcional)</FormLabel> <FormControl><Input type="tel" {...field} disabled={isFormDisabled} /></FormControl> <FormMessage /> </FormItem> )} />
                              <FormField control={control} name={`familiares.padres.${index}.direccion`} render={({ field }) => ( <FormItem> <FormLabel>Dirección (Opcional)</FormLabel> <FormControl><Input {...field} disabled={isFormDisabled} /></FormControl> <FormMessage /> </FormItem> )} />
                              <FormField control={control} name={`familiares.padres.${index}.email`} render={({ field }) => ( <FormItem className="md:col-span-2"> <FormLabel>Email (Opcional)</FormLabel> <FormControl><Input type="email" {...field} disabled={isFormDisabled} /></FormControl> <FormMessage /> </FormItem> )} />
                            </div>
                            <h5 className="text-sm font-semibold mt-4 mb-2">Documentación Padre/Madre {index + 1}</h5>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {(['fotoDniFrente', 'fotoDniDorso', 'fotoPerfil'] as const).map(docType => (
                                    <FormField control={control} name={`familiares.padres.${index}.${docType}`} key={`padre-${index}-${docType}`}
                                        render={({ field: { onChange, value, ...restField }}) => (
                                        <FormItem>
                                            <FormLabel>{docType === 'fotoDniFrente' ? 'DNI Frente' : docType === 'fotoDniDorso' ? 'DNI Dorso' : 'Foto Perfil'}</FormLabel>
                                            <FormControl>
                                                <label className={`cursor-pointer w-full flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-md ${isFormDisabled ? 'cursor-not-allowed bg-muted/50' : 'hover:border-primary'}`}>
                                                    <UploadCloud className="h-8 w-8 text-muted-foreground mb-2" />
                                                    <span className="text-sm text-muted-foreground">{(value instanceof FileList && value.length > 0) ? value[0].name : (typeof value === 'string' ? "Archivo cargado" : "Subir")}</span>
                                                    <Input type="file" className="hidden" onChange={e => onChange(e.target.files)} accept={docType === 'fotoPerfil' ? "image/png,image/jpeg" : "image/png,image/jpeg,application/pdf"} {...restField} disabled={isFormDisabled} />
                                                </label>
                                            </FormControl>
                                            {renderFilePreview(value, `familiares.padres.${index}.${docType}`)}
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                ))}
                            </div>
                        </div>
                        ))}
                        {padresFields.length < MAX_PADRES && (
                        <Button type="button" variant="outline" onClick={() => appendPadre({ id: generateId(), apellido: '', nombre: '', fechaNacimiento: new Date(), dni: '', relacion: RelacionFamiliar.PADRE_MADRE, fotoDniFrente: null, fotoDniDorso: null, fotoPerfil: null, telefono: '', direccion: '', email: '' })} disabled={isFormDisabled}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Agregar Padre/Madre
                        </Button>
                        )}
                    </div>
                )}
                 {errors.familiares && (errors.familiares as any).message && (
                  <FormItem>
                    <FormMessage>{(errors.familiares as any).message}</FormMessage>
                  </FormItem>
                 )}
                 {errors.root?.message && (
                    <FormItem>
                        <FormMessage>{errors.root.message}</FormMessage>
                    </FormItem>
                 )}


              </section>
            )}

            {currentStep === 3 && (
              <section>
                <h3 className="text-lg font-semibold mb-4">Revisar y Enviar Solicitud de Cambio</h3>
                <p className="text-muted-foreground mb-4">Por favor, revisa que toda la información sea correcta antes de enviar la solicitud de cambio. Esta será revisada por administración.</p>
                <div className="space-y-2 p-4 border rounded-md bg-muted/30">
                  <p><strong>Tipo de Grupo Familiar Propuesto:</strong> {
                    (watch("tipoGrupoFamiliar") || existingGroupType) === 'conyugeEHijos' ? 'Cónyuge e Hijos/as' :
                    (watch("tipoGrupoFamiliar") || existingGroupType) === 'padresMadres' ? 'Padres/Madres' : 'No seleccionado'
                  }</p>

                  {(watch("tipoGrupoFamiliar") === 'conyugeEHijos' || existingGroupType === 'conyugeEHijos') && (
                    <>
                      {watch("familiares.conyuge") && <p className="pl-4"><strong>Cónyuge:</strong> {watch("familiares.conyuge.nombre")} {watch("familiares.conyuge.apellido")}</p>}
                      {watch("familiares.hijos")?.map((h, i) => <p key={`hijo-rev-${i}`} className="pl-4"><strong>Hijo/a {i+1}:</strong> {h.nombre} {h.apellido}</p>)}
                      {watch("familiares.hijos")?.length === 0 && !watch("familiares.conyuge") && <p className="pl-4 text-muted-foreground">No se proponen cónyuges ni hijos/as.</p>}
                    </>
                  )}
                  {(watch("tipoGrupoFamiliar") === 'padresMadres' || existingGroupType === 'padresMadres') && (
                    <>
                      {watch("familiares.padres")?.map((p, i) => <p key={`padre-rev-${i}`} className="pl-4"><strong>Padre/Madre {i+1}:</strong> {p.nombre} {p.apellido}</p>)}
                      {watch("familiares.padres")?.length === 0 && <p className="pl-4 text-muted-foreground">No se proponen padres/madres.</p>}
                    </>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-4">Al enviar, la información proporcionada quedará pendiente de aprobación por la administración.</p>
              </section>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button type="button" variant="outline" onClick={prevStep} disabled={currentStep === 1}>
              <ChevronLeft className="mr-2 h-4 w-4" /> Anterior
            </Button>
            {currentStep < totalSteps ? (
              <Button type="button" onClick={nextStep} disabled={isFormDisabled}>
                Siguiente <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={form.formState.isSubmitting || isFormDisabled}>
                {form.formState.isSubmitting ? 'Enviando...' : 'Enviar Solicitud de Cambio'}
              </Button>
            )}
          </CardFooter>
        </form>
      </Card>
    </FormProvider>
  );
}
