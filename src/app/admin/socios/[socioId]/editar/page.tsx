
import { AdminEditarSocioForm } from '@/components/admin/AdminEditarSocioForm';
import { siteConfig } from '@/config/site';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: `Editar Socio - ${siteConfig.name} Admin`,
  description: 'Modifica los datos de un socio del club.',
};

interface EditarSocioPageProps {
  params: {
    socioId: string;
  };
}

export default function EditarSocioPage({ params }: EditarSocioPageProps) {
  return (
    <div className="container mx-auto py-8">
      <AdminEditarSocioForm socioId={params.socioId} />
    </div>
  );
}
