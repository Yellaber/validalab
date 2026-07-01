import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { UsuariosController } from '../usuarios/usuarios.controller';
import { UsuariosService } from '../usuarios/usuarios.service';

/**
 * Verifica que el documento OpenAPI que sirve `/docs` refleja el módulo usuarios:
 * las rutas del controlador, el esquema de seguridad Bearer y los esquemas de los
 * DTOs `createZodDto` (request, respuesta y error) generados por nestjs-zod.
 */
describe('documento OpenAPI (usuarios)', () => {
  let app: INestApplication;
  let doc: ReturnType<typeof cleanupOpenApiDoc>;

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      controllers: [UsuariosController],
      providers: [{ provide: UsuariosService, useValue: {} }],
    }).compile();
    app = modulo.createNestApplication();
    await app.init();

    const config = new DocumentBuilder()
      .setTitle('ValidaLab API')
      .setVersion('0.1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'bearerAuth',
      )
      .build();
    doc = cleanupOpenApiDoc(SwaggerModule.createDocument(app, config));
  });

  afterAll(async () => {
    await app.close();
  });

  it('publica las rutas del módulo usuarios, incluidas las de administración', () => {
    expect(Object.keys(doc.paths)).toEqual(
      expect.arrayContaining([
        '/usuarios/registro',
        '/usuarios/login',
        '/usuarios/refresh',
        '/usuarios/logout',
        '/usuarios/yo',
        '/usuarios',
        '/usuarios/{id}',
        '/usuarios/{id}/rol',
        '/usuarios/{id}/estado',
      ]),
    );
  });

  it('declara el esquema de seguridad Bearer JWT', () => {
    expect(doc.components?.securitySchemes?.bearerAuth).toMatchObject({
      type: 'http',
      scheme: 'bearer',
    });
  });

  it('protege /usuarios/yo con Bearer y deja /usuarios/login público', () => {
    expect(doc.paths['/usuarios/yo'].get?.security).toEqual([
      { bearerAuth: [] },
    ]);
    expect(doc.paths['/usuarios/login'].post?.security).toBeUndefined();
  });

  it('documenta el 403 en los endpoints de administración (RBAC)', () => {
    expect(doc.paths['/usuarios'].get?.security).toEqual([{ bearerAuth: [] }]);
    expect(doc.paths['/usuarios'].get?.responses?.['403']).toBeDefined();
    expect(
      doc.paths['/usuarios/{id}/rol'].patch?.responses?.['403'],
    ).toBeDefined();
  });

  it('genera los esquemas de los DTOs de request, respuesta y error', () => {
    const esquemas = Object.keys(doc.components?.schemas ?? {});
    expect(esquemas).toEqual(
      expect.arrayContaining([
        'RegistroUsuarioDto',
        'UsuarioRespuestaDto',
        'TokenRespuestaDto',
        'ErrorRespuestaDto',
      ]),
    );
  });

  it('no expone contraseña ni hash en el recurso Usuario', () => {
    const usuario = doc.components?.schemas?.UsuarioRespuestaDto as {
      properties?: Record<string, unknown>;
    };
    expect(Object.keys(usuario.properties ?? {})).not.toContain('password');
    expect(Object.keys(usuario.properties ?? {})).not.toContain('passwordHash');
  });
});
