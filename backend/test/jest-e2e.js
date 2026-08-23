/**
 * Configuración de la suite e2e.
 *
 * Está en `.js` y no en `.json` para poder documentar el porqué de cada opción
 * junto a la opción misma: Jest valida las claves desconocidas, así que un JSON
 * con claves de comentario emite warnings en cada ejecución.
 */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '.e2e-spec.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },

  // Fija `process.env` antes de que se importe la aplicación. Ver `setup-env.ts`.
  setupFiles: ['<rootDir>/setup-env.ts'],

  // EN SERIE a propósito: todas las specs comparten la misma base de test y la
  // limpian entre pruebas con TRUNCATE. En paralelo, el TRUNCATE de una spec
  // borraría los datos de otra a media ejecución y produciría fallos
  // intermitentes — la clase de fallo que erosiona la confianza en una suite
  // hasta que alguien la desactiva.
  //
  // Si la suite crece hasta que el tiempo en serie moleste, la salida es una
  // base por worker (`validalab_test_${JEST_WORKER_ID}`), NO subir este número.
  maxWorkers: 1,

  // Holgado porque el primer arranque crea la base de test y aplica las
  // migraciones.
  testTimeout: 60000,
};
