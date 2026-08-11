import { EstadoIdea } from '../../core/api/idea.model';

/** Etiqueta legible para cada `EstadoIdea` (terminología del SRS, en español). */
export const ETIQUETA_ESTADO: Record<EstadoIdea, string> = {
  borrador: 'Borrador',
  en_validacion: 'En validación',
  go: 'Go',
  pivote: 'Pivote',
  kill: 'Kill',
  archivada: 'Archivada',
};

/** Estados ofrecidos en el filtro del listado, en orden del ciclo de validación. */
export const ESTADOS_IDEA: EstadoIdea[] = [
  'borrador',
  'en_validacion',
  'go',
  'pivote',
  'kill',
  'archivada',
];
