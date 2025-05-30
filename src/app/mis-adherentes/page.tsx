
import { GestionAdherentesSocio } from '@/components/adherentes/GestionAdherentesSocio';
import { Metadata } from 'next';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: `Mis Adherentes - ${siteConfig.name}`,
  description: `Gestiona tus adherentes en ${siteConfig.name}.`,
};

export default function MisAdherentesPage() {
  return (
    <div className="container mx-auto py-8">
      <GestionAdherentesSocio />
    </div>
  );
}
