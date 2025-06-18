
'use client';

import { useEffect, useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import type { Socio, AdminEditSocioTitularData } from '@/types';
import { adminEditSocioTitularSchema } from '@/types';
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
import { CalendarDays, UserCog, Save, X, Info, Users, ShieldCheck, ShieldAlert, AlertTriangle, UserCircle, Briefcase, Mail, Phone, MapPin } from 'lucide-react';
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
  
  // Estado para la fecha máxima de nacimiento (mayor de 18 años)
  const [maxBirthDate, setMaxBirthDate] = useState<string>(() => {
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
    },
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
          empresa: data.empresa.toString(), // Asegurarse que sea string
          telefono: data.telefono,
          direccion: data.direccion,
          email: data.email,
          estadoSocio: data.estadoSocio,
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

    const updatedTitularData: Partial<Socio> = {
        ...data,
        fechaNacimiento: data.fechaNacimiento instanceof Date ? formatISO(data.fechaNacimiento) : data.fechaNacimiento as string,
    };

    try {
      await updateSocio({ ...socio, ...updatedTitularData });
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
                    <CardDescription>Modifique los datos del socio titular. N° Socio: {socio.numeroSocio}</CardDescription>
                </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <section>
                <h3 className="text-lg font-semibold mb-3 text-primary border-b pb-1">Datos Personales y Contacto</h3>
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
                                    max={maxBirthDate}
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
                <h3 className="text-lg font-semibold mb-3 text-primary border-b pb-1">Información de Membresía</h3>
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
                <h3 className="text-lg font-semibold mb-3 text-primary border-b pb-1">Salud y Documentación (Solo Visualización)</h3>
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
                <h3 className="text-lg font-semibold mb-3 text-primary border-b pb-1">Grupo Familiar (Solo Visualización)</h3>
                {socio.grupoFamiliar && socio.grupoFamiliar.length > 0 ? (
                    <div className="space-y-2">
                        {socio.grupoFamiliar.map(f => (
                            <div key={f.id || f.dni} className="text-sm p-2 border rounded bg-muted/20">
                                <p><strong>{f.nombre} {f.apellido}</strong> ({f.relacion}) - DNI: {f.dni}</p>
                            </div>
                        ))}
                    </div>
                ) : <p className="text-sm text-muted-foreground">Sin familiares registrados.</p>}
                <p className="text-xs text-muted-foreground mt-2">La gestión detallada del grupo familiar (agregar, quitar, editar aptos) se realiza a través de las opciones específicas en el dashboard de socios.</p>
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
