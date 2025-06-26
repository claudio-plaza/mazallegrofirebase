
import { AISuggestionsTool } from '@/components/admin/AISuggestions';
import { Metadata } from 'next';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: `Sugerencias de IA - ${siteConfig.name} Admin`,
  description: 'Utilice la IA para obtener sugerencias sobre el estado de los socios.',
};

export default function AISuggestionsPage() {
  return (
    <div className="container mx-auto py-8">
      <AISuggestionsTool />
    </div>
  );
}
