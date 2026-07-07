import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogoController } from './catalogo/catalogo.controller';
import { CatalogoService } from './catalogo/catalogo.service';
import { ModeloIA } from './catalogo/modelo-ia.entity';

/**
 * Módulo de dominio `proveedores` (épica E7 / BYOK). Estrenado con el sub-dominio
 * `catalogo/`: el catálogo curado de proveedores de IA y sus modelos (datos
 * actualizables sin redesplegar). El siguiente chunk añadirá `configuracion/`
 * con la config BYOK del usuario (cifrado + validación de la key). Reutiliza la
 * fundación: guard global (requiere token) y el sobre `Error`.
 */
@Module({
  imports: [TypeOrmModule.forFeature([ModeloIA])],
  controllers: [CatalogoController],
  providers: [CatalogoService],
})
export class ProveedoresModule {}
