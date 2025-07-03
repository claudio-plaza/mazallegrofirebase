'use client';
    
import { useMemo, useEffect } from 'react';
import { useController, type Control } from 'react-hook-form';
import Image from 'next/image';
import { UploadCloud, FileText as FileIcon, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormControl, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

interface FileInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name' | 'defaultValue' | 'type'> {
  name: string;
  label: string;
  control: Control<any>;
  isEditable?: boolean;
  aiHint?: string;
  accept?: string;
}

export function FileInput({ name, label, control, isEditable = true, aiHint, accept, ...props }: FileInputProps) {
  const { field } = useController({ name, control });
  
  const fileValue = field.value;
  
  const previewUrl = useMemo(() => {
    if (fileValue instanceof FileList && fileValue.length > 0 && fileValue[0].type.startsWith("image/")) {
      return URL.createObjectURL(fileValue[0]);
    }
    if (typeof fileValue === 'string') return fileValue;
    return null;
  }, [fileValue]);

  const fileName = useMemo(() => {
    if (fileValue instanceof FileList && fileValue.length > 0) {
      return fileValue[0].name;
    }
    return null;
  }, [fileValue]);

  // Cleanup to avoid memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      <FormControl>
        <div className="relative">
          <label className={`relative cursor-pointer w-full min-h-[120px] h-[120px] flex flex-col items-center justify-center p-2 border-2 border-dashed rounded-md transition-colors ${!isEditable ? 'cursor-not-allowed bg-muted/50' : 'hover:border-primary bg-background hover:bg-muted/50'}`}>
            {previewUrl ? (
              <Image 
                src={previewUrl} 
                alt={`Vista previa de ${label}`} 
                fill 
                className="object-contain rounded-md" 
                data-ai-hint={aiHint || "user document photo"}
              />
            ) : fileName ? (
              <div className="text-center p-2 text-muted-foreground">
                <FileIcon className="h-8 w-8 mx-auto mb-2" />
                <p className="text-xs break-all">{fileName}</p>
              </div>
            ) : (
              <div className="text-center p-2 text-muted-foreground">
                <UploadCloud className="h-8 w-8 mx-auto mb-2" />
                <p className="text-xs">Subir archivo</p>
              </div>
            )}
            <Input
              type="file"
              className="hidden"
              onChange={e => field.onChange(e.target.files && e.target.files.length > 0 ? e.target.files : null)}
              disabled={!isEditable}
              accept={accept}
              {...props}
            />
          </label>
          {isEditable && fileValue && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute -top-2 -right-2 h-7 w-7 bg-card rounded-full shadow-md hover:bg-destructive/10"
              onClick={() => field.onChange(null)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      </FormControl>
      <FormMessage />
    </FormItem>
  );
}
