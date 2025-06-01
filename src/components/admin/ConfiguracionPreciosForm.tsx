
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { PreciosInvitadosConfig, PreciosInvitadosFormData } from '@/types';
import { preciosInvitadosConfigSchema } from '@/types';
import { getPreciosInvitados, updatePreciosInvitados } from '@/lib/firebase/firestoreService';
import { DollarSign, Save } from 'lucide-react';

export function ConfiguracionPreciosForm() {
  const { toast } = useToast();
  const form = useForm<PreciosInvitadosFormData>({
    resolver: zodResolver(preciosInvitadosConfigSchema),
    defaultValues: {
      precioInvitadoDiario: 0,
      precioInvitadoCumpleanos: 0,
    },
  });

  useEffect(() => {
    const fetchPrecios = async () => {
      const precios = await getPreciosInvitados();
      form.reset(precios);
    };
    fetchPrecios();
  }, [form]);

  const onSubmit = async (data: PreciosInvitadosFormData) => {
    try {
      await updatePreciosInvitados(data);
      toast({
        title: 'Precios Actualizados',
        description: 'La configuración de precios para invitados ha sido guardada.',
      });
    } catch (error) {
      toast({
        title: 'Error al Guardar',
        description: 'No se pudo actualizar la configuración de precios.',
        variant: 'destructive',
      });
      console.error("Error updating precios:", error);
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center">
          <DollarSign className="mr-3 h-7 w-7 text-primary" />
          Configuración de Precios para Invitados
        </CardTitle>
        <CardDescription>
          Establece aquí los montos que se cobrarán por las entradas de los invitados.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="precioInvitadoDiario"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio Entrada Invitado Diario</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        type="number" 
                        placeholder="0.00" 
                        {...field} 
                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                        className="pl-10"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="precioInvitadoCumpleanos"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio Entrada Invitado de Cumpleaños</FormLabel>
                  <FormControl>
                     <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        type="number" 
                        placeholder="0.00" 
                        {...field} 
                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                        className="pl-10"
                       />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardContent className="flex justify-end pt-6">
             <Button type="submit" disabled={form.formState.isSubmitting}>
              <Save className="mr-2 h-4 w-4" />
              {form.formState.isSubmitting ? 'Guardando...' : 'Guardar Precios'}
            </Button>
          </CardContent>
        </form>
      </Form>
    </Card>
  );
}
