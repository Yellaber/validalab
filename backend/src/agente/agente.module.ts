import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Entrevista } from '../entrevistas/entrevista/entrevista.entity';
import { IdeasModule } from '../ideas/ideas.module';
import { KpisModule } from '../kpis/kpis.module';
import { ProveedoresModule } from '../proveedores/proveedores.module';
import { EjecucionAgente } from './ejecucion/ejecucion-agente.entity';
import { ModeloDeChatFactory } from './proveedor/modelo-chat.factory';
import { AgenteService } from './scoring/agente.service';
import { Veredicto } from './veredicto/veredicto.entity';
import { VeredictoController } from './veredicto/veredicto.controller';
import { VeredictoService } from './veredicto/veredicto.service';

/**
 * Módulo de infraestructura `agente` (SRS §8): el Validador Inteligente, con dos
 * funciones organizadas por sub-dominio: `scoring/` (E4, automático al guardar) y
 * `veredicto/` (E6, bajo demanda), sobre la fundación compartida `comun/`
 * (runner del grafo) y `proveedor/` (adaptador RNF-06). Consume el repo de
 * `Entrevista` DIRECTAMENTE (evita el ciclo con `entrevistas`). Importa
 * `IdeasModule` (tools + fijar estado por veredicto), `ProveedoresModule` (la
 * credencial BYOK) y `KpisModule` (tablero para el snapshot y alertas). Exporta
 * `AgenteService` para el disparo del scoring desde `entrevistas`.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([EjecucionAgente, Entrevista, Veredicto]),
    IdeasModule,
    ProveedoresModule,
    KpisModule,
  ],
  controllers: [VeredictoController],
  providers: [AgenteService, ModeloDeChatFactory, VeredictoService],
  exports: [AgenteService],
})
export class AgenteModule {}
