
import type { Socio, RevisionMedica, UserRole, MiembroFamiliar, AptoMedicoInfo } from '@/types';
import { RelacionFamiliar, EmpresaTitular } from '@/types'; // Added EmpresaTitular
import { addDays, subDays, formatISO, subMonths, subYears } from 'date-fns';

const today = new Date();

const mockFamiliaresJuan: MiembroFamiliar[] = [
  {
    id: 'fam-jp-1',
    nombre: 'Maria',
    apellido: 'Gonzalez',
    dni: '12345679',
    fechaNacimiento: subYears(today, 28),
    relacion: RelacionFamiliar.CONYUGE,
    aptoMedico: {
      valido: true,
      fechaEmision: formatISO(subDays(today, 5)),
      fechaVencimiento: formatISO(addDays(subDays(today, 5), 14)), // Vence en 9 días
      observaciones: 'Apta.',
    },
    // Fotos opcionales para mock
  },
  {
    id: 'fam-jp-2',
    nombre: 'Pedro',
    apellido: 'Pérez',
    dni: '55667788',
    fechaNacimiento: subYears(today, 5),
    relacion: RelacionFamiliar.HIJO_A,
    aptoMedico: {
      valido: true,
      fechaEmision: formatISO(subDays(today, 2)),
      fechaVencimiento: formatISO(addDays(subDays(today, 2), 14)), // Vence en 12 días
      observaciones: 'Apto para deportes infantiles.',
    },
  }
];

const mockFamiliaresLaura: MiembroFamiliar[] = [
  {
    id: 'fam-lg-1',
    nombre: 'Marcos',
    apellido: 'Diaz',
    dni: '21223344',
    fechaNacimiento: subYears(today, 33),
    relacion: RelacionFamiliar.CONYUGE,
    aptoMedico: {
      valido: true,
      fechaEmision: formatISO(subDays(today, 7)),
      fechaVencimiento: formatISO(addDays(subDays(today, 7), 14)), // Vence en 7 días
      observaciones: 'Apto.',
    },
  },
  {
    id: 'fam-lg-2',
    nombre: 'Sofia',
    apellido: 'Diaz',
    dni: '66778899',
    fechaNacimiento: subYears(today, 6),
    relacion: RelacionFamiliar.HIJO_A,
    aptoMedico: { // Pendiente
      valido: false,
      razonInvalidez: 'Pendiente de presentación',
    },
  },
  {
    id: 'fam-lg-3',
    nombre: 'Lucas',
    apellido: 'Diaz',
    dni: '77889900',
    fechaNacimiento: subYears(today, 4),
    relacion: RelacionFamiliar.HIJO_A,
    aptoMedico: {
      valido: true,
      fechaEmision: formatISO(subDays(today, 1)),
      fechaVencimiento: formatISO(addDays(subDays(today, 1), 14)), // Vence en 13 días
      observaciones: 'Apto.',
    },
  }
];

export const mockSocios: Socio[] = [
  {
    id: '1001',
    numeroSocio: '1001',
    nombre: 'Juan',
    apellido: 'Pérez',
    dni: '12345678',
    fechaNacimiento: subYears(today, 30), 
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
    grupoFamiliar: mockFamiliaresJuan,
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
  {
    id: '1005',
    numeroSocio: '1005',
    nombre: 'Laura',
    apellido: 'Gomez',
    dni: '22334455',
    fechaNacimiento: subYears(today, 32),
    fotoUrl: 'https://placehold.co/150x150.png',
    estadoSocio: 'Activo',
    aptoMedico: {
      valido: true,
      fechaEmision: formatISO(subDays(today, 4)),
      fechaVencimiento: formatISO(addDays(subDays(today, 4), 14)), // Vence en 10 días
      observaciones: 'Apta.',
    },
    email: 'laura.gomez@example.com',
    telefono: '3344556677',
    direccion: 'Calle Sol Naciente 321',
    empresa: EmpresaTitular.SADOP,
    miembroDesde: formatISO(subMonths(today, 18)),
    ultimaRevisionMedica: formatISO(subDays(today, 4)),
    grupoFamiliar: mockFamiliaresLaura,
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
    resultado: 'Apto', 
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
  {
    id: 'rev-fam-jp-1',
    fechaRevision: formatISO(subDays(today, 5)),
    socioId: 'fam-jp-1', 
    socioNombre: 'Maria Gonzalez',
    resultado: 'Apto',
    fechaVencimientoApto: formatISO(addDays(subDays(today, 5), 14)),
    observaciones: 'Apta.',
    medicoResponsable: 'Dr. House',
  },
   {
    id: 'rev-fam-jp-2',
    fechaRevision: formatISO(subDays(today, 2)),
    socioId: 'fam-jp-2',
    socioNombre: 'Pedro Pérez',
    resultado: 'Apto',
    fechaVencimientoApto: formatISO(addDays(subDays(today, 2), 14)),
    observaciones: 'Apto para deportes infantiles.',
    medicoResponsable: 'Dra. Quinn',
  },
  {
    id: 'rev-lg-1',
    fechaRevision: formatISO(subDays(today, 4)),
    socioId: '1005', // Titular Laura Gomez
    socioNombre: 'Laura Gomez',
    resultado: 'Apto',
    fechaVencimientoApto: formatISO(addDays(subDays(today, 4), 14)),
    observaciones: 'Apta.',
    medicoResponsable: 'Dra. Quinn',
  },
  {
    id: 'rev-fam-lg-1',
    fechaRevision: formatISO(subDays(today, 7)),
    socioId: 'fam-lg-1', // Conyuge Marcos Diaz
    socioNombre: 'Marcos Diaz',
    resultado: 'Apto',
    fechaVencimientoApto: formatISO(addDays(subDays(today, 7), 14)),
    observaciones: 'Apto.',
    medicoResponsable: 'Dr. House',
  },
  {
    id: 'rev-fam-lg-3', // Para Lucas Diaz (Sofia está pendiente)
    fechaRevision: formatISO(subDays(today, 1)),
    socioId: 'fam-lg-3', 
    socioNombre: 'Lucas Diaz',
    resultado: 'Apto',
    fechaVencimientoApto: formatISO(addDays(subDays(today, 1), 14)),
    observaciones: 'Apto.',
    medicoResponsable: 'Dr. House',
  },
];
