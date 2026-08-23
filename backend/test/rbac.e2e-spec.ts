import {
  AppE2E,
  cerrarAppE2E,
  crearAppE2E,
  limpiarBaseDeDatos,
} from './utils/app-e2e';
import {
  crearAdministrador,
  crearTenant,
  servidorDe,
  Tenant,
} from './utils/tenant';

/**
 * Las operaciones de administración de cuentas son la ÚNICA excepción al filtro
 * por `owner_id`: un administrador gestiona las cuentas de todos. Ese privilegio
 * lo sustituye el RBAC, así que verificar que el rol se exige de verdad —con los
 * dos guards globales encadenados y sobre HTTP real— es lo que impide que la
 * excepción se convierta en un agujero.
 */
describe('RBAC de administración (e2e)', () => {
  let contexto: AppE2E;
  let validador: Tenant;
  let administrador: Tenant;

  beforeAll(async () => {
    contexto = await crearAppE2E();
  });

  afterAll(async () => {
    await cerrarAppE2E(contexto);
  });

  beforeEach(async () => {
    await limpiarBaseDeDatos(contexto.dataSource);
    administrador = await crearAdministrador(contexto.app);
    validador = await crearTenant(contexto.app, 'validador');
  });

  const servidor = () => servidorDe(contexto.app);

  describe('una cuenta con rol validador', () => {
    it('no puede listar las cuentas del sistema', async () => {
      const respuesta = await servidor()
        .get('/usuarios')
        .set('Authorization', `Bearer ${validador.accessToken}`)
        .expect(403);

      expect(respuesta.body).toMatchObject({ codigo: 'ACCESO_DENEGADO' });
    });

    it('no puede consultar la cuenta de otro', async () => {
      await servidor()
        .get(`/usuarios/${administrador.id}`)
        .set('Authorization', `Bearer ${validador.accessToken}`)
        .expect(403);
    });

    it('no puede cambiar roles — ni siquiera el suyo', async () => {
      // El intento de autopromoción es el caso que importa: si esto pasara,
      // cualquiera se haría administrador.
      await servidor()
        .patch(`/usuarios/${validador.id}/rol`)
        .set('Authorization', `Bearer ${validador.accessToken}`)
        .send({ rol: 'administrador' })
        .expect(403);

      // Y sigue siendo validador.
      const perfil = await servidor()
        .get('/usuarios/yo')
        .set('Authorization', `Bearer ${validador.accessToken}`)
        .expect(200);
      expect((perfil.body as { rol: string }).rol).toBe('validador');
    });

    it('no puede cambiar el estado de una cuenta', async () => {
      await servidor()
        .patch(`/usuarios/${administrador.id}/estado`)
        .set('Authorization', `Bearer ${validador.accessToken}`)
        .send({ estado: 'suspendido' })
        .expect(403);
    });

    it('recibe 403 y no 401: está autenticado, le falta autorización', async () => {
      const sinToken = await servidor().get('/usuarios').expect(401);
      const conTokenDeValidador = await servidor()
        .get('/usuarios')
        .set('Authorization', `Bearer ${validador.accessToken}`)
        .expect(403);

      expect(sinToken.body).toMatchObject({ codigo: 'NO_AUTENTICADO' });
      expect(conTokenDeValidador.body).toMatchObject({
        codigo: 'ACCESO_DENEGADO',
      });
    });
  });

  describe('una cuenta con rol administrador', () => {
    it('lista las cuentas del sistema', async () => {
      const respuesta = await servidor()
        .get('/usuarios?pagina=1&porPagina=20')
        .set('Authorization', `Bearer ${administrador.accessToken}`)
        .expect(200);

      const cuerpo = respuesta.body as {
        datos: { email: string }[];
        paginacion: unknown;
      };
      expect(cuerpo.paginacion).toBeDefined();
      // Ve las cuentas de todos, no solo la suya: es la excepción al aislamiento.
      const emails = cuerpo.datos.map((u) => u.email);
      expect(emails).toContain(administrador.email);
      expect(emails).toContain(validador.email);
    });

    it('consulta la cuenta de otro usuario', async () => {
      const respuesta = await servidor()
        .get(`/usuarios/${validador.id}`)
        .set('Authorization', `Bearer ${administrador.accessToken}`)
        .expect(200);

      expect((respuesta.body as { email: string }).email).toBe(validador.email);
    });

    it('promueve a otra cuenta a administrador', async () => {
      const respuesta = await servidor()
        .patch(`/usuarios/${validador.id}/rol`)
        .set('Authorization', `Bearer ${administrador.accessToken}`)
        .send({ rol: 'administrador' })
        .expect(200);

      expect((respuesta.body as { rol: string }).rol).toBe('administrador');
    });

    it('suspende una cuenta y esa cuenta deja de autenticarse', async () => {
      await servidor()
        .patch(`/usuarios/${validador.id}/estado`)
        .set('Authorization', `Bearer ${administrador.accessToken}`)
        .send({ estado: 'suspendido' })
        .expect(200);

      await servidor()
        .post('/usuarios/login')
        .send({ email: validador.email, password: 'contrasena-de-prueba' })
        .expect(401);
    });
  });
});
