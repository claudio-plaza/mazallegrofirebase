
'use client';

import { useEffect, useState } from 'react';
import { useForm, FormProvider, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import type { Socio, AdminEditSocioTitularData, MiembroFamiliar } from '@/types';
import { adminEditSocioTitularSchema, RelacionFamiliar } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardFooter, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { addSocio } from '@/lib/firebase/firestoreService';
import { getFileUrl, generateId } from '@/lib/helpers';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CalendarDays, UserPlus, Save, X, Info, Users, ShieldCheck, ShieldAlert, AlertTriangle, UserCircle, Briefcase, Mail, Phone, MapPin, Trash2, PlusCircle, UploadCloud, FileText, Lock, Heart } from 'lucide-react';
import { format, parseISO, isValid, subYears, formatISO } from 'date-fns';
import { Separator } from '../ui/separator';
import Image from 'next/image';

type FotoFieldNameTitular = 'fotoPerfil' | 'fotoDniFrente' | 'fotoDniDorso' | 'fotoCarnet';
type FotoFieldNameFamiliar = `grupoFamiliar.${number}.fotoPerfil` | `grupoFamiliar.${number}.fotoDniFrente` | `grupoFamiliar.${number}.fotoDniDorso` | `grupoFamiliar.${number}.fotoCarnet`;
type FotoFieldName = FotoFieldNameTitular | FotoFieldNameFamiliar;


const processPhotoFieldForSubmit = (fieldValue: any): string | null => {
    if (typeof window !== 'undefined' && fieldValue instanceof FileList && fieldValue.length > 0) {
        const timestamp = Date.now();
        const filename = fieldValue[0].name.substring(0, 10).replace(/[^a-zA-Z0-9]/g, '');
        return `https://placehold.co/150x150.png?text=FOTO_${filename}_${timestamp}`;
    }
    if (typeof fieldValue === 'string' && fieldValue.startsWith('http')) {
        return fieldValue;
    }
    return null;
};


