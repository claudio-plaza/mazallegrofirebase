
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { loginUser } from '@/lib/auth'; 
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { LogIn } from 'lucide-react';
import { siteConfig } from '@/config/site';

const loginSchema = z.object({
  email: z.string().email('Email inválido.'),
  password: z.string().min(1, 'Contraseña es requerida.'), 
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const { toast } = useToast();
  const router = useRouter();
  const auth = useAuth(); 

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  function onSubmit(data: LoginFormValues) {
    const user = loginUser(data.email, data.password);

    if (user) {
      auth.login(user.role, user.name, user.numeroSocio); 
      toast({
        title: 'Inicio de Sesión Exitoso',
        description: `Bienvenido de nuevo, ${user.name}!`,
      });
      router.push('/dashboard');
    } else {
      toast({
        title: 'Error de Inicio de Sesión',
        description: 'Email o contraseña incorrectos. Por favor, intente de nuevo.',
        variant: 'destructive',
      });
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center">
          <LogIn className="mr-2 h-6 w-6 text-primary" /> Iniciar Sesión
        </CardTitle>
        <CardDescription>
          Accede a tu cuenta de {siteConfig.name}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Ingresando...' : 'Ingresar'}
            </Button>
          </form>
        </Form>
        <p className="mt-6 text-center text-sm">
          ¿No tienes una cuenta?{' '}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Crear Cuenta
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
