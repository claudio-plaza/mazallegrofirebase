
import { Timestamp } from 'firebase/firestore';
import { format, parseISO, isAfter, isEqual, isValid, differenceInDays, differenceInYears, getMonth, getDate as getDayOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import type { AptoMedicoInfo, MiembroFamiliar, Adherente, AptoMedicoDisplay } from '@/types'; // Import AptoMedicoDisplay

export const parseAnyDate = (dateInput: any): Date | null => {
  if (!dateInput) return null;
  if (dateInput instanceof Date && isValid(dateInput)) {
    return dateInput;
  }
  if (typeof dateInput === 'string') {
    const parsed = parseISO(dateInput);
    if (isValid(parsed)) return parsed;
  }
  if (dateInput.seconds !== undefined && dateInput.nanoseconds !== undefined) {
    try {
      const date = new Timestamp(dateInput.seconds, dateInput.nanoseconds).toDate();
      if (isValid(date)) return date;
    } catch (error) {
      return null;
    }
  }
  return null;
};

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
      console.error("formatDate received an invalid type:", typeof dateInput, dateInput);
      return 'Entrada inválida';
    }
    
    if (!isValid(date)) return 'Fecha inválida';
    return format(date, formatStr, { locale: es });
  } catch (error) {
    console.error("Error formatting date:", dateInput, error);
    return 'Error fecha';
  }
};

export const getAptoMedicoStatus = (aptoMedico?: AptoMedicoInfo | null, fechaNacimiento?: string | Date): AptoMedicoDisplay => {
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

    let fechaVencimientoDate: Date | null = null;
    const fv = aptoMedico.fechaVencimiento as any;

    if (fv instanceof Date) {
      fechaVencimientoDate = fv;
    } else if (typeof fv === 'string') {
      fechaVencimientoDate = parseISO(fv);
    } else if (fv && typeof fv.seconds === 'number' && typeof fv.nanoseconds === 'number') {
      fechaVencimientoDate = new Timestamp(fv.seconds, fv.nanoseconds).toDate();
    } else {
      console.error("Invalid type for aptoMedico.fechaVencimiento:", fv);
      return { status: 'Error', message: 'Formato de fecha de vencimiento interno inválido.', colorClass: 'text-red-600 bg-red-100' };
    }
    
    if (!fechaVencimientoDate || !isValid(fechaVencimientoDate)) {
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

export const getEncryptedImageUrl = (path: string | undefined | null): string => {
  if (!path) {
    return '/logo-chico.png';
  }

  let finalPath: string;

  try {
    const url = new URL(path);
    const pathname = url.pathname;
    const match = pathname.match(/\/o\/(.*)/);
    
    if (match && match[1]) {
      const storagePath = match[1];
      const decodedPath = decodeURIComponent(storagePath);
      finalPath = `/api/images/${decodedPath}`;
    } else {
      finalPath = '/logo-chico.png';
    }
  } catch (error) {
    console.warn('[getEncryptedImageUrl] Path is not a full URL, treating as direct path:', path);
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    finalPath = `/api/images/${cleanPath}`;
  }

  if (finalPath === '/placeholder.png') {
    return finalPath;
  }

  // Agregar timestamp para cache busting
  const separator = finalPath.includes('?') ? '&' : '?';
  return `${finalPath}${separator}_t=${Date.now()}`;
};



export const convertTimestampToDate = (data: any): any => {
  if (data instanceof Timestamp) {
    return data.toDate();
  }
  if (typeof data === 'object' && data !== null) {
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        data[key] = convertTimestampToDate(data[key]);
      }
    }
  }
  return data;
};

export const generateKeywords = (
  nombre: string,
  apellido: string,
  dni: string,
  numeroSocio: string,
  grupoFamiliar?: MiembroFamiliar[], // Nuevo parámetro
  adherentes?: Adherente[] // Nuevo parámetro
): string[] => {
  const keywords = new Set<string>();

  // Keywords for the main socio
  const addSocioKeywords = (n: string, a: string, d: string, ns: string) => {
    const nombreNorm = normalizeText(n);
    const apellidoNorm = normalizeText(a);
    const dniNorm = normalizeText(d);
    const numeroSocioNorm = normalizeText(ns);

    keywords.add(nombreNorm);
    keywords.add(apellidoNorm);
    keywords.add(dniNorm);
    keywords.add(numeroSocioNorm);

    nombreNorm.split(' ').forEach(part => keywords.add(part));
    apellidoNorm.split(' ').forEach(part => keywords.add(part));
    keywords.add(`${nombreNorm} ${apellidoNorm}`);
  };

  addSocioKeywords(nombre, apellido, dni, numeroSocio);

  // Keywords for family members
  if (grupoFamiliar && grupoFamiliar.length > 0) {
    grupoFamiliar.forEach(fam => {
      if (fam.nombre && fam.apellido && fam.dni) {
        addSocioKeywords(fam.nombre, fam.apellido, fam.dni, ''); // No numeroSocio for family
      }
    });
  }

  // Keywords for adherentes
  if (adherentes && adherentes.length > 0) {
    adherentes.forEach(adh => {
      if (adh.nombre && adh.apellido && adh.dni) {
        addSocioKeywords(adh.nombre, adh.apellido, adh.dni, ''); // No numeroSocio for adherentes
      }
    });
  }

  return Array.from(keywords).filter(Boolean);
};
