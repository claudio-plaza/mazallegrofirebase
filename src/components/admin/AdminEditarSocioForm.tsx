
'use client';

import { useEffect, useState } from 'react';
import { useForm, FormProvider, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import type { Socio, AdminEditSocioTitularData, MiembroFamiliar, AdminEditableFamiliarData } from '@/types';
import { adminEditSocioTitularSchema, RelacionFamiliar } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardFooter, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getSocioById, updateSocio } from '@/lib/firebase/firestoreService';
import { formatDate, getAptoMedicoStatus, getFileUrl, normalizeText } from '@/lib/helpers';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CalendarDays, UserCog, Save, X, Info, Users, ShieldCheck, ShieldAlert, AlertTriangle, UserCircle, Briefcase, Mail, Phone, MapPin, Trash2, PlusCircle, UploadCloud, FileText } from 'lucide-react';
import { format, parseISO, isValid, subYears, formatISO } from 'date-fns';
import { Separator } from '../ui/separator';
import Link from 'next/link';
import Image from 'next/image';


interface AdminEditarSocioFormProps {
  socioId: string;
}

export function AdminEditarSocioForm({ socioId }: AdminEditarSocioFormProps) {
  const [socio, setSocio] = useState<Socio | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();
  
  const [maxBirthDate, setMaxBirthDate] = useState<string>(() => {
    const today = new Date();
    return format(today, 'yyyy-MM-dd');
  });
  const [maxBirthDateTitular, setMaxBirthDateTitular] = useState<string>(() => {
    const eighteenYearsAgo = subYears(new Date(), 18);
    return format(eighteenYearsAgo, 'yyyy-MM-dd');
  });


  const form = useForm<AdminEditSocioTitularData>({
    resolver: zodResolver(adminEditSocioTitularSchema),
    mode: 'onBlur', // Puede ser útil para validaciones de archivo
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
      grupoFamiliar: [],
      fotoUrl: null,
      fotoPerfil: null,
      fotoDniFrente: null,
      fotoDniDorso: null,
      fotoCarnet: null,
    },
  });
  
  const { fields: grupoFamiliarFields, append: appendFamiliar, remove: removeFamiliar } = useFieldArray({
    control: form.control,
    name: "grupoFamiliar",
  });


  useEffect(() => {
    const fetchSocio = async () => {
      setLoading(true);
      const data = await getSocioById(socioId);
      if (data) {
        setSocio(data);
        form.reset({
          nombre: data.nombre,
          apellido: data.apellido,
          fechaNacimiento: typeof data.fechaNacimiento === 'string' ? parseISO(data.fechaNacimiento) : data.fechaNacimiento,
          dni: data.dni,
          empresa: data.empresa.toString(),
          telefono: data.telefono,
          direccion: data.direccion,
          email: data.email,
          estadoSocio: data.estadoSocio,
          // Fotos del titular
          fotoUrl: data.fotoUrl,
          fotoPerfil: data.fotoPerfil as string | null, // Inicialmente como string (URL) o null
          fotoDniFrente: data.fotoDniFrente as string | null,
          fotoDniDorso: data.fotoDniDorso as string | null,
          fotoCarnet: data.fotoCarnet as string | null,
          grupoFamiliar: data.grupoFamiliar.map(f => ({
            ...f,
            id: f.id || f.dni,
            fechaNacimiento: typeof f.fechaNacimiento === 'string' ? parseISO(f.fechaNacimiento) : f.fechaNacimiento,
            fotoPerfil: f.fotoPerfil as string | null,
            fotoDniFrente: f.fotoDniFrente as string | null,
            fotoDniDorso: f.fotoDniDorso as string | null,
            fotoCarnet: f.fotoCarnet as string | null,
            aptoMedico: f.aptoMedico, // Preservar apto, no editable aquí
          })),
        });
      } else {
        toast({ title: "Error", description: "Socio no encontrado.", variant: "destructive" });
        router.push('/admin/gestion-socios');
      }
      setLoading(false);
    };
    if (socioId) {
      fetchSocio();
    }
  }, [socioId, form, toast, router]);

  const onSubmit = async (data: AdminEditSocioTitularData) => {
    if (!socio) return;

    const processFotoField = (fieldValue: FileList | string | null | undefined, existingUrl?: string | null): string | null | undefined => {
        if (fieldValue === null) return null; // Explicitly set to null (delete)
        if (fieldValue instanceof FileList && fieldValue.length > 0) {
            // Simular subida y generar URL de placeholder
            return `https://placehold.co/150x150.png?text=NUEVA_FOTO_${Date.now()}`;
        }
        if (typeof fieldValue === 'string' && fieldValue.startsWith('http')) return fieldValue; // URL existente o nueva de placeholder
        return existingUrl || undefined; // Mantener la existente si no hay cambios o el valor es inválido
    };
    
    const updatedData: Partial<Socio> = {
        ...data,
        fechaNacimiento: data.fechaNacimiento instanceof Date ? formatISO(data.fechaNacimiento as Date) : data.fechaNacimiento as string,
        fotoUrl: processFotoField(data.fotoPerfil, socio.fotoUrl), // Usar fotoPerfil como fuente para fotoUrl (principal)
        fotoPerfil: processFotoField(data.fotoPerfil, socio.fotoPerfil as string | undefined),
        fotoDniFrente: data.fotoDniFrente === null ? null : (socio.fotoDniFrente as string | undefined), // Solo puede ser null o la existente
        fotoDniDorso: data.fotoDniDorso === null ? null : (socio.fotoDniDorso as string | undefined),
        fotoCarnet: data.fotoCarnet === null ? null : (socio.fotoCarnet as string | undefined),

        grupoFamiliar: data.grupoFamiliar?.map((formFamiliar, index) => {
            const existingFamiliar = socio.grupoFamiliar?.[index];
            return {
                ...formFamiliar,
                id: existingFamiliar?.id || formFamiliar.dni,
                fechaNacimiento: formFamiliar.fechaNacimiento instanceof Date ? formatISO(formFamiliar.fechaNacimiento as Date) : formFamiliar.fechaNacimiento as string,
                fotoPerfil: processFotoField(formFamiliar.fotoPerfil, existingFamiliar?.fotoPerfil as string | undefined),
                fotoDniFrente: formFamiliar.fotoDniFrente === null ? null : (existingFamiliar?.fotoDniFrente as string | undefined),
                fotoDniDorso: formFamiliar.fotoDniDorso === null ? null : (existingFamiliar?.fotoDniDorso as string | undefined),
                fotoCarnet: formFamiliar.fotoCarnet === null ? null : (existingFamiliar?.fotoCarnet as string | undefined),
                aptoMedico: existingFamiliar?.aptoMedico, // Preservar apto
            }
        }) as MiembroFamiliar[],
    };
    
    const finalDataForUpdate: Socio = {
        ...socio, 
        ...updatedData, 
    };


    try {
      await updateSocio(finalDataForUpdate);
      toast({ title: 'Socio Actualizado', description: `Los datos de ${data.nombre} ${data.apellido} han sido actualizados.` });
      router.push('/admin/gestion-socios');
    } catch (error) {
      console.error("Error al actualizar socio:", error);
      toast({ title: "Error", description: "No se pudo actualizar el socio.", variant: "destructive" });
    }
  };

  const renderFotoInput = (
    fieldName: `fotoPerfil` | `fotoDniFrente` | `fotoDniDorso` | `fotoCarnet` | `grupoFamiliar.${number}.fotoPerfil` | `grupoFamiliar.${number}.fotoDniFrente` | `grupoFamiliar.${number}.fotoDniDorso` | `grupoFamiliar.${number}.fotoCarnet`,
    label: string,
    allowUpload: boolean = false,
    currentPhotoUrl?: string | null | FileList
  ) => {
    const currentUrlToDisplay = typeof currentPhotoUrl === 'string' ? currentPhotoUrl : (currentPhotoUrl instanceof FileList && currentPhotoUrl.length > 0 ? getFileUrl(currentPhotoUrl) : null);
    
    return (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        {currentUrlToDisplay && (
          <div className="mb-2">
            <Image src={currentUrlToDisplay} alt={label} width={100} height={100} className="rounded border object-contain" data-ai-hint="user photo"/>
          </div>
        )}
        {allowUpload && (
          <FormField
            control={form.control}
            name={fieldName as any} // Zod maneja FileList | string | null
            render={({ field }) => (
              <>
                <FormControl>
                  <label className="cursor-pointer w-full flex flex-col items-center justify-center p-2 border-2 border-dashed rounded-md hover:border-primary bg-background hover:bg-muted/50 transition-colors text-xs">
                    <UploadCloud className="h-5 w-5 text-muted-foreground mb-1" />
                    <span>{currentUrlToDisplay || (field.value && field.value instanceof FileList && field.value.length > 0) ? 'Cambiar Foto' : 'Subir Foto'}</span>
                    <Input
                      type="file"
                      className="hidden"
                      onChange={e => field.onChange(e.target.files)}
                      accept="image/png,image/jpeg"
                    />
                  </label>
                </FormControl>
                 {(field.value && field.value instanceof FileList && field.value.length > 0) && (
                    <p className="text-xs text-muted-foreground mt-1">Nuevo: {field.value[0].name}</p>
                )}
                <FormMessage />
              </>
            )}
          />
        )}
        {currentUrlToDisplay && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="mt-1 text-xs"
            onClick={() => form.setValue(fieldName as any, null)}
          >
            <Trash2 className="mr-1 h-3 w-3" /> Eliminar Foto
          </Button>
        )}
      </FormItem>
    );
  };


  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-1/2" />
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-10 w-1/4" />
      </div>
    );
  }

  if (!socio) {
    return <p className="text-center text-destructive">Socio no encontrado.</p>;
  }
  
  const fotoTitularActual = form.watch('fotoPerfil') instanceof FileList 
                             ? getFileUrl(form.watch('fotoPerfil') as FileList) 
                             : form.watch('fotoPerfil') as string || socio.fotoUrl || `https://placehold.co/128x128.png?text=${socio.nombre[0]}${socio.apellido[0]}`;

  const aptoStatusTitular = getAptoMedicoStatus(socio.aptoMedico, socio.fechaNacimiento);

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card className="w-full max-w-4xl mx-auto shadow-xl">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-center gap-4">
                <Avatar className="h-20 w-20 border">
                    <AvatarImage src={fotoTitularActual} alt={`${form.watch('nombre') || socio.nombre} ${form.watch('apellido') || socio.apellido}`} data-ai-hint="profile photo"/>
                    <AvatarFallback>{(form.watch('nombre') || socio.nombre)?.[0]}{(form.watch('apellido') || socio.apellido)?.[0]}</AvatarFallback>
                </Avatar>
                <div>
                    <CardTitle className="text-2xl flex items-center"><UserCog className="mr-3 h-7 w-7 text-primary" />Editar Socio: {form.watch('nombre') || socio.nombre} {form.watch('apellido') || socio.apellido}</CardTitle>
                    <CardDescription>Modifique los datos del socio titular y su grupo familiar. N° Socio: {socio.numeroSocio}</CardDescription>
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
                                    value={field.value ? format(new Date(field.value), 'yyyy-MM-dd') : ''}
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
                    <div className="md:col-span-2">
                        <FormLabel>Miembro Desde</FormLabel>
                        <Input value={formatDate(socio.miembroDesde)} disabled className="mt-1 bg-muted/50"/>
                    </div>
                </div>
            </section>
            <Separator />
            <section>
                <h3 className="text-lg font-semibold mb-3 text-primary border-b pb-1">Salud y Documentación (Titular)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <div>
                        <FormLabel>Apto Médico (Titular)</FormLabel>
                        <div className={`mt-1 p-2 rounded-md border ${aptoStatusTitular.colorClass.replace('text-', 'text-').replace('bg-', 'bg-opacity-10 border-')}`}>
                             <div className="flex items-center">
                                {aptoStatusTitular.status === 'Válido' && <ShieldCheck className="h-4 w-4 mr-1.5 text-green-600" />}
                                {(aptoStatusTitular.status === 'Vencido' || aptoStatusTitular.status === 'Inválido') && <ShieldAlert className="h-4 w-4 mr-1.5 text-red-600" />}
                                {aptoStatusTitular.status === 'Pendiente' && <AlertTriangle className="h-4 w-4 mr-1.5 text-yellow-600" />}
                                {aptoStatusTitular.status === 'No Aplica' && <Info className="h-4 w-4 mr-1.5 text-gray-600" />}
                                <span className="text-sm font-medium">{aptoStatusTitular.status}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{aptoStatusTitular.message}</p>
                        </div>
                         <p className="text-xs text-muted-foreground mt-1">La gestión de aptos se realiza desde el Panel Médico.</p>
                    </div>
                     <div>
                        <FormLabel>Última Revisión Médica</FormLabel>
                        <Input value={socio.ultimaRevisionMedica ? formatDate(socio.ultimaRevisionMedica) : 'N/A'} disabled className="mt-1 bg-muted/50"/>
                    </div>
                    {renderFotoInput('fotoPerfil', 'Foto de Perfil (Titular)', true, form.watch('fotoPerfil') || socio.fotoPerfil)}
                    {renderFotoInput('fotoDniFrente', 'Foto DNI Frente (Titular)', false, form.watch('fotoDniFrente') || socio.fotoDniFrente)}
                    {renderFotoInput('fotoDniDorso', 'Foto DNI Dorso (Titular)', false, form.watch('fotoDniDorso') || socio.fotoDniDorso)}
                    {renderFotoInput('fotoCarnet', 'Foto Carnet (Titular)', false, form.watch('fotoCarnet') || socio.fotoCarnet)}
                </div>
            </section>
            <Separator />
             <section>
                <h3 className="text-lg font-semibold mb-3 text-primary border-b pb-1">Grupo Familiar</h3>
                {grupoFamiliarFields.length === 0 && <p className="text-sm text-muted-foreground">Este socio no tiene familiares registrados o editables aquí.</p>}
                <div className="space-y-6">
                {grupoFamiliarFields.map((field, index) => {
                    const familiarData = socio.grupoFamiliar.find(f => f.id === field.id || f.dni === field.dni);
                    const aptoStatusFamiliar = familiarData ? getAptoMedicoStatus(familiarData.aptoMedico, familiarData.fechaNacimiento) : { status: 'N/A', message: 'No se pudo cargar apto', colorClass: 'text-gray-500' };
                    
                    const fotoPerfilFamiliarActual = form.watch(`grupoFamiliar.${index}.fotoPerfil`) instanceof FileList
                                                    ? getFileUrl(form.watch(`grupoFamiliar.${index}.fotoPerfil`) as FileList)
                                                    : form.watch(`grupoFamiliar.${index}.fotoPerfil`) as string || familiarData?.fotoPerfil as string || `https://placehold.co/64x64.png?text=${form.watch(`grupoFamiliar.${index}.nombre`)?.[0] || ''}${form.watch(`grupoFamiliar.${index}.apellido`)?.[0] || ''}`;


                    return (
                        <Card key={field.id} className="p-4 bg-muted/20">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-medium">Familiar {index + 1}</h4>
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
                                                value={formField.value ? format(new Date(formField.value), 'yyyy-MM-dd') : ''}
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
                                                    <SelectItem key={rel} value={rel}>{rel}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                 <div className="md:col-span-1 flex flex-col items-center">
                                      <Avatar className="h-16 w-16 border">
                                          <AvatarImage src={fotoPerfilFamiliarActual} alt={form.watch(`grupoFamiliar.${index}.nombre`)} data-ai-hint="family member photo"/>
                                          <AvatarFallback>{form.watch(`grupoFamiliar.${index}.nombre`)?.[0]}{form.watch(`grupoFamiliar.${index}.apellido`)?.[0]}</AvatarFallback>
                                      </Avatar>
                                      <p className={`text-xs mt-1 text-center p-1 rounded ${aptoStatusFamiliar.colorClass.replace('bg-', 'bg-opacity-20 ')}`}>Apto: {aptoStatusFamiliar.status}</p>
                                  </div>
                            </div>
                            <Separator className="my-3"/>
                            <h5 className="text-sm font-semibold mt-2 mb-1">Documentación Familiar {index + 1}</h5>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {renderFotoInput(`grupoFamiliar.${index}.fotoPerfil` as any, 'Foto de Perfil', true, form.watch(`grupoFamiliar.${index}.fotoPerfil`) || familiarData?.fotoPerfil)}
                                {renderFotoInput(`grupoFamiliar.${index}.fotoDniFrente` as any, 'Foto DNI Frente', false, form.watch(`grupoFamiliar.${index}.fotoDniFrente`) || familiarData?.fotoDniFrente)}
                                {renderFotoInput(`grupoFamiliar.${index}.fotoDniDorso` as any, 'Foto DNI Dorso', false, form.watch(`grupoFamiliar.${index}.fotoDniDorso`) || familiarData?.fotoDniDorso)}
                                {renderFotoInput(`grupoFamiliar.${index}.fotoCarnet` as any, 'Foto Carnet', false, form.watch(`grupoFamiliar.${index}.fotoCarnet`) || familiarData?.fotoCarnet)}
                             </div>
                        </Card>
                    );
                })}
                </div>
            </section>

          </CardContent>
          <CardFooter className="flex justify-between pt-6">
            <Button type="button" variant="outline" onClick={() => router.push('/admin/gestion-socios')}>
              <X className="mr-2 h-4 w-4" /> Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              <Save className="mr-2 h-4 w-4" /> {form.formState.isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </FormProvider>
  );
}

