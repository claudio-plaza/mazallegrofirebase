
import { GestionCumpleanos } from '@/components/cumpleanos/GestionCumpleanos';
import { Metadata } from 'next';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: `Mis Cumpleaños - ${siteConfig.name}`,
  description: `Gestiona tus festejos de cumpleaños y listas de invitados en ${siteConfig.name}.`,
};

export default function CumpleanosPage() {
  return (
    <div className="container mx-auto py-8">
      <GestionCumpleanos />
    </div>
  );
}

