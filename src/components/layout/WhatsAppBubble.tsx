
'use client';

import { ExternalLink } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import Link from 'next/link';

// Helper to format phone numbers for WhatsApp links
const formatWhatsAppLink = (phoneNumber: string) => {
  return `https://wa.me/${phoneNumber.replace(/\s+|\+/g, '')}`;
};

const contactNumber = "+54 9 2613 60 9590";
const eventsNumber = "+54 261 3693534";

export function WhatsAppBubble() {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            size="lg"
            className="rounded-full shadow-lg w-16 h-16 p-0 flex items-center justify-center bg-white"
            aria-label="Contactar por WhatsApp"
          >
            <Image src="/whatsapp.png" alt="WhatsApp" width={32} height={32} className="h-8 w-8" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4 rounded-lg shadow-xl bg-background border-border">
          <div className="grid gap-4">
            <div className="space-y-2">
              <h4 className="font-medium leading-none text-foreground">Contactar por WhatsApp</h4>
              <p className="text-sm text-muted-foreground">
                Elige una opción para iniciar una conversación.
              </p>
            </div>
            <div className="grid gap-3">
              <Link
                href={formatWhatsAppLink(contactNumber)}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between rounded-md border border-input bg-transparent px-4 py-3 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <div>
                  <p className="font-medium text-foreground">Contacto General</p>
                  <p className="text-xs text-muted-foreground">{contactNumber}</p>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-accent-foreground" />
              </Link>
              <Link
                href={formatWhatsAppLink(eventsNumber)}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between rounded-md border border-input bg-transparent px-4 py-3 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                 <div>
                  <p className="font-medium text-foreground">Eventos y Consultas</p>
                  <p className="text-xs text-muted-foreground">{eventsNumber}</p>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-accent-foreground" />
              </Link>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
