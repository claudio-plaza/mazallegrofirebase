
'use client';

import { useState, useEffect } from 'react';
import { useForm, FormProvider, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, ChevronRight, PlusCircle, Trash2, UploadCloud, FileText as FileIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { 
  type AltaSocioData, altaSocioSchema,
  type Paso1TitularData, paso1TitularSchema,
  type Paso2FamiliaresData, paso2FamiliaresSchema, // Changed from Paso3FamiliaresData
  empresas, EmpresaTitular, RelacionFamiliar, MAX_HIJOS, MAX_PADRES
} from '@/types';
import { getFileUrl } from '@/lib/helpers';

const totalSteps = 3; // Reduced from 4 to 3

export function AltaSocioMultiStepForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoadingTitularData, setIsLoadingTitularData] = useState(true);
  const { toast } = useToast();
  const auth = useAuth();

  const form = useForm<AltaSocioData>({
    resolver: async (data, context, options) => {
      let result;
      if (currentStep === 1) {
        result = await zodResolver(paso1TitularSchema)(data, context, options);
      } else if (currentStep === 2) { // Previously Step 3, now Step 2 for familiares
        const familiaresData = data.familiares || { conyuge: null, hijos: [], padres: [] };
        result = await zodResolver(paso2FamiliaresSchema)(familiaresData, context, options);
        if (result.errors && Object.keys(result.errors).length > 0) {
            const errorsMapped: Record<string, any> = {};
            Object.keys(result.errors).forEach(key => {
                errorsMapped[`familiares.${key}`] = result.errors[key];
            });
            return { values: data, errors: errorsMapped };
        }
        return {values: { ...data, familiares: result.values }, errors: {}};
      } else {
        // For Step 3 (Review), or any other step not explicitly handled, assume full schema or no validation needed yet.
        // For the final submission, the full `altaSocioSchema` will be used by `handleSubmit`.
        result = { values: data, errors: {} }; 
      }
      return result;
    },
    mode: 'onChange', 
    defaultValues: {
      apellido: '', nombre: '', dni: '', empresa: undefined, telefono: '', direccion: '', email: '',
      fotoDniFrente: null, fotoDniDorso: null, fotoPerfil: null,
      familiares: { // tipoGrupoFamiliar is removed
        conyuge: null,
        hijos: [],
        padres: [],
      }
    },
  });

  const { control, trigger, handleSubmit, watch, setValue, getValues, reset, formState: { errors, isValid } } = form;

  useEffect(() => {
    const loadTitularData = async () => {
      setIsLoadingTitularData(true);
      const existingDni = getValues("dni"); 
      if (existingDni && auth.isLoggedIn) { 
        console.log("Datos del titular detectados (simulado), saltando al paso 2 (Datos Familiares).");
        setCurrentStep(2); // Skip to new Step 2 (Familiares)
      }
      setIsLoadingTitularData(false);
    };

    loadTitularData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isLoggedIn]);


  const { fields: hijosFields, append: appendHijo, remove: removeHijo } = useFieldArray({
    control,
    name: "familiares.hijos",
  });

  const { fields: padresFields, append: appendPadre, remove: removePadre } = useFieldArray({
    control,
    name: "familiares.padres",
  });
  
  // tipoGrupoFamiliar is no longer watched or used to control UI visibility in this step

  const nextStep = async () => {
    let isValidStep = false;
    if (currentStep === 1) { // Titular data
      isValidStep = await trigger(["apellido", "nombre", "fechaNacimiento", "dni", "empresa", "telefono", "direccion", "email", "fotoDniFrente", "fotoDniDorso", "fotoPerfil"]);
    } else if (currentStep === 2) { // Familiares data (new Step 2)
      isValidStep = await trigger(["familiares"]);
    } else { // Review step (new Step 3)
      isValidStep = true; 
    }

    if (isValidStep) {
      if (currentStep < totalSteps) {
        setCurrentStep(prev => prev + 1);
      }
    } else {
      toast({
        title: "Error de Validación",
        description: "Por favor, corrija los errores en el formulario.",
        variant: "destructive",
      });
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };
  
  const onSubmit = (data: AltaSocioData) => {
    console.log('Solicitud de Alta Data:', data);
    toast({
      title: 'Solicitud Enviada',
      description: 'Tu solicitud de alta ha sido enviada exitosamente (simulación).',
    });
    // reset(); 
    // setCurrentStep(1); 
  };

 const renderFilePreview = (fileList: FileList | null | undefined, fieldName: keyof AltaSocioData | `familiares.conyuge.${string}` | `familiares.hijos.${number}.${string}` | `familiares.padres.${number}.${string}`) => {
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

  if (isLoadingTitularData) {
    return (
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader><CardTitle>Cargando...</CardTitle></CardHeader>
        <CardContent><p>Verificando datos del titular...</p></CardContent>
      </Card>
    );
  }

  return (
    <FormProvider {...form}>
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Solicitud de Alta de Socio</CardTitle>
          <CardDescription>Paso {currentStep} de {totalSteps}</CardDescription>
          <div className="w-full bg-muted rounded-full h-2.5 mt-2">
            <div className="bg-primary h-2.5 rounded-full" style={{ width: `${(currentStep / totalSteps) * 100}%` }}></div>
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            {currentStep === 1 && ( 
              <section>
                <h3 className="text-lg font-semibold mb-4">Datos del Titular</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={control} name="apellido" render={({ field }) => ( <FormItem> <FormLabel>Apellido</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                  <FormField control={control} name="nombre" render={({ field }) => ( <FormItem> <FormLabel>Nombre</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                  <FormField control={control} name="fechaNacimiento" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de Nacimiento</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value ? format(new Date(field.value), 'yyyy-MM-dd') : ''}
                          onChange={(e) => field.onChange(e.target.value ? parseISO(e.target.value) : null)}
                          className="w-full"
                          max={format(new Date(), 'yyyy-MM-dd')}
                          min={format(new Date("1900-01-01"), 'yyyy-MM-dd')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={control} name="dni" render={({ field }) => ( <FormItem> <FormLabel>DNI</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                  <FormField control={control} name="empresa" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Empresa</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccione empresa" /></SelectTrigger></FormControl>
                        <SelectContent>{empresas.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={control} name="telefono" render={({ field }) => ( <FormItem> <FormLabel>Teléfono</FormLabel> <FormControl><Input type="tel" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                  <FormField control={control} name="direccion" render={({ field }) => ( <FormItem className="md:col-span-2"> <FormLabel>Dirección</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                  <FormField control={control} name="email" render={({ field }) => ( <FormItem className="md:col-span-2"> <FormLabel>Email</FormLabel> <FormControl><Input type="email" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                </div>
                <h4 className="text-md font-semibold mt-6 mb-2">Documentación del Titular</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(['fotoDniFrente', 'fotoDniDorso', 'fotoPerfil'] as const).map(fieldName => (
                        <FormField
                            control={control}
                            name={fieldName}
                            key={fieldName}
                            render={({ field: { onChange, value, ...restField }}) => (
                            <FormItem>
                                <FormLabel>
                                {fieldName === 'fotoDniFrente' ? 'Foto DNI Frente' : fieldName === 'fotoDniDorso' ? 'Foto DNI Dorso' : 'Foto de Perfil'}
                                </FormLabel>
                                <FormControl>
                                <label className="cursor-pointer w-full flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-md hover:border-primary">
                                    <UploadCloud className="h-8 w-8 text-muted-foreground mb-2" />
                                    <span className="text-sm text-muted-foreground">
                                        { value && value.length > 0 ? `${value[0].name}` : "Click para subir archivo"}
                                    </span>
                                    <Input 
                                        type="file" 
                                        className="hidden" 
                                        onChange={(e) => onChange(e.target.files)}
                                        accept={fieldName === 'fotoPerfil' ? "image/png,image/jpeg" : "image/png,image/jpeg,application/pdf"}
                                        {...restField}
                                    />
                                </label>
                                </FormControl>
                                {renderFilePreview(value, fieldName)}
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    ))}
                </div>
              </section>
            )}
            
            {/* Step 2 (Old Step 3) - Datos del Grupo Familiar */}
            {currentStep === 2 && ( 
              <section>
                <h3 className="text-lg font-semibold mb-4">Datos del Grupo Familiar (Opcional)</h3>
                <p className="text-sm text-muted-foreground mb-4">Agregue los miembros de su familia que desee asociar.</p>
                
                {/* Sección Cónyuge */}
                <div className="mb-6 p-4 border rounded-md">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-md font-semibold">Datos del Cónyuge</h4>
                     {!watch("familiares.conyuge") ? (
                        <Button type="button" size="sm" variant="outline" onClick={() => setValue('familiares.conyuge', { apellido: '', nombre: '', fechaNacimiento: new Date(), dni: '', relacion: RelacionFamiliar.CONYUGE, fotoDniFrente: null, fotoDniDorso: null, fotoPerfil: null })}>
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

                {/* Sección Hijos */}
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

                {/* Sección Padres/Madres */}
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
                 {errors.familiares && (errors.familiares as any).message && <FormMessage>{(errors.familiares as any).message}</FormMessage>}
              </section>
            )}

            {/* Step 3 (Old Step 4) - Review and Submit */}
            {currentStep === 3 && ( 
              <section>
                <h3 className="text-lg font-semibold mb-4">Revisar y Enviar Solicitud</h3>
                <p className="text-muted-foreground mb-4">Por favor, revisa que toda la información sea correcta antes de enviar.</p>
                <div className="space-y-2 p-4 border rounded-md bg-muted/30">
                  <p><strong>Titular:</strong> {watch("nombre")} {watch("apellido")} - DNI: {watch("dni")}</p>
                  <p><strong>Email:</strong> {watch("email")}</p>
                  {/* tipoGrupoFamiliar is removed from review */}
                  {watch("familiares.conyuge") && <p className="pl-4"><strong>Cónyuge:</strong> {watch("familiares.conyuge.nombre")} {watch("familiares.conyuge.apellido")}</p>}
                  {watch("familiares.hijos")?.map((h, i) => <p key={i} className="pl-4"><strong>Hijo/a {i+1}:</strong> {h.nombre} {h.apellido}</p>)}
                  {watch("familiares.padres")?.map((p, i) => <p key={i} className="pl-4"><strong>Padre/Madre {i+1}:</strong> {p.nombre} {p.apellido}</p>)}
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
