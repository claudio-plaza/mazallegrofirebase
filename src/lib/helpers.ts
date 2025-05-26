import { format, parseISO, isAfter, isEqual, isValid, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import type { AptoMedicoInfo } from '@/types';

export const formatDate = (dateString?: string | Date, formatStr: string = 'dd/MM/yyyy'): string => {
  if (!dateString) return 'N/A';
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    if (!isValid(date)) return 'Fecha inválida';
    return format(date, formatStr, { locale: es });
  } catch (error) {
    console.error("Error formatting date:", error);
    return 'Error fecha';
  }
};

export const getAptoMedicoStatus = (aptoMedico?: AptoMedicoInfo): { status: 'Válido' | 'Vencido' | 'Inválido' | 'Pendiente'; message: string; colorClass: string } => {
  if (!aptoMedico) {
    return { status: 'Pendiente', message: 'Sin datos de apto médico', colorClass: 'text-yellow-600 bg-yellow-100' };
  }

  if (aptoMedico.valido === false && aptoMedico.razonInvalidez) {
    return { status: 'Inválido', message: `Inválido (${aptoMedico.razonInvalidez})`, colorClass: 'text-red-600 bg-red-100' };
  }
  
  if (aptoMedico.valido === false) {
    return { status: 'Inválido', message: 'No Apto (Razón no especificada)', colorClass: 'text-red-600 bg-red-100'};
  }

  if (aptoMedico.valido && aptoMedico.fechaVencimiento) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); // Comparar solo fechas
    const fechaVencimiento = parseISO(aptoMedico.fechaVencimiento);
    fechaVencimiento.setHours(23,59,59,999); // El apto es válido hasta el final del día de vencimiento

    if (isAfter(fechaVencimiento, hoy) || isEqual(fechaVencimiento, hoy)) {
      const daysLeft = differenceInDays(fechaVencimiento, hoy);
      let colorClass = 'text-green-600 bg-green-100';
      if (daysLeft <= 7) colorClass = 'text-orange-600 bg-orange-100'; // Próximo a vencer

      return { status: 'Válido', message: `Válido hasta: ${formatDate(aptoMedico.fechaVencimiento)}`, colorClass };
    } else {
      return { status: 'Vencido', message: `Vencido (Venció el ${formatDate(aptoMedico.fechaVencimiento)})`, colorClass: 'text-red-600 bg-red-100' };
    }
  }
  
  if (aptoMedico.valido && !aptoMedico.fechaVencimiento) {
     return { status: 'Válido', message: 'Válido (Sin fecha de vencimiento especificada)', colorClass: 'text-green-600 bg-green-100' };
  }

  return { status: 'Pendiente', message: 'Apto médico pendiente o información incompleta', colorClass: 'text-yellow-600 bg-yellow-100' };
};

export const getFileUrl = (fileList: FileList | null | undefined): string | null => {
  if (fileList && fileList.length > 0) {
    return URL.createObjectURL(fileList[0]);
  }
  return null;
};

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};
