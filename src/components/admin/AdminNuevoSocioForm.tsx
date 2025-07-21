'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
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
import { toast }s from 'sonner';
import { Timestamp } from 'firebase/firestore';
import { createSocio } from '@/lib/firebase/firestoreService';
import { uploadFile } from '@/lib/firebase/storageService';
import { Socio } from '@/types';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FileInput } from '../ui/file-input';
import { getFileUrl } from '@/lib/utils';
import { useMemo } from 'react';

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 4; // In MB

const sizeInMB = (sizeInBytes: number, decimalsNum = 2) => {
  const result = sizeInBytes / (1024 * 1024);
  return +result.toFixed(decimalsNum);
};

const nuevoSocioFormSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  apellido: z.string().min(1, 'El apellido es requerido'),
  dni: z.string().min(7, 'El DNI debe tener al menos 7 caracteres'),
  email: z.string().email('Email inválido'),
  telefono: z.string().optional(),
  fechaNacimiento: z.string().min(1, 'La fecha de nacimiento es requerida'),
  fotoPerfil: z
    .custom<File | null | undefined | string>()
    .refine(
      (file) => !file || (file instanceof File && sizeInMB(file.size) <= MAX_IMAGE_SIZE),
      `El tamaño máximo de la imagen es de ${MAX_IMAGE_SIZE}MB.`
    )
    .refine(
      (file) => !file || (file instanceof File && ACCEPTED_IMAGE_TYPES.includes(file.type)),
      'Solo se aceptan los formatos .jpg, .jpeg, .png y .webp.'
    )
    .optional(),
});

type NuevoSocioFormValues = z.infer<typeof nuevoSocioFormSchema>;

const defaultValues: Partial<NuevoSocioFormValues> = {
  nombre: '',
  apellido: '',
  dni: '',
  email: '',
  telefono: '',
  fechaNacimiento: '',
  fotoPerfil: undefined,
};

export function AdminNuevoSocioForm() {
  const router = useRouter();
  const form = useForm<NuevoSocioFormValues>({
    resolver: zodResolver(nuevoSocioFormSchema),
    defaultValues,
    mode: 'onChange',
  });

  const fotoPerfil = form.watch('fotoPerfil');

  const fotoTitularPreview = useMemo(() => {
    if (fotoPerfil instanceof File) {
      return URL.createObjectURL(fotoPerfil);
    }
    if (typeof fotoPerfil === 'string') {
      return fotoPerfil;
    }
    return 'https://placehold.co/128x128.png?text=NS';
  }, [fotoPerfil]);

  async function onSubmit(data: NuevoSocioFormValues) {
    try {
      toast.info('Creando nuevo socio...');
      let fotoURL: string | undefined = undefined;

      if (data.fotoPerfil instanceof File) {
        const filePath = `socios/${Date.now()}_${data.fotoPerfil.name}`;
        fotoURL = await uploadFile(data.fotoPerfil, filePath);
      }

      const fechaNacimientoDate = new Date(data.fechaNacimiento);
      const fechaNacimientoTimestamp = Timestamp.fromDate(fechaNacimientoDate);

      const nuevoSocio: Omit<Socio, 'id'> = {
        nombre: data.nombre,
        apellido: data.apellido,
        dni: data.dni,
        email: data.email,
        telefono: data.telefono || '',
        fechaNacimiento: fechaNacimientoTimestamp,
        fotoURL: fotoURL || '',
        estado: 'activo',
        fechaInicio: Timestamp.now(),
        historialPagos: [],
        grupoFamiliar: [],
      };

      const socioId = await createSocio(nuevoSocio);
      toast.success(`Socio ${data.nombre} ${data.apellido} creado con éxito con ID: ${socioId}`);
      router.push('/admin/socios');
    } catch (error) {
      console.error('Error al crear el socio:', error);
      toast.error('Hubo un error al crear el socio. Por favor, intenta de nuevo.');
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Información del Socio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <Avatar className="h-32 w-32">
                <AvatarImage src={fotoTitularPreview} alt="Foto de perfil" />
                <AvatarFallback>
                  {form.watch('nombre')?.[0]}
                  {form.watch('apellido')?.[0]}
                </AvatarFallback>
              </Avatar>
              <FormField
                control={form.control}
                name="fotoPerfil"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Foto de Perfil</FormLabel>
                    <FormControl>
                      <FileInput
                        placeholder="Seleccionar foto"
                        onValueChange={field.onChange}
                        value={field.value as File | string | null | undefined}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}\n              />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Juan" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="apellido"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apellido</FormLabel>
                    <FormControl>
                      <Input placeholder="Pérez" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="dni"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>DNI</FormLabel>
                  <FormControl>
                    <Input placeholder="12345678" {...field} />
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
                    <Input placeholder="juan.perez@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="telefono"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input placeholder="2611234567" {...field} />
                  </FormControl>
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
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Creando...' : 'Crear Socio'}
        </Button>
      </form>
    </Form>
  );
}

