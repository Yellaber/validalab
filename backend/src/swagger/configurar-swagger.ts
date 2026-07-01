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
    .addTag(
      'usuarios',
      'Autenticación, sesión y perfil propio del usuario (épica E0).',
    )
    .build();

  const documento = cleanupOpenApiDoc(
    SwaggerModule.createDocument(app, config),
  );
  SwaggerModule.setup(RUTA_DOCS, app, documento);
}
