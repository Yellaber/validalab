import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Entrevista } from '../entrevistas/entrevista/entrevista.entity';
import { IdeasModule } from '../ideas/ideas.module';
import { ProveedoresModule } from '../proveedores/proveedores.module';
import { EjecucionAgente } from './ejecucion/ejecucion-agente.entity';
import { ModeloDeChatFactory } from './proveedor/modelo-chat.factory';
import { AgenteService } from './scoring/agente.service';

/**
 * Módulo de infraestructura `agente` (E4-C / SRS §8): el Validador Inteligente.
 * Organizado por tipo técnico (`proveedor/`, `scoring/`, `ejecucion/`). Consume
 * el repo de `Entrevista` DIRECTAMENTE (no `EntrevistasModule`) para evitar la
 * dependencia circular con `entrevistas`, que es quien dispara el scoring.
 * Importa `IdeasModule` (tools de hipótesis/umbrales) y `ProveedoresModule` (la
 * credencial BYOK descifrada, RNF-06). Exporta `AgenteService` para el disparo.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([EjecucionAgente, Entrevista]),
    IdeasModule,
    ProveedoresModule,
  ],
  providers: [AgenteService, ModeloDeChatFactory],
  exports: [AgenteService],
})
export class AgenteModule {}
