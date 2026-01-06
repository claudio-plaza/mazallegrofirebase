
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';

export async function GET() {
  try {
    const today = new Date();
    const todayISO = today.toISOString().split('T')[0];
    
    console.log(`Debugging guests for date: ${todayISO}`);

    const q = query(
      collection(db, 'solicitudesInvitadosDiarios'),
      where('fecha', '==', todayISO)
    );

    const snapshot = await getDocs(q);
    const results = snapshot.docs.map(doc => ({
      id: doc.id,
      data: doc.data()
    }));

    return NextResponse.json({ 
      count: results.length,
      date: todayISO,
      results 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
