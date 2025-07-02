
'use client';

import { useEffect, useState, useCallback } from 'react';
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
import { formatDate, getAptoMedicoStatus, generateId } from '@/lib/helpers';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CalendarDays, UserCog, Save, X, Info, Users, ShieldCheck, ShieldAlert, AlertTriangle, UserCircle, Briefcase, Mail, Phone, MapPin, Trash2, PlusCircle, UploadCloud, FileText, Lock, Heart } from 'lucide-react';
import { format, parseISO, isValid, subYears, formatISO } from 'date-fns';
import { Separator } from '../ui/separator';
import Link from 'next/link';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type FotoFieldNameTitular = 'fotoPerfil' | 'fotoDniFrente' | 'fotoDniDorso' | 'fotoCarnet';
type FotoFieldNameFamiliar = `grupoFamiliar.${number}.fotoPerfil` | `grupoFamiliar.${number}.fotoDniFrente` | `grupoFamiliar.${number}.fotoDniDorso` | `grupoFamiliar.${number}.fotoCarnet`;
type FotoFieldName = FotoFieldNameTitular | FotoFieldNameFamiliar;


interface AdminEditarSocioFormProps {
  socioId: string;
}

const processPhotoFieldForUpdate = (formValue: any, originalUrl: string | null | undefined): string | null => {
    if (formValue instanceof FileList && formValue.length > 0) {
        // Simula la subida de un nuevo archivo y devuelve una URL de marcador de posición
        const timestamp = Date.now();
        const filename = formValue[0].name.substring(0, 10).replace(/[^a-zA-Z0-9]/g, '');
        return `https://placehold.co/150x150.png?text=UPD_${filename}_${timestamp}`;
    }
    if (formValue === null) {
        // La foto fue eliminada explícitamente en el formulario
        return null;
    }
    // Si no es un FileList y no es null, es la URL original o no se tocó
    return originalUrl || null;
};


