
import { GestionInvitadosDiarios } from '@/components/invitados/GestionInvitadosDiarios';
import { Metadata } from 'next';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: `Cargar Invitados del Día - ${siteConfig.name}`,
  description: `Registra tus invitados para el acceso diario en ${siteConfig.name}.`,
};

export default function InvitadosDiariosPage() {
  return (
    <div className="container mx-auto py-8">
      <GestionInvitadosDiarios />
    </div>
  );
}
