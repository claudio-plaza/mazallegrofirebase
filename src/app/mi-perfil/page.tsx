
import { VistaPerfilSocio } from '@/components/perfil/VistaPerfilSocio';
import { Metadata } from 'next';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: `Mi Perfil - ${siteConfig.name}`,
  description: `Visualiza tus datos personales y de membresía en ${siteConfig.name}.`,
};

export default function MiPerfilPage() {
  return (
    <div className="container mx-auto py-8">
      <VistaPerfilSocio />
    </div>
  );
}
