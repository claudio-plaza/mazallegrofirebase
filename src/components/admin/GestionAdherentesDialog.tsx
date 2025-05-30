
'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Socio, Adherente, AdherenteData, EstadoAdherente } from '@/types';
import { adherenteSchema } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { updateSocio } from '@/lib/firebase/firestoreService';
import { generateId } from '@/lib/helpers';
import { PlusCircle, Trash2, UserPlus, Users, Edit, XCircle, CheckCircle2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Card } from '@/components/ui/card';

interface GestionAdherentesDialogProps {
  socio: Socio | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdherentesUpdated: () => void; // Callback to refresh socio list
}

const addAdherenteFormSchema = z.object({
  nombre: z.string().min(2, "Nombre es requerido."),
  apellido: z.string().min(2, "Apellido es requerido."),
  dni: z.string().regex(/^\d{7,8}$/, "DNI debe tener 7 u 8 dígitos numéricos."),
});
type AddAdherenteFormValues = z.infer<typeof addAdherenteFormSchema>;

export function GestionAdherentesDialog({ socio, open, onOpenChange, onAdherentesUpdated }: GestionAdherentesDialogProps) {
  const { toast } = useToast();
  const [currentAdherentes, setCurrentAdherentes] = useState<Adherente[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  const form = useForm<AddAdherenteFormValues>({
    resolver: zodResolver(addAdherenteFormSchema),
    defaultValues: {
      nombre: '',
      apellido: '',
      dni: '',
    },
  });

  useEffect(() => {
    if (socio) {
      setCurrentAdherentes(socio.adherentes || []);
    } else {
      setCurrentAdherentes([]);
    }
    form.reset(); // Reset form when dialog opens or socio changes
    setIsAdding(false);
  }, [socio, open, form]);

  if (!socio) return null;

  const handleAddAdherente = async (data: AddAdherenteFormValues) => {
    const nuevoAdherente: Adherente = {
      id: generateId(),
      ...data,
      estadoAdherente: 'Activo', // New adherentes are active by default
    };

    const updatedAdherentes = [...currentAdherentes, nuevoAdherente];
    try {
      await updateSocio({ ...socio, adherentes: updatedAdherentes });
      setCurrentAdherentes(updatedAdherentes);
      toast({ title: "Adherente Agregado", description: `${data.nombre} ${data.apellido} ha sido agregado.` });
      onAdherentesUpdated();
      form.reset();
      setIsAdding(false);
    } catch (error) {
      toast({ title: "Error", description: "No se pudo agregar el adherente.", variant: "destructive" });
    }
  };

  const handleToggleEstadoAdherente = async (adherenteId: string) => {
    const adherente = currentAdherentes.find(a => a.id === adherenteId);
    if (!adherente) return;

    const nuevoEstado: EstadoAdherente = adherente.estadoAdherente === 'Activo' ? 'Inactivo' : 'Activo';
    const updatedAdherentes = currentAdherentes.map(a =>
      a.id === adherenteId ? { ...a, estadoAdherente: nuevoEstado } : a
    );

    try {
      await updateSocio({ ...socio, adherentes: updatedAdherentes });
      setCurrentAdherentes(updatedAdherentes);
      toast({ title: "Estado Actualizado", description: `El adherente ${adherente.nombre} ahora está ${nuevoEstado.toLowerCase()}.` });
      onAdherentesUpdated();
    } catch (error) {
      toast({ title: "Error", description: "No se pudo actualizar el estado del adherente.", variant: "destructive" });
    }
  };

  const handleRemoveAdherente = async (adherenteId: string) => {
    const adherente = currentAdherentes.find(a => a.id === adherenteId);
    if (!adherente) return;
    
    const updatedAdherentes = currentAdherentes.filter(a => a.id !== adherenteId);
    try {
      await updateSocio({ ...socio, adherentes: updatedAdherentes });
      setCurrentAdherentes(updatedAdherentes);
      toast({ title: "Adherente Eliminado", description: `${adherente.nombre} ${adherente.apellido} ha sido eliminado.` });
      onAdherentesUpdated();
    } catch (error) {
      toast({ title: "Error", description: "No se pudo eliminar el adherente.", variant: "destructive" });
    }
  };


  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        form.reset();
        setIsAdding(false);
      }
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center">
            <Users className="mr-2 h-6 w-6 text-primary" />
            Gestionar Adherentes de {socio.nombre} {socio.apellido}
          </DialogTitle>
          <DialogDescription>
            {socio.estadoSocio !== 'Activo' 
              ? "El socio titular no está activo. Active al socio para poder gestionar adherentes."
              : "Agregue, elimine o cambie el estado de los adherentes."
            }
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(80vh-200px)] p-1 -mx-1">
          <div className="p-4 space-y-4">
            {currentAdherentes.length === 0 && !isAdding && (
              <p className="text-sm text-muted-foreground text-center py-4">Este socio no tiene adherentes registrados.</p>
            )}

            {currentAdherentes.map(adherente => (
              <Card key={adherente.id} className="p-3 bg-card shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <p className="font-semibold text-foreground">{adherente.nombre} {adherente.apellido}</p>
                    <p className="text-xs text-muted-foreground">DNI: {adherente.dni}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-2 sm:mt-0">
                    <Badge variant={adherente.estadoAdherente === 'Activo' ? 'default' : 'secondary'}
                           className={adherente.estadoAdherente === 'Activo' ? 'bg-green-500 hover:bg-green-600' : 'bg-slate-500 hover:bg-slate-600'}>
                      {adherente.estadoAdherente}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleEstadoAdherente(adherente.id)}
                      disabled={socio.estadoSocio !== 'Activo'}
                    >
                      {adherente.estadoAdherente === 'Activo' ? <XCircle className="mr-1 h-4 w-4" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
                      {adherente.estadoAdherente === 'Activo' ? 'Desactivar' : 'Activar'}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" disabled={socio.estadoSocio !== 'Activo'}><Trash2 className="mr-1 h-4 w-4" /> Eliminar</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción eliminará permanentemente al adherente {adherente.nombre} {adherente.apellido}.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleRemoveAdherente(adherente.id)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </Card>
            ))}

            {isAdding && (
              <Card className="p-4 mt-4 border-primary">
                <h4 className="text-md font-semibold mb-3">Nuevo Adherente</h4>
                <FormProvider {...form}>
                  <form onSubmit={form.handleSubmit(handleAddAdherente)} className="space-y-3">
                    <FormField
                      control={form.control}
                      name="nombre"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Nombre</FormLabel>
                          <FormControl><Input {...field} placeholder="Nombre del adherente" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="apellido"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Apellido</FormLabel>
                          <FormControl><Input {...field} placeholder="Apellido del adherente" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="dni"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">DNI</FormLabel>
                          <FormControl><Input type="number" {...field} placeholder="DNI (sin puntos)" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end gap-2 pt-2">
                      <Button type="button" variant="ghost" onClick={() => { setIsAdding(false); form.reset(); }}>Cancelar</Button>
                      <Button type="submit" disabled={form.formState.isSubmitting}>Agregar Adherente</Button>
                    </div>
                  </form>
                </FormProvider>
              </Card>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4 pr-4">
          {!isAdding && (
            <Button 
              type="button" 
              variant="default" 
              onClick={() => setIsAdding(true)}
              disabled={socio.estadoSocio !== 'Activo'}
            >
              <UserPlus className="mr-2 h-4 w-4" /> Añadir Nuevo Adherente
            </Button>
          )}
          <DialogClose asChild>
            <Button type="button" variant="outline">Cerrar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
