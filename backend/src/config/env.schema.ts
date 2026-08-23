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
  // (p. ej. 30d, 12h). Fija también el `Max-Age` de la cookie de refresh.
  REFRESH_TOKEN_TTL: z.string().min(1).default('30d'),
  // Flag `Secure` de la cookie de refresh: en producción DEBE ser `true` (solo
  // HTTPS); en dev sobre `http://localhost` se pone `false` para que el navegador
  // acepte la cookie.
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  // Orígenes permitidos por CORS (separados por coma). Con credenciales (la cookie
  // de refresh) el origen NO puede ser `*`: debe listarse explícitamente.
  CORS_ORIGINS: z.string().min(1).default('http://localhost:4200'),

  // --- Inicialización del sistema ---
  // Secreto que autoriza `POST /sistema/inicializar` (cabecera `X-Bootstrap-Token`),
  // la única operación que lo acepta. Es OPCIONAL a propósito: un sistema que ya
  // fue inicializado no lo necesita, y exigirlo rompería el arranque de todo
  // despliegue en marcha. Si no está configurado, el guard rechaza TODA petición
  // de inicialización (el fallo por defecto es denegar). El mínimo de 32
  // caracteres evita que un secreto trivial pase inadvertido.
  // Un valor vacío (`BOOTSTRAP_TOKEN=` en el .env) se trata como «sin configurar»:
  // es lo que el operador quiere decir, y evita que copiar la plantilla aborte el
  // arranque por un `.min(32)` sobre la cadena vacía.
  BOOTSTRAP_TOKEN: z.preprocess(
    (valor) => (valor === '' ? undefined : valor),
    z.string().min(32).optional(),
  ),

  // --- BYOK (configuración del proveedor de IA por usuario) ---
  // Clave AES-256 (32 bytes = 64 hex) para cifrar en reposo las API keys BYOK.
  BYOK_CLAVE_CIFRADO: z
    .string()
    .regex(
      /^[0-9a-fA-F]{64}$/,
      'Debe ser 64 caracteres hexadecimales (32 bytes).',
    ),
  // Si es `false`, la API key no se valida contra el proveedor real (dev/test):
  // cualquier key no vacía se acepta. En producción debe ser `true`.
  BYOK_VALIDAR_KEY: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),

  // --- Agente (Validador Inteligente) ---
  // `fake` corta la capa agéntica y produce una salida de scoring determinista
  // sin invocar a ningún proveedor ni salir a la red (dev/test). `real` invoca
  // al proveedor configurado por el usuario (BYOK).
  AGENTE_MODO: z.enum(['real', 'fake']).default('real'),
  // Límite de iteraciones del grafo por ejecución (recursionLimit de LangGraph).
  AGENTE_MAX_ITERACIONES: z.coerce.number().int().positive().default(6),
  // Timeout por ejecución del agente, en milisegundos.
  AGENTE_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  // Reintentos ante una salida que no cumple el esquema Zod antes de fallar.
  AGENTE_MAX_REINTENTOS: z.coerce.number().int().min(0).default(2),
  // Versión de la rúbrica de scoring; participa en el hash de idempotencia.
  // Súbela para invalidar todos los scores previos sin tocar datos. `v2` añade
  // las señales estructuradas por entrevista que alimentan los KPIs de señal (E5).
  SCORING_VERSION_RUBRICA: z.string().min(1).default('v2'),
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
