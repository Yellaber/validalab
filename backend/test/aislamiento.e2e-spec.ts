import {
  AppE2E,
  cerrarAppE2E,
  crearAppE2E,
  limpiarBaseDeDatos,
} from './utils/app-e2e';
import { crearIdea, crearTenant, servidorDe, Tenant } from './utils/tenant';

/**
 * El aislamiento multi-tenant es el invariante que sostiene el producto: ningún
 * usuario ve datos de otro. Los tests unitarios lo comprueban pieza a pieza con
 * dobles; solo aquí se verifica que el cableado real —token, guard, servicio y
 * consulta filtrada por `owner_id`— lo cumple de extremo a extremo.
 */
describe('Aislamiento multi-tenant (e2e)', () => {
  let contexto: AppE2E;
  let alicia: Tenant;
  let bruno: Tenant;

  beforeAll(async () => {
    contexto = await crearAppE2E();
  });

  afterAll(async () => {
    await cerrarAppE2E(contexto);
  });

  beforeEach(async () => {
    await limpiarBaseDeDatos(contexto.dataSource);
    alicia = await crearTenant(contexto.app, 'alicia');
    bruno = await crearTenant(contexto.app, 'bruno');
  });

  const servidor = () => servidorDe(contexto.app);

  it('cada colección contiene únicamente los recursos de su propietario', async () => {
    await crearIdea(contexto.app, alicia, 'Idea de Alicia');
    await crearIdea(contexto.app, bruno, 'Idea de Bruno');

    const deAlicia = await servidor()
      .get('/ideas')
      .set('Authorization', `Bearer ${alicia.accessToken}`)
      .expect(200);
    const deBruno = await servidor()
      .get('/ideas')
      .set('Authorization', `Bearer ${bruno.accessToken}`)
      .expect(200);

    const titulos = (respuesta: { body: unknown }) =>
      (respuesta.body as { datos: { titulo: string }[] }).datos.map(
        (i) => i.titulo,
      );

    expect(titulos(deAlicia)).toEqual(['Idea de Alicia']);
    expect(titulos(deBruno)).toEqual(['Idea de Bruno']);
  });

  it('no permite leer por id un recurso ajeno ni revela sus datos', async () => {
    const ideaDeBruno = await crearIdea(
      contexto.app,
      bruno,
      'Secreto comercial de Bruno',
    );

    const respuesta = await servidor()
      .get(`/ideas/${ideaDeBruno}`)
      .set('Authorization', `Bearer ${alicia.accessToken}`)
      .expect(403);

    expect(respuesta.body).toMatchObject({ codigo: 'ACCESO_DENEGADO' });
    // El cuerpo del error no puede filtrar el contenido del recurso ajeno.
    expect(JSON.stringify(respuesta.body)).not.toContain('Secreto comercial');
  });

  it('no permite modificar un recurso ajeno', async () => {
    const ideaDeBruno = await crearIdea(contexto.app, bruno);

    await servidor()
      .patch(`/ideas/${ideaDeBruno}`)
      .set('Authorization', `Bearer ${alicia.accessToken}`)
      .send({ titulo: 'Secuestrada por Alicia' })
      .expect(403);

    // El recurso de Bruno queda intacto.
    const original = await servidor()
      .get(`/ideas/${ideaDeBruno}`)
      .set('Authorization', `Bearer ${bruno.accessToken}`)
      .expect(200);
    expect((original.body as { titulo: string }).titulo).toBe('Idea de prueba');
  });

  it('no permite archivar un recurso ajeno', async () => {
    const ideaDeBruno = await crearIdea(contexto.app, bruno);

    await servidor()
      .post(`/ideas/${ideaDeBruno}/archivar`)
      .set('Authorization', `Bearer ${alicia.accessToken}`)
      .expect(403);
  });

  it('ignora un ownerId enviado por el cliente y usa el derivado del token', async () => {
    // Alicia intenta crear una idea a nombre de Bruno.
    const idea = await crearIdea(
      contexto.app,
      alicia,
      'Idea con ownerId falso',
      {
        ownerId: bruno.id,
        owner_id: bruno.id,
      },
    );

    // La idea es de Alicia: el `owner_id` se deriva SIEMPRE del token.
    await servidor()
      .get(`/ideas/${idea}`)
      .set('Authorization', `Bearer ${alicia.accessToken}`)
      .expect(200);

    // Y Bruno no la ve ni en su colección ni por acceso directo.
    const deBruno = await servidor()
      .get('/ideas')
      .set('Authorization', `Bearer ${bruno.accessToken}`)
      .expect(200);
    expect((deBruno.body as { datos: unknown[] }).datos).toHaveLength(0);

    await servidor()
      .get(`/ideas/${idea}`)
      .set('Authorization', `Bearer ${bruno.accessToken}`)
      .expect(403);
  });

  it('mantiene el aislamiento en los recursos anidados de una idea ajena', async () => {
    const ideaDeBruno = await crearIdea(contexto.app, bruno);

    // Las hipótesis cuelgan de la idea: si el aislamiento fallara en la ruta
    // padre, se filtraría todo el subárbol.
    await servidor()
      .get(`/ideas/${ideaDeBruno}/hipotesis`)
      .set('Authorization', `Bearer ${alicia.accessToken}`)
      .expect(403);

    await servidor()
      .get(`/ideas/${ideaDeBruno}/kpis`)
      .set('Authorization', `Bearer ${alicia.accessToken}`)
      .expect(403);
  });
});
