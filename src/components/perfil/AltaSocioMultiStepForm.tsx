
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
import { 
  type AltaSocioData, altaSocioSchema,
  type Paso1TitularData, paso1TitularSchema,
  type Paso3FamiliaresData, paso3FamiliaresSchema,
  empresas, EmpresaTitular, RelacionFamiliar, MAX_HIJOS, MAX_PADRES
} from '@/types';
import { getFileUrl } from '@/lib/helpers';

const totalSteps = 4;

export function AltaSocioMultiStepForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const { toast } = useToast();

  const form = useForm<AltaSocioData>({
    resolver: async (data, context, options) => {
      let result;
      if (currentStep === 1) {
        result = await zodResolver(paso1TitularSchema)(data, context, options);
      } else if (currentStep === 3) {
         // Ensure 'familiares' object exists for validation
        const familiaresData = data.familiares || { tipoGrupoFamiliar: undefined, conyuge: null, hijos: [], padres: [] };
        result = await zodResolver(paso3FamiliaresSchema)(familiaresData, context, options);
         // Map errors back to data.familiares if they exist
        if (result.errors && Object.keys(result.errors).length > 0) {
            const errorsMapped = {};
            Object.keys(result.errors).forEach(key => {
                errorsMapped[`familiares.${key}`] = result.errors[key];
            });
            return { values: data, errors: errorsMapped };
        }
        return {values: { ...data, familiares: result.values }, errors: {}};

      } else {
        // For step 2 (selection only) and step 4 (review), no specific validation here
        // Full validation occurs on final submit
        result = { values: data, errors: {} };
      }
      return result;
    },
    mode: 'onChange', // Validate on change for better UX
    defaultValues: {
      // Paso 1
      apellido: '', nombre: '', dni: '', empresa: undefined, telefono: '', direccion: '', email: '',
      fotoDniFrente: null, fotoDniDorso: null, fotoPerfil: null,
      // Paso 3 (familiares wrapped)
      familiares: {
        tipoGrupoFamiliar: undefined,
        conyuge: null,
        hijos: [],
        padres: [],
      }
    },
  });

  const { control, trigger, handleSubmit, watch, setValue, formState: { errors, isValid } } = form;

  const { fields: hijosFields, append: appendHijo, remove: removeHijo } = useFieldArray({
    control,
    name: "familiares.hijos",
  });

  const { fields: padresFields, append: appendPadre, remove: removePadre } = useFieldArray({
    control,
    name: "familiares.padres",
  });
  
  const tipoGrupoFamiliar = watch("familiares.tipoGrupoFamiliar");

  const nextStep = async () => {
    let isValidStep = false;
    if (currentStep === 1) {
      isValidStep = await trigger(["apellido", "nombre", "fechaNacimiento", "dni", "empresa", "telefono", "direccion", "email", "fotoDniFrente", "fotoDniDorso", "fotoPerfil"]);
    } else if (currentStep === 2) {
        // Check if tipoGrupoFamiliar is selected
        isValidStep = !!tipoGrupoFamiliar;
        if(!isValidStep) {
            form.setError("familiares.tipoGrupoFamiliar", { type: "manual", message: "Debe seleccionar un tipo de grupo familiar." });
        } else {
            form.clearErrors("familiares.tipoGrupoFamiliar");
        }
    } else if (currentStep === 3) {
      isValidStep = await trigger(["familiares"]);
    } else {
      isValidStep = true; // For review step or unvalidated steps
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
    // Simulate API call and reset
    toast({
      title: 'Solicitud Enviada',
      description: 'Tu solicitud de alta ha sido enviada exitosamente (simulación).',
    });
    // form.reset(); // Optionally reset form
    // setCurrentStep(1); // Go back to first step
  };

  const renderFilePreview = (fileList: FileList | null | undefined, fieldName: string) => {
    const url = getFileUrl(fileList);
    if (url) {
      return (
        <div className="mt-2 flex items-center space-x-2">
          <FileIcon className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground truncate max-w-[200px]">{fileList![0].name}</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => form.setValue(fieldName as any, null)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      );
    }
    return null;
  };


  return (
    <FormProvider {...form}>
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Solicitud de Alta de Socio Titular</CardTitle>
          <CardDescription>Paso {currentStep} de {totalSteps}</CardDescription>
          <div className="w-full bg-muted rounded-full h-2.5 mt-2">
            <div className="bg-primary h-2.5 rounded-full" style={{ width: `${(currentStep / totalSteps) * 100}%` }}></div>
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            {currentStep === 1 && ( // PASO 1: Datos del Titular
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
                          value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
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
                <h4 className="text-md font-semibold mt-6 mb-2">Documentación</h4>
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

            {currentStep === 2 && ( // PASO 2: Tipo de Grupo Familiar
              <section>
                <h3 className="text-lg font-semibold mb-4">Tipo de Grupo Familiar</h3>
                 <FormField
                    control={control}
                    name="familiares.tipoGrupoFamiliar"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>¿Qué tipo de grupo familiar desea registrar?</FormLabel>
                        <FormControl>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <Button type="button" variant={field.value === 'conyugeEHijos' ? 'default' : 'outline'} onClick={() => field.onChange('conyugeEHijos')} className="flex-1 justify-start p-6 text-left h-auto">
                                    <div className="flex flex-col">
                                        <span className="font-semibold">Registrar Cónyuge e Hijos/as</span>
                                        <span className="text-xs text-muted-foreground">Permite agregar un cónyuge y hasta {MAX_HIJOS} hijos/as.</span>
                                    </div>
                                </Button>
                                <Button type="button" variant={field.value === 'padresMadres' ? 'default' : 'outline'} onClick={() => field.onChange('padresMadres')} className="flex-1 justify-start p-6 text-left h-auto">
                                    <div className="flex flex-col">
                                        <span className="font-semibold">Registrar Padres/Madres</span>
                                        <span className="text-xs text-muted-foreground">Permite agregar hasta {MAX_PADRES} padres/madres.</span>
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
            
            {currentStep === 3 && ( // PASO 3: Datos del Grupo Familiar
              <section>
                <h3 className="text-lg font-semibold mb-4">Datos del Grupo Familiar</h3>
                {tipoGrupoFamiliar === 'conyugeEHijos' && (
                  <>
                    {/* Formulario Cónyuge */}
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={control} name="familiares.conyuge.apellido" render={({ field }) => ( <FormItem> <FormLabel>Apellido Cónyuge</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                            <FormField control={control} name="familiares.conyuge.nombre" render={({ field }) => ( <FormItem> <FormLabel>Nombre Cónyuge</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                            <FormField control={control} name="familiares.conyuge.fechaNacimiento" render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Fecha Nac. Cónyuge</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="date"
                                      value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                                      onChange={(e) => field.onChange(e.target.value ? parseISO(e.target.value) : null)}
                                      className="w-full"
                                      max={format(new Date(), 'yyyy-MM-dd')}
                                      min={format(new Date("1900-01-01"), 'yyyy-MM-dd')}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={control} name="familiares.conyuge.dni" render={({ field }) => ( <FormItem> <FormLabel>DNI Cónyuge</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                        </div>
                       )}
                    </div>

                    {/* Formularios Hijos */}
                    <h4 className="text-md font-semibold mb-2">Datos de Hijos/as (hasta {MAX_HIJOS})</h4>
                    {hijosFields.map((item, index) => (
                      <div key={item.id} className="mb-4 p-4 border rounded-md relative">
                        <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive hover:bg-destructive/10" onClick={() => removeHijo(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <p className="font-medium mb-2">Hijo/a {index + 1}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <FormField control={control} name={`familiares.hijos.${index}.apellido`} render={({ field }) => ( <FormItem> <FormLabel>Apellido</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                           <FormField control={control} name={`familiares.hijos.${index}.nombre`} render={({ field }) => ( <FormItem> <FormLabel>Nombre</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                           <FormField control={control} name={`familiares.hijos.${index}.fechaNacimiento`} render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Fecha Nac.</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="date"
                                      value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                                      onChange={(e) => field.onChange(e.target.value ? parseISO(e.target.value) : null)}
                                      className="w-full"
                                      max={format(new Date(), 'yyyy-MM-dd')}
                                      min={format(new Date("1900-01-01"), 'yyyy-MM-dd')}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={control} name={`familiares.hijos.${index}.dni`} render={({ field }) => ( <FormItem> <FormLabel>DNI</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                        </div>
                      </div>
                    ))}
                    {hijosFields.length < MAX_HIJOS && (
                      <Button type="button" variant="outline" onClick={() => appendHijo({ apellido: '', nombre: '', fechaNacimiento: new Date(), dni: '', relacion: RelacionFamiliar.HIJO_A, fotoDniFrente: null, fotoDniDorso: null, fotoPerfil: null })}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Agregar Hijo/a
                      </Button>
                    )}
                  </>
                )}
                {tipoGrupoFamiliar === 'padresMadres' && (
                    <>
                    <h4 className="text-md font-semibold mb-2">Datos de Padres/Madres (hasta {MAX_PADRES})</h4>
                    {/* Formularios Padres/Madres (similar a hijos) */}
                     {padresFields.map((item, index) => (
                      <div key={item.id} className="mb-4 p-4 border rounded-md relative">
                        <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive hover:bg-destructive/10" onClick={() => removePadre(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <p className="font-medium mb-2">Padre/Madre {index + 1}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <FormField control={control} name={`familiares.padres.${index}.apellido`} render={({ field }) => ( <FormItem> <FormLabel>Apellido</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                           <FormField control={control} name={`familiares.padres.${index}.nombre`} render={({ field }) => ( <FormItem> <FormLabel>Nombre</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                           <FormField control={control} name={`familiares.padres.${index}.fechaNacimiento`} render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Fecha Nac.</FormLabel>
                                  <FormControl>
                                     <Input
                                      type="date"
                                      value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                                      onChange={(e) => field.onChange(e.target.value ? parseISO(e.target.value) : null)}
                                      className="w-full"
                                      max={format(new Date(), 'yyyy-MM-dd')}
                                      min={format(new Date("1900-01-01"), 'yyyy-MM-dd')}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={control} name={`familiares.padres.${index}.dni`} render={({ field }) => ( <FormItem> <FormLabel>DNI</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                        </div>
                      </div>
                    ))}
                    {padresFields.length < MAX_PADRES && (
                      <Button type="button" variant="outline" onClick={() => appendPadre({ apellido: '', nombre: '', fechaNacimiento: new Date(), dni: '', relacion: RelacionFamiliar.PADRE_MADRE, fotoDniFrente: null, fotoDniDorso: null, fotoPerfil: null })}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Agregar Padre/Madre
                      </Button>
                    )}
                    </>
                )}
                 {errors.familiares && (errors.familiares as any).message && <FormMessage>{(errors.familiares as any).message}</FormMessage>}
              </section>
            )}

            {currentStep === 4 && ( // PASO 4: Revisar y Enviar
              <section>
                <h3 className="text-lg font-semibold mb-4">Revisar y Enviar Solicitud</h3>
                <p className="text-muted-foreground mb-4">Por favor, revisa que toda la información sea correcta antes de enviar.</p>
                {/* Resumen de datos (simulado) */}
                <div className="space-y-2 p-4 border rounded-md bg-muted/30">
                  <p><strong>Titular:</strong> {watch("nombre")} {watch("apellido")} - DNI: {watch("dni")}</p>
                  <p><strong>Email:</strong> {watch("email")}</p>
                  {watch("familiares.tipoGrupoFamiliar") && <p><strong>Grupo Familiar:</strong> {watch("familiares.tipoGrupoFamiliar") === "conyugeEHijos" ? "Cónyuge e Hijos" : "Padres/Madres"}</p>}
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

    