// src/components/admin/AdminEditarSocioForm.tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
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
import { toast } from 'sonner';
import { Timestamp } from 'firebase/firestore';
import { updateSocio } from '@/lib/firebase/firestoreService';
import { uploadFile } from '@/lib/firebase/storageService';
import { Socio } from '@/types';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FileInput } from '../ui/file-input';
import { useMemo } from 'react';

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 4; // In MB

const sizeInMB = (sizeInBytes: number, decimalsNum = 2) => {
  const result = sizeInBytes / (1024 * 1024);
  return +result.toFixed(decimalsNum);
};

const editarSocioFormSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  apellido: z.string().min(1, 'El apellido es requerido'),
  dni: z.string().min(7, 'El DNI debe tener al menos 7 caracteres'),
  email: z.string().email('Email inválido'),
  telefono: z.string().optional(),
  fechaNacimiento: z.string().min(1, 'La fecha de nacimiento es requerida'),
  fotoPerfil: z
    .custom<File | null | undefined | string>()
    .refine(
      (file) => !file || (file instanceof File && sizeInMB(file.size) <= MAX_IMAGE_SIZE),
      `El tamaño máximo de la imagen es de ${MAX_IMAGE_SIZE}MB.`
    )
    .refine(
      (file) => !file || (file instanceof File && ACCEPTED_IMAGE_TYPES.includes(file.type)),
      'Solo se aceptan los formatos .jpg, .jpeg, .png y .webp.'
    )
    .optional(),
});

type EditarSocioFormValues = z.infer<typeof editarSocioFormSchema>;

interface AdminEditarSocioFormProps {
  socio: Socio;
}

