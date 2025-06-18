
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
import { CalendarDays, UserCog, Save, X, Info, Users, ShieldCheck, ShieldAlert, AlertTriangle, UserCircle, Briefcase, Mail, Phone, MapPin, Trash2, PlusCircle } from 'lucide-react';
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
    return format(today, 'yyyy-MM-dd'); // Para familiares, puede ser cualquier fecha hasta hoy
  });
  const [maxBirthDateTitular, setMaxBirthDateTitular] = useState<string>(() => {
    const eighteenYearsAgo = subYears(new Date(), 18);
    return format(eighteenYearsAgo, 'yyyy-MM-dd');
  });


  const form = useForm<AdminEditSocioTitularData>({
    resolver: zodResolver(adminEditSocioTitularSchema),
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
          grupoFamiliar: data.grupoFamiliar.map(f => ({
            ...f,
            fechaNacimiento: typeof f.fechaNacimiento === 'string' ? parseISO(f.fechaNacimiento) : f.fechaNacimiento,
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

    const updatedSocioData: Partial<Socio> = {
        ...data,
        fechaNacimiento: data.fechaNacimiento instanceof Date ? formatISO(data.fechaNacimiento as Date) : data.fechaNacimiento as string,
        grupoFamiliar: data.grupoFamiliar?.map(f => ({
            ...f,
            id: f.id || `temp-${Math.random().toString(36).substr(2, 9)}`, // Ensure ID for new ones if any
            fechaNacimiento: f.fechaNacimiento instanceof Date ? formatISO(f.fechaNacimiento as Date) : f.fechaNacimiento as string,
            aptoMedico: socio.grupoFamiliar.find(gf => gf.id === f.id)?.aptoMedico, // Preserve existing apto
            fotoPerfil: socio.grupoFamiliar.find(gf => gf.id === f.id)?.fotoPerfil, // Preserve existing photos
            fotoDniFrente: socio.grupoFamiliar.find(gf => gf.id === f.id)?.fotoDniFrente,
            fotoDniDorso: socio.grupoFamiliar.find(gf => gf.id === f.id)?.fotoDniDorso,
            fotoCarnet: socio.grupoFamiliar.find(gf => gf.id === f.id)?.fotoCarnet,
        })) as MiembroFamiliar[],
    };
    
    // Preserve existing photos for the titular if not changed in this form
    const finalDataForUpdate: Socio = {
        ...socio, // Start with existing socio data
        ...updatedSocioData, // Overlay with form data
        // Ensure photo URLs are preserved if not part of updatedTitularData (which they are not for now)
        fotoUrl: socio.fotoUrl,
        fotoPerfil: socio.fotoPerfil,
        fotoDniFrente: socio.fotoDniFrente,
        fotoDniDorso: socio.fotoDniDorso,
        fotoCarnet: socio.fotoCarnet,
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
  
  const fotoPerfilToShow = socio.fotoUrl || (socio.fotoPerfil && getFileUrl(socio.fotoPerfil as FileList)) || `https://placehold.co/128x128.png?text=${socio.nombre[0]}${socio.apellido[0]}`;
  const aptoStatusTitular = getAptoMedicoStatus(socio.aptoMedico, socio.fechaNacimiento);

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card className="w-full max-w-4xl mx-auto shadow-xl">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-center gap-4">
                <Avatar className="h-20 w-20 border">
                    <AvatarImage src={fotoPerfilToShow} alt={`${socio.nombre} ${socio.apellido}`} data-ai-hint="profile photo"/>
                    <AvatarFallback>{socio.nombre[0]}{socio.apellido[0]}</AvatarFallback>
                </Avatar>
                <div>
                    <CardTitle className="text-2xl flex items-center"><UserCog className="mr-3 h-7 w-7 text-primary" />Editar Socio: {socio.nombre} {socio.apellido}</CardTitle>
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
                <h3 className="text-lg font-semibold mb-3 text-primary border-b pb-1">Salud y Documentación (Titular - Solo Visualización)</h3>
                 <p className="text-xs text-muted-foreground mb-3">La edición de aptos médicos y la carga/modificación de archivos de DNI/Perfil se realizan desde otras secciones o se implementarán próximamente.</p>
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
                    </div>
                    <div>
                        <FormLabel>Última Revisión Médica</FormLabel>
                        <Input value={socio.ultimaRevisionMedica ? formatDate(socio.ultimaRevisionMedica) : 'N/A'} disabled className="mt-1 bg-muted/50"/>
                    </div>
                    <div>
                        <FormLabel>Foto DNI Frente</FormLabel>
                        {socio.fotoDniFrente ? <Image src={typeof socio.fotoDniFrente === 'string' ? socio.fotoDniFrente : getFileUrl(socio.fotoDniFrente as FileList)} alt="DNI Frente" width={150} height={90} className="mt-1 rounded border object-contain" data-ai-hint="ID card front"/> : <p className="text-xs text-muted-foreground mt-1">No disponible</p>}
                    </div>
                    <div>
                        <FormLabel>Foto DNI Dorso</FormLabel>
                        {socio.fotoDniDorso ? <Image src={typeof socio.fotoDniDorso === 'string' ? socio.fotoDniDorso : getFileUrl(socio.fotoDniDorso as FileList)} alt="DNI Dorso" width={150} height={90} className="mt-1 rounded border object-contain" data-ai-hint="ID card back"/> : <p className="text-xs text-muted-foreground mt-1">No disponible</p>}
                    </div>
                </div>
            </section>
            <Separator />
             <section>
                <h3 className="text-lg font-semibold mb-3 text-primary border-b pb-1">Grupo Familiar</h3>
                {grupoFamiliarFields.length === 0 && <p className="text-sm text-muted-foreground">Este socio no tiene familiares registrados o editables aquí.</p>}
                <div className="space-y-4">
                {grupoFamiliarFields.map((field, index) => {
                    const familiarData = socio.grupoFamiliar.find(f => f.id === field.id || f.dni === field.dni); // Match by ID or DNI
                    const aptoStatusFamiliar = familiarData ? getAptoMedicoStatus(familiarData.aptoMedico, familiarData.fechaNacimiento) : { status: 'N/A', message: 'No se pudo cargar apto', colorClass: 'text-gray-500' };
                    const fotoFamiliar = (familiarData?.fotoPerfil && typeof familiarData.fotoPerfil === 'string')
                                        ? familiarData.fotoPerfil
                                        : (familiarData?.fotoPerfil && getFileUrl(familiarData.fotoPerfil as FileList))
                                        || `https://placehold.co/64x64.png?text=${field.nombre?.[0] || ''}${field.apellido?.[0] || ''}`;

                    return (
                        <Card key={field.id} className="p-4 bg-muted/20">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-medium">Familiar {index + 1}</h4>
                                {/* Add remove button later if needed */}
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
                                          <AvatarImage src={fotoFamiliar} alt={field.nombre} data-ai-hint="family member photo"/>
                                          <AvatarFallback>{field.nombre?.[0]}{field.apellido?.[0]}</AvatarFallback>
                                      </Avatar>
                                      <p className={`text-xs mt-1 text-center p-1 rounded ${aptoStatusFamiliar.colorClass.replace('bg-', 'bg-opacity-20 ')}`}>Apto: {aptoStatusFamiliar.status}</p>
                                  </div>
                            </div>
                        </Card>
                    );
                })}
                </div>
                <p className="text-xs text-muted-foreground mt-2">La edición de aptos médicos y fotos de familiares se realiza desde otras secciones o se implementará próximamente.</p>
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

