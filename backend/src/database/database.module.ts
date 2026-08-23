import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigService } from '../config/app-config.service';
import { buildDataSourceOptions } from './typeorm-options';

/**
 * Módulo de persistencia: configura la conexión a PostgreSQL vía TypeORM a
 * partir de `AppConfigService` (config validada). Las opciones se construyen con
 * el mismo builder que usa la CLI de migraciones (`data-source.ts`).
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) =>
        buildDataSourceOptions(config.database),
    }),
  ],
})
export class DatabaseModule {}
