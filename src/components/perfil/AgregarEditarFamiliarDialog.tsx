'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { MiembroFamiliar, RelacionFamiliar, familiarBaseSchema } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useQueryClient } from '@tanstack/react-query';
import { generateId } from '@/lib/helpers';
import { format, parseISO } from 'date-fns';
import FileInput from '@/components/ui/file-input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { X, AlertTriangle } from 'lucide-react';

const familiarDialogSchema = familiarBaseSchema.extend({
  fotoPerfil: z.any().refine(val => val, { message: "Se requiere foto de perfil." }),
  fotoDniFrente: z.any().refine(val => val, { message: "Se requiere foto del DNI (frente)." }),
  fotoDniDorso: z.any().refine(val => val, { message: "Se requiere foto del DNI (dorso)." }),
  fotoCarnet: z.any().optional(),
});
type FamiliarFormData = z.infer<typeof familiarDialogSchema>;

interface Props {
  familiarToEdit?: MiembroFamiliar | null;
  onClose: () => void;
  socioId: string;
  familiaresActuales: MiembroFamiliar[];
}

export function AgregarEditarFamiliarDialog({ familiarToEdit, onClose, socioId, familiaresActuales }: Props) {
  const { toast } = useToast();
  const { user, refreshSocio } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!familiarToEdit;
  const [familiares, setFamiliares] = useState<FamiliarFormData[]>([]);

  const form = useForm<FamiliarFormData>({ resolver: zodResolver(familiarDialogSchema) });

  const yaExisteConyuge = useMemo(() => {
    if (isEditMode && familiarToEdit?.relacion === RelacionFamiliar.CONYUGE) return false; // Allow editing existing spouse
    const enGrupoActual = familiaresActuales.some(f => f.relacion === RelacionFamiliar.CONYUGE);
    const enNuevos = familiares.some(f => f.relacion === RelacionFamiliar.CONYUGE);
    return enGrupoActual || enNuevos;
  }, [familiaresActuales, familiares, isEditMode, familiarToEdit]);

  useEffect(() => {
    if (isEditMode && familiarToEdit) {
        form.reset({ ...familiarToEdit, fechaNacimiento: new Date(familiarToEdit.fechaNacimiento) });
    } else {
        form.reset({ nombre: '', apellido: '', dni: '', fechaNacimiento: new Date(), relacion: '' as RelacionFamiliar, telefono: '', direccion: '', email: '', fotoPerfil: null, fotoDniFrente: null, fotoDniDorso: null, fotoCarnet: null });
    }
  }, [isEditMode, familiarToEdit, form]);

  const handleAddAnother = async () => {
    const result = await form.trigger();
    if (!result) {
      toast({ title: "Datos incompletos", description: "Complete los campos requeridos antes de agregar otro.", variant: "destructive" });
      return;
    }
    const currentData = form.getValues();
    if (currentData.relacion === RelacionFamiliar.CONYUGE && yaExisteConyuge) {
        toast({ title: "Error de Validación", description: "Ya existe un cónyuge en el grupo familiar. Solo se permite uno.", variant: "destructive" });
        return;
    }
    setFamiliares(prev => [...prev, { ...currentData, id: generateId() }]);
    form.reset({ nombre: '', apellido: '', dni: '', fechaNacimiento: new Date(), relacion: '' as RelacionFamiliar, telefono: '', direccion: '', email: '', fotoPerfil: null, fotoDniFrente: null, fotoDniDorso: null, fotoCarnet: null });
  };

  const handleRemoveFamiliar = (id: string) => {
    setFamiliares(prev => prev.filter(f => f.id !== id));
  };

  const onSubmit = async (data: FamiliarFormData) => {
    if (!user) {
      toast({ title: "Error", description: "Debes estar autenticado.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    try {
      // Combine the currently filled form data with the list of already added familiares
      const allNewFamiliaresData: FamiliarFormData[] = [...familiares];
      const isCurrentFormEmpty = !data.nombre && !data.apellido && !data.dni;

      if (!isEditMode && !isCurrentFormEmpty) {
        const result = await form.trigger();
        if (result) {
          allNewFamiliaresData.push({ ...data, id: generateId() });
        } else {
          toast({ title: "Datos incompletos", description: "El último familiar en el formulario tiene datos incompletos. O complételos o envíe la solicitud sin rellenar el último.", variant: "destructive" });
          setIsSubmitting(false);
          return;
        }
      }
      
      if (!isEditMode && allNewFamiliaresData.length === 0) {
        toast({ title: "No hay familiares", description: "Agregue al menos un familiar para enviar la solicitud.", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }

      const uploadFoto = async (file: File | string | null | undefined, familiarId: string, tipo: string): Promise<string | null> => {
        if (file instanceof File) {
          const { uploadFile } = await import('@/lib/firebase/storageService');
          const path = `solicitudes-temp/${socioId}/${familiarId}_${tipo}.jpg`;
          return await uploadFile(file, path);
        }
        return typeof file === 'string' ? file : null;
      };

      let familiaresParaEnviar: MiembroFamiliar[];

      if (isEditMode) {
        // EDIT MODE: Process only the single familiar being edited
        const familiarId = familiarToEdit?.id || generateId();
        const [fotoPerfilUrl, fotoDniFrenteUrl, fotoDniDorsoUrl, fotoCarnetUrl] = await Promise.all([
          uploadFoto(data.fotoPerfil, familiarId, 'perfil'),
          uploadFoto(data.fotoDniFrente, familiarId, 'dniFrente'),
          uploadFoto(data.fotoDniDorso, familiarId, 'dniDorso'),
          uploadFoto(data.fotoCarnet, familiarId, 'carnet'),
        ]);
        const familiarEditado: MiembroFamiliar = {
          id: familiarId,
          nombre: data.nombre,
          apellido: data.apellido,
          dni: data.dni,
          fechaNacimiento: data.fechaNacimiento,
          relacion: data.relacion,
          telefono: data.telefono || '',
          email: data.email || '',
          direccion: data.direccion || '',
          fotoPerfil: fotoPerfilUrl,
          fotoDniFrente: fotoDniFrenteUrl,
          fotoDniDorso: fotoDniDorsoUrl,
          fotoCarnet: fotoCarnetUrl,
        };
        familiaresParaEnviar = familiaresActuales.map(f => f.id === familiarEditado.id ? familiarEditado : f);
      } else {
        // ADD MODE: Process the list of new familiares
        const nuevosFamiliaresProcesados = await Promise.all(
          allNewFamiliaresData.map(async (famData) => {
            const familiarId = famData.id || generateId();
            const [fotoPerfilUrl, fotoDniFrenteUrl, fotoDniDorsoUrl, fotoCarnetUrl] = await Promise.all([
              uploadFoto(famData.fotoPerfil, familiarId, 'perfil'),
              uploadFoto(famData.fotoDniFrente, familiarId, 'dniFrente'),
              uploadFoto(famData.fotoDniDorso, familiarId, 'dniDorso'),
              uploadFoto(famData.fotoCarnet, familiarId, 'carnet'),
            ]);
            return {
              id: familiarId,
              nombre: famData.nombre,
              apellido: famData.apellido,
              dni: famData.dni,
              fechaNacimiento: famData.fechaNacimiento,
              relacion: famData.relacion,
              telefono: famData.telefono || '',
              email: famData.email || '',
              direccion: famData.direccion || '',
              fotoPerfil: fotoPerfilUrl,
              fotoDniFrente: fotoDniFrenteUrl,
              fotoDniDorso: fotoDniDorsoUrl,
              fotoCarnet: fotoCarnetUrl,
            };
          })
        );
        familiaresParaEnviar = [...familiaresActuales, ...nuevosFamiliaresProcesados];
      }

      const conyugesEnSolicitud = familiaresParaEnviar.filter(f => f.relacion === RelacionFamiliar.CONYUGE).length;
      if (conyugesEnSolicitud > 1) {
        toast({ title: "Error de Validación", description: "Solo se permite un cónyuge por grupo familiar.", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }

      console.log('📤 ENVIANDO A CLOUD FUNCTION:', {
        datos: {
          cambiosData: familiaresParaEnviar
        },
        estructura: JSON.stringify(familiaresParaEnviar[0], null, 2),
        cantidad: familiaresParaEnviar.length
      });

      const functions = getFunctions();
      const solicitarCambio = httpsCallable(functions, 'solicitarCambioGrupoFamiliar');
      
      await solicitarCambio({ cambiosData: familiaresParaEnviar });

      toast({ title: "Solicitud Enviada", description: "Los cambios en tus familiares han sido enviados para aprobación." });

      queryClient.invalidateQueries({ queryKey: ['socio', socioId] });
      await refreshSocio();
      onClose();
    } catch (error: any) {
      console.error("Error al enviar la solicitud:", error);
      toast({ title: "Error al enviar", description: error.message || "Ocurrió un error desconocido.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const showAddAnotherButton = useMemo(() => {
    if (isEditMode) return false;
    // Simple rule: allow adding up to 20 familiares in total for now.
    return familiares.length < 20;
  }, [isEditMode, familiares.length]);

  return (
    <Dialog open={true} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Editar Familiar' : 'Agregar Familiar'}</DialogTitle>
          <DialogDescription>{isEditMode ? 'Modifique los datos del familiar. La solicitud será revisada por administración.' : 'Agregue uno o más familiares. La solicitud se enviará con todos los miembros juntos.'}</DialogDescription>
        </DialogHeader>

        {!isEditMode && familiares.length > 0 && (
          <div className="mb-4 border-b pb-4">
            <h3 className="font-semibold mb-2 text-sm">Familiares en esta solicitud:</h3>
            <div className="flex flex-wrap gap-2">{familiares.map((fam) => (<Badge key={fam.id} variant="secondary" className="flex items-center gap-2"><span>{fam.nombre} {fam.apellido} ({fam.relacion})</span><button onClick={() => handleRemoveFamiliar(fam.id!)} className="rounded-full hover:bg-muted-foreground/20 p-0.5"><X className="h-3 w-3" /></button></Badge>))}</div>
          </div>
        )}
        
        <div className="overflow-y-auto pr-2 flex-grow">
            <FormProvider {...form}>
            <form id="familiar-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField name="nombre" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField name="apellido" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Apellido</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField name="dni" control={form.control} render={({ field }) => ( <FormItem><FormLabel>DNI</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField name="fechaNacimiento" control={form.control} render={({ field }) => (<FormItem><FormLabel>Fecha de Nacimiento</FormLabel><FormControl><Input type="date" value={field.value && !isNaN(new Date(field.value).getTime()) 
          ? format(new Date(field.value), 'yyyy-MM-dd') 
          : ''
        }  onChange={(e) => field.onChange(e.target.value ? parseISO(e.target.value) : null)} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField name="relacion" control={form.control} render={({ field }) => (
                        <FormItem>
                        <FormLabel>Relación</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={isEditMode}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar relación..." /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value={RelacionFamiliar.CONYUGE} disabled={yaExisteConyuge}>Cónyuge {yaExisteConyuge && '(Ya existe)'}</SelectItem>
                                <SelectItem value={RelacionFamiliar.HIJO_A}>Hijo/a</SelectItem>
                            </SelectContent>
                        </Select>
                        {yaExisteConyuge && (
                            <Alert variant="destructive" className="mt-2 bg-yellow-50 border-yellow-200 text-yellow-800"><AlertTriangle className="h-4 w-4" /><AlertDescription className="text-xs">Ya existe un cónyuge en este grupo familiar.</AlertDescription></Alert>
                        )}
                        <FormMessage />
                        </FormItem>
                    )} />
                    <FormField name="telefono" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Teléfono (Opcional)</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField name="direccion" control={form.control} render={({ field }) => ( <FormItem className="md:col-span-2"><FormLabel>Dirección (Opcional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField name="email" control={form.control} render={({ field }) => ( <FormItem className="md:col-span-2"><FormLabel>Email (Opcional)</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /> </FormItem> )} />
                </div>
                <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-sm font-semibold">Documentación Fotográfica</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField name="fotoPerfil" control={form.control} render={({ field: { onChange, value, ...rest } }) => ( <FormItem><FormLabel>Foto para tu perfil (De frente, mirando la camara. Rostro descubierto, sin lentes ni sombreros, tipo selfie)</FormLabel><FormControl><FileInput onValueChange={onChange} value={value as any} placeholder="Seleccionar foto" accept="image/png,image/jpeg" {...rest} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField name="fotoDniFrente" control={form.control} render={({ field: { onChange, value, ...rest } }) => ( <FormItem><FormLabel>DNI Frente</FormLabel><FormControl><FileInput onValueChange={onChange} value={value as any} placeholder="DNI frente" accept="image/png,image/jpeg,application/pdf" {...rest} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField name="fotoDniDorso" control={form.control} render={({ field: { onChange, value, ...rest } }) => ( <FormItem><FormLabel>DNI Dorso</FormLabel><FormControl><FileInput onValueChange={onChange} value={value as any} placeholder="DNI dorso" accept="image/png,image/jpeg,application/pdf" {...rest} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField name="fotoCarnet" control={form.control} render={({ field: { onChange, value, ...rest } }) => ( <FormItem><FormLabel>Foto carnet sindical si corresponde</FormLabel><FormControl><FileInput onValueChange={onChange} value={value as any} placeholder="Foto tipo carnet" accept="image/png,image/jpeg" {...rest} /></FormControl><FormMessage /></FormItem> )} />
                    </div>
                </div>
            </form>
            </FormProvider>
        </div>

        <DialogFooter className="pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          {!isEditMode && showAddAnotherButton && (
            <Button type="button" onClick={handleAddAnother}>+ Agregar Otro</Button>
          )}
          
          {isEditMode ? (
            <Button type="submit" form="familiar-form" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={isSubmitting}>
                  {isSubmitting ? 'Enviando...' : 'Enviar Solicitud'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Recuerda agregar a todos los integrantes de tu grupo familiar antes de enviar la solicitud, ya que sólo puedes enviar UNA solicitud hasta que sea aprobada o denegada por el administrador.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Agregar otro familiar</AlertDialogCancel>
                  <AlertDialogAction onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting}>
                    {isSubmitting ? 'Enviando...' : 'Enviar Solicitud'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
