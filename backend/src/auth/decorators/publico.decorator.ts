import { SetMetadata } from '@nestjs/common';

/** Clave de metadatos que marca un handler/controlador como público. */
export const PUBLICO_KEY = 'es_publico';

/**
 * Marca una ruta como pública (equivale a `security: []` en el contrato): el
 * `JwtAuthGuard` global la deja pasar sin exigir token. Úsalo en los endpoints
 * de registro, login y refresh.
 */
export const Publico = () => SetMetadata(PUBLICO_KEY, true);
