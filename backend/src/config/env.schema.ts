import { z } from 'zod';

/**
 * Esquema de las variables de entorno del backend. Se valida una sola vez al
 * arrancar (fail-fast): si falta una obligatoria o es inválida, la app no
 * arranca. Aplica coerción (los env vars siempre llegan como string) y valores
 * por defecto donde el contrato/operación lo permite.
 */
export const envSchema = z.object({
  // --- Aplicación ---
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  // --- PostgreSQL (TypeORM) ---
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_USERNAME: z.string().min(1),
  // La contraseña puede ser vacía (p. ej. auth `trust` local), pero la variable
  // debe estar presente.
  DB_PASSWORD: z.string(),
  DB_DATABASE: z.string().min(1),
  // La sincronización automática de esquema queda desactivada por defecto; el
  // esquema real se gobierna con migraciones. Solo se habilita en un arranque
  // local desechable.
  DB_SYNCHRONIZE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),

  // --- JWT (firma y verificación del accessToken) ---
  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_ACCESS_TTL: z.string().min(1).default('15m'),

  // --- Sesión / refresh token ---
  // Vigencia del refresh token opaco (se almacena hasheado). Formato de `ms`
  // (p. ej. 30d, 12h).
  REFRESH_TOKEN_TTL: z.string().min(1).default('30d'),
});

/** Configuración del entorno ya validada y con tipos derivados. */
export type Env = z.infer<typeof envSchema>;

/**
 * Valida el entorno crudo contra `envSchema`. La usa `@nestjs/config` como
 * `validate`. Si la validación falla, lanza un error con el detalle campo a
 * campo para que el operador sepa exactamente qué variable corregir.
 */
export function validateEnv(config: Record<string, unknown>): Env {
  const resultado = envSchema.safeParse(config);

  if (!resultado.success) {
    const detalle = resultado.error.issues
      .map((issue) => {
        const campo = issue.path.join('.') || '(raíz)';
        return `  - ${campo}: ${issue.message}`;
      })
      .join('\n');

    throw new Error(
      `Configuración de entorno inválida. Revisa tu archivo .env o las variables de entorno:\n${detalle}`,
    );
  }

  return resultado.data;
}
