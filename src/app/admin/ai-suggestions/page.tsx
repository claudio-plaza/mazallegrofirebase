import { AISuggestionsTool } from '@/components/admin/AISuggestions';
import { Metadata } from 'next';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: `Sugerencias AI para Socios - ${siteConfig.name} Admin`,
  description: 'Utiliza AI para obtener recomendaciones sobre el estado de los socios.',
};

export default function AISuggestionsPage() {
  return (
    <div className="container mx-auto py-8">
      <AISuggestionsTool />
    </div>
  );
}
