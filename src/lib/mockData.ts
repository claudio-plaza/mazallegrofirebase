import type { Socio, RevisionMedica, UserRole } from '@/types';
import { addDays, subDays, formatISO, subMonths, subYears } from 'date-fns';

const today = new Date();

export const mockSocios: Socio[] = [
  {
    id: '1001',
    numeroSocio: '1001',
    nombre: 'Juan',
    apellido: 'Pérez',
    dni: '12345678',
    fechaNacimiento: subYears(today, 30), // 30 years old
    fotoUrl: 'https://placehold.co/150x150.png',
    estadoSocio: 'Activo',
    aptoMedico: {
      valido: true,
      fechaEmision: formatISO(subDays(today, 10)),
      fechaVencimiento: formatISO(addDays(subDays(today, 10), 14)), // Vence en 4 dias
      observaciones: 'Apto para actividad física moderada.',
    },
    email: 'juan.perez@example.com',
    telefono: '1122334455',
    direccion: 'Calle Falsa 123',
    empresa: EmpresaTitular.OSDE,
    miembroDesde: formatISO(subMonths(today, 6)),
    ultimaRevisionMedica: formatISO(subDays(today, 10)),
    grupoFamiliar: [],
    role: 'socio',
  },
  {
    id: '1002',
    numeroSocio: '1002',
    nombre: 'Ana',
    apellido: 'García',
    dni: '87654321',
    fechaNacimiento: subYears(today, 25),
    fotoUrl: 'https://placehold.co/150x150.png',
    estadoSocio: 'Activo',
    aptoMedico: {
      valido: false,
      fechaEmision: formatISO(subDays(today, 20)),
      fechaVencimiento: formatISO(addDays(subDays(today, 20), 14)), // Vencido hace 6 días
      razonInvalidez: 'Vencido',
      observaciones: 'Requiere nueva evaluación.',
    },
    email: 'ana.garcia@example.com',
    telefono: '5544332211',
    direccion: 'Avenida Siempreviva 742',
    empresa: EmpresaTitular.SWISS_MEDICAL,
    miembroDesde: formatISO(subMonths(today, 12)),
    ultimaRevisionMedica: formatISO(subDays(today, 20)),
    grupoFamiliar: [],
    role: 'socio',
  },
  {
    id: '1003',
    numeroSocio: '1003',
    nombre: 'Carlos',
    apellido: 'Rodríguez',
    dni: '11223344',
    fechaNacimiento: subYears(today, 40),
    fotoUrl: 'https://placehold.co/150x150.png',
    estadoSocio: 'Inactivo',
    aptoMedico: {
      valido: false,
      razonInvalidez: 'Pendiente de presentación',
    },
    email: 'carlos.rodriguez@example.com',
    telefono: '6677889900',
    direccion: 'Boulevard de los Sueños Rotos 45',
    empresa: EmpresaTitular.GALENO,
    miembroDesde: formatISO(subMonths(today, 24)),
    grupoFamiliar: [],
    role: 'socio',
  },
  {
    id: '1004',
    numeroSocio: '1004',
    nombre: 'Laura',
    apellido: 'Martínez',
    dni: '44332211',
    fechaNacimiento: subYears(today, 35),
    fotoUrl: 'https://placehold.co/150x150.png',
    estadoSocio: 'Activo',
    aptoMedico: {
      valido: true,
      fechaEmision: formatISO(subDays(today, 3)),
      fechaVencimiento: formatISO(addDays(subDays(today, 3), 14)), // Vence en 11 días
      observaciones: 'Sin restricciones.',
    },
    email: 'laura.martinez@example.com',
    telefono: '9988776655',
    direccion: 'Pasaje de la Alegría 88',
    empresa: EmpresaTitular.MEDICUS,
    miembroDesde: formatISO(subMonths(today, 3)),
    ultimaRevisionMedica: formatISO(subDays(today, 3)),
    grupoFamiliar: [],
    role: 'socio',
  },
];

export const mockRevisiones: RevisionMedica[] = [
  {
    id: 'rev001',
    fechaRevision: formatISO(subDays(today, 10)),
    socioId: '1001',
    socioNombre: 'Juan Pérez',
    resultado: 'Apto',
    fechaVencimientoApto: formatISO(addDays(subDays(today, 10), 14)),
    observaciones: 'Apto para actividad física moderada.',
    medicoResponsable: 'Dr. House',
  },
  {
    id: 'rev002',
    fechaRevision: formatISO(subDays(today, 20)),
    socioId: '1002',
    socioNombre: 'Ana García',
    resultado: 'Apto', // Fue apto, pero ya venció
    fechaVencimientoApto: formatISO(addDays(subDays(today, 20), 14)),
    observaciones: 'Requiere nueva evaluación.',
    medicoResponsable: 'Dra. Quinn',
  },
  {
    id: 'rev003',
    fechaRevision: formatISO(subDays(today, 3)),
    socioId: '1004',
    socioNombre: 'Laura Martínez',
    resultado: 'Apto',
    fechaVencimientoApto: formatISO(addDays(subDays(today, 3), 14)),
    observaciones: 'Sin restricciones.',
    medicoResponsable: 'Dr. House',
  },
];

// Define EmpresaTitular enum if not already globally available
enum EmpresaTitular {
  OSDE = "OSDE",
  SWISS_MEDICAL = "Swiss Medical",
  GALENO = "Galeno",
  MEDICUS = "Medicus",
  OMINT = "Omint",
  SANCOR_SALUD = "Sancor Salud",
  OTRA = "Otra",
  NINGUNA = "Ninguna",
}