export function AdminEditarSocioForm({ socio }: AdminEditarSocioFormProps) {
  const router = useRouter();
  const defaultValues: Partial<EditarSocioFormValues> = {
    nombre: socio?.nombre || '',
    apellido: socio?.apellido || '',
    dni: socio?.dni || '',
    email: socio?.email || '',
    telefono: socio?.telefono || '',
    fechaNacimiento: socio?.fechaNacimiento instanceof Timestamp
        ? socio.fechaNacimiento.toDate().toISOString().split('T')[0]
        : '',
    fotoPerfil: socio?.fotoURL || undefined,
  };

  const form = useForm<EditarSocioFormValues>({
    resolver: zodResolver(editarSocioFormSchema),
    defaultValues,
    mode: 'onChange',
  });

  const fotoPerfil = form.watch('fotoPerfil');

  const fotoTitularPreview = useMemo(() => {
    if (fotoPerfil instanceof File) {
      return URL.createObjectURL(fotoPerfil);
    }
    if (typeof fotoPerfil === 'string') {
      return fotoPerfil;
    }
    return socio?.fotoURL || 'https://placehold.co/128x128.png?text=NS';
  }, [fotoPerfil, socio?.fotoURL]);

  async function onSubmit(data: EditarSocioFormValues) {
    try {
      toast.info('Actualizando socio...');
      let fotoURL: string | undefined = socio.fotoURL;

      if (data.fotoPerfil instanceof File) {
        const filePath = `socios/${Date.now()}_${data.fotoPerfil.name}`;
        fotoURL = await uploadFile(data.fotoPerfil, filePath);
      }

      const fechaNacimientoDate = new Date(data.fechaNacimiento);
      const fechaNacimientoTimestamp = Timestamp.fromDate(fechaNacimientoDate);

      const socioActualizado: Partial<Socio> = {
        nombre: data.nombre,
        apellido: data.apellido,
        dni: data.dni,
        email: data.email,
        telefono: data.telefono || '',
        fechaNacimiento: fechaNacimientoTimestamp,
        fotoURL: fotoURL,
      };

      await updateSocio(socio.id, socioActualizado);
      toast.success(`Socio ${data.nombre} ${data.apellido} actualizado con éxito.`);
      router.push('/admin/socios');
    } catch (error) {
      console.error('Error al actualizar el socio:', error);
      toast.error('Hubo un error al actualizar el socio. Por favor, intenta de nuevo.');
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Editar Información del Socio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <Avatar className="h-32 w-32">
                <AvatarImage src={fotoTitularPreview} alt="Foto de perfil" />
                <AvatarFallback>
                  {form.watch('nombre')?.[0]}
                  {form.watch('apellido')?.[0]}
                </AvatarFallback>
              </Avatar>
              <FormField
                control={form.control}
                name="fotoPerfil"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cambiar Foto de Perfil</FormLabel>
                    <FormControl>
                      <FileInput
                        placeholder="Seleccionar nueva foto"
                        onValueChange={field.onChange}
                        value={field.value as File | string | null | undefined}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="apellido"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apellido</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="dni"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>DNI</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="telefono"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
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
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </form>
    </Form>
  );
}

// src/components/auth/SignupForm.tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
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
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Timestamp } from 'firebase/firestore';
import { uploadFile } from '@/lib/firebase/storageService';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { FileInput } from '../ui/file-input';
import { useMemo } from 'react';

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 4; // In MB

const sizeInMB = (sizeInBytes: number, decimalsNum = 2) => {
  const result = sizeInBytes / (1024 * 1024);
  return +result.toFixed(decimalsNum);
};

const formSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  apellido: z.string().min(1, 'El apellido es requerido'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  dni: z.string().min(7, 'El DNI debe tener al menos 7 caracteres'),
  fechaNacimiento: z.string().min(1, 'La fecha de nacimiento es requerida'),
  fotoPerfil: z
    .custom<File | null | undefined>()
    .refine(
      (file) => !file || (file instanceof File && sizeInMB(file.size) <= MAX_IMAGE_SIZE),
      `El tamaño máximo de la imagen es de ${MAX_IMAGE_SIZE}MB.`
    )
    .refine(
      (file) => !file || (file instanceof File && ACCEPTED_IMAGE_TYPES.includes(file.type)),
      'Solo se aceptan los formatos .jpg, .jpeg, .png y .webp.'
    )
    .optional(),
});

type SignupFormValues = z.infer<typeof formSchema>;

const defaultValues: Partial<SignupFormValues> = {
  nombre: '',
  apellido: '',
  email: '',
  password: '',
  dni: '',
  fechaNacimiento: '',
  fotoPerfil: undefined,
};

