'use client';

import { useMemo, useEffect } from 'react';
import type { ControllerRenderProps } from 'react-hook-form';
import Image from 'next/image';
import { UploadCloud, FileText as FileIcon, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Note: This component is now a "controlled" component intended to be used
// inside a <FormField> from shadcn/ui. It no longer contains FormItem, FormLabel, etc.
interface FileInputControlProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  field: ControllerRenderProps<any, any>;
  label: string; // Keep label for alt text and hints
  isEditable?: boolean;
  aiHint?: string;
}

export function FileInput({ field, label, isEditable = true, aiHint, ...props }: FileInputControlProps) {
  const fileValue = field.value as File | string | null | undefined;

  const previewUrl = useMemo(() => {
    if (fileValue instanceof File && fileValue.type.startsWith("image/")) {
      return URL.createObjectURL(fileValue);
    }
    if (typeof fileValue === 'string') return fileValue;
    return null;
  }, [fileValue]);

  const fileName = useMemo(() => {
    if (fileValue instanceof File) {
      return fileValue.name;
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
    <div className="relative w-full">
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
          onChange={e => field.onChange(e.target.files ? e.target.files[0] : null)}
          disabled={!isEditable}
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
  );
}

