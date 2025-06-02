
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
import { UserPlus, FileText, UploadCloud, Trash2, UserCircle, Mail, Phone, MapPin, KeyRound, Building, CalendarDays } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { signupTitularSchema, type SignupTitularData } from '@/types';
import { format, parseISO, subYears } from 'date-fns';
import { Separator } from '@/components/ui/separator';

const renderFilePreview = (fileList: FileList | null | undefined, fieldName: keyof SignupTitularData, form: ReturnType<typeof useForm<SignupTitularData>>) => {
  if (fileList && fileList.length > 0) {
    const file = fileList[0];
    return (
      <div className="mt-2 flex items-center space-x-2 p-2 border rounded-md bg-muted/50">
        <FileText className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm text-muted-foreground truncate max-w-[150px] sm:max-w-[200px]">{file.name}</span>
        <Button type="button" variant="ghost" size="icon" onClick={() => form.setValue(fieldName, null as any, { shouldValidate: true })}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    );
  }
  return null;
};


export function SignupForm() {
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<SignupTitularData>({
    resolver: zodResolver(signupTitularSchema),
    defaultValues: {
      nombre: '',
      apellido: '',
      fechaNacimiento: undefined,
      dni: '',
      empresa: '', // Changed from undefined
      telefono: '',
      direccion: '',
      email: '',
      password: '',
      confirmPassword: '',
      fotoDniFrente: null,
      fotoDniDorso: null,
      fotoPerfil: null,
    },
  });

  function onSubmit(data: SignupTitularData) {
    console.log('Signup data:', data);
    // Aquí iría la lógica para registrar al usuario en el backend.
    // Por ahora, solo simulamos el éxito.
    // También se crearía una entrada en `sociosDB` y `mockUsers` en `lib/auth.ts`
    // para que el nuevo usuario pueda iniciar sesión inmediatamente.

    toast({
      title: 'Cuenta Creada Exitosamente',
      description: 'Tu cuenta de titular ha sido creada. Ahora puedes iniciar sesión.',
    });
    router.push('/login');
  }

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
            
            {/* Datos Personales */}
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
                            max={format(subYears(new Date(), 18), 'yyyy-MM-dd')}
                            min={format(new Date("1900-01-01"), 'yyyy-MM-dd')}
                            className="w-full pl-10"
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

            {/* Datos de Contacto */}
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

            {/* Documentación */}
            <section>
              <h3 className="text-xl font-semibold mb-4 flex items-center"><FileText className="mr-2 h-6 w-6 text-primary"/>Documentación</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                  {(['fotoDniFrente', 'fotoDniDorso', 'fotoPerfil'] as const).map(docType => (
                      <FormField
                          control={form.control}
                          name={docType}
                          key={docType}
                          render={({ field: { onChange, value, ...restField }}) => (
                          <FormItem>
                              <FormLabel>{docType === 'fotoDniFrente' ? 'DNI Frente' : docType === 'fotoDniDorso' ? 'DNI Dorso' : 'Foto Perfil'}</FormLabel>
                              <FormControl>
                                  <label className="cursor-pointer w-full min-h-[120px] flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-md hover:border-primary bg-background hover:bg-muted/50 transition-colors">
                                      <UploadCloud className="h-8 w-8 text-muted-foreground mb-2" />
                                      <span className="text-sm text-muted-foreground text-center">
                                        {value && value.length > 0 ? value[0].name : (docType === 'fotoPerfil' ? "Subir foto (PNG, JPG)" : "Subir DNI (PNG, JPG, PDF)")}
                                      </span>
                                      <Input type="file" className="hidden" onChange={e => onChange(e.target.files)} accept={docType === 'fotoPerfil' ? "image/png,image/jpeg" : "image/png,image/jpeg,application/pdf"} {...restField} />
                                  </label>
                              </FormControl>
                              {renderFilePreview(value, docType, form)}
                              <FormMessage />
                          </FormItem>
                      )} />
                  ))}
              </div>
            </section>

            <Separator />

            {/* Seguridad de la Cuenta */}
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