export function SignupForm() {
  const { signUp } = useAuth();
  const form = useForm<SignupFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: 'onChange',
  });

  const fotoPerfil = form.watch('fotoPerfil');

  const fotoPreview = useMemo(() => {
    if (fotoPerfil instanceof File) {
      return URL.createObjectURL(fotoPerfil);
    }
    return 'https://placehold.co/128x128.png?text=NS';
  }, [fotoPerfil]);

  async function onSubmit(data: SignupFormValues) {
    try {
      toast.info('Creando cuenta...');
      let fotoURL: string | undefined = undefined;
      if (data.fotoPerfil) {
        const filePath = `socios/${Date.now()}_${data.fotoPerfil.name}`;
        fotoURL = await uploadFile(data.fotoPerfil, filePath);
      }

      const fechaNacimientoDate = new Date(data.fechaNacimiento);
      const fechaNacimientoTimestamp = Timestamp.fromDate(fechaNacimientoDate);

      await signUp(
        data.email,
        data.password,
        data.nombre,
        data.apellido,
        data.dni,
        fechaNacimientoTimestamp,
        fotoURL
      );
      toast.success('¡Cuenta creada con éxito! Redirigiendo...');
    } catch (error: any) {
      console.error('Error en el registro:', error);
      toast.error(error.message || 'Error al crear la cuenta. Intente de nuevo.');
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex flex-col items-center space-y-4">
            <Avatar className="h-32 w-32">
                <AvatarImage src={fotoPreview} alt="Foto de perfil" />
                <AvatarFallback>
                {form.watch('nombre')?.[0]}
                {form.watch('apellido')?.[0]}
                </AvatarFallback>
            </Avatar>
            <FormField
                control={form.control}
                name="fotoPerfil"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Foto de Perfil</FormLabel>
                    <FormControl>
                    <FileInput
                        placeholder="Seleccionar foto"
                        onValueChange={field.onChange}
                        value={field.value}
                    />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                    <Input placeholder="Juan" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="apellido"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Apellido</FormLabel>
                    <FormControl>
                    <Input placeholder="Pérez" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
        </div>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="tu@email.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contraseña</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
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
              <FormLabel>DNI</FormLabel>
              <FormControl>
                <Input placeholder="12345678" {...field} />
              </FormControl>
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
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Registrando...' : 'Registrarse'}
        </Button>
      </form>
    </Form>
  );
}

// src/components/perfil/AltaSocioMultiStepForm.tsx
'use client';

import { useState, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FileInput } from '../ui/file-input';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { uploadFile } from '@/lib/firebase/storageService';
import { updateSocio, createSocio } from '@/lib/firebase/firestoreService';
import { Timestamp } from 'firebase/firestore';
import { Socio } from '@/types';
import { useRouter } from 'next/navigation';

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 4; // In MB

const sizeInMB = (sizeInBytes: number, decimalsNum = 2) => {
  const result = sizeInBytes / (1024 * 1024);
  return +result.toFixed(decimalsNum);
};

const familiarSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  apellido: z.string().min(1, 'El apellido es requerido'),
  dni: z.string().min(7, 'El DNI debe tener al menos 7 caracteres'),
  fechaNacimiento: z.string().min(1, 'La fecha de nacimiento es requerida'),
  fotoPerfil: z
    .custom<File | null | undefined | string>()
    .refine(
      (file) => !file || (file instanceof File && sizeInMB(file.size) <= MAX_IMAGE_SIZE),
      `El tamaño máximo de la imagen es de ${MAX_IMAGE_SIZE}MB.`
    )
    .refine(
      (file) => !file || (file instanceof File && ACCEPTED_IMAGE_TYPES.includes(file.type)),
      'Solo se aceptan los formatos .jpg, .jpeg, .png y .webp.'
    )
    .optional(),
});

const altaSocioSchema = z.object({
  titular: z.object({
    nombre: z.string().min(1, 'El nombre es requerido'),
    apellido: z.string().min(1, 'El apellido es requerido'),
    dni: z.string().min(7, 'El DNI debe tener al menos 7 caracteres'),
    fechaNacimiento: z.string().min(1, 'La fecha de nacimiento es requerida'),
    fotoPerfil: z
      .custom<File | null | undefined | string>()
      .refine(
        (file) => !file || (file instanceof File && sizeInMB(file.size) <= MAX_IMAGE_SIZE),
        `El tamaño máximo de la imagen es de ${MAX_IMAGE_SIZE}MB.`
      )
      .refine(
        (file) => !file || (file instanceof File && ACCEPTED_IMAGE_TYPES.includes(file.type)),
        'Solo se aceptan los formatos .jpg, .jpeg, .png y .webp.'
      )
      .optional(),
  }),
  familiares: z.array(familiarSchema).optional(),
});