export function AdminNuevoSocioForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [maxBirthDate, setMaxBirthDate] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'));
  const [maxBirthDateTitular, setMaxBirthDateTitular] = useState<string>(() => format(subYears(new Date(), 18), 'yyyy-MM-dd'));

  const form = useForm<AdminEditSocioTitularData>({
    resolver: zodResolver(adminEditSocioTitularSchema),
    mode: 'onBlur',
    defaultValues: {
      nombre: '',
      apellido: '',
      fechaNacimiento: undefined,
      dni: '',
      empresa: '',
      telefono: '',
      direccion: '',
      email: '',
      estadoSocio: 'Activo',
      tipoGrupoFamiliar: undefined,
      grupoFamiliar: [],
      fotoUrl: null, 
      fotoPerfil: null,
      fotoDniFrente: null,
      fotoDniDorso: null,
      fotoCarnet: null,
    },
  });

  const { fields: grupoFamiliarFields, append: appendFamiliar, remove: removeFamiliar, replace: replaceFamiliares } = useFieldArray({
    control: form.control,
    name: "grupoFamiliar",
  });

  const tipoGrupoFamiliarSeleccionado = form.watch('tipoGrupoFamiliar');

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'tipoGrupoFamiliar') {
        replaceFamiliares([]);
        if (value.tipoGrupoFamiliar === 'conyugeEHijos') {
           appendFamiliar({ id: generateId(), nombre: '', apellido: '', dni: '', fechaNacimiento: new Date(), relacion: RelacionFamiliar.CONYUGE, fotoPerfil: null, fotoDniFrente: null, fotoDniDorso: null, fotoCarnet: null, aptoMedico: undefined });
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form, replaceFamiliares, appendFamiliar]);


  const onSubmit = async (data: AdminEditSocioTitularData) => {
    const socioParaCrear: Omit<Socio, 'id' | 'numeroSocio' | 'role' | 'adherentes' | 'aptoMedico' | 'miembroDesde'> & { aptoMedico?: Partial<Socio['aptoMedico']> } = {
      nombre: data.nombre,
      apellido: data.apellido,
      fechaNacimiento: data.fechaNacimiento as Date,
      dni: data.dni,
      empresa: data.empresa,
      telefono: data.telefono,
      direccion: data.direccion,
      email: data.email,
      estadoSocio: data.estadoSocio,
      fotoUrl: processPhotoFieldForSubmit(data.fotoPerfil), 
      fotoPerfil: processPhotoFieldForSubmit(data.fotoPerfil),
      fotoDniFrente: processPhotoFieldForSubmit(data.fotoDniFrente),
      fotoDniDorso: processPhotoFieldForSubmit(data.fotoDniDorso),
      fotoCarnet: processPhotoFieldForSubmit(data.fotoCarnet),
      grupoFamiliar: data.grupoFamiliar?.filter(Boolean).map((formFamiliar) => {
            let relacionCorrecta = formFamiliar.relacion;
            if (data.tipoGrupoFamiliar === 'conyugeEHijos' && formFamiliar.relacion === RelacionFamiliar.PADRE_MADRE) {
                relacionCorrecta = RelacionFamiliar.HIJO_A;
            } else if (data.tipoGrupoFamiliar === 'padresMadres' && (formFamiliar.relacion === RelacionFamiliar.CONYUGE || formFamiliar.relacion === RelacionFamiliar.HIJO_A)) {
                relacionCorrecta = RelacionFamiliar.PADRE_MADRE;
            }
            return {
                ...formFamiliar,
                id: formFamiliar.id || generateId(),
                relacion: relacionCorrecta,
                fechaNacimiento: formFamiliar.fechaNacimiento,
                fotoPerfil: processPhotoFieldForSubmit(formFamiliar.fotoPerfil),
                fotoDniFrente: processPhotoFieldForSubmit(formFamiliar.fotoDniFrente),
                fotoDniDorso: processPhotoFieldForSubmit(formFamiliar.fotoDniDorso),
                fotoCarnet: processPhotoFieldForSubmit(formFamiliar.fotoCarnet),
                aptoMedico: formFamiliar.aptoMedico || { valido: false, razonInvalidez: 'Pendiente de revisión médica inicial'},
            }
        }) as MiembroFamiliar[],
    };

    try {
      await addSocio(socioParaCrear, false); 
      toast({ title: 'Socio Creado', description: `El socio ${data.nombre} ${data.apellido} ha sido agregado.` });
      router.push('/admin/gestion-socios');
    } catch (error) {
      console.error("Error al crear socio:", error);
      toast({ title: "Error", description: "No se pudo crear el socio.", variant: "destructive" });
    }
  };


  const renderFotoInput = (
    fieldName: FotoFieldName,
    label: string
  ) => {
    const currentFieldValue = form.watch(fieldName);
    let displayUrl: string | null = null;
    let newFileName: string | null = null;
  
    if (currentFieldValue instanceof FileList && currentFieldValue.length > 0) {
      if (typeof window !== 'undefined') {
        displayUrl = URL.createObjectURL(currentFieldValue[0]);
        newFileName = currentFieldValue[0].name;
      }
    } else if (typeof currentFieldValue === 'string') {
      displayUrl = currentFieldValue;
    }
  
    return (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <Card className="p-2 space-y-2">
          {displayUrl ? (
            <Image
              src={displayUrl}
              alt={`Vista previa de ${label}`}
              width={100}
              height={100}
              className="rounded border object-contain"
              data-ai-hint="user photo document placeholder"
            />
          ) : (
            <div className="flex items-center justify-center h-[100px] w-[100px] bg-muted rounded border text-muted-foreground text-xs text-center">
              Sin foto
            </div>
          )}
          <FormField
            control={form.control}
            name={fieldName}
            render={({ field }) => (
              <>
                <FormControl>
                  <label className="cursor-pointer text-sm font-medium text-primary hover:underline">
                    {displayUrl ? 'Cambiar...' : 'Subir...'}
                    <Input
                      type="file"
                      className="hidden"
                      onChange={e => field.onChange(e.target.files)}
                      accept="image/png,image/jpeg"
                    />
                  </label>
                </FormControl>
                {newFileName && (
                  <p className="text-xs text-muted-foreground mt-1">Nuevo: {newFileName}</p>
                )}
                {displayUrl && (
                  <Button
                    type="button"
                    variant="link"
                    className="text-xs text-destructive p-0 h-auto"
                    onClick={() => form.setValue(fieldName, null)}
                  >
                    Eliminar foto
                  </Button>
                )}
                <FormMessage className="text-xs" />
              </>
            )}
          />
        </Card>
      </FormItem>
    );
  };

  const fotoTitularActual = (form.watch('fotoPerfil') instanceof FileList
                             ? getFileUrl(form.watch('fotoPerfil') as FileList)
                             : form.watch('fotoPerfil') as string)
                             || `https://placehold.co/128x128.png?text=N S`;


  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card className="w-full max-w-4xl mx-auto shadow-xl">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-center gap-4">
                <Avatar className="h-20 w-20 border">
                    <AvatarImage src={fotoTitularActual} alt={`${form.watch('nombre') || 'Nuevo'} ${form.watch('apellido') || 'Socio'}`} data-ai-hint="profile photo placeholder"/>
                    <AvatarFallback>{(form.watch('nombre') || 'N')?.[0]}{(form.watch('apellido') || 'S')?.[0]}</AvatarFallback>
                </Avatar>
                <div>
                    <CardTitle className="text-2xl flex items-center"><UserPlus className="mr-3 h-7 w-7 text-primary" />Nuevo Socio Titular</CardTitle>
                    <CardDescription>Complete los datos para agregar un nuevo socio al club.</CardDescription>
                </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <section>
                <h3 className="text-lg font-semibold mb-3 text-primary border-b pb-1">Datos Personales y Contacto (Titular)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <FormField control={form.control} name="nombre" render={({ field }) => ( <FormItem> <FormLabel className="flex items-center"><UserCircle className="mr-1.5 h-4 w-4 text-muted-foreground"/>Nombre(s)</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="apellido" render={({ field }) => ( <FormItem> <FormLabel className="flex items-center"><UserCircle className="mr-1.5 h-4 w-4 text-muted-foreground"/>Apellido(s)</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="dni" render={({ field }) => ( <FormItem> <FormLabel className="flex items-center"><Info className="mr-1.5 h-4 w-4 text-muted-foreground"/>DNI</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="fechaNacimiento" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="flex items-center"><CalendarDays className="mr-1.5 h-4 w-4 text-muted-foreground"/>Fecha de Nacimiento</FormLabel>
                            <FormControl>
                                <Input
                                    type="date"
                                    value={field.value && isValid(field.value) ? format(field.value, 'yyyy-MM-dd') : ''}
                                    onChange={(e) => field.onChange(e.target.value ? parseISO(e.target.value) : null)}
                                    max={maxBirthDateTitular}
                                    className="w-full"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    <FormField control={form.control} name="email" render={({ field }) => ( <FormItem> <FormLabel className="flex items-center"><Mail className="mr-1.5 h-4 w-4 text-muted-foreground"/>Email</FormLabel> <FormControl><Input type="email" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="telefono" render={({ field }) => ( <FormItem> <FormLabel className="flex items-center"><Phone className="mr-1.5 h-4 w-4 text-muted-foreground"/>Teléfono</FormLabel> <FormControl><Input type="tel" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="direccion" render={({ field }) => ( <FormItem className="md:col-span-2"> <FormLabel className="flex items-center"><MapPin className="mr-1.5 h-4 w-4 text-muted-foreground"/>Dirección</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                </div>
            </section>
            <Separator />
            <section>
                <h3 className="text-lg font-semibold mb-3 text-primary border-b pb-1">Información de Membresía (Titular)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <FormField control={form.control} name="empresa" render={({ field }) => ( <FormItem> <FormLabel className="flex items-center"><Briefcase className="mr-1.5 h-4 w-4 text-muted-foreground"/>Empresa / Sindicato</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="estadoSocio" render={({ field }) => (
                        <FormItem>
                        <FormLabel className="flex items-center"><Info className="mr-1.5 h-4 w-4 text-muted-foreground"/>Estado del Socio</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Seleccione un estado" /></SelectTrigger></FormControl>
                            <SelectContent>
                            {(['Activo', 'Inactivo', 'Pendiente Validacion'] as const).map(estado => (
                                <SelectItem key={estado} value={estado}>{estado}</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )} />
                </div>
            </section>
            <Separator />
            <section>
                <h3 className="text-lg font-semibold mb-3 text-primary border-b pb-1">Salud y Documentación (Titular)</h3>
                 <p className="text-xs text-muted-foreground mb-4">El apto médico se gestionará desde el Panel Médico una vez creado el socio.</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {renderFotoInput('fotoPerfil', 'Foto de Perfil')}
                    {renderFotoInput('fotoDniFrente', 'DNI Frente')}
                    {renderFotoInput('fotoDniDorso', 'DNI Dorso')}
                    {renderFotoInput('fotoCarnet', 'Foto Carnet')}
                </div>
            </section>
            <Separator />
             <section>
                <h3 className="text-lg font-semibold mb-3 text-primary border-b pb-1">Grupo Familiar (Opcional)</h3>
                 <FormField
                    control={form.control}
                    name="tipoGrupoFamiliar"
                    render={({ field }) => (
                        <FormItem className="mb-6">
                            <FormLabel className="flex items-center"><Users className="mr-1.5 h-4 w-4 text-muted-foreground"/>Tipo de Grupo Familiar</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccione un tipo de grupo (opcional)" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="conyugeEHijos">Cónyuge e Hijos/as</SelectItem>
                                    <SelectItem value="padresMadres">Padres/Madres</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="space-y-6">
                {grupoFamiliarFields.map((field, index) => {
                    const fotoPerfilFamiliarActual = form.watch(`grupoFamiliar.${index}.fotoPerfil`) instanceof FileList
                                                    ? getFileUrl(form.watch(`grupoFamiliar.${index}.fotoPerfil`) as FileList)
                                                    : form.watch(`grupoFamiliar.${index}.fotoPerfil`) as string || `https://placehold.co/64x64.png?text=${form.watch(`grupoFamiliar.${index}.nombre`)?.[0] || 'F'}${form.watch(`grupoFamiliar.${index}.apellido`)?.[0] || ''}`;

                    return (
                        <Card key={field.id} className="p-4 bg-muted/20">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-medium">Familiar {index + 1}</h4>
                                <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => removeFamiliar(index)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField control={form.control} name={`grupoFamiliar.${index}.nombre`} render={({ field: formField }) => ( <FormItem> <FormLabel className="text-xs">Nombre</FormLabel> <FormControl><Input {...formField} className="h-9 text-sm"/></FormControl> <FormMessage /> </FormItem> )} />
                                <FormField control={form.control} name={`grupoFamiliar.${index}.apellido`} render={({ field: formField }) => ( <FormItem> <FormLabel className="text-xs">Apellido</FormLabel> <FormControl><Input {...formField} className="h-9 text-sm"/></FormControl> <FormMessage /> </FormItem> )} />
                                <FormField control={form.control} name={`grupoFamiliar.${index}.dni`} render={({ field: formField }) => ( <FormItem> <FormLabel className="text-xs">DNI</FormLabel> <FormControl><Input type="number" {...formField} className="h-9 text-sm"/></FormControl> <FormMessage /> </FormItem> )} />
                                <FormField control={form.control} name={`grupoFamiliar.${index}.fechaNacimiento`} render={({ field: formField }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs">Fecha Nac.</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="date"
                                                value={formField.value && isValid(formField.value) ? format(formField.value, 'yyyy-MM-dd') : ''}
                                                onChange={(e) => formField.onChange(e.target.value ? parseISO(e.target.value) : null)}
                                                max={maxBirthDate}
                                                className="w-full h-9 text-sm"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name={`grupoFamiliar.${index}.relacion`} render={({ field: formField }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs">Relación</FormLabel>
                                        <Select onValueChange={formField.onChange} value={formField.value}>
                                            <FormControl><SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccione relación" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {Object.values(RelacionFamiliar).map(rel => (
                                                    <SelectItem key={rel} value={rel} disabled={
                                                        (tipoGrupoFamiliarSeleccionado === 'conyugeEHijos' && rel === RelacionFamiliar.PADRE_MADRE) ||
                                                        (tipoGrupoFamiliarSeleccionado === 'padresMadres' && (rel === RelacionFamiliar.CONYUGE || rel === RelacionFamiliar.HIJO_A))
                                                    }>{rel}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                 <div className="md:col-span-1 flex flex-col items-center">
                                      <Avatar className="h-16 w-16 border">
                                          <AvatarImage src={fotoPerfilFamiliarActual || undefined} alt={form.watch(`grupoFamiliar.${index}.nombre`)} data-ai-hint="family member photo placeholder"/>
                                          <AvatarFallback>{form.watch(`grupoFamiliar.${index}.nombre`)?.[0]}{form.watch(`grupoFamiliar.${index}.apellido`)?.[0]}</AvatarFallback>
                                      </Avatar>
                                      <p className="text-xs mt-1 text-center p-1 rounded bg-yellow-100 text-yellow-700">Apto: Pendiente</p>
                                  </div>
                            </div>
                            <Separator className="my-3"/>
                            <h5 className="text-sm font-semibold mt-2 mb-1">Documentación Familiar {index + 1}</h5>
                             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {renderFotoInput(`grupoFamiliar.${index}.fotoPerfil` as FotoFieldNameFamiliar, 'Foto de Perfil')}
                                {renderFotoInput(`grupoFamiliar.${index}.fotoDniFrente` as FotoFieldNameFamiliar, 'DNI Frente')}
                                {renderFotoInput(`grupoFamiliar.${index}.fotoDniDorso` as FotoFieldNameFamiliar, 'DNI Dorso')}
                                {renderFotoInput(`grupoFamiliar.${index}.fotoCarnet` as FotoFieldNameFamiliar, 'Foto Carnet')}
                             </div>
                        </Card>
                    );
                })}
                {tipoGrupoFamiliarSeleccionado && (
                    <Button type="button" variant="outline" onClick={() => appendFamiliar({ id: generateId(), nombre: '', apellido: '', dni: '', fechaNacimiento: new Date(), relacion: tipoGrupoFamiliarSeleccionado === 'conyugeEHijos' ? RelacionFamiliar.HIJO_A : RelacionFamiliar.PADRE_MADRE, fotoPerfil: null, fotoDniFrente: null, fotoDniDorso: null, fotoCarnet: null, aptoMedico: undefined })}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        {tipoGrupoFamiliarSeleccionado === 'conyugeEHijos' ? 'Agregar Hijo/a' : 'Agregar Padre/Madre'}
                    </Button>
                )}
                </div>
            </section>

          </CardContent>
          <CardFooter className="flex justify-between pt-6">
            <Button type="button" variant="outline" onClick={() => router.push('/admin/gestion-socios')}>
              <X className="mr-2 h-4 w-4" /> Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              <Save className="mr-2 h-4 w-4" /> {form.formState.isSubmitting ? 'Creando Socio...' : 'Crear Socio'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </FormProvider>
  );
}
