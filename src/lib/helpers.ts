
import { format, parseISO, isAfter, isEqual, isValid, differenceInDays, differenceInYears, getMonth, getDate as getDayOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import type { AptoMedicoInfo } from '@/types';

export const formatDate = (dateInput?: string | Date, formatStr: string = 'dd/MM/yyyy'): string => {
  if (!dateInput) return 'N/A';
  try {
    let date: Date;
    if (dateInput instanceof Date) {
      date = dateInput;
    } else if (typeof dateInput === 'string') {
      date = parseISO(dateInput);
    } else {
      // This case should not be reached if TypeScript is doing its job with the string | Date union type
      console.error("formatDate received an invalid type:", dateInput);
      return 'Entrada inválida';
    }
    
    if (!isValid(date)) return 'Fecha inválida';
    return format(date, formatStr, { locale: es });
  } catch (error) {
    console.error("Error formatting date:", dateInput, error);
    return 'Error fecha';
  }
};

export const getAptoMedicoStatus = (aptoMedico?: AptoMedicoInfo | null, fechaNacimiento?: string | Date): { status: string; message: string; colorClass: string } => {
  if (fechaNacimiento) {
    try {
      const birthDate = typeof fechaNacimiento === 'string' ? parseISO(fechaNacimiento) : fechaNacimiento;
      if (isValid(birthDate)) {
        const age = differenceInYears(new Date(), birthDate);
        if (age < 3) {
          return { status: 'No Aplica', message: 'Menor de 3 años (revisión no requerida)', colorClass: 'text-gray-600 bg-gray-100' };
        }
      }
    } catch (e) {
      // Ignore error in parsing fechaNacimiento, proceed with aptoMedico logic
    }
  }

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
    hoy.setHours(0, 0, 0, 0); 

    let fechaVencimientoDate: Date;
    if (aptoMedico.fechaVencimiento instanceof Date) {
      fechaVencimientoDate = aptoMedico.fechaVencimiento;
    } else if (typeof aptoMedico.fechaVencimiento === 'string') {
      fechaVencimientoDate = parseISO(aptoMedico.fechaVencimiento);
    } else {
      console.error("Invalid type for aptoMedico.fechaVencimiento:", aptoMedico.fechaVencimiento);
      return { status: 'Error', message: 'Formato de fecha de vencimiento interno inválido.', colorClass: 'text-red-600 bg-red-100' };
    }
    
    if (!isValid(fechaVencimientoDate)) {
        return { status: 'Error', message: 'Fecha de vencimiento inválida tras procesar.', colorClass: 'text-red-600 bg-red-100' };
    }

    const fechaVencimientoComparable = new Date(fechaVencimientoDate.valueOf());
    fechaVencimientoComparable.setHours(23,59,59,999); 

    if (isAfter(fechaVencimientoComparable, hoy) || isEqual(fechaVencimientoComparable, hoy)) {
      const daysLeft = differenceInDays(fechaVencimientoComparable, hoy);
      let colorClass = 'text-green-600 bg-green-100';
      if (daysLeft <= 7) colorClass = 'text-orange-600 bg-orange-100'; 

      return { status: 'Válido', message: `Válido hasta: ${formatDate(fechaVencimientoDate)}`, colorClass };
    } else {
      return { status: 'Vencido', message: `Vencido (Venció el ${formatDate(fechaVencimientoDate)})`, colorClass: 'text-red-600 bg-red-100' };
    }
  }
  
  if (aptoMedico.valido && !aptoMedico.fechaVencimiento) {
     return { status: 'Válido', message: 'Válido (Sin fecha de vencimiento especificada)', colorClass: 'text-green-600 bg-green-100' };
  }

  return { status: 'Pendiente', message: 'Apto médico pendiente o información incompleta', colorClass: 'text-yellow-600 bg-yellow-100' };
};



export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

export const esCumpleanosHoy = (fechaNacimientoInput?: Date | string): boolean => {
  if (!fechaNacimientoInput) return false;
  
  let fechaNac: Date;
  if (typeof fechaNacimientoInput === 'string') {
    fechaNac = parseISO(fechaNacimientoInput);
  } else if (fechaNacimientoInput instanceof Date) {
    fechaNac = fechaNacimientoInput;
  } else {
    return false; 
  }

  if (!isValid(fechaNac) || fechaNac.getTime() === new Date(0).getTime()) {
    return false;
  }

  const hoy = new Date();
  // Comparamos solo mes y día
  return getMonth(hoy) === getMonth(fechaNac) && getDayOfMonth(hoy) === getDayOfMonth(fechaNac);
};

export const normalizeText = (text: string | number | undefined | null): string => {
  if (text === undefined || text === null) return '';
  return String(text)
    .normalize('NFD') // Descompone caracteres acentuados (e.g., 'á' -> 'a' + '´')
    .replace(/[\u0300-\u036f]/g, '') // Elimina los diacríticos (acentos)
    .toLowerCase(); // Convierte a minúsculas
};

export const esFechaRestringidaParaCumpleanos = (fecha: Date): boolean => {
  if (!isValid(fecha)) return false;
  const mes = getMonth(fecha); // 0 (Enero) a 11 (Diciembre)
  const dia = getDayOfMonth(fecha);

  // 25 de Diciembre
  if (mes === 11 && dia === 25) return true;
  // 1 de Enero
  if (mes === 0 && dia === 1) return true;

  return false;
};