type AltaSocioFormValues = z.infer<typeof altaSocioSchema>;

export function AltaSocioMultiStepForm() {
  const { user, socio, loading } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);

  const defaultValues: AltaSocioFormValues = {
    titular: {
      nombre: socio?.nombre || '',
      apellido: socio?.apellido || '',
      dni: socio?.dni || '',
      fechaNacimiento: 
        socio?.fechaNacimiento instanceof Timestamp
          ? socio.fechaNacimiento.toDate().toISOString().split('T')[0]
          : '',
      fotoPerfil: socio?.fotoURL || undefined,
    },
    familiares: [],
  };

  const form = useForm<AltaSocioFormValues>({
    resolver: zodResolver(altaSocioSchema),
    defaultValues,
    mode: 'onChange',
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'familiares',
  });

  const fotoTitular = form.watch('titular.fotoPerfil');

  const fotoTitularPreview = useMemo(() => {
    if (fotoTitular instanceof File) {
      return URL.createObjectURL(fotoTitular);
    }
    if (typeof fotoTitular === 'string') {
      return fotoTitular;
    }
    return socio?.fotoURL || 'https://placehold.co/128x128.png?text=NS';
  }, [fotoTitular, socio?.fotoURL]);

  const familiaresFotos = form.watch('familiares');

  const familiaresPreview = useMemo(() => {
    return familiaresFotos?.map(familiar => {
        if (familiar.fotoPerfil instanceof File) {
            return URL.createObjectURL(familiar.fotoPerfil);
        }
        if (typeof familiar.fotoPerfil === 'string') {
            return familiar.fotoPerfil;
        }
        return 'https://placehold.co/128x128.png?text=NS';
    }) || [];
  }, [familiaresFotos]);


  async function onSubmit(data: AltaSocioFormValues) {
    if (!user || !socio) {
      toast.error('No estás autenticado. Por favor, inicia sesión.');
      return;
    }

    try {
      toast.info('Procesando alta de socio...');
      let titularFotoURL = socio.fotoURL;

      // Subir foto del titular si se cambió
      if (data.titular.fotoPerfil instanceof File) {
        const filePath = `socios/${user.uid}/titular_${Date.now()}`;
        titularFotoURL = await uploadFile(data.titular.fotoPerfil, filePath);
      }

      // Actualizar datos del socio titular
      const titularData: Partial<Socio> = {
        nombre: data.titular.nombre,
        apellido: data.titular.apellido,
        dni: data.titular.dni,
        fechaNacimiento: Timestamp.fromDate(new Date(data.titular.fechaNacimiento)),
        fotoURL: titularFotoURL,
        estado: 'activo', // O el estado que corresponda
      };
      await updateSocio(socio.id, titularData);

      // Procesar familiares
      const familiaresIds: string[] = [];
      if (data.familiares) {
        for (const familiarData of data.familiares) {
          let familiarFotoURL: string | undefined = undefined;
          if (familiarData.fotoPerfil instanceof File) {
            const filePath = `socios/${user.uid}/familiar_${Date.now()}`;
            familiarFotoURL = await uploadFile(familiarData.fotoPerfil, filePath);
          }

          const nuevoFamiliar: Omit<Socio, 'id'> = {
            nombre: familiarData.nombre,
            apellido: familiarData.apellido,
            dni: familiarData.dni,
            email: '', // Familiares no tienen email de login
            telefono: '',
            fechaNacimiento: Timestamp.fromDate(new Date(familiarData.fechaNacimiento)),
            fotoURL: familiarFotoURL || '',
            estado: 'activo',
            fechaInicio: Timestamp.now(),
            historialPagos: [],
            grupoFamiliar: [], // Se podría vincular al titular
          };
          const familiarId = await createSocio(nuevoFamiliar);
          familiaresIds.push(familiarId);
        }
      }
      
      // Actualizar el grupo familiar del titular
      if (familiaresIds.length > 0) {
          await updateSocio(socio.id, { grupoFamiliar: familiaresIds });
      }

      toast.success('¡Alta de socio completada con éxito!');
      router.push('/perfil');
    } catch (error) {
      console.error('Error en el alta de socio:', error);
      toast.error('Hubo un error al procesar el alta. Por favor, intenta de nuevo.');
    }
  }

  if (loading) return <p>Cargando...</p>;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Paso 1: Datos del Titular</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <Avatar className="h-32 w-32">
                  <AvatarImage src={fotoTitularPreview} alt="Foto de perfil del titular" />
                  <AvatarFallback>
                    {form.watch('titular.nombre')?.[0]}
                    {form.watch('titular.apellido')?.[0]}
                  </AvatarFallback>
                </Avatar>
                <FormField
                  control={form.control}
                  name="titular.fotoPerfil"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Foto de Perfil</FormLabel>
                      <FormControl>
                        <FileInput
                          placeholder="Cambiar foto"
                          onValueChange={field.onChange}
                          value={field.value as File | string | null | undefined}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="titular.nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="titular.apellido"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apellido</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="titular.dni"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>DNI</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="titular.fechaNacimiento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Nacimiento</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button onClick={() => setStep(2)}>Siguiente</Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Paso 2: Grupo Familiar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="rounded-lg border p-4 space-y-4 relative">
                    <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => remove(index)}
                        className="absolute top-2 right-2"
                    >
                        X
                    </Button>
                  <div className="flex items-center space-x-4">
                     <Avatar className="h-24 w-24">
                        <AvatarImage src={familiaresPreview[index]} alt={`Foto de ${form.watch(`familiares.${index}.nombre`)}`} />
                        <AvatarFallback>
                            {form.watch(`familiares.${index}.nombre`)?.[0]}
                            {form.watch(`familiares.${index}.apellido`)?.[0]}
                        </AvatarFallback>
                    </Avatar>
                    <FormField
                      control={form.control}
                      name={`familiares.${index}.fotoPerfil`}
                      render={({ field: fieldFile }) => (
                        <FormItem>
                          <FormLabel>Foto de Perfil</FormLabel>
                          <FormControl>
                            <FileInput 
                                placeholder="Seleccionar foto"
                                onValueChange={fieldFile.onChange}
                                value={fieldFile.value as File | string | null | undefined}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name={`familiares.${index}.nombre`}
                    render={({ field }) => <Input placeholder="Nombre" {...field} />}
                  />
                  <FormField
                    control={form.control}
                    name={`familiares.${index}.apellido`}
                    render={({ field }) => <Input placeholder="Apellido" {...field} />}
                  />
                  <FormField
                    control={form.control}
                    name={`familiares.${index}.dni`}
                    render={({ field }) => <Input placeholder="DNI" {...field} />}
                  />
                  <FormField
                    control={form.control}
                    name={`familiares.${index}.fechaNacimiento`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Fecha de Nacimiento</FormLabel>
                            <FormControl>
                                <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                  />
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  append({
                    nombre: '',
                    apellido: '',
                    dni: '',
                    fechaNacimiento: '',
                    fotoPerfil: undefined,
                  })
                }
              >
                Agregar Familiar
              </Button>
              <div className="flex justify-between">
                <Button type="button" variant="secondary" onClick={() => setStep(1)}>
                  Anterior
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Procesando...' : 'Finalizar Alta'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </form>
    </Form>
  );
}