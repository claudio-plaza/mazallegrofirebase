
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardFooter, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription as DialogDescriptionComponent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import type { Novedad, NovedadFormData } from '@/types';
import { novedadSchema, TipoNovedad } from '@/types';
import { getNovedades, addNovedad, updateNovedad, deleteNovedad } from '@/lib/firebase/firestoreService';
import { formatDate } from '@/lib/helpers';
import { PlusCircle, Edit, Trash2, ListChecks, Megaphone, CalendarDays, Info, AlertTriangleIcon as AlertTriangleLucide } from 'lucide-react'; // Renamed AlertTriangleIcon to avoid conflict
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, formatISO, parseISO, isValid } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription as AlertDialogDescriptionComponent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';

export function GestionNovedadesDashboard() {
  const [novedades, setNovedades] = useState<Novedad[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingNovedad, setEditingNovedad] = useState<Novedad | null>(null);
  const { toast } = useToast();

  const form = useForm<NovedadFormData>({
    resolver: zodResolver(novedadSchema),
    defaultValues: {
      titulo: '',
      contenido: '',
      fechaVencimiento: null,
      activa: true,
      tipo: TipoNovedad.INFO,
    },
  });

  const loadNovedades = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getNovedades();
      setNovedades(data);
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron cargar las novedades.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadNovedades();
    const handleNovedadesUpdated = () => loadNovedades();
    window.addEventListener('firestore/novedadesUpdated', handleNovedadesUpdated);
    return () => {
        window.removeEventListener('firestore/novedadesUpdated', handleNovedadesUpdated);
    };
  }, [loadNovedades]);

  const onSubmit = async (data: NovedadFormData) => {
    try {
      let savedNovedad;
      const processedData = {
        ...data,
        fechaVencimiento: data.fechaVencimiento ? (isValid(new Date(data.fechaVencimiento)) ? new Date(data.fechaVencimiento) : null) : null,
      };

      if (editingNovedad) {
        // Asegurarse de que fechaCreacion no se pierda al actualizar
        const dataToUpdate = { 
            ...editingNovedad, 
            ...processedData, 
            fechaCreacion: editingNovedad.fechaCreacion 
        };
        savedNovedad = await updateNovedad(dataToUpdate);
        toast({ title: "Novedad Actualizada", description: `La novedad &quot;${savedNovedad?.titulo}&quot; ha sido actualizada.` });
      } else {
        const { id, fechaCreacion, ...dataToAdd } = processedData; // Excluir campos autogenerados o que no deben enviarse
        savedNovedad = await addNovedad(dataToAdd);
        toast({ title: "Novedad Creada", description: `La novedad &quot;${savedNovedad?.titulo}&quot; ha sido creada.` });
      }
      loadNovedades();
      setIsFormOpen(false);
      setEditingNovedad(null);
      form.reset({ titulo: '', contenido: '', fechaVencimiento: null, activa: true, tipo: TipoNovedad.INFO });
    } catch (error) {
      console.error("Error guardando novedad:", error);
      toast({ title: "Error", description: "No se pudo guardar la novedad.", variant: "destructive" });
    }
  };

  const handleOpenForm = (novedad?: Novedad) => {
    if (novedad) {
      setEditingNovedad(novedad);
      form.reset({
        ...novedad,
        fechaVencimiento: novedad.fechaVencimiento ? new Date(novedad.fechaVencimiento) : null,
      });
    } else {
      setEditingNovedad(null);
      form.reset({
        titulo: '',
        contenido: '',
        fechaVencimiento: null,
        activa: true,
        tipo: TipoNovedad.INFO,
        // id y fechaCreacion se manejarán en el backend/servicio
      });
    }
    setIsFormOpen(true);
  };

  const handleDelete = async (novedadId: string) => {
    try {
      await deleteNovedad(novedadId);
      toast({ title: "Novedad Eliminada", description: "La novedad ha sido eliminada." });
      loadNovedades();
    } catch (error) {
      toast({ title: "Error", description: "No se pudo eliminar la novedad.", variant: "destructive" });
    }
  };
  
  const getTipoBadge = (tipo: TipoNovedad) => {
    switch (tipo) {
      case TipoNovedad.INFO:
        return <Badge variant="outline" className="border-blue-500 text-blue-600"><Info className="mr-1 h-3 w-3" /> Info</Badge>;
      case TipoNovedad.ALERTA:
        return <Badge variant="destructive" className="bg-yellow-500 hover:bg-yellow-600"><AlertTriangleLucide className="mr-1 h-3 w-3" /> Alerta</Badge>;
      case TipoNovedad.EVENTO:
        return <Badge variant="secondary" className="bg-purple-500 hover:bg-purple-600 text-white"><CalendarDays className="mr-1 h-3 w-3" /> Evento</Badge>;
      default:
        return <Badge variant="outline">{tipo}</Badge>;
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-xl">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <CardTitle className="text-2xl flex items-center"><Megaphone className="mr-3 h-7 w-7 text-primary" />Gestión de Novedades</CardTitle>
          <Button onClick={() => handleOpenForm()}>
            <PlusCircle className="mr-2 h-4 w-4" /> Nueva Novedad
          </Button>
        </div>
        <CardDescription>
          Crea, edita y administra las novedades, alertas y eventos que se mostrarán a los socios.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading && <p className="text-center py-4">Cargando novedades...</p>}
        {!loading && novedades.length === 0 && (
          <div className="text-center py-10 px-6 border border-dashed rounded-md">
            <ListChecks className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-xl font-medium text-foreground">No hay novedades creadas.</p>
            <p className="text-muted-foreground mt-1">Haz clic en &quot;Nueva Novedad&quot; para agregar una.</p>
          </div>
        )}
        {!loading && novedades.length > 0 && (
          <ScrollArea className="h-[500px] w-full">
            <div className="space-y-3 pr-2">
              {novedades.map((novedad) => (
                <Card key={novedad.id} className="bg-card hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start gap-2">
                      <CardTitle className="text-lg">{novedad.titulo}</CardTitle>
                      <div className="flex items-center gap-2">
                        {getTipoBadge(novedad.tipo)}
                        <Badge variant={novedad.activa ? 'default' : 'outline'} className={novedad.activa ? 'bg-green-500' : 'border-red-500 text-red-600'}>
                          {novedad.activa ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Creada: {formatDate(novedad.fechaCreacion, "dd/MM/yy HH:mm")}
                      {novedad.fechaVencimiento && ` - Vence: ${formatDate(novedad.fechaVencimiento, "dd/MM/yy HH:mm")}`}
                    </p>
                  </CardHeader>
                  <CardContent className="pt-0 pb-3">
                    <p className="text-sm text-muted-foreground line-clamp-2">{novedad.contenido}</p>
                  </CardContent>
                  <CardFooter className="flex justify-end gap-2 pt-2 pb-3 px-6">
                    <Button variant="outline" size="sm" onClick={() => handleOpenForm(novedad)}>
                      <Edit className="mr-2 h-4 w-4" /> Editar
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4" /> Eliminar</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Confirmar Eliminación?</AlertDialogTitle>
                          <AlertDialogDescriptionComponent>
                            Esta acción no se puede deshacer. Se eliminará permanentemente la novedad &quot;{novedad.titulo}&quot;.
                          </AlertDialogDescriptionComponent>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(novedad.id)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
        setIsFormOpen(isOpen);
        if (!isOpen) {
            setEditingNovedad(null);
            form.reset({ titulo: '', contenido: '', fechaVencimiento: null, activa: true, tipo: TipoNovedad.INFO });
        }
      }}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">{editingNovedad ? 'Editar Novedad' : 'Crear Nueva Novedad'}</DialogTitle>
            <DialogDescriptionComponent>
              {editingNovedad ? 'Modifica los detalles de la novedad.' : 'Completa los datos para crear una nueva novedad.'}
            </DialogDescriptionComponent>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1 pt-3">
              <FormField control={form.control} name="titulo" render={({ field }) => (
                <FormItem> <FormLabel>Título</FormLabel> <FormControl><Input placeholder="Título de la novedad" {...field} /></FormControl> <FormMessage /> </FormItem>
              )} />
              <FormField control={form.control} name="contenido" render={({ field }) => (
                <FormItem> <FormLabel>Contenido</FormLabel> <FormControl><Textarea placeholder="Descripción detallada de la novedad..." {...field} rows={5} /></FormControl> <FormMessage /> </FormItem>
              )} />
              <FormField control={form.control} name="tipo" render={({ field }) => (
                <FormItem> <FormLabel>Tipo de Novedad</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccione un tipo" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {Object.values(TipoNovedad).map(tipo => (
                        <SelectItem key={tipo} value={tipo}>{tipo.charAt(0).toUpperCase() + tipo.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select> <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="fechaVencimiento" render={({ field }) => (
                <FormItem> <FormLabel>Fecha de Vencimiento (Opcional)</FormLabel>
                  <FormControl>
                     <Input
                        type="datetime-local"
                        value={field.value && isValid(new Date(field.value)) ? format(new Date(field.value), "yyyy-MM-dd'T'HH:mm") : ''}
                        onChange={(e) => field.onChange(e.target.value ? parseISO(e.target.value) : null)}
                        min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                      />
                  </FormControl> <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="activa" render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Novedad Activa</FormLabel>
                    <FormDescription>Si está activa, será visible para los socios.</FormDescription>
                  </div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
              <DialogFooter className="pt-4">
                <DialogClose asChild><Button type="button" variant="ghost">Cancelar</Button></DialogClose>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Guardando...' : (editingNovedad ? 'Actualizar Novedad' : 'Crear Novedad')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
