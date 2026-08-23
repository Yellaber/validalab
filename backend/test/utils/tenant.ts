import { INestApplication } from '@nestjs/common';
import request from 'supertest';

/** Secreto de bootstrap que fija `setup-env.ts` para la suite. */
export const TOKEN_BOOTSTRAP_TEST = process.env.BOOTSTRAP_TOKEN!;

/**
 * `getHttpServer()` está tipado como `any`, así que pasarlo directo a supertest
 * propaga el `any` por toda la suite. Este helper lo estrecha una sola vez al
 * tipo que la propia `request` espera.
 */
export function servidorDe(app: INestApplication) {
  return request(app.getHttpServer() as Parameters<typeof request>[0]);
}

export interface Tenant {
  id: string;
  email: string;
  nombre: string;
  accessToken: string;
  /** Cabecera `Set-Cookie` completa del login, para las pruebas de refresh. */
  cookieRefresh: string;
}

/**
 * Emails únicos por llamada. Cada test crea sus propios tenants en vez de
 * compartirlos por `beforeAll`: compartirlos acoplaría el orden de ejecución y
 * un fallo temprano arrastraría a los siguientes.
 */
let contador = 0;
export function emailUnico(prefijo = 'tenant'): string {
  contador += 1;
  return `${prefijo}-${Date.now()}-${contador}@ejemplo.com`;
}

const PASSWORD = 'contrasena-de-prueba';

/** Extrae la cookie de refresh de la cabecera `Set-Cookie` de una respuesta. */
export function extraerCookieRefresh(cabeceras: unknown): string {
  const setCookie = (cabeceras as Record<string, unknown>)['set-cookie'];
  const cookies = Array.isArray(setCookie) ? (setCookie as string[]) : [];
  const refresh = cookies.find((c) => c.startsWith('refreshToken='));
  if (!refresh) {
    throw new Error('La respuesta no incluyó la cookie de refresh.');
  }
  return refresh;
}

/** Registra una cuenta e inicia sesión, devolviendo el tenant ya autenticado. */
export async function crearTenant(
  app: INestApplication,
  prefijo?: string,
): Promise<Tenant> {
  const email = emailUnico(prefijo);
  const nombre = 'Tenant de prueba';

  await servidorDe(app)
    .post('/usuarios/registro')
    .send({ email, nombre, password: PASSWORD })
    .expect(201);

  return iniciarSesion(app, email, nombre);
}

/** Inicia sesión con una cuenta ya existente. */
export async function iniciarSesion(
  app: INestApplication,
  email: string,
  nombre = '',
): Promise<Tenant> {
  const respuesta = await servidorDe(app)
    .post('/usuarios/login')
    .send({ email, password: PASSWORD })
    .expect(200);

  const cuerpo = respuesta.body as {
    accessToken: string;
    usuario: { id: string };
  };

  return {
    id: cuerpo.usuario.id,
    email,
    nombre,
    accessToken: cuerpo.accessToken,
    cookieRefresh: extraerCookieRefresh(respuesta.headers),
  };
}

/**
 * Crea el administrador del sistema por la única vía que lo produce:
 * `POST /sistema/inicializar` con el secreto de despliegue. Solo funciona una
 * vez por estado de base de datos, que es exactamente lo que se quiere probar.
 */
export async function crearAdministrador(
  app: INestApplication,
): Promise<Tenant> {
  const email = emailUnico('admin');

  await servidorDe(app)
    .post('/sistema/inicializar')
    .set('X-Bootstrap-Token', TOKEN_BOOTSTRAP_TEST)
    .send({ email, nombre: 'Administrador', password: PASSWORD })
    .expect(201);

  return iniciarSesion(app, email, 'Administrador');
}

/** Crea una idea propiedad del tenant y devuelve su `id`. */
export async function crearIdea(
  app: INestApplication,
  tenant: Tenant,
  titulo = 'Idea de prueba',
  extra: Record<string, unknown> = {},
): Promise<string> {
  const respuesta = await servidorDe(app)
    .post('/ideas')
    .set('Authorization', `Bearer ${tenant.accessToken}`)
    .send({ titulo, problema: 'Un problema que validar', ...extra })
    .expect(201);

  return (respuesta.body as { id: string }).id;
}

export { PASSWORD };
