import { AltaSocioMultiStepForm } from '@/components/perfil/AltaSocioMultiStepForm';
import { Metadata } from 'next';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: `Solicitud de Alta / Mi Perfil - ${siteConfig.name}`,
  description: `Completa tus datos para registrarte como socio en ${siteConfig.name} o actualiza tu perfil.`,
};

export default function PerfilPage() {
  return (
    <div className="container mx-auto py-8">
      <AltaSocioMultiStepForm />
    </div>
  );
}
