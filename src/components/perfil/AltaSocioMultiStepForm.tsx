
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, FormProvider, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, ChevronRight, PlusCircle, Trash2, UploadCloud, FileText as FileIcon, Users, Heart, UserSquare2, Lock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { 
  type AgregarFamiliaresData, agregarFamiliaresSchema,
  RelacionFamiliar, MAX_HIJOS, MAX_PADRES, type Socio
} from '@/types';
import { getFileUrl } from '@/lib/helpers';
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
      // Determine existing group type
      let groupType: 'conyugeEHijos' | 'padresMadres' | null = null;
      if (data.grupoFamiliar?.some(f => f.relacion === RelacionFamiliar.CONYUGE) || data.grupoFamiliar?.some(f => f.relacion === RelacionFamiliar.HIJO_A)) {
        groupType = 'conyugeEHijos';
      } else if (data.grupoFamiliar?.some(f => f.relacion === RelacionFamiliar.PADRE_MADRE)) {
        groupType = 'padresMadres';
      }
      setExistingGroupType(groupType);
      
      // Pre-fill form if data exists
      setValue('tipoGrupoFamiliar', groupType || undefined);
      const conyugeData = data.grupoFamiliar?.find(f => f.relacion === RelacionFamiliar.CONYUGE);
      const hijosData = data.grupoFamiliar?.filter(f => f.relacion === RelacionFamiliar.HIJO_A);
      const padresData = data.grupoFamiliar?.filter(f => f.relacion === RelacionFamiliar.PADRE_MADRE);

      setValue('familiares.conyuge', conyugeData ? {
        ...conyugeData, 
        fechaNacimiento: conyugeData.fechaNacimiento ? parseISO(conyugeData.fechaNacimiento as unknown as string) : new Date(),
        // file fields will remain null/string URL, not FileList, unless re-uploaded
        fotoDniFrente: typeof conyugeData.fotoDniFrente === 'string' ? conyugeData.fotoDniFrente : null,
        fotoDniDorso: typeof conyugeData.fotoDniDorso === 'string' ? conyugeData.fotoDniDorso : null,
        fotoPerfil: typeof conyugeData.fotoPerfil === 'string' ? conyugeData.fotoPerfil : null,
      } : null);
      setValue('familiares.hijos', hijosData?.map(h => ({
        ...h, 
        fechaNacimiento: h.fechaNacimiento ? parseISO(h.fechaNacimiento as unknown as string) : new Date(),
        fotoDniFrente: typeof h.fotoDniFrente === 'string' ? h.fotoDniFrente : null,
        fotoDniDorso: typeof h.fotoDniDorso === 'string' ? h.fotoDniDorso : null,
        fotoPerfil: typeof h.fotoPerfil === 'string' ? h.fotoPerfil : null,
      })) || []);
      setValue('familiares.padres', padresData?.map(p => ({
        ...p, 
        fechaNacimiento: p.fechaNacimiento ? parseISO(p.fechaNacimiento as unknown as string) : new Date(),
        fotoDniFrente: typeof p.fotoDniFrente === 'string' ? p.fotoDniFrente : null,
        fotoDniDorso: typeof p.fotoDniDorso === 'string' ? p.fotoDniDorso : null,
        fotoPerfil: typeof p.fotoPerfil === 'string' ? p.fotoPerfil : null,
      })) || []);
    }
    setLoadingSocio(false);
  }, [loggedInUserNumeroSocio, authLoading, setValue]);

  useEffect(() => {
    fetchSocioData();
  }, [fetchSocioData]);


  const nextStep = async () => {
    let isValidStep = false;
    if (currentStep === 1) {
      if (existingGroupType && tipoGrupoFamiliar !== existingGroupType) {
         toast({ title: "Cambio Bloqueado", description: "No puede cambiar el tipo de grupo familiar. Contacte a administración.", variant: "destructive" });
         return; // Prevent proceeding if trying to change locked type
      }
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
      console.log(`Validation errors (Step ${currentStep}):`, JSON.stringify(form.formState.errors, null, 2));
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };
  
  const onSubmit = async (data: AgregarFamiliaresData) => {
    if (!socioData) {
      toast({ title: "Error", description: "No se pudieron cargar los datos del socio titular.", variant: "destructive" });
      return;
    }

    const nuevosFamiliares: any[] = [];
    if (data.tipoGrupoFamiliar === 'conyugeEHijos') {
      if (data.familiares.conyuge) nuevosFamiliares.push(data.familiares.conyuge);
      if (data.familiares.hijos) nuevosFamiliares.push(...data.familiares.hijos);
    } else if (data.tipoGrupoFamiliar === 'padresMadres') {
      if (data.familiares.padres) nuevosFamiliares.push(...data.familiares.padres);
    }
    
    // Here you would handle file uploads for each familiar and get URLs
    // For simulation, we'll just pass the FileList objects or existing string URLs
    
    const socioActualizado: Socio = {
      ...socioData,
      grupoFamiliar: nuevosFamiliares.map(fam => ({
        ...fam,
        fechaNacimiento: format(new Date(fam.fechaNacimiento), 'yyyy-MM-dd'), // Ensure date is string for storage
        // If foto fields are FileList, they'd be uploaded and replaced by URL string here
        // If they are already string (URL), they are kept
      })),
    };

    try {
      await updateSocio(socioActualizado);
      toast({
        title: 'Familiares Actualizados',
        description: 'Los datos del grupo familiar han sido actualizados.',
      });
      fetchSocioData(); // Refresh data to reflect changes and lock type
      setCurrentStep(1); // Or go to a success/confirmation page
    } catch (error) {
      console.error("Error actualizando socio:", error);
      toast({ title: "Error", description: "No se pudo actualizar el grupo familiar.", variant: "destructive" });
    }
  };

 const renderFilePreview = (fileList: FileList | null | undefined | string, fieldName: `familiares.conyuge.${string}` | `familiares.hijos.${number}.${string}` | `familiares.padres.${number}.${string}`) => {
    if (typeof fileList === 'string') { // It's a URL
      return (
        <div className="mt-2 flex items-center space-x-2">
          <FileIcon className="h-5 w-5 text-muted-foreground" />
          <a href={fileList} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate max-w-[150px] sm:max-w-[200px]">Ver archivo</a>
          {/* No remove button for existing URLs for simplicity in this simulation */}
        </div>
      );
    }
    const url = getFileUrl(fileList); // FileList
    if (url) {
      return (
        <div className="mt-2 flex items-center space-x-2">
          <FileIcon className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground truncate max-w-[150px] sm:max-w-[200px]">{fileList![0].name}</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => form.setValue(fieldName as any, null)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      );
    }
    return null;
  };

  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name === 'tipoGrupoFamiliar' && !existingGroupType) { // Only reset if no existing type is locked
        if (value.tipoGrupoFamiliar === 'conyugeEHijos') {
          setValue('familiares.padres', []);
        } else if (value.tipoGrupoFamiliar === 'padresMadres') {
          setValue('familiares.conyuge', null);
          setValue('familiares.hijos', []);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, setValue, existingGroupType]);

  if (loadingSocio || authLoading) {
      return <p>Cargando datos del perfil...</p>
  }
  if (!socioData && !authLoading && !loadingSocio) {
      return <p>Error al cargar datos del socio. Por favor, intente recargar.</p>
  }


  return (
    <FormProvider {...form}>
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Agregar/Modificar Grupo Familiar</CardTitle>
          <CardDescription>Paso {currentStep} de {totalSteps} - {
            currentStep === 1 ? "Selección de tipo de grupo" :
            currentStep === 2 ? "Detalles de familiares" :
            "Revisión final"
          }</CardDescription>
          <div className="w-full bg-muted rounded-full h-2.5 mt-2">
            <div className="bg-primary h-2.5 rounded-full" style={{ width: `${(currentStep / totalSteps) * 100}%` }}></div>
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            {currentStep === 1 && ( 
              <section>
                <h3 className="text-lg font-semibold mb-4">Tipo de Grupo Familiar</h3>
                {existingGroupType && (
                    <Alert variant="default" className="mb-4 bg-blue-500/10 border-blue-500 text-blue-700">
                        <Lock className="h-5 w-5 text-blue-600" />
                        <AlertTitle className="text-blue-700">Tipo de Grupo Establecido</AlertTitle>
                        <AlertDescription>
                            Ya tienes un grupo familiar de tipo: <strong>{existingGroupType === 'conyugeEHijos' ? 'Cónyuge e Hijos/as' : 'Padres/Madres'}</strong>.
                            <br />Para cambiar el tipo de grupo, por favor contacta a administración.
                        </AlertDescription>
                    </Alert>
                )}
                 <FormField
                    control={control}
                    name="tipoGrupoFamiliar"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className={existingGroupType ? 'text-muted-foreground' : ''}>
                            {existingGroupType ? 'Tipo de grupo actual (no modificable aquí):' : '¿Qué tipo de grupo familiar desea registrar?'}
                        </FormLabel>
                        <FormControl>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <Button 
                                    type="button" 
                                    variant={(field.value === 'conyugeEHijos' || existingGroupType === 'conyugeEHijos') ? 'default' : 'outline'} 
                                    onClick={() => !existingGroupType && field.onChange('conyugeEHijos')} 
                                    className="flex-1 justify-start p-6 text-left h-auto"
                                    disabled={existingGroupType && existingGroupType !== 'conyugeEHijos'}
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
                                    variant={(field.value === 'padresMadres' || existingGroupType === 'padresMadres') ? 'default' : 'outline'} 
                                    onClick={() => !existingGroupType && field.onChange('padresMadres')} 
                                    className="flex-1 justify-start p-6 text-left h-auto"
                                    disabled={existingGroupType && existingGroupType !== 'padresMadres'}
                                >
                                    <div className="flex items-center">
                                        <Users className="mr-3 h-6 w-6 text-blue-500" />
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
                {!tipoGrupoFamiliar && !existingGroupType && <p className="text-destructive">Por favor, regrese al paso anterior y seleccione un tipo de grupo familiar.</p>}
                {(tipoGrupoFamiliar === 'conyugeEHijos' || existingGroupType === 'conyugeEHijos') && (
                    <>
                    <div className="mb-6 p-4 border rounded-md">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="text-md font-semibold">Datos del Cónyuge</h4>
                            {!watch("familiares.conyuge") ? (
                                <Button type="button" size="sm" variant="outline" onClick={() => setValue('familiares.conyuge', { apellido: '', nombre: '', fechaNacimiento: new Date(), dni: '', relacion: RelacionFamiliar.CONYUGE, fotoDniFrente: null, fotoDniDorso: null, fotoPerfil: null, telefono: '', direccion: '', email: '' })}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Agregar Cónyuge
                                </Button>
                            ) : (
                                <Button type="button" size="sm" variant="destructive" onClick={() => setValue('familiares.conyuge', null)}>
                                    <Trash2 className="mr-2 h-4 w-4" /> Quitar Cónyuge
                                </Button>
                            )}
                        </div>
                        {watch("familiares.conyuge") && (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField control={control} name="familiares.conyuge.apellido" render={({ field }) => ( <FormItem> <FormLabel>Apellido Cónyuge</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                              <FormField control={control} name="familiares.conyuge.nombre" render={({ field }) => ( <FormItem> <FormLabel>Nombre Cónyuge</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                              <FormField control={control} name="familiares.conyuge.fechaNacimiento" render={({ field }) => ( <FormItem> <FormLabel>Fecha Nac. Cónyuge</FormLabel> <FormControl><Input type="date" value={field.value ? format(new Date(field.value), 'yyyy-MM-dd') : ''} onChange={(e) => field.onChange(e.target.value ? parseISO(e.target.value) : null)} className="w-full" max={format(new Date(), 'yyyy-MM-dd')} min={format(new Date("1900-01-01"), 'yyyy-MM-dd')} /></FormControl> <FormMessage /> </FormItem> )}/>
                              <FormField control={control} name="familiares.conyuge.dni" render={({ field }) => ( <FormItem> <FormLabel>DNI Cónyuge</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                              <FormField control={control} name="familiares.conyuge.telefono" render={({ field }) => ( <FormItem> <FormLabel>Teléfono (Opcional)</FormLabel> <FormControl><Input type="tel" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                              <FormField control={control} name="familiares.conyuge.direccion" render={({ field }) => ( <FormItem> <FormLabel>Dirección (Opcional)</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                              <FormField control={control} name="familiares.conyuge.email" render={({ field }) => ( <FormItem className="md:col-span-2"> <FormLabel>Email (Opcional)</FormLabel> <FormControl><Input type="email" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
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
                                              <label className="cursor-pointer w-full flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-md hover:border-primary">
                                                  <UploadCloud className="h-8 w-8 text-muted-foreground mb-2" />
                                                  <span className="text-sm text-muted-foreground">{(value instanceof FileList && value.length > 0) ? value[0].name : (typeof value === 'string' ? "Archivo cargado" : "Subir")}</span>
                                                  <Input type="file" className="hidden" onChange={e => onChange(e.target.files)} accept={docType === 'fotoPerfil' ? "image/png,image/jpeg" : "image/png,image/jpeg,application/pdf"} {...restField} />
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
                            <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive hover:bg-destructive/10" onClick={() => removeHijo(index)}> <Trash2 className="h-4 w-4" /> </Button>
                            <p className="font-medium mb-2">Hijo/a {index + 1}</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={control} name={`familiares.hijos.${index}.apellido`} render={({ field }) => ( <FormItem> <FormLabel>Apellido</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                            <FormField control={control} name={`familiares.hijos.${index}.nombre`} render={({ field }) => ( <FormItem> <FormLabel>Nombre</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                            <FormField control={control} name={`familiares.hijos.${index}.fechaNacimiento`} render={({ field }) => ( <FormItem> <FormLabel>Fecha Nac.</FormLabel> <FormControl><Input type="date" value={field.value ? format(new Date(field.value), 'yyyy-MM-dd') : ''} onChange={(e) => field.onChange(e.target.value ? parseISO(e.target.value) : null)} className="w-full" max={format(new Date(), 'yyyy-MM-dd')} min={format(new Date("1900-01-01"), 'yyyy-MM-dd')} /></FormControl> <FormMessage /> </FormItem> )}/>
                            <FormField control={control} name={`familiares.hijos.${index}.dni`} render={({ field }) => ( <FormItem> <FormLabel>DNI</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                            <FormField control={control} name={`familiares.hijos.${index}.telefono`} render={({ field }) => ( <FormItem> <FormLabel>Teléfono (Opcional)</FormLabel> <FormControl><Input type="tel" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                            <FormField control={control} name={`familiares.hijos.${index}.direccion`} render={({ field }) => ( <FormItem> <FormLabel>Dirección (Opcional)</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                            <FormField control={control} name={`familiares.hijos.${index}.email`} render={({ field }) => ( <FormItem className="md:col-span-2"> <FormLabel>Email (Opcional)</FormLabel> <FormControl><Input type="email" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                            </div>
                            <h5 className="text-sm font-semibold mt-4 mb-2">Documentación Hijo/a {index + 1}</h5>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {(['fotoDniFrente', 'fotoDniDorso', 'fotoPerfil'] as const).map(docType => (
                                    <FormField control={control} name={`familiares.hijos.${index}.${docType}`} key={`hijo-${index}-${docType}`}
                                        render={({ field: { onChange, value, ...restField }}) => (
                                        <FormItem>
                                            <FormLabel>{docType === 'fotoDniFrente' ? 'DNI Frente' : docType === 'fotoDniDorso' ? 'DNI Dorso' : 'Foto Perfil'}</FormLabel>
                                            <FormControl>
                                                <label className="cursor-pointer w-full flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-md hover:border-primary">
                                                    <UploadCloud className="h-8 w-8 text-muted-foreground mb-2" />
                                                    <span className="text-sm text-muted-foreground">{(value instanceof FileList && value.length > 0) ? value[0].name : (typeof value === 'string' ? "Archivo cargado" : "Subir")}</span>
                                                    <Input type="file" className="hidden" onChange={e => onChange(e.target.files)} accept={docType === 'fotoPerfil' ? "image/png,image/jpeg" : "image/png,image/jpeg,application/pdf"} {...restField} />
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
                        <Button type="button" variant="outline" onClick={() => appendHijo({ apellido: '', nombre: '', fechaNacimiento: new Date(), dni: '', relacion: RelacionFamiliar.HIJO_A, fotoDniFrente: null, fotoDniDorso: null, fotoPerfil: null, telefono: '', direccion: '', email: '' })}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Agregar Hijo/a
                        </Button>
                        )}
                    </div>
                    </>
                )}

                {(tipoGrupoFamiliar === 'padresMadres' || existingGroupType === 'padresMadres') && (
                    <div className="mb-6 p-4 border rounded-md">
                        <h4 className="text-md font-semibold mb-2">Datos de Padres/Madres (hasta {MAX_PADRES})</h4>
                        {padresFields.map((item, index) => (
                        <div key={item.id} className="mb-4 p-4 border rounded-md relative bg-muted/20">
                            <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive hover:bg-destructive/10" onClick={() => removePadre(index)}> <Trash2 className="h-4 w-4" /> </Button>
                            <p className="font-medium mb-2">Padre/Madre {index + 1}</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField control={control} name={`familiares.padres.${index}.apellido`} render={({ field }) => ( <FormItem> <FormLabel>Apellido</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                              <FormField control={control} name={`familiares.padres.${index}.nombre`} render={({ field }) => ( <FormItem> <FormLabel>Nombre</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                              <FormField control={control} name={`familiares.padres.${index}.fechaNacimiento`} render={({ field }) => ( <FormItem> <FormLabel>Fecha Nac.</FormLabel> <FormControl><Input type="date" value={field.value ? format(new Date(field.value), 'yyyy-MM-dd') : ''} onChange={(e) => field.onChange(e.target.value ? parseISO(e.target.value) : null)} className="w-full" max={format(new Date(), 'yyyy-MM-dd')} min={format(new Date("1900-01-01"), 'yyyy-MM-dd')} /></FormControl> <FormMessage /> </FormItem> )}/>
                              <FormField control={control} name={`familiares.padres.${index}.dni`} render={({ field }) => ( <FormItem> <FormLabel>DNI</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                              <FormField control={control} name={`familiares.padres.${index}.telefono`} render={({ field }) => ( <FormItem> <FormLabel>Teléfono (Opcional)</FormLabel> <FormControl><Input type="tel" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                              <FormField control={control} name={`familiares.padres.${index}.direccion`} render={({ field }) => ( <FormItem> <FormLabel>Dirección (Opcional)</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                              <FormField control={control} name={`familiares.padres.${index}.email`} render={({ field }) => ( <FormItem className="md:col-span-2"> <FormLabel>Email (Opcional)</FormLabel> <FormControl><Input type="email" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                            </div>
                            <h5 className="text-sm font-semibold mt-4 mb-2">Documentación Padre/Madre {index + 1}</h5>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {(['fotoDniFrente', 'fotoDniDorso', 'fotoPerfil'] as const).map(docType => (
                                    <FormField control={control} name={`familiares.padres.${index}.${docType}`} key={`padre-${index}-${docType}`}
                                        render={({ field: { onChange, value, ...restField }}) => (
                                        <FormItem>
                                            <FormLabel>{docType === 'fotoDniFrente' ? 'DNI Frente' : docType === 'fotoDniDorso' ? 'DNI Dorso' : 'Foto Perfil'}</FormLabel>
                                            <FormControl>
                                                <label className="cursor-pointer w-full flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-md hover:border-primary">
                                                    <UploadCloud className="h-8 w-8 text-muted-foreground mb-2" />
                                                    <span className="text-sm text-muted-foreground">{(value instanceof FileList && value.length > 0) ? value[0].name : (typeof value === 'string' ? "Archivo cargado" : "Subir")}</span>
                                                    <Input type="file" className="hidden" onChange={e => onChange(e.target.files)} accept={docType === 'fotoPerfil' ? "image/png,image/jpeg" : "image/png,image/jpeg,application/pdf"} {...restField} />
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
                        <Button type="button" variant="outline" onClick={() => appendPadre({ apellido: '', nombre: '', fechaNacimiento: new Date(), dni: '', relacion: RelacionFamiliar.PADRE_MADRE, fotoDniFrente: null, fotoDniDorso: null, fotoPerfil: null, telefono: '', direccion: '', email: '' })}>
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
                <h3 className="text-lg font-semibold mb-4">Revisar y Enviar Solicitud</h3>
                <p className="text-muted-foreground mb-4">Por favor, revisa que toda la información sea correcta antes de enviar.</p>
                <div className="space-y-2 p-4 border rounded-md bg-muted/30">
                  <p><strong>Tipo de Grupo Familiar:</strong> {
                    (watch("tipoGrupoFamiliar") || existingGroupType) === 'conyugeEHijos' ? 'Cónyuge e Hijos/as' : 
                    (watch("tipoGrupoFamiliar") || existingGroupType) === 'padresMadres' ? 'Padres/Madres' : 'No seleccionado'
                  }</p>
                  
                  {(watch("tipoGrupoFamiliar") === 'conyugeEHijos' || existingGroupType === 'conyugeEHijos') && (
                    <>
                      {watch("familiares.conyuge") && <p className="pl-4"><strong>Cónyuge:</strong> {watch("familiares.conyuge.nombre")} {watch("familiares.conyuge.apellido")}</p>}
                      {watch("familiares.hijos")?.map((h, i) => <p key={`hijo-rev-${i}`} className="pl-4"><strong>Hijo/a {i+1}:</strong> {h.nombre} {h.apellido}</p>)}
                    </>
                  )}
                  {(watch("tipoGrupoFamiliar") === 'padresMadres' || existingGroupType === 'padresMadres') && (
                    <>
                      {watch("familiares.padres")?.map((p, i) => <p key={`padre-rev-${i}`} className="pl-4"><strong>Padre/Madre {i+1}:</strong> {p.nombre} {p.apellido}</p>)}
                    </>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-4">Al enviar, confirmas que la información proporcionada es veraz y completa.</p>
              </section>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button type="button" variant="outline" onClick={prevStep} disabled={currentStep === 1}>
              <ChevronLeft className="mr-2 h-4 w-4" /> Anterior
            </Button>
            {currentStep < totalSteps ? (
              <Button type="button" onClick={nextStep}>
                Siguiente <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Enviando...' : 'Enviar Solicitud'}
              </Button>
            )}
          </CardFooter>
        </form>
      </Card>
    </FormProvider>
  );
}


    