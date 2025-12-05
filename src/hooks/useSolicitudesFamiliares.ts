'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from './useAuth';
import type { Socio } from '@/types';

export function useSolicitudesFamiliares() {
  const [solicitudes, setSolicitudes] = useState<Socio[]>([]);
  const [loading, setLoading] = useState(true);
  const { userRole } = useAuth();

  useEffect(() => {
    if (userRole !== 'admin') {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'socios'),
      where('estadoCambioFamiliares', '==', 'Pendiente')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data: Socio[] = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Socio);
      });
      setSolicitudes(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching solicitudes:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userRole]);

  return { solicitudes, loading };
}
