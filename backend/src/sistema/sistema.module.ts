import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { BootstrapTokenGuard } from './bootstrap-token.guard';
import { InicializacionSistema } from './inicializacion.entity';
import { SistemaController } from './sistema.controller';
import { SistemaService } from './sistema.service';

/**
 * Módulo `sistema`: ciclo de vida de la instalación, no un dominio del SRS. Es el
 * único módulo del backend que no modela un agregado de negocio.
 *
 * Importa `UsuariosModule` para reutilizar el alta de cuentas —el administrador
 * de origen se crea por el mismo camino que cualquier otra cuenta, difiriendo
 * solo en el rol— en vez de duplicar hashing e invariantes.
 */
@Module({
  imports: [TypeOrmModule.forFeature([InicializacionSistema]), UsuariosModule],
  controllers: [SistemaController],
  providers: [SistemaService, BootstrapTokenGuard],
})
export class SistemaModule {}
