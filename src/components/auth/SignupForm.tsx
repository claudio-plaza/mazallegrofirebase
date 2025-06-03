
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserPlus, FileText, UploadCloud, Trash2, UserCircle, Mail, Phone, MapPin, KeyRound, Building, CalendarDays, BadgeCheck } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { signupTitularSchema, type SignupTitularData } from '@/types';
import { format, parseISO, subYears } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { useState, useEffect } from 'react';

const renderFilePreview = (
  fileList: FileList | null | undefined | string,
  fieldName: keyof SignupTitularData,
  formInstance: ReturnType<typeof useForm<SignupTitularData>>
) => {
  let fileNamePreview: string | null = null;
  let isExistingFile = typeof fileList === 'string' && fileList.startsWith('http');

  if (isExistingFile) {
    fileNamePreview = "Archivo cargado";
  } else if (typeof window !== 'undefined' && fileList instanceof FileList && fileList.length > 0) {
    fileNamePreview = fileList[0].name;
  }

  if (fileNamePreview) {
    return (
      <div className="mt-1 flex items-center space-x-2 p-1 border rounded-md bg-muted/30 text-xs">
        <BadgeCheck className="h-4 w-4 text-green-500" />
        <span className="text-muted-foreground truncate max-w-[120px] sm:max-w-[150px]">
          {fileNamePreview}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => formInstance.setValue(fieldName, null, { shouldValidate: true })}
        >
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
      </div>
    );
  }
  return null;
};


