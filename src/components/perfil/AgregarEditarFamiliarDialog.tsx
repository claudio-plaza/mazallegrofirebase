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
import { compressImage } from '@/lib/imageUtils';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { X, AlertTriangle, Trash2 } from 'lucide-react';

const familiarDialogSchema = familiarBaseSchema.extend({
  fotoPerfil: z.any().refine(val => val, { message: "Se requiere foto de perfil." }),
  fotoDniFrente: z.any().refine(val => val, { message: "Se requiere foto del DNI (frente)." }),
  fotoDniDorso: z.any().refine(val => val, { message: "Se requiere foto del DNI (dorso)." }),
  fotoCarnet: z.any().optional(),
}).refine(data => {
  if (data.relacion === RelacionFamiliar.HIJO_A) {
    if (!data.fechaNacimiento) return true; // Dejar que el validador `required` se encargue.
    const hoy = new Date();
    const fechaNacimiento = new Date(data.fechaNacimiento);
    // Para ser válido, el cumpleaños número 22 no debe haber ocurrido aún.
    // Calculamos la fecha límite: hoy hace 22 años.
    const fechaLimite = new Date(hoy.getFullYear() - 22, hoy.getMonth(), hoy.getDate());
    // La fecha de nacimiento debe ser posterior a esta fecha límite.
    return fechaNacimiento > fechaLimite;
  }
  return true;
}, {
  message: "Los hijos no pueden ser mayores de 21 años.",
  path: ["fechaNacimiento"], 
});
type FamiliarFormData = z.infer<typeof familiarDialogSchema>;

interface Props {
  familiarToEdit?: MiembroFamiliar | null;
  onClose: () => void;
  socioId: string;
  familiaresActuales: MiembroFamiliar[];
  onSaveDraft?: (familiar: MiembroFamiliar) => void;
}

