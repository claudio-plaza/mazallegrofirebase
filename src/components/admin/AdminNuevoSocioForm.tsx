
'use client';

import { useEffect, useState } from 'react';
import { useForm, FormProvider, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import type { Socio, AdminNuevoSocioTitularData, MiembroFamiliar } from '@/types';
import { adminNuevoSocioTitularSchema, RelacionFamiliar } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardFooter, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { addSocio, uploadFile } from '@/lib/firebase/firestoreService';
import { getFileUrl, generateId } from '@/lib/helpers';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CalendarDays, UserPlus, Save, X, Info, Users, ShieldCheck, ShieldAlert, AlertTriangle, UserCircle, Briefcase, Mail, Phone, MapPin, Trash2, PlusCircle, UploadCloud, FileText, Lock, Heart } from 'lucide-react';
import { format, parseISO, isValid, subYears, formatISO } from 'date-fns';
import { Separator } from '../ui/separator';
import Image from 'next/image';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
const FileInput = dynamic(() => import('../ui/file-input').then(mod => mod.FileInput), { ssr: false });


type FotoFieldNameTitular = 'fotoPerfil' | 'fotoDniFrente' | 'fotoDniDorso' | 'fotoCarnet';
type FotoFieldNameFamiliar = `grupoFamiliar.${number}.fotoPerfil` | `grupoFamiliar.${number}.fotoDniFrente` | `grupoFamiliar.${number}.fotoDniDorso` | `grupoFamiliar.${number}.fotoCarnet`;
type FotoFieldName = FotoFieldNameTitular | FotoFieldNameFamiliar;


export function AdminNuevoSocioForm() {
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [maxBirthDate, setMaxBirthDate] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'));
  const [maxBirthDateTitular, setMaxBirthDateTitular] = useState<string>(() => format(subYears(new Date(), 18), 'yyyy-MM-dd'));

  const form = useForm<AdminNuevoSocioTitularData>({
    resolver: zodResolver(adminNuevoSocioTitularSchema),
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


  const { mutate: addSocioMutation, isPending } = useMutation({
    mutationFn: (socioData: any) => addSocio(generateId(), socioData, false),
    onSuccess: (data) => {
        toast({ title: 'Socio Creado', description: `El socio ${data.nombre} ${data.apellido} ha sido agregado.` });
        queryClient.invalidateQueries({ queryKey: ['socios'] });
        router.push('/admin/gestion-socios');
    },
    onError: (error) => {
      console.error("Error al crear socio:", error);
      toast({ title: "Error", description: "No se pudo crear el socio.", variant: "destructive" });
    }
  });


  const onSubmit = async (data: AdminNuevoSocioTitularData) => {
    const tempId = generateId(); // Use a temp ID for paths if no auth user

    const uploadAndGetUrl = async (fileInput: any, pathSuffix: string): Promise<string | null> => {
        if (fileInput instanceof FileList && fileInput.length > 0) {
            return uploadFile(fileInput[0], `socios/${tempId}/${pathSuffix}`);
        }
        return null;
    };

    const fotoPerfilUrl = await uploadAndGetUrl(data.fotoPerfil, 'fotoPerfil.jpg');

    const grupoFamiliarConUrls = await Promise.all(
        (data.grupoFamiliar || []).map(async (familiar) => {
            const familiarId = familiar.id || generateId();
            const [perfil, frente, dorso, carnet] = await Promise.all([
                uploadAndGetUrl(familiar.fotoPerfil, `familiares/${familiarId}_perfil.jpg`),
                uploadAndGetUrl(familiar.fotoDniFrente, `familiares/${familiarId}_dniFrente.jpg`),
                uploadAndGetUrl(familiar.fotoDniDorso, `familiares/${familiarId}_dniDorso.jpg`),
                uploadAndGetUrl(familiar.fotoCarnet, `familiares/${familiarId}_carnet.jpg`),
            ]);
            return {
                ...familiar,
                id: familiarId,
                fotoPerfil: perfil,
                fotoDniFrente: frente,
                fotoDniDorso: dorso,
                fotoCarnet: carnet,
            };
        })
    );

    const socioDataForCreation = {
        ...data,
        fotoUrl: fotoPerfilUrl,
        fotoPerfil: fotoPerfilUrl,
        fotoDniFrente: await uploadAndGetUrl(data.fotoDniFrente, 'fotoDniFrente.jpg'),
        fotoDniDorso: await uploadAndGetUrl(data.fotoDniDorso, 'fotoDniDorso.jpg'),
        fotoCarnet: await uploadAndGetUrl(data.fotoCarnet, 'fotoCarnet.jpg'),
        grupoFamiliar: grupoFamiliarConUrls,
    };

    addSocioMutation(socioDataForCreation);
  };
  
  const fotoTitularActual = (typeof window !== 'undefined' && form.watch('fotoPerfil') instanceof FileList
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
                    <AvatarImage src={fotoTitularActual || undefined} alt={`${form.watch('nombre') || 'Nuevo'} ${form.watch('apellido') || 'Socio'}`} data-ai-hint="profile photo placeholder"/>
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
                    <FormField
                      control={form.control}
                      name="fotoPerfil"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Foto de Perfil</FormLabel>
                          <FormControl>
                            <FileInput field={field} label="Foto de Perfil" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="fotoDniFrente"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>DNI Frente</FormLabel>
                          <FormControl>
                            <FileInput field={field} label="DNI Frente" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="fotoDniDorso"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>DNI Dorso</FormLabel>
                          <FormControl>
                            <FileInput field={field} label="DNI Dorso" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="fotoCarnet"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Foto Carnet</FormLabel>
                          <FormControl>
                            <FileInput field={field} label="Foto Carnet" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                               <FormField
                                  control={form.control}
                                  name={`grupoFamiliar.${index}.fotoPerfil`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-xs">Foto Perfil</FormLabel>
                                      <FormControl>
                                        <FileInput field={field} label={`Foto Perfil Familiar ${index + 1}`} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`grupoFamiliar.${index}.fotoDniFrente`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-xs">DNI Frente</FormLabel>
                                      <FormControl>
                                        <FileInput field={field} label={`DNI Frente Familiar ${index + 1}`} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`grupoFamiliar.${index}.fotoDniDorso`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-xs">DNI Dorso</FormLabel>
                                      <FormControl>
                                        <FileInput field={field} label={`DNI Dorso Familiar ${index + 1}`} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`grupoFamiliar.${index}.fotoCarnet`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-xs">Foto Carnet</FormLabel>
                                      <FormControl>
                                        <FileInput field={field} label={`Foto Carnet Familiar ${index + 1}`} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
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
            <Button type="submit" disabled={isPending}>
              <Save className="mr-2 h-4 w-4" /> {isPending ? 'Creando Socio...' : 'Crear Socio'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </FormProvider>
  );
}