export function AdminEditarSocioForm({ socioId }: AdminEditarSocioFormProps) {
  const [socio, setSocio] = useState<Socio | null>(null);
  const [loading, setLoading] = useState(true);
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
    const fetchSocio = async () => {
      setLoading(true);
      const data = await getSocioById(socioId);
      if (data) {
        setSocio(data);

        let groupTypeDetermined: 'conyugeEHijos' | 'padresMadres' | undefined = undefined;
        if (data.grupoFamiliar?.some(f => f.relacion === RelacionFamiliar.CONYUGE || f.relacion === RelacionFamiliar.HIJO_A)) {
          groupTypeDetermined = 'conyugeEHijos';
        } else if (data.grupoFamiliar?.some(f => f.relacion === RelacionFamiliar.PADRE_MADRE)) {
          groupTypeDetermined = 'padresMadres';
        }

        form.reset({
          nombre: data.nombre,
          apellido: data.apellido,
          fechaNacimiento: data.fechaNacimiento,
          dni: data.dni,
          empresa: data.empresa,
          telefono: data.telefono,
          direccion: data.direccion,
          email: data.email,
          estadoSocio: data.estadoSocio,
          tipoGrupoFamiliar: groupTypeDetermined,
          fotoUrl: data.fotoUrl,
          fotoPerfil: data.fotoPerfil,
          fotoDniFrente: data.fotoDniFrente,
          fotoDniDorso: data.fotoDniDorso,
          fotoCarnet: data.fotoCarnet,
          grupoFamiliar: data.grupoFamiliar,
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
    if (!socio) return;

    // Construct the payload for Firestore, only including fields from the form
    // This is a partial update, so we don't need to copy the original socio object
    const updatePayload: Partial<Socio> = {
        nombre: data.nombre,
        apellido: data.apellido,
        fechaNacimiento: data.fechaNacimiento,
        dni: data.dni,
        empresa: data.empresa,
        telefono: data.telefono,
        direccion: data.direccion,
        email: data.email,
        estadoSocio: data.estadoSocio,
        
        // Process and update photos
        fotoPerfil: processPhotoFieldForUpdate(data.fotoPerfil, socio.fotoPerfil),
        fotoUrl: processPhotoFieldForUpdate(data.fotoPerfil, socio.fotoUrl), // Keep fotoUrl in sync
        fotoDniFrente: processPhotoFieldForUpdate(data.fotoDniFrente, socio.fotoDniFrente),
        fotoDniDorso: processPhotoFieldForUpdate(data.fotoDniDorso, socio.fotoDniDorso),
        fotoCarnet: processPhotoFieldForUpdate(data.fotoCarnet, socio.fotoCarnet),

        // Process and update the entire grupoFamiliar array
        grupoFamiliar: data.grupoFamiliar ? data.grupoFamiliar.map((familiarFormData) => {
            const originalFamiliar = socio.grupoFamiliar?.find(f => f.id === familiarFormData.id);
            return {
                ...familiarFormData,
                id: familiarFormData.id || generateId(),
                fechaNacimiento: familiarFormData.fechaNacimiento,
                fotoPerfil: processPhotoFieldForUpdate(familiarFormData.fotoPerfil, originalFamiliar?.fotoPerfil),
                fotoDniFrente: processPhotoFieldForUpdate(familiarFormData.fotoDniFrente, originalFamiliar?.fotoDniFrente),
                fotoDniDorso: processPhotoFieldForUpdate(familiarFormData.fotoDniDorso, originalFamiliar?.fotoDniDorso),
                fotoCarnet: processPhotoFieldForUpdate(familiarFormData.fotoCarnet, originalFamiliar?.fotoCarnet),
            };
        }) : [],
    };
    // By building the payload explicitly, we ensure `tipoGrupoFamiliar` is never included.

    try {
        await updateSocio({ id: socio.id, ...updatePayload });
        toast({ title: 'Socio Actualizado', description: `Los datos de ${data.nombre} ${data.apellido} han sido actualizados.` });
        router.push('/admin/gestion-socios');
    } catch (error) {
        console.error("Error al actualizar socio:", error);
        toast({ title: "Error", description: "No se pudo actualizar el socio.", variant: "destructive" });
    }
  };


  const renderFotoInput = (
    fieldName: FotoFieldName,
    label: string,
    isEditable: boolean
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
              data-ai-hint="user photo document"
            />
          ) : (
            <div className="flex items-center justify-center h-[100px] w-[100px] bg-muted rounded border text-muted-foreground text-xs text-center">
              Sin foto
            </div>
          )}
          
          {isEditable && (
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
          )}
        </Card>
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
  
  const fotoTitularActual = typeof form.watch('fotoPerfil') === 'string'
                            ? form.watch('fotoPerfil')
                            : (form.watch('fotoPerfil') instanceof FileList && typeof window !== 'undefined' && (form.watch('fotoPerfil') as FileList).length > 0 ? URL.createObjectURL((form.watch('fotoPerfil') as FileList)[0]) 
                            : socio.fotoPerfil || `https://placehold.co/128x128.png?text=${socio.nombre[0]}${socio.apellido[0]}`);

  const aptoStatusTitular = getAptoMedicoStatus(socio.aptoMedico, socio.fechaNacimiento);

  const handleAddFamiliar = () => {
    if (tipoGrupoFamiliarSeleccionado === 'conyugeEHijos') {
        appendFamiliar({ id: generateId(), nombre: '', apellido: '', dni: '', fechaNacimiento: new Date(), relacion: RelacionFamiliar.HIJO_A, fotoPerfil: null, fotoDniFrente: null, fotoDniDorso: null, fotoCarnet: null, aptoMedico: undefined });
    } else if (tipoGrupoFamiliarSeleccionado === 'padresMadres') {
        appendFamiliar({ id: generateId(), nombre: '', apellido: '', dni: '', fechaNacimiento: new Date(), relacion: RelacionFamiliar.PADRE_MADRE, fotoPerfil: null, fotoDniFrente: null, fotoDniDorso: null, fotoCarnet: null, aptoMedico: undefined });
    }
  };


  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card className="w-full max-w-4xl mx-auto shadow-xl">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-center gap-4">
                <Avatar className="h-20 w-20 border">
                    <AvatarImage src={fotoTitularActual!} alt={`${form.watch('nombre') || socio.nombre} ${form.watch('apellido') || socio.apellido}`} data-ai-hint="profile photo"/>
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
                                    value={field.value && isValid(new Date(field.value)) ? format(new Date(field.value), 'yyyy-MM-dd') : ''}
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
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    {renderFotoInput('fotoPerfil', 'Foto de Perfil', true)}
                    {renderFotoInput('fotoDniFrente', 'DNI Frente', false)}
                    {renderFotoInput('fotoDniDorso', 'DNI Dorso', false)}
                    {renderFotoInput('fotoCarnet', 'Foto Carnet', false)}
                </div>
            </section>
            <Separator />
             <section>
                <h3 className="text-lg font-semibold mb-3 text-primary border-b pb-1">Grupo Familiar</h3>
                 <FormField
                    control={form.control}
                    name="tipoGrupoFamiliar"
                    render={({ field }) => (
                        <FormItem className="mb-6">
                            <FormLabel className="flex items-center"><Users className="mr-1.5 h-4 w-4 text-muted-foreground"/>Tipo de Grupo Familiar</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccione un tipo de grupo" /></SelectTrigger></FormControl>
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
                    const familiarData = socio.grupoFamiliar?.find(f => f.id === field.id || f.dni === field.dni);
                    const aptoStatusFamiliar = familiarData ? getAptoMedicoStatus(familiarData.aptoMedico, familiarData.fechaNacimiento) : { status: 'N/A', message: 'No se pudo cargar apto', colorClass: 'text-gray-500' };
                    
                    const fotoPerfilFamiliarActual = typeof form.watch(`grupoFamiliar.${index}.fotoPerfil`) === 'string'
                                                    ? form.watch(`grupoFamiliar.${index}.fotoPerfil`)
                                                    : (form.watch(`grupoFamiliar.${index}.fotoPerfil`) instanceof FileList && typeof window !== 'undefined' && (form.watch(`grupoFamiliar.${index}.fotoPerfil`) as FileList).length > 0 ? URL.createObjectURL((form.watch(`grupoFamiliar.${index}.fotoPerfil`) as FileList)[0])
                                                    : familiarData?.fotoPerfil || `https://placehold.co/64x64.png?text=${form.watch(`grupoFamiliar.${index}.nombre`)?.[0] || ''}${form.watch(`grupoFamiliar.${index}.apellido`)?.[0] || ''}`);


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
                                                value={formField.value && isValid(new Date(formField.value)) ? format(new Date(formField.value), 'yyyy-MM-dd') : ''}
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
                                          <AvatarImage src={fotoPerfilFamiliarActual!} alt={form.watch(`grupoFamiliar.${index}.nombre`)} data-ai-hint="family member photo"/>
                                          <AvatarFallback>{form.watch(`grupoFamiliar.${index}.nombre`)?.[0]}{form.watch(`grupoFamiliar.${index}.apellido`)?.[0]}</AvatarFallback>
                                      </Avatar>
                                      <p className={`text-xs mt-1 text-center p-1 rounded ${aptoStatusFamiliar.colorClass.replace('bg-', 'bg-opacity-20 ')}`}>Apto: {aptoStatusFamiliar.status}</p>
                                  </div>
                            </div>
                            <Separator className="my-3"/>
                            <h5 className="text-sm font-semibold mt-2 mb-1">Documentación Familiar {index + 1}</h5>
                             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {renderFotoInput(`grupoFamiliar.${index}.fotoPerfil` as FotoFieldNameFamiliar, 'Foto de Perfil', true)}
                                {renderFotoInput(`grupoFamiliar.${index}.fotoDniFrente` as FotoFieldNameFamiliar, 'DNI Frente', false)}
                                {renderFotoInput(`grupoFamiliar.${index}.fotoDniDorso` as FotoFieldNameFamiliar, 'DNI Dorso', false)}
                                {renderFotoInput(`grupoFamiliar.${index}.fotoCarnet` as FotoFieldNameFamiliar, 'Foto Carnet', false)}
                             </div>
                        </Card>
                    );
                })}
                {tipoGrupoFamiliarSeleccionado && (
                    <Button type="button" variant="outline" onClick={handleAddFamiliar}>
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
              <Save className="mr-2 h-4 w-4" /> {form.formState.isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </FormProvider>
  );
}
