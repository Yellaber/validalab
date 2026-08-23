/**
 * Entorno de la suite e2e. Jest lo carga vía `setupFiles`, ANTES de que se
 * importe la aplicación.
 *
 * Funciona porque `@nestjs/config` usa dotenv, y dotenv **no pisa** variables ya
 * presentes en `process.env`. Fijándolas aquí, la app arranca con este entorno
 * aunque exista un `.env` de desarrollo — y sin meter lógica de test dentro de
 * `ConfigModule`.
 *
 * ⚠️ `DB_DATABASE` apunta a una base **de test** que la suite VACÍA entre
 * pruebas. Nunca la apuntes a tu base de desarrollo: perderías los datos.
 */

/** Valor por defecto solo si la variable no viene ya del entorno (p. ej. del CI). */
function porDefecto(clave: string, valor: string): void {
  process.env[clave] ??= valor;
}

porDefecto('NODE_ENV', 'test');

// --- Base de datos de test ---
porDefecto('DB_HOST', 'localhost');
porDefecto('DB_PORT', '5432');
porDefecto('DB_USERNAME', 'validalab');
porDefecto('DB_PASSWORD', 'validalab');
// Distinta de la de desarrollo, a propósito.
porDefecto('DB_DATABASE', 'validalab_test');
porDefecto('DB_SYNCHRONIZE', 'false');

// --- Secretos de test (no son secretos reales: solo viven en esta suite) ---
porDefecto('JWT_ACCESS_SECRET', 'secreto-de-test-solo-para-la-suite-e2e');
porDefecto('JWT_ACCESS_TTL', '15m');
porDefecto('REFRESH_TOKEN_TTL', '30d');
porDefecto('COOKIE_SECURE', 'false');
porDefecto('BYOK_CLAVE_CIFRADO', 'a'.repeat(64));
porDefecto(
  'BOOTSTRAP_TOKEN',
  'token-de-bootstrap-para-la-suite-e2e-0123456789',
);

// --- Nada de red ---
// El agente responde de forma determinista sin invocar a ningún proveedor, y las
// API keys BYOK no se validan contra servicios externos. La suite no sale a
// internet en ningún momento.
porDefecto('AGENTE_MODO', 'fake');
porDefecto('BYOK_VALIDAR_KEY', 'false');