export function SignupForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [maxBirthDate, setMaxBirthDate] = useState<string>('');

  useEffect(() => {
    const eighteenYearsAgo = subYears(new Date(), 18);
    setMaxBirthDate(format(eighteenYearsAgo, 'yyyy-MM-dd'));
  }, []);

  const form = useForm<SignupTitularData>({
    resolver: zodResolver(signupTitularSchema),
    mode: 'onChange',
    defaultValues: {
      nombre: '',
      apellido: '',
      fechaNacimiento: undefined,
      dni: '',
      empresa: '',
      telefono: '',
      direccion: '',
      email: '',
      password: '',
      confirmPassword: '',
      fotoDniFrente: null,
      fotoDniDorso: null,
      fotoPerfil: null,
      fotoCarnet: null,
    },
  });

  function onSubmit(data: SignupTitularData) {
    console.log('Signup data submitted:', data); // Log submitted data
    toast({
      title: 'Cuenta Creada Exitosamente',
      description: 'Tu cuenta de titular ha sido creada. Ahora puedes iniciar sesión.',
    });
    router.push('/login');
  }

  // DEBUGGING CONSOLE LOGS:
  // These logs will show up in your browser's developer console.
  // They help us see what the form thinks its values and errors are at any given moment.
  console.log('Current form values:', form.getValues());
  console.log('Current form errors:', form.formState.errors);


  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl my-8">
      <CardHeader className="text-center">
        <UserPlus className="mx-auto h-12 w-12 text-primary mb-2" />
        <CardTitle className="text-3xl font-bold">Crear Cuenta de Titular</CardTitle>
        <CardDescription>
          Regístrate en {siteConfig.name} para acceder a todos los beneficios.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-8">
            
            <section>
              <h3 className="text-xl font-semibold mb-4 flex items-center"><UserCircle className="mr-2 h-6 w-6 text-primary"/>Datos Personales</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <FormField
                  control={form.control}
                  name="nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre(s)</FormLabel>
                      <FormControl><Input placeholder="Juan Alberto" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="apellido"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apellido(s)</FormLabel>
                      <FormControl><Input placeholder="Pérez González" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fechaNacimiento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de Nacimiento</FormLabel>
                      <FormControl>
                        <div className="relative">
                           <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                           <Input
                            type="date"
                            value={field.value ? format(new Date(field.value), 'yyyy-MM-dd') : ''}
                            onChange={(e) => field.onChange(e.target.value ? parseISO(e.target.value) : null)}
                            max={maxBirthDate}
                            min="1900-01-01"
                            className="w-full pl-10"
                            disabled={!maxBirthDate}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dni"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de DNI</FormLabel>
                      <FormControl><Input type="number" placeholder="Sin puntos ni espacios" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="empresa"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Empresa / Sindicato</FormLabel>
                      <FormControl>
                        <div className="relative">
                           <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                           <Input placeholder="Nombre de su empresa o sindicato" {...field} className="pl-10" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            <Separator />

            <section>
              <h3 className="text-xl font-semibold mb-4 flex items-center"><Mail className="mr-2 h-6 w-6 text-primary"/>Datos de Contacto</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                 <FormField
                  control={form.control}
                  name="telefono"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de Teléfono</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input type="tel" placeholder="Ej: 2615123456" {...field} className="pl-10" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                       <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input type="email" placeholder="tu@email.com" {...field} className="pl-10" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="direccion"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Dirección Completa</FormLabel>
                       <FormControl>
                        <div className="relative">
                           <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="Calle, Número, Localidad, Provincia" {...field} className="pl-10" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>
            
            <Separator />

            <section>
              <h3 className="text-xl font-semibold mb-4 flex items-center"><FileText className="mr-2 h-6 w-6 text-primary"/>Documentación</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  {(['fotoDniFrente', 'fotoDniDorso', 'fotoPerfil', 'fotoCarnet'] as const).map(docType => {
                      const isOptional = docType === 'fotoCarnet';
                      const labelText = docType === 'fotoDniFrente' ? 'DNI Frente' :
                                        docType === 'fotoDniDorso' ? 'DNI Dorso' :
                                        docType === 'fotoPerfil' ? 'Foto Perfil' :
                                        'Foto Carnet (Opcional)';
                      const placeholderText = docType === 'fotoPerfil' || docType === 'fotoCarnet' ? "Subir foto (PNG, JPG)" : "Subir DNI (PNG, JPG, PDF)";

                      return (
                        <FormField
                            control={form.control}
                            name={docType}
                            key={docType}
                            render={({ field }) => {
                              const hasFileSelected = typeof window !== 'undefined' && field.value instanceof FileList && field.value.length > 0;
                              return (
                                <FormItem>
                                    <FormLabel>{labelText}</FormLabel>
                                    <FormControl>
                                        <label className="cursor-pointer w-full min-h-[120px] flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-md hover:border-primary bg-background hover:bg-muted/50 transition-colors">
                                            <UploadCloud className="h-8 w-8 text-muted-foreground mb-2" />
                                            <span className="text-sm text-muted-foreground text-center">
                                              {!hasFileSelected && !isOptional ? placeholderText : (hasFileSelected ? '' : (isOptional ? placeholderText + " (Opcional)" : placeholderText))}
                                            </span>
                                            <Input 
                                              type="file" 
                                              className="hidden" 
                                              onChange={e => {
                                                field.onChange(e.target.files);
                                                form.trigger(docType);
                                              }}
                                              accept={docType === 'fotoPerfil' || docType === 'fotoCarnet' ? "image/png,image/jpeg" : "image/png,image/jpeg,application/pdf"}
                                              ref={field.ref}
                                              name={field.name}
                                              onBlur={field.onBlur}
                                            />
                                        </label>
                                    </FormControl>
                                    {renderFilePreview(field.value, docType, form)}
                                    <FormMessage />
                                </FormItem>
                              );
                            }}
                          />
                      );
                  })}
              </div>
            </section>

            <Separator />

            <section>
              <h3 className="text-xl font-semibold mb-4 flex items-center"><KeyRound className="mr-2 h-6 w-6 text-primary"/>Seguridad de la Cuenta</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraseña</FormLabel>
                      <FormControl><Input type="password" placeholder="Al menos 6 caracteres" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmar Contraseña</FormLabel>
                      <FormControl><Input type="password" placeholder="Repita su contraseña" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

          </CardContent>
          <CardFooter className="flex flex-col items-center pt-6">
            <Button type="submit" className="w-full max-w-xs text-lg py-6" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Creando cuenta...' : 'Crear Mi Cuenta'}
            </Button>
            <p className="mt-8 text-center text-sm text-muted-foreground">
              ¿Ya tienes una cuenta?{' '}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Iniciar Sesión
              </Link>
            </p>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