export function AgregarEditarFamiliarDialog({ familiarToEdit, onClose, socioId, familiaresActuales, onSaveDraft }: Props) {
  const { toast } = useToast();
  const { user, refreshSocio } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const isEditMode = !!familiarToEdit;
  const [familiares, setFamiliares] = useState<FamiliarFormData[]>([]);
  const [mostrarFormularioNuevo, setMostrarFormularioNuevo] = useState(true);
  
  // Clave para localStorage basada en el socioId
  const STORAGE_KEY = `familiar_draft_${socioId}`;

  const form = useForm<FamiliarFormData>({ resolver: zodResolver(familiarDialogSchema) });
  const [formKey, setFormKey] = useState(0); // Para forzar reset de inputs

  // Cargar datos al montar (edición o draft)
  useEffect(() => {
    if (familiarToEdit) {
      // Modo edición: cargar datos del familiar
      form.reset({
        ...familiarToEdit,
        fechaNacimiento: familiarToEdit.fechaNacimiento ? parseISO(familiarToEdit.fechaNacimiento as any) : new Date(),
        // Las fotos ya vienen como URLs, el input file no las muestra pero el usuario puede subir nuevas
        fotoPerfil: null,
        fotoDniFrente: null,
        fotoDniDorso: null,
        fotoCarnet: null,
      });
    } else {
       // Modo agregar: intentar recuperar draft del localStorage
       const savedData = localStorage.getItem(STORAGE_KEY);
       if (savedData) {
         try {
           const parsed = JSON.parse(savedData);
           setFamiliares(parsed); // Recuperar lista de familiares
           toast({ title: "Borrador recuperado", description: "Se han restaurado los familiares que tenías pendientes." });
         } catch (e) {
           console.error("Error parsing draft", e);
         }
       }
    }
  }, [familiarToEdit, form, STORAGE_KEY, toast]);

  // Guardar en localStorage cuando cambia la lista de familiares (solo modo agregar)
  useEffect(() => {
    if (!isEditMode && familiares.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(familiares));
    } else if (!isEditMode && familiares.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [familiares, isEditMode, STORAGE_KEY]);

  // Validar si ya existe cónyuge (en existentes o en la lista nueva)
  const yaExisteConyuge = useMemo(() => {
    const enExistentes = familiaresActuales.some(f => f.relacion === RelacionFamiliar.CONYUGE && f.id !== familiarToEdit?.id);
    const enNuevos = familiares.some(f => f.relacion === RelacionFamiliar.CONYUGE);
    return enExistentes || enNuevos;
  }, [familiaresActuales, familiares, familiarToEdit]);

  // --- NUEVA FUNCION: Subir foto individual ---
  const uploadFotoIndividual = async (file: File | string | null | undefined, famId: string, tipo: string) => {
      // Si ya es una URL (string), retornarla tal cual (ej: edición o persistencia)
      if (typeof file === 'string') return file;
      // Si no hay archivo, retornar null
      if (!file || !(file instanceof File)) return null;

      try {
        // 1. Comprimir
        const compressedFile = await compressImage(file, 1280, 0.8);
        // 2. Subir
        const { uploadFile } = await import('@/lib/firebase/storageService');
        const path = `solicitudes-temp/${socioId}/${famId}_${tipo}.jpg`;
        const url = await uploadFile(compressedFile, path);
        return url;
      } catch (error) {
        console.error(`Error subiendo ${tipo}:`, error);
        // Fallback: intentar subir original si falla compresión
        try {
            const { uploadFile } = await import('@/lib/firebase/storageService');
            const path = `solicitudes-temp/${socioId}/${famId}_${tipo}.jpg`;
            return await uploadFile(file, path);
        } catch (retryError) {
             console.error("Fallo total subida imagen", retryError);
             throw retryError;
        }
      }
  };

  const [isUploading, setIsUploading] = useState(false); // Estado local para spinner en botón agregar

  const handleAgregarALista = async () => {
    const result = await form.trigger();
    if (!result) {
      toast({ title: "Datos incompletos", description: "Complete los campos requeridos para agregar al familiar.", variant: "destructive" });
      return;
    }
    
    // Validación conyuge
    const currentData = form.getValues();
    if (currentData.relacion === RelacionFamiliar.CONYUGE && yaExisteConyuge) {
        toast({ title: "Error de Validación", description: "Ya existe un cónyuge en el grupo familiar. Solo se permite uno.", variant: "destructive" });
        return;
    }

    setIsUploading(true); // Activar spinner
    try {
        const familiarId = generateId();
        
        // --- SUBIDA INMEDIATA DE FOTOS ---
        // Esto evita el congelamiento al final y permite persistencia en localStorage
        const [fotoPerfilUrl, fotoDniFrenteUrl, fotoDniDorsoUrl, fotoCarnetUrl] = await Promise.all([
             uploadFotoIndividual(currentData.fotoPerfil, familiarId, 'perfil'),
             uploadFotoIndividual(currentData.fotoDniFrente, familiarId, 'dniFrente'),
             uploadFotoIndividual(currentData.fotoDniDorso, familiarId, 'dniDorso'),
             uploadFotoIndividual(currentData.fotoCarnet, familiarId, 'carnet'),
        ]);

        // Crear objeto familiar con URLs finales
        const nuevoFamiliarConFotos = { 
            ...currentData, 
            id: familiarId,
            fotoPerfil: fotoPerfilUrl,
            fotoDniFrente: fotoDniFrenteUrl, 
            fotoDniDorso: fotoDniDorsoUrl, 
            fotoCarnet: fotoCarnetUrl
        };

        setFamiliares(prev => [...prev, nuevoFamiliarConFotos]);
        
        // Resetear formulario
        setFormKey(prev => prev + 1);
        form.reset({ nombre: '', apellido: '', dni: '', fechaNacimiento: new Date(), relacion: '' as RelacionFamiliar, fotoPerfil: null, fotoDniFrente: null, fotoDniDorso: null, fotoCarnet: null });
        setMostrarFormularioNuevo(true); 
        toast({ title: "Familiar Agregado", description: "El familiar y sus fotos se han guardado correctamente." });

    } catch (error) {
        console.error("Error al procesar familiar:", error);
        toast({ title: "Error al agregar", description: "Hubo un problema subiendo las fotos. Intente nuevamente.", variant: "destructive" });
    } finally {
        setIsUploading(false);
    }
  };

  const handleRemoveFamiliar = (id: string) => {
    setFamiliares(prev => prev.filter(f => f.id !== id));
  };

  // Limpiar localStorage al enviar exitosamente
  const clearSavedData = () => {
    localStorage.removeItem(STORAGE_KEY);
  };

  // Descartar formulario vacío (cuando se agregó uno por error)
  const handleDiscardForm = () => {
    if (familiares.length > 0) {
      // Si hay familiares agregados, ocultar el formulario adicional
      setMostrarFormularioNuevo(false);
      form.reset({ nombre: '', apellido: '', dni: '', fechaNacimiento: new Date(), relacion: '' as RelacionFamiliar, fotoPerfil: null, fotoDniFrente: null, fotoDniDorso: null, fotoCarnet: null });
      toast({ title: "Formulario descartado", description: "El formulario adicional fue eliminado." });
    }
  };

  // Verificar si el formulario actual está vacío (sin datos importantes)
  const currentFormValues = form.watch();
  const isCurrentFormEmpty = useMemo(() => {
    return !currentFormValues.nombre && !currentFormValues.apellido && !currentFormValues.dni;
  }, [currentFormValues.nombre, currentFormValues.apellido, currentFormValues.dni]);

  const handleFinalSubmit = async () => {
    // Solo enviar la lista de familiares acumulados
    if (familiares.length === 0) {
      toast({ title: "Lista vacía", description: "Agregue al menos un familiar a la lista antes de enviar.", variant: "destructive" });
      return;
    }

    if (!isCurrentFormEmpty && mostrarFormularioNuevo) {
       // Hay datos sin agregar en el formulario
       toast({ 
         title: "Formulario pendiente", 
         description: "Tiene datos en el formulario sin agregar. Agregue el familiar a la lista o limpie el formulario antes de enviar.", 
         variant: "destructive" 
       });
       return;
    }

    // Logic de envío existente simplificada (ya no mira el form actual)
    onSubmit(form.getValues()); // Pasamos values dummy, onSubmit usará 'familiares' state
  };

  // onSubmit modificado para usar solo la lista en modo Agregar
  const onSubmit = async (data: FamiliarFormData) => {
    if (!user) {
      toast({ title: "Error", description: "Debes estar autenticado.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('La operación tardó demasiado. Por favor, inténtalo de nuevo.')), 60000);
    });

    try {
      let familiaresParaEnviar: MiembroFamiliar[];

      if (isEditMode) {
         // Lógica Edición (se mantiene igual, usa 'data' del form actual)
         const familiarId = familiarToEdit?.id || generateId();
         const uploadFoto = async (file: File | string | null | undefined, famId: string, tipo: string) => {
             // ... lógica uploadFoto existente ...
             // Reutilizaremos la función definida dentro (pero necesitamos moverla fuera o duplicarla si cambiamos el scope)
             // Para minimizar cambios invasivos, asumiremos que esta función onSubmit sigue encapsulando la lógica.
             // SIMPLIFICACION: Copiaremos la lógica de uploadFoto aquí dentro.
             if (file instanceof File) {
               try {
                 const compressedFile = await compressImage(file, 1280, 0.8);
                 const { uploadFile } = await import('@/lib/firebase/storageService');
                 const path = `solicitudes-temp/${socioId}/${famId}_${tipo}.jpg`;
                 return await uploadFile(compressedFile, path);
               } catch (error) {
                 const { uploadFile } = await import('@/lib/firebase/storageService');
                 const path = `solicitudes-temp/${socioId}/${famId}_${tipo}.jpg`;
                 return await uploadFile(file, path);
               }
             }
             return typeof file === 'string' ? file : null;
         };

         const [fotoPerfilUrl, fotoDniFrenteUrl, fotoDniDorsoUrl, fotoCarnetUrl] = await Promise.all([
            uploadFoto(data.fotoPerfil, familiarId, 'perfil'),
            uploadFoto(data.fotoDniFrente, familiarId, 'dniFrente'),
            uploadFoto(data.fotoDniDorso, familiarId, 'dniDorso'),
            uploadFoto(data.fotoCarnet, familiarId, 'carnet'),
          ]);

          familiaresParaEnviar = familiaresActuales.map(f => f.id === familiarId ? {
            ...f,
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
          } : f);

      } else {
        // MODO AGREGAR:
        // Solo enviamos los familiares NUEVOS (no los existentes)
        // Las fotos ya están subidas en 'familiares'.
        familiaresParaEnviar = familiares as unknown as MiembroFamiliar[];
      }

      const conyugesEnSolicitud = familiaresParaEnviar.filter(f => f.relacion === RelacionFamiliar.CONYUGE).length;
      if (conyugesEnSolicitud > 1) {
        toast({ title: "Error de Validación", description: "Solo se permite un cónyuge por grupo familiar.", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }

      if (onSaveDraft) {
        const familiarDraft = familiaresParaEnviar.find(f => f.id === (familiarToEdit?.id || familiares[0]?.id));
        if (familiarDraft) {
             onSaveDraft(familiarDraft);
             toast({ title: "Borrador Guardado", description: "Cambios guardados." });
             onClose();
        }
        setIsSubmitting(false);
        return;
      }

      console.log('📤 ENVIANDO SOLICITUD FAMILIARES');

      const functions = getFunctions();
      const solicitarCambio = httpsCallable(functions, 'solicitarCambioGrupoFamiliar');
      
      await Promise.race([
        solicitarCambio({ cambiosData: familiaresParaEnviar }),
        timeoutPromise
      ]);

      toast({ title: "Solicitud Enviada", description: "Los cambios han sido enviados para aprobación." });
      clearSavedData();
      queryClient.invalidateQueries({ queryKey: ['socio', socioId] });
      await refreshSocio();
      onClose();

    } catch (error: any) {
      setShowConfirmDialog(false);
      console.error("Error al enviar:", error);
      toast({ title: "Error al enviar", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Editar Familiar' : 'Agregar Grupo Familiar'}</DialogTitle>
          <DialogDescription>{isEditMode ? 'Modifique los datos.' : 'Agregue cada familiar a la lista y luego envíe la solicitud.'}</DialogDescription>
        </DialogHeader>

        {!isEditMode && familiares.length > 0 && (
          <div className="mb-4 border-b pb-4 bg-muted/20 p-2 rounded-md">
            <h3 className="font-semibold mb-2 text-sm text-primary">Familiares listos para enviar:</h3>
            <div className="flex flex-wrap gap-2">
                {familiares.map((fam) => (
                    <Badge key={fam.id} variant="default" className="flex items-center gap-2 pl-3 bg-blue-600 hover:bg-blue-700">
                        <span className="text-sm font-medium">{fam.nombre} {fam.apellido}</span>
                        <span className="text-xs opacity-80">({fam.relacion})</span>
                        <button onClick={() => handleRemoveFamiliar(fam.id!)} className="rounded-full hover:bg-white/20 p-1 ml-1 cursor-pointer" title="Eliminar de lista">
                            <X className="h-4 w-4" />
                        </button>
                    </Badge>
                ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-right">Recuerda pulsar &quot;Enviar Solicitud&quot; al finalizar.</p>
          </div>
        )}
        
        <div className="overflow-y-auto pr-2 flex-grow">
            <FormProvider {...form}>
            {(isEditMode || mostrarFormularioNuevo) ? (
            <div className={`relative transition-all duration-300 ${
                !isEditMode && familiares.length > 0 
                  ? 'mt-4 border border-blue-100 shadow-lg' 
                  : 'border border-border/50'
              } bg-white rounded-xl overflow-hidden`}>
              
              {!isEditMode && familiares.length > 0 && (
                 <div className="bg-blue-50/50 px-4 py-3 border-b border-blue-100 flex justify-between items-center">
                    <span className="font-semibold text-sm text-blue-700 flex items-center gap-2">
                        <span className="bg-blue-100 p-1.5 rounded-md text-blue-600">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-user-plus"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
                        </span>
                        Nuevo Familiar
                    </span>
                    <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleDiscardForm}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 px-2"
                        title="Descartar este formulario"
                    >
                        <Trash2 className="h-4 w-4 mr-1.5" /> Descartar
                    </Button>
                 </div>
              )}

              <div className="p-5">
              {!isEditMode && isCurrentFormEmpty && familiares.length === 0 && (
                 <div className="flex justify-end mb-2 absolute top-2 right-2 z-10">
                    {/* Botón de ocultar solo visible si es el primer formulario y está vacío (opcional, por ahora oculto para limpieza) */}
                 </div>
              )}
              
              <form id="familiar-form" key={formKey} className="space-y-5">
                {!isEditMode && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <FormField name="nombre" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField name="apellido" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Apellido</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField name="dni" control={form.control} render={({ field }) => ( <FormItem><FormLabel>DNI</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField name="fechaNacimiento" control={form.control} render={({ field }) => (<FormItem><FormLabel>Fecha de Nacimiento</FormLabel><FormControl><Input type="date" value={field.value && !isNaN(new Date(field.value).getTime()) ? format(new Date(field.value), 'yyyy-MM-dd') : ''}  onChange={(e) => field.onChange(e.target.value ? parseISO(e.target.value) : null)} /></FormControl><FormMessage /></FormItem>)} />
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
                        <FormMessage />
                        </FormItem>
                    )} />

                </div>
                )}
                <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-sm font-semibold">Documentación Fotográfica</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField name="fotoPerfil" control={form.control} render={({ field: { onChange, value, ...rest } }) => ( <FormItem><FormLabel>Foto Perfil (Selfie)</FormLabel><FormControl><FileInput onValueChange={onChange} value={value as any} placeholder="Subir Foto" accept="image/*" {...rest} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField name="fotoDniFrente" control={form.control} render={({ field: { onChange, value, ...rest } }) => ( <FormItem><FormLabel>DNI Frente</FormLabel><FormControl><FileInput onValueChange={onChange} value={value as any} placeholder="Subir DNI Frente" accept="image/*" {...rest} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField name="fotoDniDorso" control={form.control} render={({ field: { onChange, value, ...rest } }) => ( <FormItem><FormLabel>DNI Dorso</FormLabel><FormControl><FileInput onValueChange={onChange} value={value as any} placeholder="Subir DNI Dorso" accept="image/*" {...rest} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField name="fotoCarnet" control={form.control} render={({ field: { onChange, value, ...rest } }) => ( <FormItem><FormLabel>Carnet Sindical (Opcional)</FormLabel><FormControl><FileInput onValueChange={onChange} value={value as any} placeholder="Subir Carnet" accept="image/*" {...rest} /></FormControl><FormMessage /></FormItem> )} />
                    </div>
                </div>

                {!isEditMode && (
                    <div className="pt-4 flex flex-col gap-2">
                        <Button 
                            type="button" 
                            onClick={handleAgregarALista} 
                            disabled={isUploading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-6 text-lg shadow-md disabled:opacity-70"
                        >
                            {isUploading ? (
                              <span className="flex items-center gap-2">
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                PROCESANDO IMÁGENES...
                              </span>
                            ) : (
                              "+ AGREGAR FAMILIAR A LA LISTA"
                            )}
                        </Button>
                        <p className="text-xs text-center text-muted-foreground">
                           Al pulsar &quot;Agregar&quot;, este familiar se guardará en la lista superior. Luego podrá agregar otro o enviar la solicitud.
                        </p>
                    </div>
                )}
              </form>
              </div>
            </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50">
                <p className="text-muted-foreground mb-4 font-medium">Formulario vacío u oculto</p>
                <Button type="button" onClick={() => setMostrarFormularioNuevo(true)} className="bg-orange-500 hover:bg-orange-600">
                  + Ingresar Nuevo Familiar
                </Button>
              </div>
            )}
            </FormProvider>
        </div>

        <DialogFooter className="pt-4 border-t flex-col sm:flex-row gap-3 sm:gap-2">
          <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">Cancelar</Button>
          
          {isEditMode ? (
            <Button type="button" onClick={() => onSubmit(form.getValues())} disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          ) : (
            <Button 
                type="button"
                onClick={handleFinalSubmit}
                disabled={isSubmitting || familiares.length === 0}
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-bold"
            >
                {isSubmitting ? 'Enviando...' : `ENVIAR SOLICITUD (${familiares.length})`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
