import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogoController } from './catalogo/catalogo.controller';
import { CatalogoService } from './catalogo/catalogo.service';
import { ModeloIA } from './catalogo/modelo-ia.entity';
import { ConfiguracionByok } from './configuracion/configuracion-byok.entity';
import { ConfiguracionController } from './configuracion/configuracion.controller';
import { ConfiguracionService } from './configuracion/configuracion.service';
import { ServicioDeCifrado } from './configuracion/cifrado.service';
import { ValidadorDeApiKey } from './configuracion/validador-apikey.service';

/**
 * Módulo de dominio `proveedores` (épica E7 / BYOK), con dos sub-dominios:
 * - `catalogo/`: el catálogo curado de proveedores y modelos (global).
 * - `configuracion/`: la config BYOK del usuario (proveedor + API key cifrada +
 *   modelos por tarea), con cifrado en reposo y validación de la key contra el
 *   proveedor. Reutiliza `CatalogoService` para validar los modelos. Reutiliza la
 *   fundación: guard global, `@OwnerId()`, `AppConfigService` y el sobre `Error`.
 */
@Module({
  imports: [TypeOrmModule.forFeature([ModeloIA, ConfiguracionByok])],
  controllers: [CatalogoController, ConfiguracionController],
  providers: [
    CatalogoService,
    ConfiguracionService,
    ServicioDeCifrado,
    ValidadorDeApiKey,
  ],
  // `ConfiguracionService` se exporta para que la capa agéntica (`agente`)
  // obtenga la credencial de scoring descifrada del usuario (RNF-06 / BYOK).
  exports: [ConfiguracionService],
})
export class ProveedoresModule {}
