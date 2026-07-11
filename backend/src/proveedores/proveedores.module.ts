import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EjecucionAgente } from '../agente/ejecucion/ejecucion-agente.entity';
import { Idea } from '../ideas/idea/idea.entity';
import { IdeasModule } from '../ideas/ideas.module';
import { CatalogoController } from './catalogo/catalogo.controller';
import { CatalogoService } from './catalogo/catalogo.service';
import { ModeloIA } from './catalogo/modelo-ia.entity';
import { ConfiguracionByok } from './configuracion/configuracion-byok.entity';
import { ConfiguracionController } from './configuracion/configuracion.controller';
import { ConfiguracionService } from './configuracion/configuracion.service';
import { ServicioDeCifrado } from './configuracion/cifrado.service';
import { ValidadorDeApiKey } from './configuracion/validador-apikey.service';
import {
  CostoIdeaController,
  CostoUsuarioController,
} from './costo/costo.controller';
import { CostoService } from './costo/costo.service';
import { PrecioModelo } from './precios/precio-modelo.entity';
import { PreciosController } from './precios/precios.controller';
import { PreciosService } from './precios/precios.service';

/**
 * Módulo de dominio `proveedores` (E7 / BYOK + E8 / costo), con sub-dominios:
 * - `catalogo/`: el catálogo curado de proveedores y modelos (global).
 * - `configuracion/`: la config BYOK del usuario (cifrada, validada).
 * - `precios/`: la tabla de precios por modelo (RF-22e, configurable).
 * - `costo/`: el costo estimado por idea y del usuario (RF-22f), agregado desde
 *   el ledger `ejecuciones_agente` × precios. Importa `IdeasModule` (aislamiento
 *   + títulos) y consume el repo de `EjecucionAgente` (solo lectura).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ModeloIA,
      ConfiguracionByok,
      PrecioModelo,
      EjecucionAgente,
      Idea,
    ]),
    IdeasModule,
  ],
  controllers: [
    CatalogoController,
    ConfiguracionController,
    PreciosController,
    CostoUsuarioController,
    CostoIdeaController,
  ],
  providers: [
    CatalogoService,
    ConfiguracionService,
    ServicioDeCifrado,
    ValidadorDeApiKey,
    PreciosService,
    CostoService,
  ],
  // `ConfiguracionService` se exporta para que la capa agéntica (`agente`)
  // obtenga la credencial descifrada del usuario (RNF-06 / BYOK).
  exports: [ConfiguracionService],
})
export class ProveedoresModule {}
