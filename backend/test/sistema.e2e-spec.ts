import {
  AppE2E,
  cerrarAppE2E,
  crearAppE2E,
  limpiarBaseDeDatos,
} from './utils/app-e2e';
import {
  emailUnico,
  PASSWORD,
  servidorDe,
  TOKEN_BOOTSTRAP_TEST,
} from './utils/tenant';

/**
 * La inicialización es la única operación que produce el rol `administrador`, y
 * es irreversible. Su corrección depende de tres piezas que solo actúan juntas
 * en la app real: el guard del secreto, la restricción de fila única en la base
 * y la transacción que las une. Aquí se prueban como las ve un cliente.
 */
describe('Inicialización del sistema (e2e)', () => {
  let contexto: AppE2E;

  beforeAll(async () => {
    contexto = await crearAppE2E();
  });

  afterAll(async () => {
    await cerrarAppE2E(contexto);
  });

  beforeEach(async () => {
    // Deja el sistema virgen: la tabla del marcador también se vacía, así que
    // cada test parte de una instalación sin inicializar.
    await limpiarBaseDeDatos(contexto.dataSource);
  });

  const servidor = () => servidorDe(contexto.app);

  const cuenta = () => ({
    email: emailUnico('admin'),
    nombre: 'Administrador',
    password: PASSWORD,
  });

  it('crea la cuenta administradora con el secreto correcto', async () => {
    const respuesta = await servidor()
      .post('/sistema/inicializar')
      .set('X-Bootstrap-Token', TOKEN_BOOTSTRAP_TEST)
      .send(cuenta())
      .expect(201);

    expect(respuesta.body).toMatchObject({
      rol: 'administrador',
      estado: 'activo',
    });
    // Sin credenciales ni sesión: el administrador inicia sesión después.
    expect(respuesta.body).not.toHaveProperty('passwordHash');
    expect(respuesta.body).not.toHaveProperty('accessToken');
    expect(respuesta.headers['set-cookie']).toBeUndefined();
  });

  it('rechaza la inicialización sin la cabecera del secreto', async () => {
    const respuesta = await servidor()
      .post('/sistema/inicializar')
      .send(cuenta())
      .expect(401);

    expect(respuesta.body).toMatchObject({ codigo: 'NO_AUTENTICADO' });
  });

  it('rechaza un secreto incorrecto', async () => {
    const respuesta = await servidor()
      .post('/sistema/inicializar')
      .set('X-Bootstrap-Token', 'a'.repeat(TOKEN_BOOTSTRAP_TEST.length))
      .send(cuenta())
      .expect(401);

    expect(respuesta.body).toMatchObject({ codigo: 'NO_AUTENTICADO' });
  });

  it('deja el sistema inicializable tras un rechazo por secreto inválido', async () => {
    await servidor().post('/sistema/inicializar').send(cuenta()).expect(401);

    // El intento fallido no consumió la oportunidad.
    await servidor()
      .post('/sistema/inicializar')
      .set('X-Bootstrap-Token', TOKEN_BOOTSTRAP_TEST)
      .send(cuenta())
      .expect(201);
  });

  it('responde CONFLICTO al repetir, aunque el secreto sea correcto', async () => {
    await servidor()
      .post('/sistema/inicializar')
      .set('X-Bootstrap-Token', TOKEN_BOOTSTRAP_TEST)
      .send(cuenta())
      .expect(201);

    const segunda = await servidor()
      .post('/sistema/inicializar')
      .set('X-Bootstrap-Token', TOKEN_BOOTSTRAP_TEST)
      .send(cuenta())
      .expect(409);

    expect(segunda.body).toMatchObject({ codigo: 'CONFLICTO' });
  });

  it('devuelve 401 y no 409 cuando el sistema ya está inicializado pero el secreto es incorrecto', async () => {
    await servidor()
      .post('/sistema/inicializar')
      .set('X-Bootstrap-Token', TOKEN_BOOTSTRAP_TEST)
      .send(cuenta())
      .expect(201);

    // El orden de las comprobaciones importa: si el 409 se decidiera antes que
    // el secreto, el endpoint sería un oráculo público sobre el estado de la
    // instalación.
    const respuesta = await servidor()
      .post('/sistema/inicializar')
      .set('X-Bootstrap-Token', 'b'.repeat(TOKEN_BOOTSTRAP_TEST.length))
      .send(cuenta())
      .expect(401);

    expect(respuesta.body).toMatchObject({ codigo: 'NO_AUTENTICADO' });
  });

  it('rechaza un cuerpo inválido sin inicializar el sistema', async () => {
    const respuesta = await servidor()
      .post('/sistema/inicializar')
      .set('X-Bootstrap-Token', TOKEN_BOOTSTRAP_TEST)
      .send({ email: 'no-es-email', nombre: '', password: 'corta' })
      .expect(422);

    expect(respuesta.body).toMatchObject({ codigo: 'VALIDACION_FALLIDA' });

    // El intento inválido no consumió la única oportunidad.
    await servidor()
      .post('/sistema/inicializar')
      .set('X-Bootstrap-Token', TOKEN_BOOTSTRAP_TEST)
      .send(cuenta())
      .expect(201);
  });

  it('revierte el marcador si el alta falla, dejando el sistema inicializable', async () => {
    const email = emailUnico('colision');

    // Alguien ya se registró con ese email por la vía pública.
    await servidor()
      .post('/usuarios/registro')
      .send({ email, nombre: 'Ocupa', password: PASSWORD })
      .expect(201);

    // La inicialización con ese mismo email falla por conflicto de email...
    await servidor()
      .post('/sistema/inicializar')
      .set('X-Bootstrap-Token', TOKEN_BOOTSTRAP_TEST)
      .send({ email, nombre: 'Administrador', password: PASSWORD })
      .expect(409);

    // ...y el rollback devolvió el marcador, así que un error de tecleo no
    // consume la única oportunidad de inicializar el sistema.
    await servidor()
      .post('/sistema/inicializar')
      .set('X-Bootstrap-Token', TOKEN_BOOTSTRAP_TEST)
      .send(cuenta())
      .expect(201);
  });

  it('un accessToken válido no sustituye al secreto', async () => {
    await servidor()
      .post('/sistema/inicializar')
      .set('X-Bootstrap-Token', TOKEN_BOOTSTRAP_TEST)
      .send(cuenta())
      .expect(201);

    const email = emailUnico();
    await servidor()
      .post('/usuarios/registro')
      .send({ email, nombre: 'Ana', password: PASSWORD })
      .expect(201);
    const login = await servidor()
      .post('/usuarios/login')
      .send({ email, password: PASSWORD })
      .expect(200);

    await servidor()
      .post('/sistema/inicializar')
      .set(
        'Authorization',
        `Bearer ${(login.body as { accessToken: string }).accessToken}`,
      )
      .send(cuenta())
      .expect(401);
  });

  it('el registro público sigue asignando validador tras inicializar', async () => {
    await servidor()
      .post('/sistema/inicializar')
      .set('X-Bootstrap-Token', TOKEN_BOOTSTRAP_TEST)
      .send(cuenta())
      .expect(201);

    const respuesta = await servidor()
      .post('/usuarios/registro')
      .send({ email: emailUnico(), nombre: 'Ana', password: PASSWORD })
      .expect(201);

    expect((respuesta.body as { rol: string }).rol).toBe('validador');
  });
});
