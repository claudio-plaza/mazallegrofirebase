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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserPlus, FileText, UploadCloud, Trash2, UserCircle, Mail, Phone, MapPin, KeyRound, Building, CalendarDays, BadgeCheck, FileWarning } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { signupTitularSchema, type SignupTitularData, dniFileSchemaConfig, profileFileSchemaConfig } from '@/types';
import { format, parseISO, subYears } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { useState, useEffect } from 'react';
import { signupUser } from '@/lib/auth';
import dynamic from 'next/dynamic';
const FileInput = dynamic(() => import('../ui/file-input').then(mod => mod.FileInput), { ssr: false });

const reglamentoInternoTexto = `Aceptación del Reglamento y Política de Privacidad:
Al registrarse y utilizar la aplicación de Allegro, el socio declara haber leído, comprendido y aceptado el presente Reglamento Interno en su totalidad. Asimismo, el socio acepta la Política de Privacidad de Allegro, la cual detalla el tratamiento y resguardo de los datos personales (nombre, apellido, DNI y fecha de nacimiento) recopilados para la gestión de accesos y servicios, conforme a la Ley N° 25.326 de Protección de los Datos Personales de Argentina.

Regla N°1 - Ingreso al Complejo:

Registro y Aprobación: Para poder ingresar al complejo, es indispensable que cada socio se registre previamente en la aplicación móvil de Allegro y que su solicitud sea aprobada por la administración. Este proceso garantiza un control de acceso y seguridad para todos.
Documentación y Mascotas: Al ingresar, se requerirá la presentación del DNI de cada miembro del grupo familiar registrado. Por razones de seguridad e higiene, no se permite el ingreso de ningún tipo de mascotas, sin excepción.
Uso de Vehículos: En caso de entrar con un vehículo, el mismo deberá permanecer exclusivamente en el lugar destinado a estacionamiento. Solo podrá circular por las calles internas de manera prudente, a una velocidad máxima de 10 km/h, y únicamente para bajar y subir pertenencias. Está estrictamente prohibido el ingreso de autos o motos a los sectores verdes.
Definición de Grupo Familiar: A los efectos de este reglamento, se considera "grupo familiar" al cónyuge/pareja y a los hijos menores de 18 años del socio titular.
Horarios del Camping:

Temporada Alta: Del 08 de diciembre al día anterior al comienzo de clases. (La temporada de pileta puede extenderse dependiendo las condiciones climáticas). 

Abrimos de 10:00 a 22:00 hs de martes a domingos, con excepción de los días sábado que cerramos a las 20:00 hs.
Los días lunes feriados el lugar abrirá sus puertas y cerraremos el día siguiente.
Temporada Baja: Del comienzo de clases al 07 de diciembre. 
Abrimos de 10:00 a 19:00 hs de martes a domingos.
Los días lunes feriados el lugar abrirá sus puertas y cerraremos el día siguiente.
La administración del lugar atiende de 12:00 a 19:00 hs.
Regla N°2 - Carnet Digital:

Su Acceso Digital: Una vez registrado y aprobado en la aplicación, se generará automáticamente su carnet digital. Este carnet es personal e intransferible.
Presentación Obligatoria: Deberá ser presentado cada vez que sea requerido por el personal a cargo del complejo o por las autoridades del mismo.
Regla N°3 - Invitados:

Registro Previo de Invitados: El socio debe registrar previamente a cada uno de los invitados por medio de la aplicación, ingresando nombre, apellido, DNI y fecha de nacimiento. Este registro es indispensable para el acceso.
Acompañamiento y Canon: Solo podrán ingresar acompañados de un socio responsable y abonando el canon de entrada dispuesto por las autoridades. Cada invitado deberá presentar su documento para corroborar identidad.
Regla N°4 - Pileta:

Temporada y Revisación Médica: Solo podrán hacer uso de la pileta en temporada habilitada y teniendo la revisión médica actualizada, realizada por el médico del complejo. Se autorizará el ingreso a la misma siempre y cuando esté el guardavidas presente.
Normas de Uso: No se permitirá el ingreso de alimentos ni de bebidas, ni objetos contundentes que puedan representar un riesgo para los presentes en la pileta. 
Cabello recogido o gorro de natación.
Revisión médica obligatoria.
Traje de baño.
Higiene Obligatoria: El ingreso a la pileta es exclusivamente por la ducha. Todo aquel que ingrese sin pasar por la misma será suspendido por un tiempo determinado por el guardavida o expulsado de la pileta por todo el día.

Restricciones para Niños: Los niños menores de 3 años o que aún usen pañales no pueden ingresar.
Regla N°5 - Salones:

Uso Exclusivo para Eventos: Los salones son solo para eventos. Para poder utilizarlos, deberán ser reservados con anticipación por medio de una seña.
Beneficio para Socios: Los socios gozarán del beneficio de un descuento en el precio final del alquiler , dicho descuento dependerá del convenio vigente con las empresas asociadas.
Horario de Cierre Sábados: Los días sábados el lugar cierra a las 20:00 hs.
Regla N°6 - Responsabilidades:

Cuidado de las Instalaciones: Todo socio es responsable de cuidar y hacer cuidar los espacios e instalaciones.
Supervisión de Menores: El socio también es responsable de cuidar a sus hijos en los juegos y en las piletas.
Regla N°7 - Objetos Personales:

Responsabilidad del Socio: Cada socio es responsable de sus pertenencias. El complejo no se hará responsable por pérdida o hurto de los objetos personales. Se recomienda encarecidamente no dejar objetos de valor desatendidos.
Seguridad en el Complejo: El lugar cuenta con cámaras de seguridad para la vigilancia general de las instalaciones.
Regla N°8 - Comportamientos:

Conducta Adecuada: Los comportamientos indebidos que alteren la convivencia, la seguridad o el buen funcionamiento del complejo serán penados con sanciones. Estas sanciones pueden ir desde la suspensión de ingreso al complejo por un tiempo determinado hasta la expulsión definitiva.
Faltas Graves: Se considerará como falta grave el realizar sus necesidades físicas fuera de los baños habilitados.
Proceso de Sanción: La aplicación de sanciones será determinada por la administración del complejo, pudiendo requerir un descargo previo al socio involucrado. La decisión final será notificada por los canales de comunicación establecidos (app, correo electrónico, etc.).
Regla N°9 - Ruidos Molestos:

Respeto por el Descanso: No se permitirá el uso de equipos de audio o instrumentos amplificados que perturben la tranquilidad de los demás socios.
Prohibición de Pirotecnia: Está prohibido el uso de pirotecnia dentro de las instalaciones.
Disposiciones Finales:

Derecho de Admisión y Permanencia: La administración de Allegro se reserva el derecho de admisión y permanencia dentro de sus instalaciones, siempre que no implique un acto discriminatorio.
Modificaciones del Reglamento y Horarios: El presente reglamento podrá ser modificado por la administración del complejo. Los socios serán notificados de cualquier cambio relevante a través de la aplicación de Allegro, correo electrónico o avisos visibles en el complejo. Los horarios pueden sufrir modificaciones sin previo aviso según disposiciones municipales, provinciales o de la administración.
Fuerza Mayor: Allegro no será responsable por el incumplimiento o retraso en la prestación de sus servicios debido a causas de fuerza mayor o caso fortuito, incluyendo pero no limitándose a desastres naturales, eventos climáticos extremos, actos de autoridad gubernamental, cortes de energía prolongados o cualquier otra circunstancia imprevisible e incontrolable que impida el normal funcionamiento de las instalaciones. En tales casos, la administración informará a los socios sobre las medidas adoptadas.
`;


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
      password: '',
      confirmPassword: '',
      fotoDniFrente: null,
      fotoDniDorso: null,
      fotoPerfil: null,
      fotoCarnet: null,
      aceptaTerminos: false,
    },
  });

  async function onSubmit(data: SignupTitularData) {
    console.log("Validation successful, onSubmit triggered.");
    console.log("Form data:", data);
    try {
      const authUser = await signupUser(data);
      if (authUser) {
        toast({
          title: 'Cuenta Creada Exitosamente',
          description: 'Tu cuenta de titular ha sido creada y está pendiente de validación. Ya puedes iniciar sesión.',
        });
        router.push('/login');
      }
    } catch (error) {
      console.error('Error in signup process:', error);
      toast({
        title: 'Error en el Registro',
        description: error instanceof Error ? error.message : 'Ocurrió un error inesperado al crear la cuenta.',
        variant: 'destructive',
      });
    }
  }

  function onInvalid(errors: any) {
    console.error("Validation failed. Errors:", errors);
    toast({
      title: "Error de Validación",
      description: "Por favor, revise los campos del formulario. Hay errores o faltan datos.",
      variant: "destructive",
    });
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
        <form onSubmit={form.handleSubmit(onSubmit, onInvalid)}>
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
                      <FormLabel>Empresa / Sindicato (Opcional)</FormLabel>
                      <FormControl>
                        <div className="relative">
                           <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                           <Input placeholder="Empresa/sindicato (si corresponde)" {...field} className="pl-10" />
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
              <h3 className="text-xl font-semibold mb-2 flex items-center"><FileText className="mr-2 h-6 w-6 text-primary"/>Documentación</h3>
              <p className="text-sm text-muted-foreground mb-4">Formatos admitidos: PNG, JPG, JPEG, TIFF, PDF.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <FormField
                    control={form.control}
                    name="fotoDniFrente"
                    render={({ field: { onChange, value, ...rest } }) => (
                      <FormItem>
                        <FormLabel>DNI Frente</FormLabel>
                        <FormControl>
                          <FileInput onValueChange={onChange} value={value} placeholder="DNI Frente" accept={dniFileSchemaConfig.mimeTypes.join(',')} {...rest} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="fotoDniDorso"
                    render={({ field: { onChange, value, ...rest } }) => (
                      <FormItem>
                        <FormLabel>DNI Dorso</FormLabel>
                        <FormControl>
                          <FileInput onValueChange={onChange} value={value} placeholder="DNI Dorso" accept={dniFileSchemaConfig.mimeTypes.join(',')} {...rest} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="fotoPerfil"
                    render={({ field: { onChange, value, ...rest } }) => (
                      <FormItem>
                        <FormLabel>Foto Perfil</FormLabel>
                        <FormControl>
                          <FileInput onValueChange={onChange} value={value} placeholder="Foto Perfil" accept={profileFileSchemaConfig.mimeTypes.join(',')} {...rest} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="fotoCarnet"
                    render={({ field: { onChange, value, ...rest } }) => (
                      <FormItem>
                        <FormLabel>Foto Carnet (Opcional)</FormLabel>
                        <FormControl>
                          <FileInput onValueChange={onChange} value={value} placeholder="Foto Carnet (Opcional)" accept={profileFileSchemaConfig.mimeTypes.join(',')} {...rest} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                      <FormControl><Input type="password" placeholder="Mín. 8 caracteres, 1 mayúscula, 1 número" {...field} /></FormControl>
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

            <Separator />

            <section>
              <h3 className="text-xl font-semibold mb-4 flex items-center"><FileWarning className="mr-2 h-6 w-6 text-primary"/>Reglamento y Políticas</h3>
               <FormField
                control={form.control}
                name="aceptaTerminos"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="cursor-pointer">
                        He leído y acepto el{' '}
                        <Dialog>
                          <DialogTrigger asChild>
                            <span className="text-primary hover:underline cursor-pointer font-medium">
                              Reglamento Interno y la Política de Privacidad
                            </span>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-2xl max-h-[80vh]">
                            <DialogHeader>
                              <DialogTitle className="text-2xl">Reglamento Interno y Política de Privacidad</DialogTitle>
                              <DialogDescription>
                                Por favor, lea atentamente el siguiente reglamento.
                              </DialogDescription>
                            </DialogHeader>
                            <ScrollArea className="max-h-[calc(80vh-200px)] my-4">
                              <div className="prose prose-sm max-w-none whitespace-pre-wrap p-1">
                                {reglamentoInternoTexto}
                              </div>
                            </ScrollArea>
                            <DialogFooter>
                              <DialogClose asChild>
                                <Button type="button">Cerrar</Button>
                              </DialogClose>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                         {' '}de {siteConfig.name}.
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
            </section>

          </CardContent>
          <CardFooter className="flex flex-col items-center pt-6">
            <Button 
              type="submit" 
              className="w-full max-w-xs text-lg py-6" 
              disabled={form.formState.isSubmitting || !form.watch('aceptaTerminos')}
            >
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
