import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';

async function bootstrap() {
  // Crear la app dispara la validación del entorno (fail-fast): si falta o es
  // inválida una variable obligatoria, esto lanza y el proceso no escucha.
  const app = await NestFactory.create(AppModule);
  const config = app.get(AppConfigService);
  await app.listen(config.port);
}
void bootstrap();
