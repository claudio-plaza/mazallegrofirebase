import { AltaSocioMultiStepForm } from '@/components/perfil/AltaSocioMultiStepForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Solicitud de Alta / Mi Perfil - ClubZenith',
  description: 'Completa tus datos para registrarte como socio en ClubZenith o actualiza tu perfil.',
};

export default function PerfilPage() {
  return (
    <div className="container mx-auto py-8">
      <AltaSocioMultiStepForm />
    </div>
  );
}
