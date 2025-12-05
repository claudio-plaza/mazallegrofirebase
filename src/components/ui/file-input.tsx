'use client';

import React, { useMemo, useEffect, forwardRef } from 'react';
import Image from 'next/image';
import { UploadCloud, FileText as FileIcon, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface FileInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value?: File | string | null;
  onValueChange: (file: File | null) => void;
}

const FileInput = forwardRef<HTMLInputElement, FileInputProps>(
  ({ value, onValueChange, placeholder, className, ...props }, ref) => {
    const previewUrl = useMemo(() => {
      if (value instanceof File && value.type.startsWith("image/")) {
        return URL.createObjectURL(value);
      }
      if (typeof value === 'string') return value;
      return null;
    }, [value]);

    const fileName = useMemo(() => {
      if (value instanceof File) {
        return value.name;
      }
      return null;
    }, [value]);

    useEffect(() => {
      return () => {
        if (previewUrl && previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(previewUrl);
        }
      };
    }, [previewUrl]);

    return (
      <div className="relative w-full">
        <label className={`relative cursor-pointer w-full min-h-[100px] h-[100px] sm:min-h-[120px] sm:h-[120px] flex flex-col items-center justify-center p-2 border-2 border-dashed rounded-md transition-colors ${props.disabled ? 'cursor-not-allowed bg-muted/50' : 'hover:border-primary bg-background hover:bg-muted/50'}`}>
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt={placeholder || 'Vista previa'}
              fill
              sizes="(max-width: 640px) 100px, 120px"
              className="object-contain rounded-md"
            />
          ) : fileName ? (
            <div className="text-center p-2 text-muted-foreground">
              <FileIcon className="h-8 w-8 mx-auto mb-2" />
              <p className="text-xs break-all">{fileName}</p>
            </div>
          ) : (
            <div className="text-center p-2 text-muted-foreground">
              <UploadCloud className="h-8 w-8 mx-auto mb-2" />
              <p className="text-xs">{placeholder || 'Subir archivo'}</p>
            </div>
          )}
          <Input
            ref={ref}
            type="file"
            className={cn("hidden", className)}
            onChange={e => onValueChange(e.target.files ? e.target.files[0] : null)}
            {...props}
          />
        </label>
        {!props.disabled && value && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute -top-2 -right-2 h-7 w-7 bg-card rounded-full shadow-md hover:bg-destructive/10"
            onClick={() => onValueChange(null)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </div>
    );
  }
);

FileInput.displayName = 'FileInput';

export default FileInput;
