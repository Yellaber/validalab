import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';
import { configurarApp } from './configurar-app';
import { ejecutarMigracionesAlArranque } from './database/migraciones-al-arranque';
import { configurarSwagger } from './swagger/configurar-swagger';

async function bootstrap() {
  // Crear la app dispara la validación del entorno (fail-fast): si falta o es
  // inválida una variable obligatoria, esto lanza y el proceso no escucha.
  const app = await NestFactory.create(AppModule);
  const config = app.get(AppConfigService);
  // Configuración compartida con la suite e2e, para que las pruebas ejerzan
  // exactamente la misma aplicación que se despliega.
  configurarApp(app);
  // CORS con credenciales: el navegador solo envía/recibe la cookie de refresh
  // entre orígenes si el origen es explícito (no `*`) y `credentials` está activo.
  app.enableCors({ origin: config.corsOrigins, credentials: true });
  // Documentación OpenAPI viva en `/docs` (la fuente de verdad del contrato
  // sigue siendo `contrato-api/openapi.yaml`).
  configurarSwagger(app);
  // Las migraciones van ANTES de escuchar: si el esquema no se puede poner al
  // día es preferible no arrancar, en vez de servir el código nuevo contra un
  // esquema viejo. El advisory lock serializa las réplicas que arranquen a la
  // vez (ver `ejecutarMigracionesAlArranque`).
  if (config.migrarAlArranque) {
    await ejecutarMigracionesAlArranque(app.get(DataSource));
  }
  await app.listen(config.port);
}
void bootstrap();
