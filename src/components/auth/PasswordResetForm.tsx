
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
import { sendPasswordReset } from '@/lib/auth';
import { MailQuestion } from 'lucide-react';

const passwordResetSchema = z.object({
  email: z.string().email('Email inválido.'),
});

type PasswordResetFormValues = z.infer<typeof passwordResetSchema>;

export function PasswordResetForm() {
  const { toast } = useToast();

  const form = useForm<PasswordResetFormValues>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: {
      email: '',
    },
  });

  async function onSubmit(data: PasswordResetFormValues) {
    const success = await sendPasswordReset(data.email);
    if (success) {
      toast({
        title: 'Correo Enviado',
        description: 'Si tu correo está registrado, recibirás un enlace para restablecer tu contraseña.',
      });
      form.reset();
    } 
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center">
          <MailQuestion className="mr-2 h-6 w-6 text-primary" /> Restablecer Contraseña
        </CardTitle>
        <CardDescription>
          Ingresa tu correo electrónico y te enviaremos un enlace para que puedas recuperarla.
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
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Enviando...' : 'Enviar Correo de Recuperación'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
