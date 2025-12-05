
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useForm, FormProvider, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import type { Socio, AdminEditSocioTitularData, MiembroFamiliar, Adherente } from '@/types';
import { adminEditSocioTitularSchema, RelacionFamiliar, EstadoAdherente, EstadoSolicitudAdherente } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardFooter, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getSocio, updateSocio } from '@/lib/firebase/firestoreService';
import { uploadFile } from '@/lib/firebase/storageService';
import { formatDate, getAptoMedicoStatus, generateId, generateKeywords } from '@/lib/helpers';
import { format, subYears, parseISO, isValid } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CalendarDays, UserCog, Save, X, Info, Users, ShieldCheck, ShieldAlert, AlertTriangle, UserCircle, Briefcase, Mail, Phone, MapPin, Trash2, PlusCircle, UploadCloud, FileText, Lock, Heart } from 'lucide-react';
import { Separator } from '../ui/separator';
import Link from 'next/link';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useMutation, useQueryClient } from '@tanstack/react-query';

type FotoFieldName = `fotoPerfil` | `fotoDniFrente` | `fotoDniDorso` | `fotoCarnet` | `familiares.${number}.fotoPerfil` | `familiares.${number}.fotoDniFrente` | `familiares.${number}.fotoDniDorso` | `familiares.${number}.fotoCarnet` | `adherentes.${number}.fotoPerfil` | `adherentes.${number}.fotoDniFrente` | `adherentes.${number}.fotoDniDorso`;


interface AdminEditarSocioFormProps {
  socioId: string;
}

