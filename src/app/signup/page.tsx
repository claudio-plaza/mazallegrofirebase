'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { subYears, format } from 'date-fns';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth, db, app } from '@/lib/firebase/config';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ArrowRight, ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';

const reglamentoInternoTexto = `Aceptación del Reglamento y Política de Privacidad:
Al registrarse y utilizar la aplicación de Mazallegro, el socio declara haber leído, comprendido y aceptado el presente Reglamento Interno en su totalidad. Asimismo, el socio acepta la Política de Privacidad de Allegro, la cual detalla el tratamiento y resguardo de los datos personales (nombre, apellido, DNI y fecha de nacimiento) recopilados para la gestión de accesos y servicios, conforme a la Ley N° 25.326 de Protección de los Datos Personales de Argentina.
... (resto del texto omitido por brevedad) ...
`;

const signupSchema = z.object({
  nombre: z.string().min(2, "Nombre es requerido.").regex(/^[a-zA-Z\s'-]+$/, "Nombre solo debe contener letras, espacios, apóstrofes o guiones."),
  apellido: z.string().min(2, "Apellido es requerido.").regex(/^[a-zA-Z\s'-]+$/, "Apellido solo debe contener letras, espacios, apóstrofes o guiones."),
  fechaNacimiento: z.date({
    required_error: "La fecha de nacimiento es requerida.",
    invalid_type_error: "Formato de fecha inválido.",
  }).refine((date) => {
    const eighteenYearsAgo = subYears(new Date(), 18);
    return date <= eighteenYearsAgo;
  }, { message: "Debes ser mayor de 18 años." }),
  dni: z.string().regex(/^\d{7,8}$/, "DNI debe tener 7 u 8 dígitos numéricos."),
  telefono: z.string().min(10, "Teléfono debe tener al menos 10 caracteres numéricos.").regex(/^\d+$/, "Teléfono solo debe contener números."),
  email: z.string().email("Email inválido."),
  direccion: z.string().min(5, "Dirección es requerida."),
  empresaSindicato: z.string().optional(),
  password: z.string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres.')
    .regex(/[A-Z]/, 'La contraseña debe contener al menos una mayúscula.')
    .regex(/[a-z]/, 'La contraseña debe contener al menos una minúscula.')
    .regex(/[0-9]/, 'La contraseña debe contener al menos un número.'),
  confirmPassword: z.string(),
  aceptaTerminos: z.boolean().refine(value => value === true, {
    message: "Debes aceptar el reglamento para registrarte.",
  }),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden.',
  path: ['confirmPassword'],
});

type SignupFormData = z.infer<typeof signupSchema>;

function LoadingOverlay({ message }: { message: string }) {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 flex flex-col items-center justify-center z-50 text-white p-6">
      <div className="mb-10"><Loader2 className="w-28 h-28 animate-spin text-orange-400 drop-shadow-2xl" /></div>
      <h2 className="text-5xl md:text-6xl font-bold text-center mb-6 tracking-tight">Creando tu cuenta</h2>
      <p className="text-xl md:text-2xl text-blue-100 text-center mb-12 max-w-2xl leading-relaxed">{message}</p>
    </div>
  );
}

export default function SignupPage() {
  console.log("DEBUG: Componente SignupPage cargado. Versión con logs de depuración."); 
  const [pasoActual, setPasoActual] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarConfirmPassword, setMostrarConfirmPassword] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { executeRecaptcha } = useGoogleReCaptcha();

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    mode: 'onBlur',
    defaultValues: {
      nombre: '',
      apellido: '',
      fechaNacimiento: undefined, // Añadido para inicializar el campo
      dni: '',
      empresaSindicato: '',
      telefono: '',
      email: '',
      direccion: '',
      password: '',
      confirmPassword: '',
      aceptaTerminos: false,
    },
  });

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (loading) {
        e.preventDefault();
        e.returnValue = 'El proceso de registro está en curso, ¿estás seguro de que quieres salir?';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [loading]);

  const irSiguiente = async () => {
    const fieldsToValidate: (keyof SignupFormData)[] = ['nombre', 'apellido', 'fechaNacimiento', 'dni', 'telefono', 'email', 'direccion'];
    const result = await form.trigger(fieldsToValidate);
    if (result) {
      setPasoActual(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      toast.error("Por favor, revisa los campos marcados en rojo.");
    }
  };

  const irAtras = () => {
    if (pasoActual > 1) setPasoActual(pasoActual - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onSubmit = async (data: SignupFormData) => {
    setLoading(true);

    if (!data.fechaNacimiento) {
      toast.error("La fecha de nacimiento es requerida.");
      setLoading(false);
      return;
    }

    // Ejecutar reCAPTCHA antes de registrar
    if (!executeRecaptcha) {
      toast.error('Error de seguridad: reCAPTCHA no está disponible. Recarga la página.');
      setLoading(false);
      return;
    }

    try {
      setLoadingMessage('Verificando seguridad...');
      const recaptchaToken = await executeRecaptcha('signup');
      console.log('reCAPTCHA token obtenido para signup');
      
      setLoadingMessage('Creando tu usuario...');
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      setLoadingMessage('Asignando número de socio...');
      const functions = getFunctions(app, 'us-central1');
      const getNextSocioNumber = httpsCallable(functions, 'getNextSocioNumber');
      const result = await getNextSocioNumber();
      const numeroSocio = (result.data as { numeroSocio: string }).numeroSocio;

      setLoadingMessage('Guardando tu perfil...');
      const socioData = {
        id: user.uid,
        numeroSocio,
        nombre: data.nombre,
        apellido: data.apellido,
        dni: data.dni,
        email: data.email,
        telefono: data.telefono,
        direccion: data.direccion,
        fechaNacimiento: Timestamp.fromDate(data.fechaNacimiento),
        empresa: data.empresaSindicato || "",
        estadoSocio: "Pendiente",
        estadoClub: "Inactivo",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        miembroDesde: Timestamp.now(),
        fotoPerfil: '',
        fotoUrl: '',
        fotoDniFrente: '',
        fotoDniDorso: '',
        documentosCompletos: false,
        grupoFamiliar: [],
        adherentes: [],
        aptoMedico: null
      };

      console.log('socioData antes de enviar:', JSON.stringify(socioData, null, 2));
      console.log('fechaNacimiento tipo:', typeof socioData.fechaNacimiento);
      console.log('fechaNacimiento valor:', socioData.fechaNacimiento);

      const createSocioProfile = httpsCallable(functions, 'createSocioProfile');
      await createSocioProfile({ socioData });

      setLoadingMessage('¡Cuenta creada! Redirigiendo...');
      await new Promise(resolve => setTimeout(resolve, 800));
      window.location.href = '/dashboard/subir-documentos';

    } catch (error: any) {
      console.error("Error en el registro:", error);
      toast.error(error.code === 'auth/email-already-in-use' ? 'El email ya está registrado.' : `Error: ${error.message}`);
      setLoading(false);
    }
  };

  const progreso = (pasoActual / 2) * 100;

  if (loading) return <LoadingOverlay message={loadingMessage} />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 flex items-center justify-center p-4 font-sans">
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(() => setShowConfirmDialog(true))} className="w-full max-w-2xl">
          <Card className="shadow-2xl">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl font-bold">Crear Cuenta de Titular</CardTitle>
              <CardDescription>Regístrate en 2 simples pasos.</CardDescription>
              <div className="mt-6"><Progress value={progreso} className="h-2" /></div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {pasoActual === 1 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-5 duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="nombre" render={({ field }) => (<FormItem><FormLabel>Nombre(s) *</FormLabel><FormControl><Input placeholder="Juan" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="apellido" render={({ field }) => (<FormItem><FormLabel>Apellido(s) *</FormLabel><FormControl><Input placeholder="Pérez" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
                  <FormField 
                    control={form.control} 
                    name="fechaNacimiento" 
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fecha de Nacimiento *</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                            onChange={(e) => {
                              const dateValue = e.target.value;
                              // Añadir T12:00:00 para evitar problemas de zona horaria que puedan resultar en el día anterior
                              const date = dateValue ? new Date(`${dateValue}T12:00:00`) : null;
                              field.onChange(date);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} 
                  />
                  <FormField control={form.control} name="dni" render={({ field }) => (<FormItem><FormLabel>Número de DNI *</FormLabel><FormControl><Input placeholder="Sin puntos" maxLength={8} {...field} onChange={e => field.onChange(e.target.value.replace(/\D/g, ''))} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="telefono" render={({ field }) => (<FormItem><FormLabel>Teléfono *</FormLabel><FormControl><Input placeholder="261..." {...field} onChange={e => field.onChange(e.target.value.replace(/\D/g, ''))} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email *</FormLabel><FormControl><Input type="email" placeholder="tu@correo.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <div className="md:col-span-2"><FormField control={form.control} name="direccion" render={({ field }) => (<FormItem><FormLabel>Dirección Completa *</FormLabel><FormControl><Input placeholder="Calle 123, Ciudad" {...field} /></FormControl><FormMessage /></FormItem>)} /></div>
                  <FormField control={form.control} name="empresaSindicato" render={({ field }) => (<FormItem><FormLabel>Empresa / Sindicato (Opcional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <Button type="button" onClick={irSiguiente} className="w-full bg-orange-500 hover:bg-orange-600" size="lg">Siguiente <ArrowRight className="ml-2 w-5 h-5" /></Button>
                </div>
              )}
              {pasoActual === 2 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-5 duration-300">
                  <FormField control={form.control} name="password" render={({ field }) => (<FormItem><FormLabel>Contraseña *</FormLabel><div className="relative"><FormControl><Input type={mostrarPassword ? 'text' : 'password'} {...field} /></FormControl><button type="button" onClick={() => setMostrarPassword(!mostrarPassword)} className="absolute right-3 top-1/2 -translate-y-1/2"><Eye className="h-5 w-5" /></button></div><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="confirmPassword" render={({ field }) => (<FormItem><FormLabel>Confirmar Contraseña *</FormLabel><div className="relative"><FormControl><Input type={mostrarConfirmPassword ? 'text' : 'password'} {...field} /></FormControl><button type="button" onClick={() => setMostrarConfirmPassword(!mostrarConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2"><Eye className="h-5 w-5" /></button></div><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="aceptaTerminos" render={({ field }) => (<FormItem className="flex items-center space-x-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><label htmlFor="terminos" className="text-sm">Acepto el <Dialog><DialogTrigger asChild><span className="text-primary hover:underline cursor-pointer font-medium">Reglamento y Política de Privacidad</span></DialogTrigger><DialogContent className="sm:max-w-2xl max-h-[80vh]"><DialogHeader><DialogTitle>Reglamento</DialogTitle></DialogHeader><ScrollArea className="max-h-[calc(80vh-200px)] my-4"><div className="prose prose-sm max-w-none whitespace-pre-wrap p-1">{reglamentoInternoTexto}</div></ScrollArea></DialogContent></Dialog>.</label><FormMessage /></FormItem>)} />
                  <div className="flex gap-3"><Button type="button" onClick={irAtras} variant="outline" className="flex-1" size="lg" disabled={loading}><ArrowLeft className="mr-2 w-5 h-5" />Atrás</Button><Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700" size="lg" disabled={loading}>{loading ? 'Creando...' : 'Crear Mi Cuenta'}<CheckCircle2 className="ml-2 w-5 h-5" /></Button></div>
                </div>
              )}
              <div className="text-center text-sm"><Link href="/login" className="underline">¿Ya tienes cuenta? Inicia Sesión</Link></div>
            </CardContent>
          </Card>
        </form>
      </FormProvider>
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="text-2xl text-center">Atención: Proceso de Registro</DialogTitle></DialogHeader>
          <DialogDescription className="text-center text-base pt-4 space-y-4">
            <p>Este proceso puede tomar hasta 30 segundos. Estamos creando tu cuenta de forma segura.</p>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded"><p className="text-yellow-800 font-medium">Por favor, <strong>NO cierres ni recargues</strong> esta ventana.</p></div>
          </DialogDescription>
          <DialogFooter className="sm:justify-center gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)} className="flex-1">Cancelar</Button>
            <Button onClick={() => { setShowConfirmDialog(false); form.handleSubmit(onSubmit)(); }} className="flex-1 bg-orange-500 hover:bg-orange-600">Entendido, Continuar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}