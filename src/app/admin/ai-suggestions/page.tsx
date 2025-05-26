import { AISuggestionsTool } from '@/components/admin/AISuggestions';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sugerencias AI para Socios - ClubZenith Admin',
  description: 'Utiliza AI para obtener recomendaciones sobre el estado de los socios.',
};

export default function AISuggestionsPage() {
  return (
    <div className="container mx-auto py-8">
      <AISuggestionsTool />
    </div>
  );
}
