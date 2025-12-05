'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from './useAuth';

export function useSolicitudesFamiliaresCount() {
  const [count, setCount] = useState(0);
  const { userRole } = useAuth();

  useEffect(() => {
    // Only run the query if the user is an admin
    if (userRole !== 'admin') {
      setCount(0);
      return;
    }

    const q = query(
      collection(db, 'socios'),
      where('estadoCambioFamiliares', '==', 'Pendiente')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      setCount(querySnapshot.size);
    }, (error) => {
      console.error("Error fetching pending solicitudes count:", error);
      setCount(0);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [userRole]);

  return count;
}
