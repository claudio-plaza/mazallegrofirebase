'use client';

import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getSocio } from '@/lib/firebase/firestoreService';
import { normalizeText, parseAnyDate } from '@/lib/helpers';
import { Search, Loader2 } from 'lucide-react';
import type { Socio, AptoMedicoInfo, TipoPersona } from '@/types';

// Esta interfaz define la estructura de la persona encontrada, para ser usada por los componentes padres.
export interface PersonaEncontrada {
  id: string;
  nombreCompleto: string;
  dni?: string;
  numeroSocio?: string;
  fechaNacimiento?: string | Date;
  fotoUrl?: string;
  aptoMedico?: AptoMedicoInfo;
  tipo: TipoPersona;
  socioAnfitrionNombre?: string;
  socioAnfitrionNumero?: string;
  // Raw data from firestore/algolia can be useful for parent components
  rawData?: any; 
}

interface BuscadorUniversalProps {
  onSelect: (persona: PersonaEncontrada) => void;
  onNotFound: () => void;
  onSearchStart: () => void;
  onSearchEnd: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export default function BuscadorUniversal({ 
  onSelect, 
  onNotFound,
  onSearchStart,
  onSearchEnd,
  placeholder = "Buscar por N° Socio, DNI, Nombre...", 
  autoFocus = false 
}: BuscadorUniversalProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim()) {
      toast({ title: "Búsqueda vacía", description: "Por favor, ingrese un término de búsqueda.", variant: "default" });
      return;
    }

    onSearchStart();
    let personForPanel: PersonaEncontrada | null = null;

    try {
      const functions = getFunctions();
      const searchSocio = httpsCallable(functions, 'searchSocio');
      const normalizedTerm = normalizeText(searchTerm);
      const { data }: any = await searchSocio({ searchTerm: normalizedTerm });
      const { results } = data;
      const algoliaHit = results && results.length > 0 ? results[0] : null;

      if (algoliaHit) {
        const { objectID, type } = algoliaHit;

        switch (type) {
          case 'Socio Titular': {
            const socio = await getSocio(objectID);
            if (socio) {
              personForPanel = {
                id: socio.id,
                nombreCompleto: `${socio.nombre} ${socio.apellido}`,
                dni: socio.dni,
                numeroSocio: socio.numeroSocio,
                fechaNacimiento: socio.fechaNacimiento,
                fotoUrl: socio.fotoUrl ?? undefined,
                aptoMedico: socio.aptoMedico,
                tipo: 'Socio Titular',
                rawData: socio,
              };
            }
            break;
          }
          case 'Familiar':
          case 'Adherente': {
            const [titularId, personaDNI] = objectID.split('-');
            const socioTitular = await getSocio(titularId);
            if (socioTitular) {
              const persona = type === 'Familiar'
                ? socioTitular.familiares?.find(f => f.dni === personaDNI)
                : socioTitular.adherentes?.find(a => a.dni === personaDNI);

              if (persona) {
                personForPanel = {
                  id: persona.dni,
                  nombreCompleto: `${persona.nombre} ${persona.apellido}`,
                  dni: persona.dni,
                  fechaNacimiento: persona.fechaNacimiento,
                  aptoMedico: persona.aptoMedico,
                  tipo: type,
                  socioAnfitrionNombre: `${socioTitular.nombre} ${socioTitular.apellido}`,
                  socioAnfitrionNumero: socioTitular.numeroSocio,
                  rawData: persona,
                };
              }
            }
            break;
          }
          case 'Invitado Diario': {
            personForPanel = {
              id: algoliaHit.dni,
              nombreCompleto: algoliaHit.nombreCompleto,
              dni: algoliaHit.dni,
              fechaNacimiento: algoliaHit.fechaNacimiento ? (parseAnyDate(algoliaHit.fechaNacimiento) ?? undefined) : undefined,
              aptoMedico: algoliaHit.aptoMedico || undefined,
              tipo: 'Invitado Diario',
              socioAnfitrionNombre: algoliaHit.socioTitularNombre || 'Desconocido',
              socioAnfitrionNumero: algoliaHit.socioTitularId,
              rawData: algoliaHit,
            };
            break;
          }
        }
      }

      if (personForPanel) {
        onSelect(personForPanel);
      } else {
        onNotFound();
      }

    } catch (error: any) {
      console.error("Error en BuscadorUniversal:", error);
      toast({ title: "Error de Búsqueda", description: error.message || "No se pudo completar la búsqueda.", variant: "destructive" });
      onNotFound();
    } finally {
      onSearchEnd();
    }
  }, [searchTerm, toast, onSelect, onNotFound, onSearchStart, onSearchEnd]);

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="flex space-x-2 w-full">
      <Input
        type="text"
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyPress={handleKeyPress}
        autoFocus={autoFocus}
        className="flex-grow"
      />
      <Button onClick={handleSearch}>
        <Search className="mr-2 h-4 w-4" /> Buscar
      </Button>
    </div>
  );
}
