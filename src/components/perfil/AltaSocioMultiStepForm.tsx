
'use client';

import { useState, useEffect } from 'react';
import { useForm, FormProvider, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, ChevronRight, PlusCircle, Trash2, UploadCloud, FileText as FileIcon, Users, Heart, UserSquare2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { 
  type AgregarFamiliaresData, agregarFamiliaresSchema,
  RelacionFamiliar, MAX_HIJOS, MAX_PADRES
} from '@/types';
import { getFileUrl } from '@/lib/helpers';

const totalSteps = 3;

export function AltaSocioMultiStepForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const { toast } = useToast();
  const auth = useAuth(); 

  const form = useForm<AgregarFamiliaresData>({
    resolver: async (data, context, options) => {
      let result;
      if (currentStep === 1) {
        const step1Schema = z.object({ tipoGrupoFamiliar: agregarFamiliaresSchema.shape.tipoGrupoFamiliar });
        result = await zodResolver(step1Schema)(data, context, options);
      } else if (currentStep === 2) { 
        result = await zodResolver(agregarFamiliaresSchema)(data, context, options);
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

  const nextStep = async () => {
    let isValidStep = false;
    if (currentStep === 1) {
      isValidStep = await trigger(["tipoGrupoFamiliar"]);
    } else if (currentStep === 2) {
      isValidStep = await trigger(["familiares"]); 
      if (errors.familiares && (errors.familiares as any).message && !isValidStep) {
        // Handled by the general toast below
      }
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
  
  const onSubmit = (data: AgregarFamiliaresData) => {
    console.log('Datos Familiares para Agregar:', data);
    toast({
      title: 'Familiares Agregados',
      description: 'Los datos de los familiares han sido enviados exitosamente (simulación).',
    });
  };

 const renderFilePreview = (fileList: FileList | null | undefined, fieldName: `familiares.conyuge.${string}` | `familiares.hijos.${number}.${string}` | `familiares.padres.${number}.${string}`) => {
    const url = getFileUrl(fileList);
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

  // Effect to clear dependent fields when tipoGrupoFamiliar changes
  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name === 'tipoGrupoFamiliar') {
        if (value.tipoGrupoFamiliar === 'conyugeEHijos') {
          setValue('familiares.padres', []);
        } else if (value.tipoGrupoFamiliar === 'padresMadres') {
          setValue('familiares.conyuge', null);
          setValue('familiares.hijos', []);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, setValue]);

  return (
    <FormProvider {...form}>
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Agregar Grupo Familiar</CardTitle>
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
            {/* Paso 1: Selección de Tipo de Grupo Familiar */}
            {currentStep === 1 && ( 
              <section>
                <h3 className="text-lg font-semibold mb-4">Tipo de Grupo Familiar</h3>
                 <FormField
                    control={control}
                    name="tipoGrupoFamiliar"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>¿Qué tipo de grupo familiar desea registrar?</FormLabel>
                        <FormControl>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <Button 
                                    type="button" 
                                    variant={field.value === 'conyugeEHijos' ? 'default' : 'outline'} 
                                    onClick={() => field.onChange('conyugeEHijos')} 
                                    className="flex-1 justify-start p-6 text-left h-auto"
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
            
            {/* Paso 2: Detalles del Grupo Familiar */}
            {currentStep === 2 && ( 
              <section>
                <h3 className="text-lg font-semibold mb-2">Datos del Grupo Familiar</h3>
                {!tipoGrupoFamiliar && <p className="text-destructive">Por favor, regrese al paso anterior y seleccione un tipo de grupo familiar.</p>}

                {/* Sección Cónyuge (Visible si tipoGrupoFamiliar es 'conyugeEHijos') */}
                {tipoGrupoFamiliar === 'conyugeEHijos' && (
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
                                                  <span className="text-sm text-muted-foreground">{value && value.length > 0 ? value[0].name : "Subir"}</span>
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
                )}

                {/* Sección Hijos (Visible si tipoGrupoFamiliar es 'conyugeEHijos') */}
                {tipoGrupoFamiliar === 'conyugeEHijos' && (
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
                                                    <span className="text-sm text-muted-foreground">{value && value.length > 0 ? value[0].name : "Subir"}</span>
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
                )}

                {/* Sección Padres/Madres (Visible si tipoGrupoFamiliar es 'padresMadres') */}
                {tipoGrupoFamiliar === 'padresMadres' && (
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
                                                    <span className="text-sm text-muted-foreground">{value && value.length > 0 ? value[0].name : "Subir"}</span>
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

            {/* Paso 3: Revisión Final */}
            {currentStep === 3 && ( 
              <section>
                <h3 className="text-lg font-semibold mb-4">Revisar y Enviar Solicitud</h3>
                <p className="text-muted-foreground mb-4">Por favor, revisa que toda la información sea correcta antes de enviar.</p>
                <div className="space-y-2 p-4 border rounded-md bg-muted/30">
                  <p><strong>Tipo de Grupo Familiar:</strong> {
                    watch("tipoGrupoFamiliar") === 'conyugeEHijos' ? 'Cónyuge e Hijos/as' : 
                    watch("tipoGrupoFamiliar") === 'padresMadres' ? 'Padres/Madres' : 'No seleccionado'
                  }</p>
                  
                  {watch("tipoGrupoFamiliar") === 'conyugeEHijos' && (
                    <>
                      {watch("familiares.conyuge") && <p className="pl-4"><strong>Cónyuge:</strong> {watch("familiares.conyuge.nombre")} {watch("familiares.conyuge.apellido")}</p>}
                      {watch("familiares.hijos")?.map((h, i) => <p key={`hijo-rev-${i}`} className="pl-4"><strong>Hijo/a {i+1}:</strong> {h.nombre} {h.apellido}</p>)}
                    </>
                  )}
                  {watch("tipoGrupoFamiliar") === 'padresMadres' && (
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

