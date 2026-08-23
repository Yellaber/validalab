import {
  AppE2E,
  cerrarAppE2E,
  crearAppE2E,
  limpiarBaseDeDatos,
} from './utils/app-e2e';
import {
  crearTenant,
  emailUnico,
  extraerCookieRefresh,
  PASSWORD,
  servidorDe,
} from './utils/tenant';

describe('Ciclo de sesión (e2e)', () => {
  let contexto: AppE2E;

  beforeAll(async () => {
    contexto = await crearAppE2E();
  });

  afterAll(async () => {
    await cerrarAppE2E(contexto);
  });

  beforeEach(async () => {
    await limpiarBaseDeDatos(contexto.dataSource);
  });

  const servidor = () => servidorDe(contexto.app);

  it('registra una cuenta con rol validador y sin exponer credenciales', async () => {
    const email = emailUnico();

    const respuesta = await servidor()
      .post('/usuarios/registro')
      .send({ email, nombre: 'Ana', password: PASSWORD })
      .expect(201);

    expect(respuesta.body).toMatchObject({
      email,
      nombre: 'Ana',
      rol: 'validador',
      estado: 'activo',
    });
    expect(respuesta.body).not.toHaveProperty('passwordHash');
    expect(respuesta.body).not.toHaveProperty('password');
  });

  it('emite un accessToken utilizable y la cookie de refresh al iniciar sesión', async () => {
    const email = emailUnico();
    await servidor()
      .post('/usuarios/registro')
      .send({ email, nombre: 'Ana', password: PASSWORD })
      .expect(201);

    const login = await servidor()
      .post('/usuarios/login')
      .send({ email, password: PASSWORD })
      .expect(200);

    expect(login.body).toMatchObject({ tokenTipo: 'Bearer' });
    expect(typeof (login.body as { accessToken: string }).accessToken).toBe(
      'string',
    );

    const cookie = extraerCookieRefresh(login.headers);
    // La cookie de refresh nunca debe ser legible por JavaScript del cliente.
    expect(cookie).toContain('HttpOnly');

    // El token sirve de verdad contra una ruta protegida.
    await servidor()
      .get('/usuarios/yo')
      .set(
        'Authorization',
        `Bearer ${(login.body as { accessToken: string }).accessToken}`,
      )
      .expect(200);
  });

  it('renueva la sesión rotando la cookie de refresh', async () => {
    const tenant = await crearTenant(contexto.app);

    const refresh = await servidor()
      .post('/usuarios/refresh')
      .set('Cookie', tenant.cookieRefresh)
      .expect(200);

    const cookieNueva = extraerCookieRefresh(refresh.headers);
    expect(cookieNueva).not.toBe(tenant.cookieRefresh);

    // El accessToken nuevo funciona.
    await servidor()
      .get('/usuarios/yo')
      .set(
        'Authorization',
        `Bearer ${(refresh.body as { accessToken: string }).accessToken}`,
      )
      .expect(200);

    // Y la cookie ANTERIOR ya no sirve: la rotación la invalidó.
    await servidor()
      .post('/usuarios/refresh')
      .set('Cookie', tenant.cookieRefresh)
      .expect(401);
  });

  it('invalida el refresh token al cerrar sesión', async () => {
    const tenant = await crearTenant(contexto.app);

    await servidor()
      .post('/usuarios/logout')
      .set('Cookie', tenant.cookieRefresh)
      .expect(204);

    await servidor()
      .post('/usuarios/refresh')
      .set('Cookie', tenant.cookieRefresh)
      .expect(401);
  });

  it('rechaza una ruta protegida sin token', async () => {
    const respuesta = await servidor().get('/usuarios/yo').expect(401);

    expect(respuesta.body).toMatchObject({ codigo: 'NO_AUTENTICADO' });
  });

  it('rechaza una ruta protegida con un token inválido', async () => {
    const respuesta = await servidor()
      .get('/usuarios/yo')
      .set('Authorization', 'Bearer esto-no-es-un-jwt')
      .expect(401);

    expect(respuesta.body).toMatchObject({ codigo: 'NO_AUTENTICADO' });
  });

  it('no distingue email inexistente de contraseña incorrecta', async () => {
    const email = emailUnico();
    await servidor()
      .post('/usuarios/registro')
      .send({ email, nombre: 'Ana', password: PASSWORD })
      .expect(201);

    const contrasenaMala = await servidor()
      .post('/usuarios/login')
      .send({ email, password: 'contrasena-equivocada' })
      .expect(401);

    const emailInexistente = await servidor()
      .post('/usuarios/login')
      .send({ email: emailUnico(), password: PASSWORD })
      .expect(401);

    // Mismo código y mismo mensaje: el login no revela qué cuentas existen.
    expect(contrasenaMala.body).toEqual(emailInexistente.body);
  });
});
