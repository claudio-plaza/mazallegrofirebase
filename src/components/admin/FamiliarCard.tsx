'use client';

import { useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RelacionFamiliar } from '@/types';
import { getEncryptedImageUrl } from '@/lib/helpers';
import FileInput from '@/components/ui/file-input';

interface FamiliarCardProps {
  index: number;
  remove: (index: number) => void;
  maxBirthDate: string;
}

export function FamiliarCard({ index, remove, maxBirthDate }: FamiliarCardProps) {
  const { control, watch } = useFormContext();

  const fotoPerfilFamiliarValue = watch(`familiares.${index}.fotoPerfil`);
  const nombre = watch(`familiares.${index}.nombre`);
  const apellido = watch(`familiares.${index}.apellido`);

  const fotoPerfilFamiliarActual = useMemo(() => {
    if (fotoPerfilFamiliarValue instanceof File) {
      return URL.createObjectURL(fotoPerfilFamiliarValue);
    }
    if (typeof fotoPerfilFamiliarValue === 'string') {
      return getEncryptedImageUrl(fotoPerfilFamiliarValue);
    }
    return `https://placehold.co/64x64.png?text=${nombre?.[0] || 'F'}${apellido?.[0] || ''}`;
  }, [fotoPerfilFamiliarValue, nombre, apellido]);

  return (
    <Card className="p-4 bg-muted/20">
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-medium">Familiar {index + 1}</h4>
        <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => remove(index)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField control={control} name={`familiares.${index}.nombre`} render={({ field: formField }) => ( <FormItem> <FormLabel className="text-xs">Nombre</FormLabel> <FormControl><Input {...formField} className="h-9 text-sm"/></FormControl> <FormMessage /> </FormItem> )} />
          <FormField control={control} name={`familiares.${index}.apellido`} render={({ field: formField }) => ( <FormItem> <FormLabel className="text-xs">Apellido</FormLabel> <FormControl><Input {...formField} className="h-9 text-sm"/></FormControl> <FormMessage /> </FormItem> )} />
          <FormField control={control} name={`familiares.${index}.dni`} render={({ field: formField }) => ( <FormItem> <FormLabel className="text-xs">DNI</FormLabel> <FormControl><Input type="number" {...formField} className="h-9 text-sm"/></FormControl> <FormMessage /> </FormItem> )} />
          <FormField control={control} name={`familiares.${index}.fechaNacimiento`} render={({ field: formField }) => (
              <FormItem> 
                  <FormLabel className="text-xs">Fecha Nac.</FormLabel> 
                  <FormControl>
                      <Input 
                          type="date" 
                          value={formField.value && new Date(formField.value).toISOString().split('T')[0] || ''}
                          onChange={(e) => formField.onChange(e.target.value ? new Date(e.target.value) : null)}
                          max={maxBirthDate}
                          className="w-full h-9 text-sm"
                      />
                  </FormControl> 
                  <FormMessage /> 
              </FormItem> 
          )}/>
          <FormField control={control} name={`familiares.${index}.relacion`} render={({ field: formField }) => (
              <FormItem>
                  <FormLabel className="text-xs">Relación</FormLabel>
                  <Select onValueChange={formField.onChange} value={formField.value}>
                      <FormControl><SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccione relación" /></SelectTrigger></FormControl>
                      <SelectContent>
                          {Object.values(RelacionFamiliar).map(rel => (
                              <SelectItem key={rel} value={rel}>{rel}</SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
                  <FormMessage />
              </FormItem>
          )}/>
            <div className="md:col-span-1 flex flex-col items-center">
                <Avatar className="h-16 w-16 border">
                    <AvatarImage src={fotoPerfilFamiliarActual || undefined} alt={nombre} data-ai-hint="family member photo placeholder"/>
                    <AvatarFallback>{nombre?.[0]}{apellido?.[0]}</AvatarFallback>
                </Avatar>
                <p className="text-xs mt-1 text-center p-1 rounded bg-yellow-100 text-yellow-700">Apto: Pendiente</p>
            </div>
      </div>
      <Separator className="my-3"/>
      <h5 className="text-sm font-semibold mt-2 mb-1">Documentación Familiar {index + 1}</h5>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <FormField
            control={control}
            name={`familiares.${index}.fotoPerfil`}
            render={({ field: { onChange, value, ...rest } }) => (
              <FormItem>
                <FormLabel className="text-xs">Foto Perfil (tipo selfie, solo rostro)</FormLabel>
                <FormControl>
                  <FileInput onValueChange={onChange} value={value} placeholder={`Foto Perfil Familiar ${index + 1}`} accept="image/png,image/jpeg" {...rest} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name={`familiares.${index}.fotoDniFrente`}
            render={({ field: { onChange, value, ...rest } }) => (
              <FormItem>
                <FormLabel className="text-xs">DNI Frente</FormLabel>
                <FormControl>
                  <FileInput onValueChange={onChange} value={value} placeholder={`DNI Frente Familiar ${index + 1}`} accept="image/png,image/jpeg,application/pdf" {...rest} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name={`familiares.${index}.fotoDniDorso`}
            render={({ field: { onChange, value, ...rest } }) => (
              <FormItem>
                <FormLabel className="text-xs">DNI Dorso</FormLabel>
                <FormControl>
                  <FileInput onValueChange={onChange} value={value} placeholder={`DNI Dorso Familiar ${index + 1}`} accept="image/png,image/jpeg,application/pdf" {...rest} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name={`familiares.${index}.fotoCarnet`}
            render={({ field: { onChange, value, ...rest } }) => (
              <FormItem>
                <FormLabel className="text-xs">Foto Carnet</FormLabel>
                <FormControl>
                  <FileInput onValueChange={onChange} value={value} placeholder={`Foto Carnet Familiar ${index + 1}`} accept="image/png,image/jpeg" {...rest} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
    </Card>
  );
}