export function AdminEditarSocioForm({ socioId }: AdminEditarSocioFormProps) {
  const [socio, setSocio] = useState<Socio | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
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
      familiares: [],
      fotoUrl: null,
      fotoPerfil: null,
      fotoDniFrente: null,
      fotoDniDorso: null,
      fotoCarnet: null,
    },
  });
  
  const { fields: familiaresFields, append: appendFamiliar, remove: removeFamiliar, replace: replaceFamiliares } = useFieldArray({
    control: form.control,
    name: "familiares",
  });

  const { fields: adherentesFields, append: appendAdherente, remove: removeAdherente } = useFieldArray({
    control: form.control,
    name: "adherentes",
  });

  const fotoTitularActual = useMemo(() => {
    const watchedFotoPerfil = form.watch('fotoPerfil');
    if (typeof window !== 'undefined' && watchedFotoPerfil instanceof File) {
      return URL.createObjectURL(watchedFotoPerfil);
    }
    
    const fotoUrl = watchedFotoPerfil || socio?.fotoPerfil || socio?.fotoUrl;
    if (typeof fotoUrl === 'string' && fotoUrl) {
      return fotoUrl;
    }

    const nombre = form.watch('nombre') || socio?.nombre || 'S';
    const apellido = form.watch('apellido') || socio?.apellido || '';
    return `https://placehold.co/128x128.png?text=${nombre[0]}${apellido[0] || ''}`;
  }, [form, socio]);

  useEffect(() => {
    const fetchSocio = async () => {
      setLoading(true);
      const data = await getSocio(socioId);
      if (data) {
        setSocio(data);

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
          fotoUrl: data.fotoUrl,
          fotoPerfil: data.fotoPerfil,
          fotoDniFrente: data.fotoDniFrente,
          fotoDniDorso: data.fotoDniDorso,
          fotoCarnet: data.fotoCarnet,
          familiares: data.familiares || [],
          adherentes: data.adherentes || [],
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


  const { mutate: updateSocioMutation, isPending } = useMutation({
    mutationFn: (variables: { socioId: string; data: Partial<Socio> }) => updateSocio(variables.socioId, variables.data),
    onSuccess: (_, variables) => {
        toast({ title: 'Socio Actualizado', description: `Los datos del socio han sido actualizados.` });
        queryClient.invalidateQueries({ queryKey: ['socios'] });
        router.push('/admin/gestion-socios');
    },
    onError: (error) => {
        console.error("Error al actualizar socio:", error);
        toast({ title: "Error", description: "No se pudo actualizar el socio.", variant: "destructive" });
    }
  });


  const onSubmit = async (data: AdminEditSocioTitularData) => {
    if (!socio) return;

    const processPhotoField = async (formValue: string | File | null | undefined, path: string): Promise<string | null> => {
        if (formValue instanceof File) {
            return uploadFile(formValue, path);
        }
        return typeof formValue === 'string' ? formValue : null;
    };

    // 1. Process titular's photos
    const fotoPerfilUrl = await processPhotoField(data.fotoPerfil, `socios/${socio.id}/fotoPerfil.jpg`);
    const fotoDniFrenteUrl = await processPhotoField(data.fotoDniFrente, `socios/${socio.id}/fotoDniFrente.jpg`);
    const fotoDniDorsoUrl = await processPhotoField(data.fotoDniDorso, `socios/${socio.id}/fotoDniDorso.jpg`);
    const fotoCarnetUrl = await processPhotoField(data.fotoCarnet, `socios/${socio.id}/fotoCarnet.jpg`);

    // 2. Process familiares array
    const processedFamiliares = await Promise.all(
        (data.familiares || []).map(async (familiarFormData) => {
            const familiarId = familiarFormData.id || generateId();
            const familiarFotoPerfilUrl = await processPhotoField(familiarFormData.fotoPerfil, `socios/${socio.id}/familiares/${familiarId}_perfil.jpg`);
            const familiarFotoDniFrenteUrl = await processPhotoField(familiarFormData.fotoDniFrente, `socios/${socio.id}/familiares/${familiarId}_dniFrente.jpg`);
            const familiarFotoDniDorsoUrl = await processPhotoField(familiarFormData.fotoDniDorso, `socios/${socio.id}/familiares/${familiarId}_dniDorso.jpg`);
            const familiarFotoCarnetUrl = await processPhotoField(familiarFormData.fotoCarnet, `socios/${socio.id}/familiares/${familiarId}_carnet.jpg`);
            return { ...familiarFormData, id: familiarId, fotoPerfil: familiarFotoPerfilUrl, fotoDniFrente: familiarFotoDniFrenteUrl, fotoDniDorso: familiarFotoDniDorsoUrl, fotoCarnet: familiarFotoCarnetUrl };
        })
    );

    // 3. Process adherentes array
    const processedAdherentes = await Promise.all(
      (data.adherentes || []).map(async (adherenteFormData) => {
          const adherenteId = adherenteFormData.id || generateId();
          const adherenteFotoPerfilUrl = await processPhotoField(adherenteFormData.fotoPerfil, `socios/${socio.id}/adherentes/${adherenteId}_perfil.jpg`);
          const adherenteFotoDniFrenteUrl = await processPhotoField(adherenteFormData.fotoDniFrente, `socios/${socio.id}/adherentes/${adherenteId}_dniFrente.jpg`);
          const adherenteFotoDniDorsoUrl = await processPhotoField(adherenteFormData.fotoDniDorso, `socios/${socio.id}/adherentes/${adherenteId}_dniDorso.jpg`);
          return { ...adherenteFormData, id: adherenteId, fotoPerfil: adherenteFotoPerfilUrl, fotoDniFrente: adherenteFotoDniFrenteUrl, fotoDniDorso: adherenteFotoDniDorsoUrl };
      })
    );

    // 4. Construct the final payload
    const { familiares, adherentes, fotoPerfil, fotoDniFrente, fotoDniDorso, fotoCarnet, ...restOfData } = data;
    const keywords = generateKeywords(data.nombre, data.apellido, data.dni, socio.numeroSocio);

    const updatePayload: Partial<Socio> = {
        ...restOfData,
        searchableKeywords: keywords,
        fotoPerfil: fotoPerfilUrl,
        fotoUrl: fotoPerfilUrl,
        fotoDniFrente: fotoDniFrenteUrl,
        fotoDniDorso: fotoDniDorsoUrl,
        fotoCarnet: fotoCarnetUrl,
        familiares: processedFamiliares,
        adherentes: processedAdherentes,

        // ✅ Si se marca como Inactivo, guardar motivo y fecha
        ...(data.estadoSocio === 'Inactivo' && {
          motivoInactivacion: data.motivoInactivacion,
          fechaInactivacion: new Date(),
        }),
        
        // ✅ Si se marca como Activo (reactivación), limpiar motivo y fecha
        ...(data.estadoSocio === 'Activo' && {
          motivoInactivacion: null,
          fechaInactivacion: null,
        }),
    };

    const cleanPayload = Object.fromEntries(Object.entries(updatePayload).filter(([_, v]) => v !== undefined));
    updateSocioMutation({ socioId: socio.id, data: cleanPayload });
  };


  const renderFotoInput = (
    fieldName: FotoFieldName,
    label: string,
    isEditable: boolean
  ) => {
    const currentFieldValue = form.watch(fieldName);
    let displayUrl: string | null = null;
    let newFileName: string | null = null;
  
    if (currentFieldValue instanceof File) {
      if (typeof window !== 'undefined') {
        displayUrl = URL.createObjectURL(currentFieldValue);
        newFileName = currentFieldValue.name;
      }
    } else if (typeof currentFieldValue === 'string' && currentFieldValue) {
      // Directamente usa la URL, sin getEncryptedImageUrl
      displayUrl = currentFieldValue;
    }
  
    return (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <Card className="p-2 space-y-2">
          {displayUrl ? (
            <Dialog>
              <DialogTrigger asChild>
                <Image
                  src={displayUrl}
                  alt={`Vista previa de ${label}`}
                  width={100}
                  height={100}
                  className="rounded border object-contain cursor-pointer"
                  data-ai-hint="user photo document"
                  unoptimized={true}
                  key={displayUrl}
                />
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                 <Image
                    src={displayUrl}
                    alt={`Foto ampliada de ${label}`}
                    width={800}
                    height={800}
                    className="rounded-md object-contain"
                  />
              </DialogContent>
            </Dialog>
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
                        onChange={e => field.onChange(e.target.files ? e.target.files[0] : null)}
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

  const aptoStatusTitular = getAptoMedicoStatus(socio.aptoMedico, socio.fechaNacimiento);

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card className="w-full max-w-4xl mx-auto shadow-xl">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-center gap-4">
                <Dialog>
                  <DialogTrigger asChild>
                    <Avatar className="h-20 w-20 border cursor-pointer">
                      <AvatarImage src={fotoTitularActual!} alt={`${form.watch('nombre') || socio.nombre} ${form.watch('apellido') || socio.apellido}`} data-ai-hint="profile photo"/>
                      <AvatarFallback>{(form.watch('nombre') || socio.nombre)?.[0]}{(form.watch('apellido') || socio.apellido)?.[0]}</AvatarFallback>
                    </Avatar>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <Image
                      src={fotoTitularActual!}
                      alt={`Foto de perfil de ${form.watch('nombre') || socio.nombre}`}
                      width={500}
                      height={500}
                      className="rounded-md object-contain"
                    />
                  </DialogContent>
                </Dialog>
                <div>
                    <CardTitle className="text-2xl flex items-center"><UserCog className="mr-3 h-7 w-7 text-primary" />Editar Socio: {form.watch('nombre') || socio.nombre} {form.watch('apellido') || socio.apellido}</CardTitle>
                    <CardDescription>Modifique los datos del socio titular y sus familiares. N° Socio: {socio.numeroSocio}</CardDescription>
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
                    {/* ✅ Campo condicional: Solo aparece si el estado es Inactivo */}
                    {form.watch('estadoSocio') === 'Inactivo' && (
                    <FormField
                        control={form.control}
                        name="motivoInactivacion"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel className="flex items-center text-destructive">
                            <AlertTriangle className="mr-1.5 h-4 w-4" />
                            Motivo de Inactivación *
                            </FormLabel>
                            <FormControl>
                            <Textarea
                                {...field}
                                value={field.value || ''}
                                placeholder="Explica claramente por qué se inactiva esta cuenta (ej: 'Foto de perfil incorrecta, debe ser tipo selfie mostrando el rostro', 'Datos personales incorrectos', etc.)"
                                className="min-h-[100px] resize-none"
                            />
                            </FormControl>
                            <FormDescription className="text-xs">
                            Este mensaje será visible para el socio cuando intente acceder a su cuenta.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    )}
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
                    {renderFotoInput('fotoPerfil', 'Foto para tu perfil (De frente, mirando la camara. Rostro descubierto, sin lentes ni sombreros, tipo selfie)', true)}
                    {renderFotoInput('fotoDniFrente', 'DNI Frente', true)}
                    {renderFotoInput('fotoDniDorso', 'DNI Dorso', true)}
                    {renderFotoInput('fotoCarnet', 'Foto carnet sindical si corresponde', true)}
                </div>
            </section>
            <Separator />
             <section>
                <h3 className="text-lg font-semibold mb-3 text-primary border-b pb-1">Familiares</h3>
                <div className="space-y-6">
                {familiaresFields.map((field, index) => {
                    const familiarData = socio.familiares?.find((f: MiembroFamiliar) => f.id === field.id);
                    const aptoStatusFamiliar = familiarData ? getAptoMedicoStatus(familiarData.aptoMedico, familiarData.fechaNacimiento) : { status: 'N/A', message: 'No se pudo cargar apto', colorClass: 'text-gray-500' };
                    
                    const getFotoPerfilFamiliarActual = () => {
                        const watchedFoto = form.watch(`familiares.${index}.fotoPerfil`);
                        if (typeof window !== 'undefined' && watchedFoto instanceof File) {
                            return URL.createObjectURL(watchedFoto);
                        }
                        const fotoUrl = watchedFoto || familiarData?.fotoPerfil;
                        if (typeof fotoUrl === 'string' && fotoUrl) {
                            return fotoUrl;
                        }
                        const nombre = form.watch(`familiares.${index}.nombre`) || 'F';
                        const apellido = form.watch(`familiares.${index}.apellido`) || '';
                        return `https://placehold.co/64x64.png?text=${nombre[0]}${apellido[0] || ''}`;
                    };

                    const fotoPerfilFamiliarActual = getFotoPerfilFamiliarActual();


                    return (
                        <Card key={field.id} className="p-4 bg-muted/20">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-medium">Familiar {index + 1}</h4>
                                <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => removeFamiliar(index)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField control={form.control} name={`familiares.${index}.nombre`} render={({ field: formField }) => ( <FormItem> <FormLabel className="text-xs">Nombre</FormLabel> <FormControl><Input {...formField} className="h-9 text-sm"/></FormControl> <FormMessage /> </FormItem> )} />
                                <FormField control={form.control} name={`familiares.${index}.apellido`} render={({ field: formField }) => ( <FormItem> <FormLabel className="text-xs">Apellido</FormLabel> <FormControl><Input {...formField} className="h-9 text-sm"/></FormControl> <FormMessage /> </FormItem> )} />
                                <FormField control={form.control} name={`familiares.${index}.dni`} render={({ field: formField }) => ( <FormItem> <FormLabel className="text-xs">DNI</FormLabel> <FormControl><Input type="number" {...formField} className="h-9 text-sm"/></FormControl> <FormMessage /> </FormItem> )} />
                                <FormField control={form.control} name={`familiares.${index}.fechaNacimiento`} render={({ field: formField }) => ( 
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
                                <FormField control={form.control} name={`familiares.${index}.relacion`} render={({ field: formField }) => (
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
                                          <AvatarImage src={fotoPerfilFamiliarActual!} alt={form.watch(`familiares.${index}.nombre`)} data-ai-hint="family member photo"/>
                                          <AvatarFallback>{form.watch(`familiares.${index}.nombre`)?.[0]}{form.watch(`familiares.${index}.apellido`)?.[0]}</AvatarFallback>
                                      </Avatar>
                                      <p className={`text-xs mt-1 text-center p-1 rounded ${aptoStatusFamiliar.colorClass.replace('bg-', 'bg-opacity-20 ')}`}>Apto: {aptoStatusFamiliar.status}</p>
                                  </div>
                            </div>
                            <Separator className="my-3"/>
                            <h5 className="text-sm font-semibold mt-2 mb-1">Documentación Familiar {index + 1}</h5>
                             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {renderFotoInput(`familiares.${index}.fotoPerfil`, 'Foto para tu perfil (De frente, mirando la camara. Rostro descubierto, sin lentes ni sombreros, tipo selfie)', true)}
                                {renderFotoInput(`familiares.${index}.fotoDniFrente` as FotoFieldName, 'DNI Frente', true)}
                                {renderFotoInput(`familiares.${index}.fotoDniDorso` as FotoFieldName, 'DNI Dorso', true)}
                                {renderFotoInput(`familiares.${index}.fotoCarnet` as FotoFieldName, 'Foto carnet sindical si corresponde', true)}
                             </div>
                        </Card>
                    );
                })}
                    <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={() => appendFamiliar({ id: generateId(), nombre: '', apellido: '', dni: '', fechaNacimiento: new Date(), relacion: RelacionFamiliar.CONYUGE, fotoPerfil: null, fotoDniFrente: null, fotoDniDorso: null, fotoCarnet: null })} disabled={familiaresFields.some(f => f.relacion === RelacionFamiliar.CONYUGE)}>
                            <PlusCircle className="mr-2 h-4 w-4" /> 
                            Agregar Cónyuge
                        </Button>
                        <Button type="button" variant="outline" onClick={() => appendFamiliar({ id: generateId(), nombre: '', apellido: '', dni: '', fechaNacimiento: new Date(), relacion: RelacionFamiliar.HIJO_A, fotoPerfil: null, fotoDniFrente: null, fotoDniDorso: null, fotoCarnet: null })}>
                            <PlusCircle className="mr-2 h-4 w-4" /> 
                            Agregar Hijo/a
                        </Button>
                    </div>
                </div>
            </section>
            <Separator />
             <section>
                <h3 className="text-lg font-semibold mb-3 text-primary border-b pb-1">Adherentes</h3>
                <div className="space-y-6">
                {adherentesFields.map((field, index) => {
                    const adherenteData = socio.adherentes?.find((a: Adherente) => a.id === field.id);
                    const aptoStatusAdherente = adherenteData ? getAptoMedicoStatus(adherenteData.aptoMedico, adherenteData.fechaNacimiento) : { status: 'N/A', message: 'No se pudo cargar apto', colorClass: 'text-gray-500' };
                    
                    const getFotoPerfilAdherenteActual = () => {
                        const watchedFoto = form.watch(`adherentes.${index}.fotoPerfil`);
                        if (typeof window !== 'undefined' && watchedFoto instanceof File) {
                            return URL.createObjectURL(watchedFoto);
                        }
                        const fotoUrl = watchedFoto || adherenteData?.fotoPerfil;
                        if (typeof fotoUrl === 'string' && fotoUrl) {
                            return fotoUrl;
                        }
                        const nombre = form.watch(`adherentes.${index}.nombre`) || 'A';
                        const apellido = form.watch(`adherentes.${index}.apellido`) || '';
                        return `https://placehold.co/64x64.png?text=${nombre[0]}${apellido[0] || ''}`;
                    };

                    const fotoPerfilAdherenteActual = getFotoPerfilAdherenteActual();

                    return (
                        <Card key={field.id} className="p-4 bg-muted/20">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-medium">Adherente {index + 1}</h4>
                                <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => removeAdherente(index)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField control={form.control} name={`adherentes.${index}.nombre`} render={({ field: formField }) => ( <FormItem> <FormLabel className="text-xs">Nombre</FormLabel> <FormControl><Input {...formField} className="h-9 text-sm"/></FormControl> <FormMessage /> </FormItem> )} />
                                <FormField control={form.control} name={`adherentes.${index}.apellido`} render={({ field: formField }) => ( <FormItem> <FormLabel className="text-xs">Apellido</FormLabel> <FormControl><Input {...formField} className="h-9 text-sm"/></FormControl> <FormMessage /> </FormItem> )} />
                                <FormField control={form.control} name={`adherentes.${index}.dni`} render={({ field: formField }) => ( <FormItem> <FormLabel className="text-xs">DNI</FormLabel> <FormControl><Input type="number" {...formField} className="h-9 text-sm"/></FormControl> <FormMessage /> </FormItem> )} />
                                <FormField control={form.control} name={`adherentes.${index}.fechaNacimiento`} render={({ field: formField }) => ( 
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
                                 <div className="md:col-span-1 flex flex-col items-center">
                                      <Avatar className="h-16 w-16 border">
                                          <AvatarImage src={fotoPerfilAdherenteActual!} alt={form.watch(`adherentes.${index}.nombre`)} data-ai-hint="adherent photo"/>
                                          <AvatarFallback>{form.watch(`adherentes.${index}.nombre`)?.[0]}{form.watch(`adherentes.${index}.apellido`)?.[0]}</AvatarFallback>
                                      </Avatar>
                                      <p className={`text-xs mt-1 text-center p-1 rounded ${aptoStatusAdherente.colorClass.replace('bg-', 'bg-opacity-20 ')}`}>Apto: {aptoStatusAdherente.status}</p>
                                  </div>
                            </div>
                            <Separator className="my-3"/>
                            <h5 className="text-sm font-semibold mt-2 mb-1">Documentación Adherente {index + 1}</h5>
                             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {renderFotoInput(`adherentes.${index}.fotoPerfil`, 'Foto para tu perfil (De frente, mirando la camara. Rostro descubierto, sin lentes ni sombreros, tipo selfie)', true)}
                                {renderFotoInput(`adherentes.${index}.fotoDniFrente` as FotoFieldName, 'DNI Frente', true)}
                                {renderFotoInput(`adherentes.${index}.fotoDniDorso` as FotoFieldName, 'DNI Dorso', true)}
                             </div>
                        </Card>
                    );
                })}
                  <Button type="button" variant="outline" onClick={() => appendAdherente({ id: generateId(), nombre: '', apellido: '', dni: '', fechaNacimiento: new Date(), fotoPerfil: null, fotoDniFrente: null, fotoDniDorso: null, estadoAdherente: EstadoAdherente.INACTIVO, estadoSolicitud: EstadoSolicitudAdherente.PENDIENTE, aptoMedico: { valido: false, razonInvalidez: 'Pendiente' } })}>
                      <PlusCircle className="mr-2 h-4 w-4" /> 
                      Agregar Adherente
                  </Button>
                </div>
            </section>
          </CardContent>
          <CardFooter className="flex justify-between pt-6">
            <Button type="button" variant="outline" onClick={() => router.push('/admin/gestion-socios')}>
              <X className="mr-2 h-4 w-4" /> Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              <Save className="mr-2 h-4 w-4" /> {isPending ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </FormProvider>
  );
}
