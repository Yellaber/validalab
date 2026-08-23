import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';

/** Ruta bajo la que se sirve la UI de Swagger (JSON en `/docs-json`). */
export const RUTA_DOCS = 'docs';

/**
 * Configura la documentación OpenAPI viva del backend con Swagger UI.
 *
 * Es la vista interactiva de lo que el backend implementa de verdad; la FUENTE
 * DE VERDAD del contrato sigue siendo `contrato-api/openapi.yaml` (diseño
 * primero). Los DTOs `createZodDto` (nestjs-zod) exponen su esquema Zod a
 * `@nestjs/swagger` de forma nativa; `cleanupOpenApiDoc` post-procesa el
 * documento generado para esos esquemas, manteniendo una sola gramática de
 * esquemas para validación y documentación.
 */
export function configurarSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('ValidaLab API')
    .setDescription(
      'Documentación viva de la implementación del backend. La fuente de verdad ' +
        'del contrato es `contrato-api/openapi.yaml`.',
    )
    .setVersion('0.1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'bearerAuth',
    )
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'X-Bootstrap-Token',
        description:
          'Secreto de despliegue que autoriza `POST /sistema/inicializar`, la ' +
          'única operación que lo acepta. Solo sirve mientras el sistema no esté ' +
          'inicializado; después puede retirarse del entorno. No sustituye ni es ' +
          'sustituido por `bearerAuth`.',
      },
      'bootstrapToken',
    )
    .addTag(
      'usuarios',
      'Autenticación, sesión y perfil propio del usuario (épica E0).',
    )
    .addTag(
      'sistema',
      'Ciclo de vida de la instalación, no del dominio: operaciones que se ' +
        'ejecutan al poner en marcha un sistema y no forman parte del uso diario.',
    )
    .build();

  const documento = cleanupOpenApiDoc(
    SwaggerModule.createDocument(app, config),
  );
  SwaggerModule.setup(RUTA_DOCS, app, documento);
}
